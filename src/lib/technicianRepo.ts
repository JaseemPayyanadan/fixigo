import { adminDb } from "@/lib/firebaseAdmin";
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
