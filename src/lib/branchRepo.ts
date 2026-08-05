import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Branch } from "@/types";

export const BRANCHES = "branches";
export const SHOPS = "shops";

/** Firestore Timestamp, JS Date, or ISO string. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

/**
 * Branch documents predate the current schema in a few shops, so the display
 * name lives under one of several keys.
 */
export function mapBranch(id: string, data: Record<string, unknown>): Branch {
  const name =
    (data.name as string) ||
    (data.branchName as string) ||
    (data.branch_name as string) ||
    (data.title as string) ||
    "";

  return {
    id,
    name,
    location: (data.location as string) || (data.address as string) || "",
    phone: (data.phone as string) || "",
    email: (data.email as string) || "",
    status: (data.status as Branch["status"]) || "active",
    shopId: (data.shopId as string) || "",
    managerId: data.managerId as string | undefined,
    managerName: data.managerName as string | undefined,
    managerEmail: data.managerEmail as string | undefined,
    managerPhone: data.managerPhone as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * Every branch of a shop, newest first.
 * Merges top-level `branches` with legacy `shops/{shopId}/branches`.
 */
export async function listBranches(shopId: string): Promise<Branch[]> {
  const flatSnapshot = await adminDb
    .collection(BRANCHES)
    .where("shopId", "==", shopId)
    .get();

  const branchList = flatSnapshot.docs.map((docSnap) =>
    mapBranch(docSnap.id, docSnap.data() as Record<string, unknown>)
  );

  try {
    const nestedSnapshot = await adminDb
      .collection(SHOPS)
      .doc(shopId)
      .collection(BRANCHES)
      .get();

    const seen = new Set(branchList.map((branch) => branch.id));
    nestedSnapshot.docs.forEach((docSnap) => {
      if (seen.has(docSnap.id)) return;
      branchList.push(
        mapBranch(docSnap.id, {
          ...(docSnap.data() as Record<string, unknown>),
          shopId,
        })
      );
    });
  } catch {
    // Nested path may be missing or unreadable; flat list is enough.
  }

  return branchList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getBranch(id: string): Promise<Branch | null> {
  const docSnap = await adminDb.collection(BRANCHES).doc(id).get();
  if (!docSnap.exists) return null;
  return mapBranch(docSnap.id, docSnap.data() as Record<string, unknown>);
}

export async function updateBranch(
  id: string,
  shopId: string,
  updates: Partial<Pick<Branch, "name" | "location" | "phone" | "email" | "status" | "managerName" | "managerPhone" | "managerEmail">>
): Promise<Branch> {
  const ref = adminDb.collection(BRANCHES).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Branch not found");
  }

  const data = existing.data() as Record<string, unknown>;
  if (data.shopId !== shopId) {
    throw new ApiError(403, "Not permitted to modify this branch");
  }

  const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      cleanUpdates[key] = value;
    }
  }

  await ref.update(cleanUpdates);
  const updated = await ref.get();
  return mapBranch(updated.id, updated.data() as Record<string, unknown>);
}

export async function deleteBranch(id: string, shopId: string): Promise<void> {
  const ref = adminDb.collection(BRANCHES).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Branch not found");
  }

  const data = existing.data() as Record<string, unknown>;
  if (data.shopId !== shopId) {
    throw new ApiError(403, "Not permitted to delete this branch");
  }

  await ref.delete();
}
