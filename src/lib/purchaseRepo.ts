// src/lib/purchaseRepo.ts
import { randomUUID } from "node:crypto";

import type { DocumentReference, Query, Transaction } from "firebase-admin/firestore";

import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { summarizePurchaseMoney } from "@/lib/purchasePayments";
import { formatPurchaseRef, nextRefCounter, type RefCounters } from "@/lib/purchaseRef";
import { computeTotals, lineTotalOf, roundMoney } from "@/lib/purchaseTotals";
import type {
  CreatePurchaseInput,
  RecordPaymentInput,
} from "@/lib/purchaseValidation";
import {
  SUPPLIERS,
  assertSupplierInShop,
  toDate,
  toOptionalDate,
} from "@/lib/supplierRepo";
import type {
  Purchase,
  PurchaseItem,
  PurchasePayment,
  PurchaseRefund,
  PurchaseReturn,
  PurchaseReturnLine,
} from "@/types/purchase";

export const PURCHASES = "purchases";
/** Top-level rather than a subcollection — see the plan's deviation note. */
export const PURCHASE_COUNTERS = "purchaseCounters";

interface CreatePurchaseArgs extends CreatePurchaseInput {
  shopId: string;
  branchId: string;
  purchasedBy: { userId: string; name: string };
}

function mapItem(raw: Record<string, unknown>): PurchaseItem {
  return {
    id: (raw.id as string) || randomUUID(),
    name: (raw.name as string) || "",
    brand: (raw.brand as string) || undefined,
    model: (raw.model as string) || undefined,
    quantity: (raw.quantity as number) || 0,
    purchasePrice: (raw.purchasePrice as number) || 0,
    sellingPrice: raw.sellingPrice === null ? undefined : (raw.sellingPrice as number | undefined),
    warrantyMonths:
      raw.warrantyMonths === null ? undefined : (raw.warrantyMonths as number | undefined),
    remarks: (raw.remarks as string) || undefined,
    serviceId: (raw.serviceId as string) || undefined,
    serviceRef: (raw.serviceRef as string) || undefined,
    lineTotal: (raw.lineTotal as number) || 0,
    returnedQuantity: (raw.returnedQuantity as number) || 0,
  };
}

function mapPayment(raw: Record<string, unknown>): PurchasePayment {
  return {
    id: (raw.id as string) || randomUUID(),
    amount: (raw.amount as number) || 0,
    method: (raw.method as PurchasePayment["method"]) || "cash",
    paidAt: toDate(raw.paidAt),
    reference: (raw.reference as string) || undefined,
    notes: (raw.notes as string) || undefined,
    recordedBy: (raw.recordedBy as string) || "",
    createdAt: toDate(raw.createdAt),
  };
}

function mapReturnLine(raw: Record<string, unknown>): PurchaseReturnLine {
  return {
    itemId: (raw.itemId as string) || "",
    name: (raw.name as string) || "",
    quantity: (raw.quantity as number) || 0,
    unitPrice: (raw.unitPrice as number) || 0,
    lineTotal: (raw.lineTotal as number) || 0,
  };
}

function mapReturn(raw: Record<string, unknown>): PurchaseReturn {
  const items = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[]).map(mapReturnLine)
    : [];
  return {
    id: (raw.id as string) || randomUUID(),
    items,
    totalAmount: (raw.totalAmount as number) || 0,
    reason: (raw.reason as string) || "",
    returnedBy: (raw.returnedBy as PurchaseReturn["returnedBy"]) || { userId: "", name: "" },
    returnedAt: toDate(raw.returnedAt),
    createdAt: toDate(raw.createdAt),
  };
}

function mapRefund(raw: Record<string, unknown>): PurchaseRefund {
  return {
    id: (raw.id as string) || randomUUID(),
    amount: (raw.amount as number) || 0,
    method: (raw.method as PurchaseRefund["method"]) || "cash",
    receivedAt: toDate(raw.receivedAt),
    reference: (raw.reference as string) || undefined,
    notes: (raw.notes as string) || undefined,
    recordedBy: (raw.recordedBy as string) || "",
    createdAt: toDate(raw.createdAt),
  };
}

