import type { ServicePaymentStatus } from "./paymentUtils";
import { normalizeStatus } from "./statusUtils";

/**
 * The display label, not the normalized `in_progress` slug: the status picker on
 * the details page is a controlled `<select>` over the display labels, and every
 * other write path stores those. Writing the slug left the dropdown with no
 * option selected after a reopen.
 */
export const REOPEN_STATUS = "In Progress";

export interface ReopenFields {
  status: typeof REOPEN_STATUS;
  isReopened: true;
  reopenReason: string;
  reopenedAt: Date;
  reopenCount: number;
  paymentStatus?: ServicePaymentStatus;
}

/**
 * Firestore fields written when staff reopens a completed service.
 * Caller must also clear completion dates (`deleteField`).
 *
 * Payment is kept as it was, which for a document predating payment tracking
 * means pinning it. Those carry no `paymentStatus` and are read as paid *because*
 * they are completed (see `paymentStatusOf`); moving off completed without
 * writing the flag would silently flip the job to unpaid and drop its price out
 * of revenue. The complete path guards the mirror image of this the same way.
 */
export function buildReopenFields(
  reason: string,
  previousCount: number | undefined,
  now: Date,
  previousPaymentStatus?: ServicePaymentStatus
): ReopenFields {
  const reopenReason = reason.trim();
  if (!reopenReason) {
    throw new Error("Reopen reason is required");
  }
  return {
    status: REOPEN_STATUS,
    isReopened: true,
    reopenReason,
    reopenedAt: now,
    reopenCount: (previousCount ?? 0) + 1,
    ...(previousPaymentStatus ? {} : { paymentStatus: "paid" as const }),
  };
}

/** Shop/branch admin, or the technician assigned to the job, may reopen when completed. */
export function canReopenService(
  user: { role: string; id: string } | null | undefined,
  service: { status: string; technician_id?: string } | null | undefined,
  technicians?: Array<{ id: string; userId?: string }> | null
): boolean {
  if (!user || !service) return false;
  if (normalizeStatus(service.status) !== "completed") return false;
  if (user.role === "shop_admin" || user.role === "branch_admin") return true;
  if (user.role !== "technician") return false;

  const assignedId = service.technician_id?.trim();
  if (!assignedId) return false;
  // `technician_id` may be the tech doc id or the linked user id.
  if (assignedId === user.id) return true;
  const tech = technicians?.find((t) => t.id === assignedId || t.userId === assignedId);
  if (!tech) return false;
  return tech.id === user.id || tech.userId === user.id;
}
