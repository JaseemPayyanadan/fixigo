// Maps a raw Firestore `services` document into the `Service` shape the app
// works with.
//
// Extracted from `useServices` so the date handling is testable. That handling
// is the whole reason this file exists: the dashboard reconstructs history from
// `createdAt` / `completedDate` / `actualCompletion`, so a mapper that invents a
// timestamp for a field the document does not carry does not produce a harmless
// default — it produces a wrong number on screen.

import type { Service } from "@/types";

/** Firestore `Timestamp`, which is what date fields arrive as before mapping. */
interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return typeof (value as TimestampLike | null)?.toDate === "function";
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Reads a date field, or `undefined` when the document does not carry one.
 *
 * Absent stays absent. An optional date that is missing means "we do not know",
 * and the analytics helpers are built to say so; substituting the current time
 * would instead assert something false about when the work happened.
 */
export function readOptionalDate(value: unknown): Date | undefined {
  if (isTimestampLike(value)) {
    const date = value.toDate();
    return isValidDate(date) ? date : undefined;
  }
  if (isValidDate(value)) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : undefined;
  }
  return undefined;
}

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
    paymentStatus: data.paymentStatus === "paid" || data.paymentStatus === "pending" ? data.paymentStatus : undefined,
    paidAt: readOptionalDate(data.paidAt),

    isReopened: data.isReopened === true,
    reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
    reopenedAt: readOptionalDate(data.reopenedAt),
    reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,

    workNotes: data.workNotes || [],
    partsUsed: data.partsUsed || [],
    customerFeedback: data.customerFeedback || {},
    qualityScore: data.qualityScore || 0,
    createdAt: readRequiredDate(data.createdAt, now),
    updatedAt: readRequiredDate(data.updatedAt, now),
  };
}
