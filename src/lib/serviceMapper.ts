// Maps a raw Firestore `services` document into the `Service` shape the app
// works with.
//
// Extracted from `useServices` so the date handling is testable. That handling
// is the whole reason this file exists: the dashboard reconstructs history from
// `createdAt` / `completedDate` / `actualCompletion`, so a mapper that invents a
// timestamp for a field the document does not carry does not produce a harmless
// default — it produces a wrong number on screen.

import type { Service } from "@/types";
import { readOptionalDate } from "./dateUtils";
import { mapStatusHistoryEntries } from "./serviceStatusHistory";

/**
 * `createdAt` and `updatedAt` are non-optional on `Service`, so they do need a
 * fallback. `fallback` is passed in rather than read from the clock here so the
 * mapping stays deterministic and testable.
 */
function readRequiredDate(value: unknown, fallback: Date): Date {
  return readOptionalDate(value) ?? fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawServiceData = Record<string, any>;

export function mapServiceDoc(id: string, data: RawServiceData, now: Date = new Date()): Service {
  return {
    id,
    name: data.name || "",
    description: data.description || "",
    customer: data.customer || {},
    device: data.device || {},
    status: data.status || "pending",
    priority: data.priority || "medium",
    shopId: data.shopId || "",
    branchId: data.branchId || "",
    price: data.price || 0,

    actualDuration: data.actualDuration || 0,
    technician_id: data.technician_id || "",

    // All three stay `undefined` when absent — see `readOptionalDate`.
    estimatedCompletion: readOptionalDate(data.estimatedCompletion),
    actualCompletion: readOptionalDate(data.actualCompletion),
    completedDate: readOptionalDate(data.completedDate),

    // Left `undefined` when the document predates payment tracking, so
    // `paymentStatusOf` can fall back to the work status rather than a stored
    // "pending" that would wrongly zero out historical revenue.
    paymentStatus:
      data.paymentStatus === "paid" ||
      data.paymentStatus === "pending" ||
      data.paymentStatus === "partial"
        ? data.paymentStatus
        : undefined,
    paidAmount: typeof data.paidAmount === "number" ? data.paidAmount : undefined,
    paidAt: readOptionalDate(data.paidAt),

    isReopened: data.isReopened === true,
    reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
    reopenedAt: readOptionalDate(data.reopenedAt),
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,

    statusHistory: mapStatusHistoryEntries(data.statusHistory),

    workNotes: data.workNotes || [],
    partsUsed: data.partsUsed || [],
    customerFeedback: data.customerFeedback || {},
    qualityScore: data.qualityScore || 0,
    createdAt: readRequiredDate(data.createdAt, now),
    updatedAt: readRequiredDate(data.updatedAt, now),
  };
}
