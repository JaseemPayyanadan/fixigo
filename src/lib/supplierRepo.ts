// src/lib/supplierRepo.ts
import { randomUUID } from "node:crypto";

import type { DocumentReference, Query, Transaction } from "firebase-admin/firestore";

import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { summarizePurchaseMoney } from "@/lib/purchasePayments";
// PURCHASES/listPurchases pull supplierRepo.ts and purchaseRepo.ts into a
// cycle — safe here because both sides only touch these bindings inside
// function bodies, never at module-init time.
import { PURCHASES, listPurchases } from "@/lib/purchaseRepo";
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

interface AllocationLine {
  purchaseId: string;
  paymentId: string;
  amount: number;
}

interface AllocationPlanEntry {
  ref: DocumentReference;
  data: Record<string, unknown>;
  applied: number;
}

interface ReversalPlanEntry {
  ref: DocumentReference;
  data: Record<string, unknown>;
  paymentIds: Set<string>;
}

/**
 * Which of the supplier's own bills a lump-sum payment should be applied to,
 * oldest-due-first (falling back to purchase date when a bill has no due
 * date). Read outside the transaction that will actually apply it — the
 * transaction re-reads each candidate for its authoritative balance, so a
 * stale ordering here only costs allocation order, never correctness.
 */
async function outstandingPurchaseCandidateIds(
  shopId: string,
  supplierId: string
): Promise<string[]> {
  const purchases = await listPurchases({ shopId, supplierId, light: true });
  return purchases
    .filter((purchase) => purchase.status === "active" && purchase.balance > 0)
    .sort((a, b) => {
      const aKey = (a.dueDate ?? a.purchaseDate).getTime();
      const bKey = (b.dueDate ?? b.purchaseDate).getTime();
      return aKey !== bKey ? aKey - bKey : a.purchaseDate.getTime() - b.purchaseDate.getTime();
    })
    .map((purchase) => purchase.id);
}

/**
 * Reads candidates in order and decides how much of `amount` each can
 * absorb, WITHOUT writing anything yet. Firestore transactions require every
 * read to happen before any write, so this is a separate pass from
 * `commitAllocationPlan` below — stops reading once the amount is covered.
 */
async function planAllocation(
  tx: Transaction,
  candidateIds: string[],
  amount: number
): Promise<AllocationPlanEntry[]> {
  let remaining = amount;
  const plan: AllocationPlanEntry[] = [];

  for (const id of candidateIds) {
    if (remaining <= 0) break;
    const ref = adminDb.collection(PURCHASES).doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) continue;
    const data = snap.data() as Record<string, unknown>;
    if (data.status === "cancelled") continue;

    const payments = Array.isArray(data.payments) ? (data.payments as Record<string, unknown>[]) : [];
    const returns = Array.isArray(data.returns) ? (data.returns as Record<string, unknown>[]) : [];
    const refunds = Array.isArray(data.refunds) ? (data.refunds as Record<string, unknown>[]) : [];
    const { balance } = summarizePurchaseMoney(
      (data.grandTotal as number) || 0,
      payments as Array<{ amount: number }>,
      returns as Array<{ totalAmount: number }>,
      refunds as Array<{ amount: number }>
    );
    if (balance <= 0) continue;

    const applied = roundMoney(Math.min(remaining, balance));
    if (applied <= 0) continue;

    plan.push({ ref, data, applied });
    remaining = roundMoney(remaining - applied);
  }

  return plan;
}

