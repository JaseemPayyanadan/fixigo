import { describe, expect, it } from "vitest";

import { computeTotals, lineTotalOf, roundMoney } from "@/lib/purchaseTotals";

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(1234.5678)).toBe(1234.57);
  });

  it("removes binary float noise", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds half away from zero rather than to even", () => {
    expect(roundMoney(2.675)).toBe(2.68);
  });

  it("returns 0 for a non-finite input rather than NaN", () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("lineTotalOf", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotalOf(3, 1800)).toBe(5400);
  });

  it("rounds a fractional product", () => {
    expect(lineTotalOf(3, 33.333)).toBe(100);
  });
});

describe("computeTotals", () => {
  const items = [
    { quantity: 3, purchasePrice: 1800 }, // 5400
    { quantity: 5, purchasePrice: 550 }, //  2750
    { quantity: 2, purchasePrice: 350 }, //   700
  ];

  it("sums line totals into the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 0 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.subtotal).toBe(8850);
    expect(totals.grandTotal).toBe(8850);
  });

  it("treats an amount discount as rupees", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 200 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(200);
    expect(totals.grandTotal).toBe(8650);
  });

  it("treats a percent discount as a share of the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "percent", value: 10 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(885);
    expect(totals.grandTotal).toBe(7965);
  });

  it("applies GST to the DISCOUNTED subtotal, not the raw subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 850 },
      gstRate: 18,
      transportCharge: 0,
    });
    // (8850 - 850) * 0.18 = 1440, not 8850 * 0.18 = 1593
    expect(totals.gstAmount).toBe(1440);
    expect(totals.grandTotal).toBe(9440);
  });

  it("adds transport after GST, untaxed", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "amount", value: 850 },
      gstRate: 18,
      transportCharge: 100,
    });
    expect(totals.gstAmount).toBe(1440);
    expect(totals.transportCharge).toBe(100);
    expect(totals.grandTotal).toBe(9540);
  });

  it("handles a discount equal to the subtotal", () => {
    const totals = computeTotals({
      items,
      discount: { mode: "percent", value: 100 },
      gstRate: 18,
      transportCharge: 50,
    });
    expect(totals.discountAmount).toBe(8850);
    expect(totals.gstAmount).toBe(0);
    expect(totals.grandTotal).toBe(50);
  });

  it("returns all zeros for an empty item list", () => {
    const totals = computeTotals({
      items: [],
      discount: { mode: "amount", value: 0 },
      gstRate: 18,
      transportCharge: 0,
    });
    expect(totals).toEqual({
      subtotal: 0,
      discountAmount: 0,
      gstAmount: 0,
      transportCharge: 0,
      grandTotal: 0,
    });
  });

  it("never lets a discount larger than the subtotal drive the total negative", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, purchasePrice: 100 }],
      discount: { mode: "amount", value: 500 },
      gstRate: 0,
      transportCharge: 0,
    });
    expect(totals.discountAmount).toBe(100);
    expect(totals.grandTotal).toBe(0);
  });

  it("rounds at each step so the parts sum to the whole", () => {
    const totals = computeTotals({
      items: [{ quantity: 3, purchasePrice: 33.33 }],
      discount: { mode: "percent", value: 7 },
      gstRate: 12,
      transportCharge: 0,
    });
    const recomputed = roundMoney(
      totals.subtotal - totals.discountAmount + totals.gstAmount + totals.transportCharge
    );
    expect(recomputed).toBe(totals.grandTotal);
  });
});