/** The single Firestore -> Purchase mapper for the whole codebase. */
export function mapPurchase(id: string, data: Record<string, unknown>): Purchase {
  const items = Array.isArray(data.items)
    ? (data.items as Record<string, unknown>[]).map(mapItem)
    : [];
  const payments = Array.isArray(data.payments)
    ? (data.payments as Record<string, unknown>[]).map(mapPayment)
    : [];
  const returns = Array.isArray(data.returns)
    ? (data.returns as Record<string, unknown>[]).map(mapReturn)
    : [];
  const refunds = Array.isArray(data.refunds)
    ? (data.refunds as Record<string, unknown>[]).map(mapRefund)
    : [];
  const discount = (data.discount as Record<string, unknown>) ?? {};

  return {
    id,
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    ref: (data.ref as string) || "",
    supplierInvoiceNo: (data.supplierInvoiceNo as string) || undefined,
    supplierId: (data.supplierId as string) || "",
    supplierName: (data.supplierName as string) || "",
    purchaseDate: toDate(data.purchaseDate),
    purchasedBy: (data.purchasedBy as Purchase["purchasedBy"]) || { userId: "", name: "" },
    items,
    subtotal: (data.subtotal as number) || 0,
    discount: {
      mode: (discount.mode as "amount" | "percent") || "amount",
      value: (discount.value as number) || 0,
      amount: (discount.amount as number) || 0,
    },
    gstRate: (data.gstRate as number) || 0,
    gstAmount: (data.gstAmount as number) || 0,
    transportCharge: (data.transportCharge as number) || 0,
    grandTotal: (data.grandTotal as number) || 0,
    payments,
    paidAmount: (data.paidAmount as number) || 0,
    balance: (data.balance as number) || 0,
    paymentStatus: (data.paymentStatus as Purchase["paymentStatus"]) || "unpaid",
    dueDate: toOptionalDate(data.dueDate),
    returns,
    returnedAmount: (data.returnedAmount as number) || 0,
    refunds,
    refundReceived: (data.refundReceived as number) || 0,
    refundDue: (data.refundDue as number) || 0,
    status: (data.status as Purchase["status"]) || "active",
    cancelReason: (data.cancelReason as string) || undefined,
    cancelledAt: toOptionalDate(data.cancelledAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * List/summary rows only — skips nested payments/items/returns so the purchases
 * index page stays fast as history grows.
 */
export function mapPurchaseListRow(id: string, data: Record<string, unknown>): Purchase {
  return {
    id,
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    ref: (data.ref as string) || "",
    supplierInvoiceNo: (data.supplierInvoiceNo as string) || undefined,
    supplierId: (data.supplierId as string) || "",
    supplierName: (data.supplierName as string) || "",
    purchaseDate: toDate(data.purchaseDate),
    purchasedBy: { userId: "", name: "" },
    items: [],
    subtotal: 0,
    discount: { mode: "amount", value: 0, amount: 0 },
    gstRate: 0,
    gstAmount: 0,
    transportCharge: 0,
    grandTotal: (data.grandTotal as number) || 0,
    payments: [],
    paidAmount: (data.paidAmount as number) || 0,
    balance: (data.balance as number) || 0,
    paymentStatus: (data.paymentStatus as Purchase["paymentStatus"]) || "unpaid",
    dueDate: toOptionalDate(data.dueDate),
    returns: [],
    returnedAmount: 0,
    refunds: [],
    refundReceived: 0,
    refundDue: 0,
    status: (data.status as Purchase["status"]) || "active",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Builds the persisted item rows, stamping each with its computed line total. */
function buildItems(input: CreatePurchaseInput): Record<string, unknown>[] {
  return input.items.map((item) => ({
    id: randomUUID(),
    name: item.name,
    brand: item.brand ?? null,
    model: item.model ?? null,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    sellingPrice: item.sellingPrice ?? null,
    warrantyMonths: item.warrantyMonths ?? null,
    remarks: item.remarks ?? null,
    serviceId: item.serviceId ?? null,
    serviceRef: item.serviceRef ?? null,
    lineTotal: lineTotalOf(item.quantity, item.purchasePrice),
    returnedQuantity: 0,
  }));
}

function buildPayment(input: RecordPaymentInput, recordedBy: string): Record<string, unknown> {
  return {
    id: randomUUID(),
    amount: input.amount,
    method: input.method,
    paidAt: input.paidAt,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    recordedBy,
    createdAt: new Date(),
  };
}

/**
 * Creates a purchase and moves the supplier's running totals in ONE
 * transaction. The counter, the purchase and the supplier must commit
 * together — a partial commit would either mint a duplicate reference or
 * leave the supplier's outstanding disagreeing with its bills.
 */
export async function createPurchase(input: CreatePurchaseArgs): Promise<Purchase> {
  const supplierRef = adminDb.collection(SUPPLIERS).doc(input.supplierId);
  const counterRef = adminDb.collection(PURCHASE_COUNTERS).doc(input.shopId);
  const purchaseRef = adminDb.collection(PURCHASES).doc();

  const totals = computeTotals({
    items: input.items,
    discount: input.discount,
    gstRate: input.gstRate,
    transportCharge: input.transportCharge,
  });

  // Defence in depth: the API layer validates this too, but this repository is
  // the only writer of supplier totals and must not trust its caller. Mirrors
  // the equivalent guard in recordPurchasePayment.
  if (input.initialPayment && input.initialPayment.amount > totals.grandTotal) {
    throw new ApiError(400, "Payment cannot exceed the grand total");
  }

  const payments = input.initialPayment
    ? [buildPayment(input.initialPayment, input.purchasedBy.userId)]
    : [];
  const summary = summarizePurchaseMoney(
    totals.grandTotal,
    payments as Array<{ amount: number }>,
    [],
    []
  );
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;
    assertSupplierInShop(supplier, input.shopId, input.supplierId);

    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists
      ? (counterSnap.data() as unknown as RefCounters)
      : undefined;
    // One sequence per year, so a backdated entry continues its own year's run
    // and never re-issues a reference already assigned in another year.
    const purchaseYear = input.purchaseDate.getFullYear();
    const { counters, seq } = nextRefCounter(current, purchaseYear);

    const purchase: Record<string, unknown> = {
      shopId: input.shopId,
      branchId: input.branchId,
      ref: formatPurchaseRef(purchaseYear, seq),
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      supplierId: input.supplierId,
      supplierName: (supplier.name as string) || "",
      purchaseDate: input.purchaseDate,
      purchasedBy: {
        userId: input.purchasedBy.userId,
        // Firestore rejects undefined; JWTs minted before name was signed may omit it.
        name: input.purchasedBy.name || "",
      },
      items: buildItems(input),
      subtotal: totals.subtotal,
      discount: { ...input.discount, amount: totals.discountAmount },
      gstRate: input.gstRate,
      gstAmount: totals.gstAmount,
      transportCharge: totals.transportCharge,
      grandTotal: totals.grandTotal,
      payments,
      paidAmount: summary.paidAmount,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      dueDate: input.dueDate ?? null,
      returns: [],
      returnedAmount: 0,
      refunds: [],
      refundReceived: 0,
      refundDue: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    tx.set(purchaseRef, purchase);
    // set, not update: the counter document does not exist on a shop's first purchase.
    tx.set(counterRef, counters);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) + totals.grandTotal),
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + summary.paidAmount),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) + summary.balance),
      lastPurchaseAt: input.purchaseDate,
      updatedAt: now,
    });

    return purchase;
  });

  return mapPurchase(purchaseRef.id, data);
}

