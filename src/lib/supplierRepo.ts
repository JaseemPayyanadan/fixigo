// src/lib/supplierRepo.ts
import type { DocumentReference, Query, Transaction } from "firebase-admin/firestore";

import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import type {
  CreateSupplierInput,
  RecordPaymentInput,
  UpdateSupplierInput,
} from "@/lib/purchaseValidation";
import { roundMoney } from "@/lib/purchaseTotals";
import type { Supplier, SupplierPayment } from "@/types/purchase";

export const SUPPLIERS = "suppliers";
export const SUPPLIER_PAYMENTS = "supplierPayments";

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
    branchId: (data.branchId as string) || "",
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

/** Omitting `branchId` returns every branch's suppliers — shop_admin's combined view. */
export async function listSuppliers(shopId: string, branchId?: string): Promise<Supplier[]> {
  let query: Query = adminDb.collection(SUPPLIERS).where("shopId", "==", shopId);
  if (branchId) query = query.where("branchId", "==", branchId);

  const snap = await query.get();
  return snap.docs
    .map((doc) => mapSupplier(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active supplier count for summary cards — avoids loading full supplier docs. */
export async function countActiveSuppliers(shopId: string, branchId?: string): Promise<number> {
  let query: Query = adminDb
    .collection(SUPPLIERS)
    .where("shopId", "==", shopId)
    .where("status", "==", "active");
  if (branchId) query = query.where("branchId", "==", branchId);

  const snap = await query.count().get();
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
  input: CreateSupplierInput & { shopId: string; branchId: string; createdBy: string }
): Promise<Supplier> {
  const now = new Date();
  const ref = adminDb.collection(SUPPLIERS).doc();

  const data: Record<string, unknown> = {
    shopId: input.shopId,
    branchId: input.branchId,
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

  await ref.delete();
  return mapSupplier(id, { ...current, status: "inactive" });
}

function mapSupplierPayment(id: string, data: Record<string, unknown>): SupplierPayment {
  return {
    id,
    amount: (data.amount as number) || 0,
    method: (data.method as SupplierPayment["method"]) || "cash",
    paidAt: toDate(data.paidAt),
    reference: (data.reference as string) || undefined,
    notes: (data.notes as string) || undefined,
    recordedBy: (data.recordedBy as string) || "",
    createdAt: toDate(data.createdAt),
  };
}

/** Newest first, for the supplier profile's payment history. */
export async function listSupplierPayments(
  shopId: string,
  supplierId: string
): Promise<SupplierPayment[]> {
  const snap = await adminDb
    .collection(SUPPLIER_PAYMENTS)
    .where("shopId", "==", shopId)
    .where("supplierId", "==", supplierId)
    .get();

  return snap.docs
    .map((doc) => mapSupplierPayment(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
}

/**
 * Records a payment against the supplier's running balance directly, not
 * against any one bill — a running-account adjustment. Moves the payment
 * record and the supplier's totals together in one transaction, the same
 * pairing purchaseRepo.recordPurchasePayment uses for bill-level payments.
 */
export async function recordSupplierPayment(
  shopId: string,
  supplierId: string,
  input: RecordPaymentInput,
  recordedBy: string
): Promise<{ supplier: Supplier; payment: SupplierPayment }> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(supplierId);
  const paymentRef = adminDb.collection(SUPPLIER_PAYMENTS).doc();
  const now = new Date();

  const result = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, shopId, supplierId);

    const outstanding = (supplier.outstanding as number) || 0;
    if (input.amount > outstanding) {
      throw new ApiError(400, "Payment cannot exceed the outstanding balance");
    }

    const paymentData: Record<string, unknown> = {
      shopId,
      branchId: supplier.branchId ?? null,
      supplierId,
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      recordedBy,
      createdAt: now,
    };

    const supplierUpdates = {
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + input.amount),
      outstanding: roundMoney(outstanding - input.amount),
      updatedAt: now,
    };

    tx.set(paymentRef, paymentData);
    tx.update(supplierRef, supplierUpdates);

    return {
      supplier: mapSupplier(supplierId, { ...supplier, ...supplierUpdates }),
      payment: mapSupplierPayment(paymentRef.id, paymentData),
    };
  });

  return result;
}

/** Loads a supplier payment inside a transaction and enforces shop + supplier ownership. */
async function loadSupplierPaymentForWrite(
  tx: Transaction,
  paymentRef: DocumentReference,
  shopId: string,
  supplierId: string
): Promise<Record<string, unknown>> {
  const snap = await tx.get(paymentRef);
  if (!snap.exists) {
    throw new ApiError(404, "Payment not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.shopId !== shopId || data.supplierId !== supplierId) {
    throw new ApiError(403, "Payment does not belong to this supplier");
  }
  return data;
}

/**
 * Edits amount/method/date/reference/notes on a previously recorded
 * supplier-level payment, re-deriving totalPaid/outstanding from the
 * difference between the old and new amount.
 */
export async function updateSupplierPayment(
  shopId: string,
  supplierId: string,
  paymentId: string,
  input: RecordPaymentInput
): Promise<{ supplier: Supplier; payment: SupplierPayment }> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(supplierId);
  const paymentRef = adminDb.collection(SUPPLIER_PAYMENTS).doc(paymentId);
  const now = new Date();

  const result = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, shopId, supplierId);

    const payment = await loadSupplierPaymentForWrite(tx, paymentRef, shopId, supplierId);

    const oldAmount = (payment.amount as number) || 0;
    const outstanding = (supplier.outstanding as number) || 0;
    const delta = input.amount - oldAmount;
    if (delta > outstanding) {
      throw new ApiError(400, "Payment cannot exceed the outstanding balance");
    }

    const paymentUpdates: Record<string, unknown> = {
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    };

    const supplierUpdates = {
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) - oldAmount + input.amount),
      outstanding: roundMoney(outstanding - delta),
      updatedAt: now,
    };

    tx.update(paymentRef, paymentUpdates);
    tx.update(supplierRef, supplierUpdates);

    return {
      supplier: mapSupplier(supplierId, { ...supplier, ...supplierUpdates }),
      payment: mapSupplierPayment(paymentId, { ...payment, ...paymentUpdates }),
    };
  });

  return result;
}

/** Deletes a supplier-level payment and reverses its effect on totalPaid/outstanding. */
export async function deleteSupplierPayment(
  shopId: string,
  supplierId: string,
  paymentId: string
): Promise<Supplier> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(supplierId);
  const paymentRef = adminDb.collection(SUPPLIER_PAYMENTS).doc(paymentId);
  const now = new Date();

  const supplier = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplierData = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplierData, shopId, supplierId);

    const payment = await loadSupplierPaymentForWrite(tx, paymentRef, shopId, supplierId);
    const amount = (payment.amount as number) || 0;

    const supplierUpdates = {
      totalPaid: roundMoney(((supplierData.totalPaid as number) || 0) - amount),
      outstanding: roundMoney(((supplierData.outstanding as number) || 0) + amount),
      updatedAt: now,
    };

    tx.delete(paymentRef);
    tx.update(supplierRef, supplierUpdates);

    return mapSupplier(supplierId, { ...supplierData, ...supplierUpdates });
  });

  return supplier;
}

