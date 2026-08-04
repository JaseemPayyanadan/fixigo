import { normalizeStatus } from "./statusUtils";

export interface ReopenFields {
  status: "in_progress";
  isReopened: true;
  reopenReason: string;
  reopenedAt: Date;
  reopenCount: number;
}

/**
 * Firestore fields written when staff reopens a completed service.
 * Caller must also clear completion dates (`deleteField`) and leave payment alone.
 */
export function buildReopenFields(
  reason: string,
  previousCount: number | undefined,
  now: Date
): ReopenFields {
  const reopenReason = reason.trim();
  if (!reopenReason) {
    throw new Error("Reopen reason is required");
  }
  return {
    status: "in_progress",
    isReopened: true,
    reopenReason,
    reopenedAt: now,
    reopenCount: (previousCount ?? 0) + 1,
  };
}

/** Same gate as `updateStatus`: shop/branch admin, or assigned technician, on a completed job. */
export function canReopenService(
  user: { role: string; id: string } | null | undefined,
  service: { status: string; technician_id?: string } | null | undefined
): boolean {
  if (!user || !service) return false;
  if (normalizeStatus(service.status) !== "completed") return false;
  if (user.role === "shop_admin" || user.role === "branch_admin") return true;
  if (user.role === "technician" && service.technician_id === user.id) return true;
  return false;
}
