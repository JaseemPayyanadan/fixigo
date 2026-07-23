import { hashPassword } from "@/lib/auth";
import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import type { CreateTechnicianInput, UpdateTechnicianInput } from "@/lib/technicianValidation";
import type { Technician } from "@/types";

export const TECHNICIANS = "technicians";
export const USERS = "users";
export const BRANCHES = "branches"; // top-level, NOT shops/{id}/branches

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
      throw new Error(`Branch ${input.branchId} does not exist`);
    }

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
      experience: 0,
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

export async function updateTechnician(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  const technicianRef = adminDb.collection(TECHNICIANS).doc(id);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new Error("Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const nextBranchId = input.branchId ?? current.branchId;

    tx.update(technicianRef, { ...input, updatedAt: new Date() });

    // Keep the linked login account in sync — spec defect 3.
    if (current.userId) {
      const userRef = adminDb.collection(USERS).doc(current.userId);
      const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) userUpdate.name = input.name;
      if (input.email !== undefined) userUpdate.email = input.email;
      if (input.phone !== undefined) userUpdate.phone = input.phone;
      if (input.branchId !== undefined) userUpdate.branchId = input.branchId;
      if (input.status !== undefined) {
        userUpdate.status = input.status === "inactive" ? "suspended" : "active";
      }
      tx.update(userRef, userUpdate);

      const memberEntry = {
        userId: current.userId,
        role: "technician",
        name: current.name,
      };

      if (input.branchId !== undefined && input.branchId !== current.branchId) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove(memberEntry),
        });
        tx.update(adminDb.collection(BRANCHES).doc(nextBranchId), {
          members: FieldValue.arrayUnion({
            ...memberEntry,
            name: input.name ?? current.name,
          }),
        });
      } else if (input.name !== undefined && input.name !== current.name) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove(memberEntry),
        });
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayUnion({ ...memberEntry, name: input.name }),
        });
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
    const snap = await tx.get(technicianRef);
    if (!snap.exists) throw new Error("Technician not found");

    const current = mapTechnician(snap.id, snap.data() as Record<string, unknown>);
    const now = new Date();

    tx.update(technicianRef, { status: "inactive", updatedAt: now });

    if (current.userId) {
      tx.update(adminDb.collection(USERS).doc(current.userId), {
        status: "suspended",
        updatedAt: now,
      });

      if (current.branchId) {
        tx.update(adminDb.collection(BRANCHES).doc(current.branchId), {
          members: FieldValue.arrayRemove({
            userId: current.userId,
            role: "technician",
            name: current.name,
          }),
        });
      }
    }
  });
}
