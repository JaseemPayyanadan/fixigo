/** Last-issued sequence per year, e.g. `{ "2025": 480, "2026": 12 }`. */
export interface RefCounters {
  [year: string]: number;
}

/** "PUR-2026-0012". Four-digit padding is a minimum, not a cap. */
export function formatPurchaseRef(year: number, seq: number): string {
  return `PUR-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Advances the sequence for `year` alone, leaving every other year's
 * high-water mark intact. Keeping one counter per year is what makes the
 * reference safe under backdating: entering a December bill in January
 * continues December's run, and the next current-year entry still picks up
 * where the current year left off, so no reference is ever re-issued.
 */
export function nextRefCounter(
  current: RefCounters | undefined,
  year: number
): { counters: RefCounters; seq: number } {
  const seq = (current?.[String(year)] ?? 0) + 1;
  return { counters: { ...current, [String(year)]: seq }, seq };
}
