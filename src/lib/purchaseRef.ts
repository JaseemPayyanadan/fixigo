export interface RefCounter {
  year: number;
  seq: number;
}

/** "PUR-2026-0012". Four-digit padding is a minimum, not a cap. */
export function formatPurchaseRef(year: number, seq: number): string {
  return `PUR-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Advances the per-shop counter. Any change of year restarts the sequence —
 * including a backwards change, so a backdated entry cannot continue a
 * different year's run and mint a duplicate reference.
 */
export function nextRefCounter(current: RefCounter | undefined, year: number): RefCounter {
  if (!current || current.year !== year) {
    return { year, seq: 1 };
  }
  return { year, seq: current.seq + 1 };
}