/** Writes a payment line into each planned bill and returns what was applied, for later reversal. */
function commitAllocationPlan(
  tx: Transaction,
  plan: AllocationPlanEntry[],
  meta: { method: SupplierPayment["method"]; paidAt: Date; recordedBy: string },
  now: Date
): AllocationLine[] {
  const lines: AllocationLine[] = [];

  for (const { ref, data, applied } of plan) {
    const payments = Array.isArray(data.payments) ? (data.payments as Record<string, unknown>[]) : [];
    const returns = Array.isArray(data.returns) ? (data.returns as Record<string, unknown>[]) : [];
    const refunds = Array.isArray(data.refunds) ? (data.refunds as Record<string, unknown>[]) : [];
    const grandTotal = (data.grandTotal as number) || 0;

    const paymentId = randomUUID();
    const newPayments = [
      ...payments,
      {
        id: paymentId,
        amount: applied,
        method: meta.method,
        paidAt: meta.paidAt,
        reference: null,
        notes: "Applied from a supplier-level payment",
        recordedBy: meta.recordedBy,
        createdAt: now,
      },
    ];
    const after = summarizePurchaseMoney(
      grandTotal,
      newPayments as Array<{ amount: number }>,
      returns as Array<{ totalAmount: number }>,
      refunds as Array<{ amount: number }>
    );

    tx.update(ref, {
      payments: newPayments,
      paidAmount: after.paidAmount,
      balance: after.balance,
      refundDue: after.refundDue,
      paymentStatus: after.paymentStatus,
      updatedAt: now,
    });

    lines.push({ purchaseId: ref.id, paymentId, amount: applied });
  }

  return lines;
}

/** Reads every bill touched by `lines`, before any write — the reversal counterpart of `planAllocation`. */
async function planReversal(
  tx: Transaction,
  lines: AllocationLine[]
): Promise<ReversalPlanEntry[]> {
  const byPurchase = new Map<string, Set<string>>();
  for (const line of lines) {
    const set = byPurchase.get(line.purchaseId) ?? new Set<string>();
    set.add(line.paymentId);
    byPurchase.set(line.purchaseId, set);
  }

  const plan: ReversalPlanEntry[] = [];
  for (const [purchaseId, paymentIds] of byPurchase) {
    const ref = adminDb.collection(PURCHASES).doc(purchaseId);
    const snap = await tx.get(ref);
    if (!snap.exists) continue;
    plan.push({ ref, data: snap.data() as Record<string, unknown>, paymentIds });
  }
  return plan;
}

/** Removes the allocated payment lines from each bill in the plan. */
function commitReversalPlan(tx: Transaction, plan: ReversalPlanEntry[], now: Date): void {
  for (const { ref, data, paymentIds } of plan) {
    const payments = Array.isArray(data.payments) ? (data.payments as Record<string, unknown>[]) : [];
    const returns = Array.isArray(data.returns) ? (data.returns as Record<string, unknown>[]) : [];
    const refunds = Array.isArray(data.refunds) ? (data.refunds as Record<string, unknown>[]) : [];
    const grandTotal = (data.grandTotal as number) || 0;

    const newPayments = payments.filter((payment) => !paymentIds.has(payment.id as string));
    const after = summarizePurchaseMoney(
      grandTotal,
      newPayments as Array<{ amount: number }>,
      returns as Array<{ totalAmount: number }>,
      refunds as Array<{ amount: number }>
    );

    tx.update(ref, {
      payments: newPayments,
      paidAmount: after.paidAmount,
      balance: after.balance,
      refundDue: after.refundDue,
      paymentStatus: after.paymentStatus,
      updatedAt: now,
    });
  }
}

/**
 * Records a payment against the supplier's running balance AND applies it
 * across that supplier's own outstanding bills (oldest-due-first) in the
 * same transaction, so a bill's own balance never disagrees with the
 * supplier-level outstanding figure shown next to it. If the supplier
 * carries more outstanding than its bills can currently absorb (shouldn't
 * happen — see the invariant note on cancelPurchase — but isn't re-derived
 * here), any leftover simply isn't applied to a specific bill, same as
 * before this function allocated at all.
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
  const candidateIds = await outstandingPurchaseCandidateIds(shopId, supplierId);

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

    const plan = await planAllocation(tx, candidateIds, input.amount);
    const allocations = commitAllocationPlan(
      tx,
      plan,
      { method: input.method, paidAt: input.paidAt, recordedBy },
      now
    );

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
      allocations,
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
 * difference between the old and new amount, and re-allocating the new
 * amount across the supplier's bills the same way recordSupplierPayment does.
 *
 * Split into two transactions — reverse, then reallocate — rather than one,
 * because reallocating needs a fresh "which bills are still outstanding"
 * query that can only see the reversal once it's committed (a transaction
 * can't query its own uncommitted writes). The amount-vs-outstanding check
 * runs up front against a plain read so a rejected edit never reaches the
 * reversal step in the first place; a true concurrent race between that
 * check and the reversal committing is not guarded against, which is an
 * accepted gap for this low-concurrency, single-admin workflow.
 */
