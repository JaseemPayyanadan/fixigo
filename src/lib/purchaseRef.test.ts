import { describe, expect, it } from "vitest";

import { formatPurchaseRef, nextRefCounter } from "@/lib/purchaseRef";

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
    expect(nextRefCounter(undefined, 2026)).toEqual({ year: 2026, seq: 1 });
  });

  it("increments within the same year", () => {
    expect(nextRefCounter({ year: 2026, seq: 11 }, 2026)).toEqual({ year: 2026, seq: 12 });
  });

  it("resets to 1 when the year rolls over", () => {
    expect(nextRefCounter({ year: 2025, seq: 480 }, 2026)).toEqual({ year: 2026, seq: 1 });
  });

  it("does not resurrect an old sequence when a backdated year appears", () => {
    expect(nextRefCounter({ year: 2026, seq: 5 }, 2025)).toEqual({ year: 2025, seq: 1 });
  });
});
