import { randomUUID } from "node:crypto";

import { ApiError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { formatPurchaseRequestRef, nextRefCounter, type RefCounters } from "@/lib/purchaseRef";
import type { CreatePurchaseRequestInput } from "@/lib/purchaseRequestValidation";
import { toDate, toOptionalDate } from "@/lib/supplierRepo";
import type { PurchaseRequest, PurchaseRequestItem } from "@/types/purchaseRequest";

export const PURCHASE_REQUESTS = "purchaseRequests";
export const PURCHASE_REQUEST_COUNTERS = "purchaseRequestCounters";

interface CreatePurchaseRequestArgs extends CreatePurchaseRequestInput {
  shopId: string;
  branchId: string;
  customerName: string;
  serviceRef?: string;
  requestedBy: { userId: string; name: string };
}

function mapItem(raw: Record<string, unknown>): PurchaseRequestItem {
  return {
    id: (raw.id as string) || randomUUID(),
    name: (raw.name as string) || "",
    brand: (raw.brand as string) || undefined,
    model: (raw.model as string) || undefined,
    quantity: (raw.quantity as number) || 0,
    remarks: (raw.remarks as string) || undefined,
  };
}

/** The single Firestore -> PurchaseRequest mapper for the whole codebase. */
export function mapPurchaseRequest(id: string, data: Record<string, unknown>): PurchaseRequest {
  const items = Array.isArray(data.items)
    ? (data.items as Record<string, unknown>[]).map(mapItem)
    : [];

  return {
    id,
    shopId: (data.shopId as string) || "",
    branchId: (data.branchId as string) || "",
    ref: (data.ref as string) || "",
    serviceId: (data.serviceId as string) || "",
    serviceRef: (data.serviceRef as string) || undefined,
    customerName: (data.customerName as string) || "",
    items,
    status: (data.status as PurchaseRequest["status"]) || "pending",
    requestedBy: (data.requestedBy as PurchaseRequest["requestedBy"]) || { userId: "", name: "" },
    requestedAt: toDate(data.requestedAt),
    decidedBy: (data.decidedBy as PurchaseRequest["decidedBy"]) || undefined,
    decidedAt: toOptionalDate(data.decidedAt),
    rejectReason: (data.rejectReason as string) || undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function buildItems(items: CreatePurchaseRequestInput["items"]): Record<string, unknown>[] {
  return items.map((item) => ({
    id: randomUUID(),
    name: item.name,
    brand: item.brand ?? null,
    model: item.model ?? null,
    quantity: item.quantity,
    remarks: item.remarks ?? null,
  }));
}

/**
 * Creates the request and advances its own reference counter in ONE
 * transaction, so a partial commit can never mint a duplicate "PR-…" ref.
 */
export async function createPurchaseRequest(
  input: CreatePurchaseRequestArgs
): Promise<PurchaseRequest> {
  const counterRef = adminDb.collection(PURCHASE_REQUEST_COUNTERS).doc(input.shopId);
  const requestRef = adminDb.collection(PURCHASE_REQUESTS).doc();
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists ? (counterSnap.data() as unknown as RefCounters) : undefined;
    const year = now.getFullYear();
    const { counters, seq } = nextRefCounter(current, year);

    const request: Record<string, unknown> = {
      shopId: input.shopId,
      branchId: input.branchId,
      ref: formatPurchaseRequestRef(year, seq),
      serviceId: input.serviceId,
      serviceRef: input.serviceRef ?? null,
      customerName: input.customerName,
      items: buildItems(input.items),
      status: "pending",
      requestedBy: {
        userId: input.requestedBy.userId,
        name: input.requestedBy.name || "",
      },
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(requestRef, request);
    // set, not update: the counter document does not exist on a shop's first request.
    tx.set(counterRef, counters);

    return request;
  });

  return mapPurchaseRequest(requestRef.id, data);
}

export async function getPurchaseRequest(shopId: string, id: string): Promise<PurchaseRequest> {
  const snap = await adminDb.collection(PURCHASE_REQUESTS).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "Purchase request not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase request does not belong to this shop");
  }
  return mapPurchaseRequest(id, data);
}

export async function listPurchaseRequests(scope: {
  shopId: string;
  branchId?: string;
}): Promise<PurchaseRequest[]> {
  let query = adminDb.collection(PURCHASE_REQUESTS).where("shopId", "==", scope.shopId) as FirebaseFirestore.Query;
  if (scope.branchId) query = query.where("branchId", "==", scope.branchId);

  const snap = await query.get();
  return snap.docs
    .map((doc) => mapPurchaseRequest(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
}

/** Loads a request inside a transaction and enforces shop ownership. */
async function loadForWrite(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  shopId: string
): Promise<Record<string, unknown>> {
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new ApiError(404, "Purchase request not found");
  }
  const data = snap.data() as Record<string, unknown>;
  if (!data.shopId || data.shopId !== shopId) {
    throw new ApiError(403, "Purchase request does not belong to this shop");
  }
  return data;
}

export async function approvePurchaseRequest(
  shopId: string,
  id: string,
  decidedBy: { userId: string; name: string }
): Promise<PurchaseRequest> {
  const requestRef = adminDb.collection(PURCHASE_REQUESTS).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const request = await loadForWrite(tx, requestRef, shopId);
    if (request.status !== "pending") {
      throw new ApiError(409, "Only a pending request can be approved");
    }

    const updates: Record<string, unknown> = {
      status: "approved",
      decidedBy: { userId: decidedBy.userId, name: decidedBy.name || "" },
      decidedAt: now,
      updatedAt: now,
    };

    tx.update(requestRef, updates);
    return { ...request, ...updates };
  });

  return mapPurchaseRequest(id, data);
}

export async function rejectPurchaseRequest(
  shopId: string,
  id: string,
  reason: string,
  decidedBy: { userId: string; name: string }
): Promise<PurchaseRequest> {
  const requestRef = adminDb.collection(PURCHASE_REQUESTS).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const request = await loadForWrite(tx, requestRef, shopId);
    if (request.status !== "pending") {
      throw new ApiError(409, "Only a pending request can be rejected");
    }

    const updates: Record<string, unknown> = {
      status: "rejected",
      rejectReason: reason,
      decidedBy: { userId: decidedBy.userId, name: decidedBy.name || "" },
      decidedAt: now,
      updatedAt: now,
    };

    tx.update(requestRef, updates);
    return { ...request, ...updates };
  });

  return mapPurchaseRequest(id, data);
}

/** Only the original requester may cancel, and only while still pending. */
export async function cancelPurchaseRequest(
  shopId: string,
  id: string,
  requestedByUserId: string
): Promise<PurchaseRequest> {
  const requestRef = adminDb.collection(PURCHASE_REQUESTS).doc(id);
  const now = new Date();

  const data = await adminDb.runTransaction(async (tx) => {
    const request = await loadForWrite(tx, requestRef, shopId);

    const requestedBy = (request.requestedBy as Record<string, unknown>) || {};
    if (requestedBy.userId !== requestedByUserId) {
      throw new ApiError(403, "Only the requester can cancel this request");
    }
    if (request.status !== "pending") {
      throw new ApiError(409, "Only a pending request can be cancelled");
    }

    const updates: Record<string, unknown> = {
      status: "cancelled",
      updatedAt: now,
    };

    tx.update(requestRef, updates);
    return { ...request, ...updates };
  });

  return mapPurchaseRequest(id, data);
}
