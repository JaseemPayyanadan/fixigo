// Resolves the branch and technician names a service row displays, ahead of the
// table rather than inside a column accessor.
//
// Why it is not done in the accessor: TanStack builds its core row model once
// per `data` array identity and caches every accessor result on the row
// (`row._valuesCache`). `branches` and `technicians` load from their own hooks
// and land after the services query does, so the first row model is built while
// both lookups are still empty — and the "—" it caches then is what the Branch
// column keeps rendering for the rest of the page's life, however many times
// the columns are rebuilt around it. Projecting the names onto the rows gives
// the table a new `data` identity when a lookup arrives, which is the only
// thing that invalidates that cache.

/** A branch or technician as the table needs it: an id and a display name. */
export interface NamedRef {
  id: string;
  name: string;
  /** Technicians only — see `technicianName` below. */
  userId?: string;
}

interface ServiceRowInput {
  branchId: string;
  technician_id?: string;
}

export type ResolvedServiceRow<T> = T & {
  branchName: string;
  technicianName: string;
};

export function resolveServiceRows<T extends ServiceRowInput>(
  services: T[],
  branches: NamedRef[],
  technicians: NamedRef[]
): ResolvedServiceRow<T>[] {
  const branchNames = new Map<string, string>();
  branches.forEach((branch) => branchNames.set(branch.id, branch.name));

  // Keyed by both ids a service can reference. `ServiceForm` writes the user id
  // when a technician files their own job and only rewrites it to the document
  // id once the technicians list has loaded, so both forms exist in the data —
  // keying on `id` alone leaves those rows showing a dash.
  const technicianNames = new Map<string, string>();
  technicians.forEach((tech) => {
    technicianNames.set(tech.id, tech.name);
    if (tech.userId) technicianNames.set(tech.userId, tech.name);
  });

  return services.map((service) => ({
    ...service,
    // `||` and not `??`: a branch document with an empty name resolves to "",
    // which renders as a blank cell.
    branchName: branchNames.get(service.branchId) || "—",
    technicianName: service.technician_id
      ? technicianNames.get(service.technician_id) || "—"
      : "Unassigned",
  }));
}
