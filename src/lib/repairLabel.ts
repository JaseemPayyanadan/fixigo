/** Last eight characters of a service/repair id — used as the denormalized serviceRef. */
export function shortServiceRef(serviceId: string): string {
  return serviceId.slice(-8);
}

/** Human-readable repair label for lists, details, and request forms. */
export function formatRepairLabel(serviceId: string, serviceRef?: string | null): string {
  const ref = serviceRef?.trim() || shortServiceRef(serviceId);
  return `Repair #${ref}`;
}
