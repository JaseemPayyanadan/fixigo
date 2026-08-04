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