/** Loads a purchase inside a transaction and enforces shop ownership. */
async function loadForWrite(
  tx: Transaction,
  ref: DocumentReference,
  shopId: string
): Promise<Record<string, unknown>> {
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new ApiError(404, "Purchase not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase does not belong to this shop");
  }
  return data;
}

export async function recordPurchasePayment(
  shopId: string,
  id: string,
  input: RecordPaymentInput,
  recordedBy: string
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    // Re-read inside the transaction: the balance may have moved since the
    // page rendered, and this guard is only sound against the current value.
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "Cannot record a payment against a cancelled purchase");
    }

    const existing = Array.isArray(purchase.payments)
      ? (purchase.payments as Record<string, unknown>[])
      : [];
    const existingReturns = Array.isArray(purchase.returns)
      ? (purchase.returns as Record<string, unknown>[])
      : [];
    const existingRefunds = Array.isArray(purchase.refunds)
      ? (purchase.refunds as Record<string, unknown>[])
      : [];
    const grandTotal = (purchase.grandTotal as number) || 0;
    const before = summarizePurchaseMoney(
      grandTotal,
      existing as Array<{ amount: number }>,
      existingReturns as Array<{ totalAmount: number }>,
      existingRefunds as Array<{ amount: number }>
    );

    if (input.amount > before.balance) {
      throw new ApiError(400, "Payment cannot exceed the outstanding balance");
    }

    const payments = [...existing, buildPayment(input, recordedBy)];
    const after = summarizePurchaseMoney(
      grandTotal,
      payments as Array<{ amount: number }>,
      existingReturns as Array<{ totalAmount: number }>,
      existingRefunds as Array<{ amount: number }>
    );

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    const updates: Record<string, unknown> = {
      payments,
      paidAmount: after.paidAmount,
      balance: after.balance,
      refundDue: after.refundDue,
      paymentStatus: after.paymentStatus,
      updatedAt: now,
    };

    tx.update(purchaseRef, updates);
    tx.update(supplierRef, {
      totalPaid: roundMoney(((supplier.totalPaid as number) || 0) + input.amount),
      outstanding: roundMoney(
        ((supplier.outstanding as number) || 0) +
          (after.balance - after.refundDue) -
          (before.balance - before.refundDue)
      ),
      updatedAt: now,
    });

    return { ...purchase, ...updates };
  });

  return mapPurchase(id, data);
}

