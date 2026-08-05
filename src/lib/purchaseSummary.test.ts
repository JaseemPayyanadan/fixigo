import { describe, expect, it } from "vitest";

import { summarizePurchases } from "@/lib/purchaseSummary";
import type { Purchase } from "@/types/purchase";

const NOW = new Date(2026, 7, 5, 12, 0);

function purchase(overrides: Partial<Purchase>): Purchase {
  return {
    id: "p1",
    shopId: "shop-1",
    branchId: "branch-1",
    ref: "PUR-2026-0001",
    supplierId: "sup-1",
    supplierName: "ABC Mobiles",
    purchaseDate: NOW,
    purchasedBy: { userId: "u1", name: "Naseem" },
    items: [{ id: "i1", name: "Display", quantity: 3, purchasePrice: 100, lineTotal: 300 }],
    subtotal: 300,
    discount: { mode: "amount", value: 0, amount: 0 },
    gstRate: 0,
    gstAmount: 0,
    transportCharge: 0,
    grandTotal: 300,
    payments: [],
    paidAmount: 0,
    balance: 300,
    paymentStatus: "unpaid",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Purchase;
}

describe("summarizePurchases", () => {
  it("returns zeros for no purchases", () => {
    expect(summarizePurchases([], 0, NOW)).toEqual({
      todayTotal: 0,
      todayCount: 0,
      monthTotal: 0,
      pendingPayments: 0,
      pendingBillCount: 0,
      activeSupplierCount: 0,
      itemsPurchasedToday: 0,
    });
  });

  it("totals today's purchases and counts them", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 8500 }), purchase({ id: "p2", grandTotal: 10000 })],
      3,
      NOW
    );
    expect(summary.todayTotal).toBe(18500);
    expect(summary.todayCount).toBe(2);
  });

  it("excludes yesterday from today but keeps it in the month", () => {
    const summary = summarizePurchases(
      [
        purchase({ grandTotal: 8500 }),
        purchase({ id: "p2", grandTotal: 12000, purchaseDate: new Date(2026, 7, 4) }),
      ],
      1,
      NOW
    );
    expect(summary.todayTotal).toBe(8500);
    expect(summary.monthTotal).toBe(20500);
  });

  it("excludes last month from the month total", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 5000, purchaseDate: new Date(2026, 6, 31) })],
      1,
      NOW
    );
    expect(summary.monthTotal).toBe(0);
  });

  it("sums outstanding balances regardless of date", () => {
    const summary = summarizePurchases(
      [
        purchase({ balance: 2500, purchaseDate: new Date(2026, 5, 1) }),
        purchase({ id: "p2", balance: 65700 }),
        purchase({ id: "p3", balance: 0, paymentStatus: "paid" }),
      ],
      1,
      NOW
    );
    expect(summary.pendingPayments).toBe(68200);
    expect(summary.pendingBillCount).toBe(2);
  });

  it("sums item quantities bought today", () => {
    const summary = summarizePurchases(
      [
        purchase({
          items: [
            { id: "i1", name: "Display", quantity: 3, purchasePrice: 1, lineTotal: 3 },
            { id: "i2", name: "Battery", quantity: 5, purchasePrice: 1, lineTotal: 5 },
          ],
        }),
        purchase({
          id: "p2",
          purchaseDate: new Date(2026, 7, 4),
          items: [{ id: "i3", name: "Panel", quantity: 99, purchasePrice: 1, lineTotal: 99 }],
        }),
      ],
      1,
      NOW
    );
    expect(summary.itemsPurchasedToday).toBe(8);
  });

  it("ignores cancelled purchases entirely", () => {
    const summary = summarizePurchases(
      [purchase({ grandTotal: 9999, balance: 9999, status: "cancelled" })],
      2,
      NOW
    );
    expect(summary.todayTotal).toBe(0);
    expect(summary.todayCount).toBe(0);
    expect(summary.pendingPayments).toBe(0);
    expect(summary.itemsPurchasedToday).toBe(0);
  });

  it("passes the supplier count straight through", () => {
    expect(summarizePurchases([], 24, NOW).activeSupplierCount).toBe(24);
  });
});
