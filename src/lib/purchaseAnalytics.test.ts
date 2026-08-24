import { describe, expect, it } from "vitest";

import { purchaseTrend, purchaseTrendForRange } from "@/lib/purchaseAnalytics";
import type { Purchase } from "@/types/purchase";

// Fixed clock: 2026-07-23, mid-month.
const NOW = new Date(2026, 6, 23, 14, 30);

function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: Math.random().toString(36).slice(2),
    shopId: "shop-1",
    branchId: "branch-1",
    ref: "PUR-2026-0001",
    supplierId: "sup-1",
    supplierName: "ABC Mobiles",
    purchaseDate: NOW,
    purchasedBy: { userId: "u1", name: "Naseem" },
    items: [{ id: "i1", name: "Display", quantity: 1, purchasePrice: 100, lineTotal: 100, returnedQuantity: 0 }],
    subtotal: 100,
    discount: { mode: "amount", value: 0, amount: 0 },
    gstRate: 0,
    gstAmount: 0,
    transportCharge: 0,
    grandTotal: 100,
    payments: [],
    paidAmount: 0,
    balance: 100,
    paymentStatus: "unpaid",
    status: "active",
    returns: [],
    returnedAmount: 0,
    refunds: [],
    refundReceived: 0,
    refundDue: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("purchaseTrend", () => {
  it("returns one point per day of the window, oldest first and ending today", () => {
    const { points } = purchaseTrend([], 30, NOW);
    expect(points).toHaveLength(30);
    expect(points[0].date).toEqual(new Date(2026, 5, 24));
    expect(points[29].date).toEqual(new Date(2026, 6, 23));
  });

  it("sums spend onto the day the purchase was made", () => {
    const { points, total } = purchaseTrend(
      [purchase({ purchaseDate: new Date(2026, 6, 23, 9), grandTotal: 500 }), purchase({ purchaseDate: new Date(2026, 6, 23, 18), grandTotal: 250 })],
      30,
      NOW
    );
    expect(points[29].amount).toBe(750);
    expect(total).toBe(750);
  });

  it("zero-fills days with no spend", () => {
    const { points } = purchaseTrend([purchase({ grandTotal: 500 })], 30, NOW);
    expect(points.filter((p) => p.amount === 0)).toHaveLength(29);
  });

  it("excludes cancelled purchases", () => {
    const { total } = purchaseTrend([purchase({ status: "cancelled", grandTotal: 4000 })], 30, NOW);
    expect(total).toBe(0);
  });

  it("ignores a non-numeric grand total instead of producing NaN spend", () => {
    const { total } = purchaseTrend([purchase({ grandTotal: undefined as unknown as number })], 30, NOW);
    expect(total).toBe(0);
  });

  it("counts the preceding window of the same length as the comparison", () => {
    const { total, previousTotal } = purchaseTrend(
      [purchase({ purchaseDate: NOW, grandTotal: 400 }), purchase({ purchaseDate: new Date(2026, 5, 20), grandTotal: 200 })],
      30,
      NOW
    );
    expect(total).toBe(400);
    expect(previousTotal).toBe(200);
  });

  it("has no delta to report when the previous window spent nothing", () => {
    expect(purchaseTrend([purchase({ purchaseDate: NOW, grandTotal: 400 })], 30, NOW).delta).toBeNull();
  });
});

describe("purchaseTrendForRange", () => {
  it("returns one point per day of a short range, oldest first", () => {
    const { points } = purchaseTrendForRange([], { start: new Date(2026, 6, 1), end: new Date(2026, 6, 10) });
    expect(points).toHaveLength(10);
    expect(points[0].date).toEqual(new Date(2026, 6, 1));
    expect(points[9].date).toEqual(new Date(2026, 6, 10));
  });

  it("sums spend onto the day the purchase was made", () => {
    const { points, total } = purchaseTrendForRange([purchase({ purchaseDate: new Date(2026, 6, 5), grandTotal: 750 })], {
      start: new Date(2026, 6, 1),
      end: new Date(2026, 6, 10),
    });
    expect(points[4].amount).toBe(750);
    expect(total).toBe(750);
  });

  it("excludes spend outside the range", () => {
    const { total } = purchaseTrendForRange([purchase({ purchaseDate: new Date(2026, 5, 1), grandTotal: 500 })], {
      start: new Date(2026, 6, 1),
      end: new Date(2026, 6, 10),
    });
    expect(total).toBe(0);
  });

  it("counts the equal-length preceding window as the comparison", () => {
    const { total, previousTotal, delta } = purchaseTrendForRange(
      [purchase({ purchaseDate: new Date(2026, 6, 5), grandTotal: 400 }), purchase({ purchaseDate: new Date(2026, 5, 25), grandTotal: 200 })],
      { start: new Date(2026, 6, 1), end: new Date(2026, 6, 10) }
    );
    expect(total).toBe(400);
    expect(previousTotal).toBe(200);
    expect(delta).toBeCloseTo(100);
  });

  it("buckets a range longer than 45 days by week", () => {
    const { points } = purchaseTrendForRange([], { start: new Date(2026, 0, 1), end: new Date(2026, 5, 30) });
    expect(points.length).toBeLessThan(30);
    expect(points.length).toBeGreaterThan(20);
  });

  it("returns an empty series when the range end precedes its start", () => {
    const result = purchaseTrendForRange([], { start: new Date(2026, 6, 10), end: new Date(2026, 6, 1) });
    expect(result.points).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.delta).toBeNull();
  });
});
