import { describe, expect, it } from "vitest";

import { formatPurchaseRef, nextRefCounter, RefCounters } from "@/lib/purchaseRef";

describe("formatPurchaseRef", () => {
  it("pads the sequence to four digits", () => {
    expect(formatPurchaseRef(2026, 12)).toBe("PUR-2026-0012");
  });

  it("pads the first reference of a year", () => {
    expect(formatPurchaseRef(2026, 1)).toBe("PUR-2026-0001");
  });

  it("does not truncate a sequence beyond four digits", () => {
    expect(formatPurchaseRef(2026, 12345)).toBe("PUR-2026-12345");
  });
});

describe("nextRefCounter", () => {
  it("starts at 1 when no counter exists yet", () => {
    expect(nextRefCounter(undefined, 2026)).toEqual({ counters: { "2026": 1 }, seq: 1 });
  });

  it("increments within the same year", () => {
    expect(nextRefCounter({ "2026": 11 }, 2026)).toEqual({
      counters: { "2026": 12 },
      seq: 12,
    });
  });

  it("starts a new year at 1 without disturbing the previous year", () => {
    expect(nextRefCounter({ "2025": 480 }, 2026)).toEqual({
      counters: { "2025": 480, "2026": 1 },
      seq: 1,
    });
  });

  it("continues a backdated year's own run rather than restarting it", () => {
    expect(nextRefCounter({ "2025": 480, "2026": 5 }, 2025)).toEqual({
      counters: { "2025": 481, "2026": 5 },
      seq: 481,
    });
  });

  it("never re-issues a reference when backdated and current entries interleave", () => {
    // The regression this fix exists for.
    let counters: RefCounters | undefined;
    const issued: string[] = [];

    for (const year of [2026, 2026, 2026, 2025, 2026]) {
      const next = nextRefCounter(counters, year);
      counters = next.counters;
      issued.push(formatPurchaseRef(year, next.seq));
    }

    expect(issued).toEqual([
      "PUR-2026-0001",
      "PUR-2026-0002",
      "PUR-2026-0003",
      "PUR-2025-0001",
      "PUR-2026-0004",
    ]);
    expect(new Set(issued).size).toBe(issued.length);
  });
});