export async function updateSupplierPayment(
  shopId: string,
  supplierId: string,
  paymentId: string,
  input: RecordPaymentInput
): Promise<{ supplier: Supplier; payment: SupplierPayment }> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(supplierId);
  const paymentRef = adminDb.collection(SUPPLIER_PAYMENTS).doc(paymentId);

  const preSupplierSnap = await supplierRef.get();
  if (!preSupplierSnap.exists) {
    throw new ApiError(404, "Supplier not found");
  }
  const preSupplier = preSupplierSnap.data() as Record<string, unknown>;
  assertSupplierInShop(preSupplier, shopId, supplierId);

  const prePaymentSnap = await paymentRef.get();
  if (!prePaymentSnap.exists) {
    throw new ApiError(404, "Payment not found");
  }
  const prePayment = prePaymentSnap.data() as Record<string, unknown>;
  if (prePayment.shopId !== shopId || prePayment.supplierId !== supplierId) {
    throw new ApiError(403, "Payment does not belong to this supplier");
  }
  const oldAmount = (prePayment.amount as number) || 0;
  if (input.amount - oldAmount > ((preSupplier.outstanding as number) || 0)) {
    throw new ApiError(400, "Payment cannot exceed the outstanding balance");
  }

  const oldAllocations = Array.isArray(prePayment.allocations)
    ? (prePayment.allocations as AllocationLine[])
    : [];
  if (oldAllocations.length > 0) {
    await adminDb.runTransaction(async (tx) => {
      const plan = await planReversal(tx, oldAllocations);
      commitReversalPlan(tx, plan, new Date());
    });
  }

  const candidateIds = await outstandingPurchaseCandidateIds(shopId, supplierId);
  const now = new Date();

  const result = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, shopId, supplierId);

    const payment = await loadSupplierPaymentForWrite(tx, paymentRef, shopId, supplierId);

    const outstanding = (supplier.outstanding as number) || 0;
    const delta = input.amount - oldAmount;
    if (delta > outstanding) {
      throw new ApiError(400, "Payment cannot exceed the outstanding balance");
    }

    const plan = await planAllocation(tx, candidateIds, input.amount);
    const allocations = commitAllocationPlan(
      tx,
      plan,
      { method: input.method, paidAt: input.paidAt, recordedBy: (payment.recordedBy as string) || "" },
      now
    );

    const paymentUpdates: Record<string, unknown> = {
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      allocations,
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

/**
 * Deletes a supplier-level payment, reverses its effect on totalPaid/
 * outstanding, and un-applies it from whichever bills it was allocated to.
 */
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
    const allocations = Array.isArray(payment.allocations)
      ? (payment.allocations as AllocationLine[])
      : [];

    const reversalPlan = await planReversal(tx, allocations);

    const supplierUpdates = {
      totalPaid: roundMoney(((supplierData.totalPaid as number) || 0) - amount),
      outstanding: roundMoney(((supplierData.outstanding as number) || 0) + amount),
      updatedAt: now,
    };

    commitReversalPlan(tx, reversalPlan, now);
    tx.delete(paymentRef);
    tx.update(supplierRef, supplierUpdates);

    return mapSupplier(supplierId, { ...supplierData, ...supplierUpdates });
  });

  return supplier;
}

