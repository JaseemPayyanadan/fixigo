// src/lib/supplierRepo.ts
import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/lib/purchaseValidation";
import type { Supplier } from "@/types/purchase";

export const SUPPLIERS = "suppliers";

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null) return undefined;
  return toDate(value);
}

/**
 * `adminDb` bypasses firestore.rules, so this is the only thing standing
 * between a caller and another shop's supplier. Fails closed on a document
 * with no `shopId`: ownership that cannot be established is not ours.
 */
export function assertSupplierInShop(
  data: Record<string, unknown> | undefined,
  shopId: string,
  supplierId: string
): void {
  if (!data?.shopId || data.shopId !== shopId) {
    throw new ApiError(403, `Supplier ${supplierId} does not belong to this shop`);
  }
}

/** The single Firestore -> Supplier mapper for the whole codebase. */
export function mapSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    shopId: (data.shopId as string) || "",
    name: (data.name as string) || "",
    contactPerson: (data.contactPerson as string) || "",
    phone: (data.phone as string) || "",
    email: (data.email as string) || undefined,
    gstNumber: (data.gstNumber as string) || undefined,
    address: (data.address as string) || undefined,
    status: (data.status as Supplier["status"]) || "active",
    totalPurchased: (data.totalPurchased as number) || 0,
    totalPaid: (data.totalPaid as number) || 0,
    outstanding: (data.outstanding as number) || 0,
    lastPurchaseAt: toOptionalDate(data.lastPurchaseAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: (data.createdBy as string) || "",
  };
}

export async function listSuppliers(shopId: string): Promise<Supplier[]> {
  const snap = await adminDb.collection(SUPPLIERS).where("shopId", "==", shopId).get();
  return snap.docs
    .map((doc) => mapSupplier(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active supplier count for summary cards — avoids loading full supplier docs. */
export async function countActiveSuppliers(shopId: string): Promise<number> {
  const snap = await adminDb
    .collection(SUPPLIERS)
    .where("shopId", "==", shopId)
    .where("status", "==", "active")
    .count()
    .get();
  return snap.data().count;
}

export async function getSupplier(shopId: string, id: string): Promise<Supplier> {
  const snap = await adminDb.collection(SUPPLIERS).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const data = snap.data() as Record<string, unknown>;
  assertSupplierInShop(data, shopId, id);
  return mapSupplier(id, data);
}

export async function createSupplier(
  input: CreateSupplierInput & { shopId: string; createdBy: string }
): Promise<Supplier> {
  const now = new Date();
  const ref = adminDb.collection(SUPPLIERS).doc();

  const data: Record<string, unknown> = {
    shopId: input.shopId,
    name: input.name,
    contactPerson: input.contactPerson,
    phone: input.phone,
    email: input.email ?? null,
    gstNumber: input.gstNumber ?? null,
    address: input.address ?? null,
    status: input.status,
    // Running totals always start at zero and are moved only by purchaseRepo
    // from here on — `outstanding` is the one exception, seeded once at
    // creation from a supplier's pre-existing balance.
    totalPurchased: 0,
    totalPaid: 0,
    outstanding: input.openingBalance ?? 0,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };

  await ref.set(data);
  return mapSupplier(ref.id, data);
}

/**
 * Editable profile fields only. `totalPurchased`, `totalPaid`, `outstanding`
 * and `lastPurchaseAt` are intentionally unreachable here — they are derived
 * from purchases, and letting an update body set them would let the UI
 * fabricate a balance.
 */
export async function updateSupplier(
  shopId: string,
  id: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const ref = adminDb.collection(SUPPLIERS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const current = snap.data() as Record<string, unknown>;
  assertSupplierInShop(current, shopId, id);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const editable = [
    "name",
    "contactPerson",
    "phone",
    "email",
    "gstNumber",
    "address",
    "status",
  ] as const;

  for (const field of editable) {
    const value = input[field];
    if (value !== undefined) updates[field] = value;
  }

  await ref.update(updates);
  return mapSupplier(id, { ...current, ...updates });
}

/**
 * Soft-delete: marks the supplier inactive so purchase history stays intact.
 * Inactive suppliers stay visible on the suppliers list but drop out of
 * "active" counts and should not be offered on new purchase forms.
 */
export async function deleteSupplier(shopId: string, id: string): Promise<Supplier> {
  const ref = adminDb.collection(SUPPLIERS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const current = snap.data() as Record<string, unknown>;
  assertSupplierInShop(current, shopId, id);

  if (current.status === "inactive") {
    throw new ApiError(409, "Supplier is already inactive");
  }

  const updates = { status: "inactive", updatedAt: new Date() };
  await ref.update(updates);
  return mapSupplier(id, { ...current, ...updates });
}