export async function updatePurchase(
  shopId: string,
  id: string,
  input: CreatePurchaseInput
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const totals = computeTotals({
    items: input.items,
    discount: input.discount,
    gstRate: input.gstRate,
    transportCharge: input.transportCharge,
  });

  const data = await adminDb.runTransaction(async (tx) => {
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "A cancelled purchase cannot be edited");
    }
    const payments = Array.isArray(purchase.payments) ? purchase.payments : [];
    if (payments.length > 0) {
      throw new ApiError(409, "A purchase with recorded payments cannot be edited");
    }

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    // Apply the DELTA, never a recomputed absolute — the supplier's totals
    // span every one of its purchases, not just this one.
    const previousTotal = (purchase.grandTotal as number) || 0;
    const delta = roundMoney(totals.grandTotal - previousTotal);

    const updates: Record<string, unknown> = {
      supplierInvoiceNo: input.supplierInvoiceNo ?? null,
      purchaseDate: input.purchaseDate,
      items: buildItems(input),
      subtotal: totals.subtotal,
      discount: { ...input.discount, amount: totals.discountAmount },
      gstRate: input.gstRate,
      gstAmount: totals.gstAmount,
      transportCharge: totals.transportCharge,
      grandTotal: totals.grandTotal,
      paidAmount: 0,
      balance: totals.grandTotal,
      paymentStatus: "unpaid",
      dueDate: input.dueDate ?? null,
      updatedAt: now,
    };

    tx.update(purchaseRef, updates);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) + delta),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) + delta),
      updatedAt: now,
    });

    return { ...purchase, ...updates };
  });

  return mapPurchase(id, data);
}

