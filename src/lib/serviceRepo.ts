import { adminDb } from "@/lib/firebaseAdmin";
import { mapServiceDoc } from "@/lib/serviceMapper";
import type { Service } from "@/types";

export const SERVICES = "services";

export type ServiceRecord = Service & {
  created_by?: { id?: string; uid?: string };
};

export async function listServices(scope: {
  shopId: string;
  branchId?: string;
}): Promise<ServiceRecord[]> {
  let query = adminDb.collection(SERVICES).where("shopId", "==", scope.shopId) as FirebaseFirestore.Query;

  if (scope.branchId) {
    query = query.where("branchId", "==", scope.branchId);
  }

  // Sort in memory — avoids composite-index failures when branchId is also filtered.
  const snapshot = await query.get();
  const services = snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const mapped = mapServiceDoc(docSnap.id, data);
    const createdBy = data.created_by;
    return {
      ...mapped,
      created_by:
        createdBy && typeof createdBy === "object"
          ? (createdBy as { id?: string; uid?: string })
          : undefined,
    };
  });

  return services.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function isVisibleToTechnician(
  service: ServiceRecord,
  user: { id: string; uid?: string; branchId?: string },
  technicianDocId: string | null
): boolean {
  if (user.branchId && service.branchId !== user.branchId) {
    return false;
  }

  const assigned =
    (technicianDocId !== null && service.technician_id === technicianDocId) ||
    service.technician_id === user.id ||
    (user.uid !== undefined && service.technician_id === user.uid);

  const createdBy = service.created_by;
  const created =
    createdBy?.id === user.id ||
    createdBy?.uid === user.id ||
    (user.uid !== undefined &&
      (createdBy?.id === user.uid || createdBy?.uid === user.uid));

  return Boolean(assigned || created);
}
