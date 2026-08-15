import { ApiError } from "@/lib/apiAuth";
import type { AuthUser } from "@/lib/auth";
import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import { mapServiceDoc } from "@/lib/serviceMapper";
import { getTechnicianByUserId } from "@/lib/technicianRepo";
import type { Service, StatusHistoryEntry } from "@/types";

export const SERVICES = "services";

export type ServiceRecord = Service & {
  created_by?: { id?: string; uid?: string; role?: string; name?: string };
};

export async function listServices(scope: {
  shopId: string;
  branchId?: string;
}): Promise<ServiceRecord[]> {
  let query = adminDb.collection(SERVICES).where("shopId", "==", scope.shopId) as FirebaseFirestore.Query;

  if (scope.branchId) {
    query = query.where("branchId", "==", scope.branchId);
  }

  const snapshot = await query.get();
  const services = snapshot.docs.map((docSnap) => mapServiceRecord(docSnap.id, docSnap.data() as Record<string, unknown>));

  return services.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function mapServiceRecord(id: string, data: Record<string, unknown>): ServiceRecord {
  const mapped = mapServiceDoc(id, data);
  const createdBy = data.created_by;
  return {
    ...mapped,
    created_by:
      createdBy && typeof createdBy === "object"
        ? (createdBy as ServiceRecord["created_by"])
        : undefined,
  };
}

export async function getService(id: string): Promise<ServiceRecord | null> {
  const docSnap = await adminDb.collection(SERVICES).doc(id).get();
  if (!docSnap.exists) return null;
  return mapServiceRecord(docSnap.id, docSnap.data() as Record<string, unknown>);
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

export async function assertCanAccessService(
  user: AuthUser,
  service: ServiceRecord
): Promise<void> {
  if (!user.shopId || service.shopId !== user.shopId) {
    throw new ApiError(403, "Not permitted to access this service");
  }

  if (user.role === "shop_admin") return;

  if (user.role === "branch_admin") {
    if (user.branchId && service.branchId === user.branchId) return;
    throw new ApiError(403, "Not permitted to access this service");
  }

  if (user.role === "technician") {
    const technician = await getTechnicianByUserId(user.id);
    if (isVisibleToTechnician(service, user, technician?.id ?? null)) return;
    throw new ApiError(403, "Not permitted to access this service");
  }

  throw new ApiError(403, "Not permitted to access this service");
}

export type ServiceUpdateInput = {
  fields?: Record<string, unknown>;
  /** Append one status-history entry with arrayUnion (concurrent-safe). */
  statusHistoryAppend?: StatusHistoryEntry;
  /** Field names to clear with FieldValue.delete(). */
  deleteFields?: string[];
};

export async function updateService(
  id: string,
  shopId: string,
  input: ServiceUpdateInput
): Promise<ServiceRecord> {
  const ref = adminDb.collection(SERVICES).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Service not found");
  }

  const data = existing.data() as Record<string, unknown>;
  if (data.shopId !== shopId) {
    throw new ApiError(403, "Not permitted to modify this service");
  }

  const payload: Record<string, unknown> = {
    ...(input.fields ?? {}),
    updatedAt: new Date(),
  };

  if (input.statusHistoryAppend) {
    payload.statusHistory = FieldValue.arrayUnion(input.statusHistoryAppend);
  }

  for (const field of input.deleteFields ?? []) {
    payload[field] = FieldValue.delete();
  }

  await ref.update(payload);
  const updated = await ref.get();
  return mapServiceRecord(updated.id, updated.data() as Record<string, unknown>);
}

export async function deleteService(id: string, shopId: string): Promise<void> {
  const ref = adminDb.collection(SERVICES).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new ApiError(404, "Service not found");
  }

  const data = existing.data() as Record<string, unknown>;
  if (data.shopId !== shopId) {
    throw new ApiError(403, "Not permitted to delete this service");
  }

  await ref.delete();
}

export async function setServicePaymentAdmin(
  id: string,
  shopId: string,
  input: {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount?: number;
  },
  now: Date = new Date()
): Promise<{
  paymentStatus: "pending" | "partial" | "paid";
  paidAt?: Date;
  paidAmount?: number;
}> {
  const { paymentStatus } = input;
  const fields: Record<string, unknown> = { paymentStatus };
  const deleteFields: string[] = [];

  if (paymentStatus === "paid") {
    fields.paidAt = now;
    if (typeof input.paidAmount === "number") {
      fields.paidAmount = input.paidAmount;
    }
  } else if (paymentStatus === "partial") {
    fields.paidAt = now;
    fields.paidAmount = input.paidAmount ?? 0;
  } else {
    deleteFields.push("paidAt", "paidAmount");
  }

  await updateService(id, shopId, { fields, deleteFields });

  if (paymentStatus === "paid") {
    return {
      paymentStatus: "paid",
      paidAt: now,
      paidAmount: typeof input.paidAmount === "number" ? input.paidAmount : undefined,
    };
  }
  if (paymentStatus === "partial") {
    return {
      paymentStatus: "partial",
      paidAt: now,
      paidAmount: input.paidAmount ?? 0,
    };
  }
  return { paymentStatus: "pending" };
}


export async function createService(
  input: {
    shopId: string;
    branchId: string;
    name: string;
    description?: string;
    price: number;
    technician_id?: string;
    priority?: string;
    customer?: Record<string, unknown>;
    device?: Record<string, unknown>;
    created_by?: Record<string, unknown>;
    status?: string;
  }
): Promise<ServiceRecord> {
  const now = new Date();
  const ref = await adminDb.collection(SERVICES).add({
    name: input.name,
    description: input.description || "",
    price: input.price,
    shopId: input.shopId,
    branchId: input.branchId,
    technician_id: input.technician_id || "",
    priority: input.priority || "medium",
    customer: input.customer || {},
    device: input.device || {},
    created_by: input.created_by || {},
    status: input.status || "awaiting_drop_off",
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return mapServiceRecord(created.id, created.data() as Record<string, unknown>);
}