export async function cancelPurchase(
  shopId: string,
  id: string,
  reason: string
): Promise<Purchase> {
  const purchaseRef = adminDb.collection(PURCHASES).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const purchase = await loadForWrite(tx, purchaseRef, shopId);

    if (purchase.status === "cancelled") {
      throw new ApiError(409, "Purchase is already cancelled");
    }
    const payments = Array.isArray(purchase.payments) ? purchase.payments : [];
    if (payments.length > 0) {
      throw new ApiError(409, "A purchase with recorded payments cannot be cancelled");
    }

    const supplierRef = adminDb.collection(SUPPLIERS).doc(purchase.supplierId as string);
    const supplierSnap = await tx.get(supplierRef);
    if (!supplierSnap.exists) {
      throw new ApiError(404, "Supplier not found");
    }
    const supplier = supplierSnap.data() as Record<string, unknown>;

    const grandTotal = (purchase.grandTotal as number) || 0;
    const balance = (purchase.balance as number) || 0;

    const updates: Record<string, unknown> = {
      status: "cancelled",
      cancelReason: reason,
      cancelledAt: now,
      updatedAt: now,
    };

    // Soft cancel: the document stays, the money reverses.
    tx.update(purchaseRef, updates);
    tx.update(supplierRef, {
      totalPurchased: roundMoney(((supplier.totalPurchased as number) || 0) - grandTotal),
      outstanding: roundMoney(((supplier.outstanding as number) || 0) - balance),
      updatedAt: now,
    });

    return { ...purchase, ...updates };
  });

  return mapPurchase(id, data);
}

export async function getPurchase(shopId: string, id: string): Promise<Purchase> {
  const snap = await adminDb.collection(PURCHASES).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "Purchase not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase does not belong to this shop");
  }
  return mapPurchase(id, data);
}

export async function listPurchases(scope: {
  shopId: string;
  branchId?: string;
  supplierId?: string;
  includeCancelled?: boolean;
  /** List/summary views only need money + identity fields, not nested history. */
  light?: boolean;
}): Promise<Purchase[]> {
  let query: Query = adminDb.collection(PURCHASES).where("shopId", "==", scope.shopId);
  if (scope.branchId) query = query.where("branchId", "==", scope.branchId);
  if (scope.supplierId) query = query.where("supplierId", "==", scope.supplierId);

  // Field mask keeps list payloads small — nested payments/returns/items are
  // loaded on the details endpoint instead.
  if (scope.light) {
    query = query.select(
      "shopId",
      "branchId",
      "ref",
      "supplierInvoiceNo",
      "supplierId",
      "supplierName",
      "purchaseDate",
      "grandTotal",
      "paidAmount",
      "balance",
      "paymentStatus",
      "status",
      "dueDate",
      "createdAt",
      "updatedAt"
    );
  }

  const snap = await query.get();
  return snap.docs
    .map((doc) =>
      scope.light
        ? mapPurchaseListRow(doc.id, doc.data() as Record<string, unknown>)
        : mapPurchase(doc.id, doc.data() as Record<string, unknown>)
    )
    .filter((purchase) => scope.includeCancelled || purchase.status !== "cancelled")
    .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
}

const SUGGESTION_SAMPLE_SIZE = 200;

/**
 * Feeds the Add Purchase autocomplete from what this shop has actually bought,
 * which is why the module needs no catalogue collection.
 */
export async function listItemSuggestions(
  shopId: string
): Promise<{ names: string[]; brands: string[]; models: string[] }> {
  // Only pull item names — not full purchase documents / payment history.
  const snap = await adminDb
    .collection(PURCHASES)
    .where("shopId", "==", shopId)
    .select("items")
    .limit(SUGGESTION_SAMPLE_SIZE)
    .get();

  const names = new Set<string>();
  const brands = new Set<string>();
  const models = new Set<string>();

  for (const doc of snap.docs) {
    const items = Array.isArray(doc.data().items) ? (doc.data().items as Record<string, unknown>[]) : [];
    for (const item of items) {
      if (typeof item.name === "string" && item.name) names.add(item.name);
      if (typeof item.brand === "string" && item.brand) brands.add(item.brand);
      if (typeof item.model === "string" && item.model) models.add(item.model);
    }
  }

  return { names: [...names], brands: [...brands], models: [...models] };
}

/**
 * Backs the duplicate-bill warning. Deliberately returns a boolean rather than
 * throwing: a genuine duplicate supplier bill number does happen, so the admin
 * is warned and may override.
 */
export async function supplierInvoiceNoExists(
  shopId: string,
  supplierId: string,
  invoiceNo: string
): Promise<boolean> {
  const purchases = await listPurchases({ shopId, supplierId });
  return purchases.some(
    (purchase) =>
      (purchase.supplierInvoiceNo || "").trim().toLowerCase() === invoiceNo.trim().toLowerCase()
  );
}
