import { hashPassword } from "@/lib/auth";
import { ApiError } from "@/lib/apiAuth";
import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import type { CreateTechnicianInput, UpdateTechnicianInput } from "@/lib/technicianValidation";
import type { Technician } from "@/types";

export const TECHNICIANS = "technicians";
export const USERS = "users";
export const BRANCHES = "branches"; // top-level, NOT shops/{id}/branches

/**
 * Every write here goes through `adminDb`, which uses a service account and so
 * bypasses firestore.rules entirely — tenant isolation is this layer's job and
 * nothing below it will catch a mistake. `branchId` arrives from the request
 * body, and the API-layer role check (`assertCanWriteTechnician`) only compares
 * shops; it cannot tell whether a branch belongs to the caller's shop. Without
 * this guard a shop_admin could name any branch id and write into another
 * shop's `members` array. Fails closed on a branch with no `shopId`: a branch
 * whose owner cannot be established has not been shown to be ours.
 */
function assertBranchInShop(
  branchSnap: FirebaseFirestore.DocumentSnapshot,
  shopId: string,
  branchId: string
): void {
  const branchShopId = (branchSnap.data() as Record<string, unknown> | undefined)?.shopId;
  if (!branchShopId || branchShopId !== shopId) {
    throw new ApiError(403, `Branch ${branchId} does not belong to this shop`);
  }
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** The single Firestore -> Technician mapper for the whole codebase. */
export function mapTechnician(id: string, data: Record<string, unknown>): Technician {
  return {
    id,
    name: (data.name as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    role: (data.role as Technician["role"]) || "technician",
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    userId: (data.userId as string) || "",
    created_by: (data.created_by as string) || "",
    skills: (data.skills as string[]) || [],
    status: (data.status as Technician["status"]) || "active",
    bio: (data.bio as string) || "",
    specializations: (data.specializations as string[]) || [],
    experience: (data.experience as number) || 0,
    rating: (data.rating as number) || 0,
    totalServices: (data.totalServices as number) || 0,
    completedServices: (data.completedServices as number) || 0,
    availability: (data.availability as Technician["availability"]) || undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listTechnicians(scope: {
  shopId: string;
  branchId?: string;
}): Promise<Technician[]> {
  let query = adminDb
    .collection(TECHNICIANS)
    .where("shopId", "==", scope.shopId) as FirebaseFirestore.Query;

  if (scope.branchId) {
    query = query.where("branchId", "==", scope.branchId);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => mapTechnician(doc.id, doc.data()));
}

export async function getTechnician(id: string): Promise<Technician | null> {
  const doc = await adminDb.collection(TECHNICIANS).doc(id).get();
  return doc.exists ? mapTechnician(doc.id, doc.data() as Record<string, unknown>) : null;
}

export async function getTechnicianByUserId(userId: string): Promise<Technician | null> {
  const snapshot = await adminDb
    .collection(TECHNICIANS)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return mapTechnician(doc.id, doc.data());
}

/**
 * `exceptUserId` is compared against `users` collection DOCUMENT IDs, not
 * technician document IDs. Passing a technician's own doc id here will never
 * match a users doc id, so the exclusion silently fails and the caller gets
 * a false positive ("email exists") even for its own email. Callers must
 * pass the linked `Technician.userId`, never `Technician.id`.
 */
export async function emailExists(email: string, exceptUserId?: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection(USERS)
    .where("email", "==", email.toLowerCase())
    .get();

  return snapshot.docs.some((doc) => doc.id !== exceptUserId);
}

export async function createTechnician(
  input: CreateTechnicianInput & { shopId: string; createdBy: string }
): Promise<Technician> {
  const hashedPassword = await hashPassword(input.password);
  const now = new Date();

  const userRef = adminDb.collection(USERS).doc();
  const technicianRef = adminDb.collection(TECHNICIANS).doc();
  const branchRef = adminDb.collection(BRANCHES).doc(input.branchId);

  await adminDb.runTransaction(async (tx) => {
    const branchSnap = await tx.get(branchRef);
    if (!branchSnap.exists) {
      throw new ApiError(400, `Branch ${input.branchId} does not exist`);
    }
    assertBranchInShop(branchSnap, input.shopId, input.branchId);

    tx.set(userRef, {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: "technician",
      shopId: input.shopId,
      branchId: input.branchId,
      phone: input.phone,
      status: "active",
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(technicianRef, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: "technician",
      shopId: input.shopId,
      branchId: input.branchId,
      userId: userRef.id,
      // The ID of the admin performing the creation — see spec defect 5.
      created_by: input.createdBy,
      skills: [],
      status: "active",
      bio: "",
      specializations: [],
      experience: input.experience ?? 0,
      rating: 0,
      totalServices: 0,
      completedServices: 0,
      availability: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      createdAt: now,
      updatedAt: now,
    });

    tx.update(branchRef, {
      members: FieldValue.arrayUnion({
        userId: userRef.id,
        role: "technician",
        name: input.name,
      }),
    });
  });

  const created = await getTechnician(technicianRef.id);
  if (!created) throw new Error("Technician creation failed");
  return created;
}

/** True when `member` (any historical shape) refers to the given userId. */
function isMemberEntryFor(member: unknown, userId: string): boolean {
  return (
    !!member &&
    typeof member === "object" &&
    (member as { userId?: unknown }).userId === userId
  );
}

function membersOf(snap: FirebaseFirestore.DocumentSnapshot | null): unknown[] {
  const data = snap?.data() as Record<string, unknown> | undefined;
  return Array.isArray(data?.members) ? (data!.members as unknown[]) : [];
}

export async function updateTechnician(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  const technicianRef = adminDb.collection(TECHNICIANS).doc(id);

  await adminDb.runTransaction(async (tx) => {
    // ---- READS ----------------------------------------------------------
    // Firestore requires every tx.get() in a transaction to happen before any
    // tx.set()/tx.update(), so all the reads this function might need are
    // gathered up front, before any write below.
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new ApiError(404, "Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const nextBranchId = input.branchId ?? current.branchId;
    const branchChanged = input.branchId !== undefined && input.branchId !== current.branchId;
    const nameChanged = input.name !== undefined && input.name !== current.name;
    const statusChanged = input.status !== undefined && input.status !== current.status;
    const membershipTouched = branchChanged || nameChanged || statusChanged;

    const userRef = current.userId ? adminDb.collection(USERS).doc(current.userId) : null;
    // A missing linked `users` doc is data corruption (it should never happen
    // for a live technician), not a normal state. We deliberately skip the
    // user sync rather than throw: aborting the whole technician update
    // because a secondary login doc vanished would leave admins with no way
    // to even fix or deactivate the technician record itself.
    const userSnap = userRef ? await tx.get(userRef) : null;

    const currentBranchRef =
      current.branchId && membershipTouched
        ? adminDb.collection(BRANCHES).doc(current.branchId)
        : null;
    const currentBranchSnap = currentBranchRef ? await tx.get(currentBranchRef) : null;

    const destBranchRef = branchChanged
      ? adminDb.collection(BRANCHES).doc(nextBranchId)
      : currentBranchRef;
    const destBranchSnap = branchChanged ? await tx.get(destBranchRef!) : currentBranchSnap;

    if (branchChanged) {
      if (!destBranchSnap?.exists) {
        throw new ApiError(400, `Branch ${nextBranchId} does not exist`);
      }
      // Scoped against the technician's OWN shopId as stored in Firestore, not
      // anything the request supplied, so a caller cannot move a technician
      // into a branch outside the shop that technician already belongs to.
      assertBranchInShop(destBranchSnap, current.shopId, nextBranchId);
    }

    // ---- WRITES ----------------------------------------------------------
    tx.update(technicianRef, { ...input, updatedAt: new Date() });

    // Keep the linked login account in sync — spec defect 3.
    if (userRef && userSnap?.exists) {
      const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) userUpdate.name = input.name;
      if (input.email !== undefined) userUpdate.email = input.email;
      if (input.phone !== undefined) userUpdate.phone = input.phone;
      if (input.branchId !== undefined) userUpdate.branchId = input.branchId;
      if (input.status !== undefined) {
        userUpdate.status = input.status === "inactive" ? "suspended" : "active";
      }
      tx.update(userRef, userUpdate);
    }

    if (current.userId && membershipTouched) {
      const userId = current.userId;
      const effectiveStatus = input.status ?? current.status;
      const effectiveName = input.name ?? current.name;
      const newEntry = {
        userId,
        role: current.role || "technician",
        name: effectiveName,
      };

      if (!branchChanged) {
        // Same branch document: read-filter-write the whole array back as
        // ONE write, rather than a FieldValue.arrayRemove + arrayUnion pair.
        // arrayRemove only deletes an EXACT whole-object match, so it misses
        // legacy 2-field {userId, role} entries and any entry whose stored
        // `name` has drifted from the technician's current name. Filtering
        // on userId alone handles every historical shape.
        // A missing branch doc for a stale `branchId` is the same data-
        // corruption case documented for the missing-`users`-doc above: skip
        // the membership sync rather than let tx.update throw NOT_FOUND and
        // abort the whole technician update.
        if (currentBranchRef && currentBranchSnap?.exists) {
          const filtered = membersOf(currentBranchSnap).filter(
            (m) => !isMemberEntryFor(m, userId)
          );
          if (effectiveStatus === "active") filtered.push(newEntry);
          tx.update(currentBranchRef, { members: filtered });
        }
      } else {
        // Branch changed: two distinct branch docs, so two writes are
        // unavoidable — drop the member from the old branch, add (if still
        // active) to the new one. Each write is still a single read-filter-
        // write of that document's own array.
        if (currentBranchRef && currentBranchSnap?.exists) {
          const filteredOld = membersOf(currentBranchSnap).filter(
            (m) => !isMemberEntryFor(m, userId)
          );
          tx.update(currentBranchRef, { members: filteredOld });
        }
        if (effectiveStatus === "active" && destBranchRef) {
          const filteredNew = membersOf(destBranchSnap).filter(
            (m) => !isMemberEntryFor(m, userId)
          );
          filteredNew.push(newEntry);
          tx.update(destBranchRef, { members: filteredNew });
        }
      }
    }
  });

  const updated = await getTechnician(id);
  if (!updated) throw new Error("Technician not found after update");
  return updated;
}

/**
 * Soft delete. Sets the technician inactive and suspends the login, but leaves
 * services untouched so technician_id on past work and invoices still resolves
 * to a name.
 */
export async function deactivateTechnician(id: string): Promise<void> {
  const technicianRef = adminDb.collection(TECHNICIANS).doc(id);

  await adminDb.runTransaction(async (tx) => {
    // ---- READS (must all happen before any write, per Firestore rules) ----
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new ApiError(404, "Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const now = new Date();

    const userRef = current.userId ? adminDb.collection(USERS).doc(current.userId) : null;
    // Same deliberate choice as updateTechnician: a missing linked users doc
    // is data corruption we don't want to let block the soft delete, so we
    // skip that particular sync instead of throwing.
    const userSnap = userRef ? await tx.get(userRef) : null;

    const branchRef = current.branchId ? adminDb.collection(BRANCHES).doc(current.branchId) : null;
    const branchSnap = branchRef ? await tx.get(branchRef) : null;

    // ---- WRITES ------------------------------------------------------------
    tx.update(technicianRef, { status: "inactive", updatedAt: now });

    if (userRef && userSnap?.exists) {
      tx.update(userRef, { status: "suspended", updatedAt: now });
    }

    if (branchRef && branchSnap?.exists && current.userId) {
      // Read-filter-write on userId alone: FieldValue.arrayRemove requires an
      // exact whole-object match and so misses legacy 2-field {userId, role}
      // entries and any entry whose stored `name` has drifted — see
      // updateTechnician for the full rationale.
      const filtered = membersOf(branchSnap).filter(
        (m) => !isMemberEntryFor(m, current.userId as string)
      );
      tx.update(branchRef, { members: filtered });
    }
  });
}
