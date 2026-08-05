// src/lib/purchaseFormat.test.ts
import { describe, expect, it } from "vitest";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

const NOW = new Date(2026, 7, 5);

function purchase(overrides: Partial<Purchase>): Purchase {
  return {
    balance: 0,
    paymentStatus: "paid",
    status: "active",
    dueDate: undefined,
    ...overrides,
  } as Purchase;
}

describe("formatRupees", () => {
  it("groups in the Indian lakh/crore system", () => {
    expect(formatRupees(342800)).toBe("₹3,42,800");
  });

  it("formats a small amount", () => {
    expect(formatRupees(8500)).toBe("₹8,500");
  });

  it("shows paise only when they are non-zero", () => {
    expect(formatRupees(2500)).toBe("₹2,500");
    expect(formatRupees(2500.5)).toBe("₹2,500.50");
  });

  it("formats zero", () => {
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("paymentStatusLabel", () => {
  it("labels a paid purchase", () => {
    expect(paymentStatusLabel(purchase({ paymentStatus: "paid" }), NOW).label).toBe("Paid");
  });

  it("labels a partial purchase", () => {
    expect(
      paymentStatusLabel(purchase({ paymentStatus: "partial", balance: 100 }), NOW).label
    ).toBe("Partially Paid");
  });

  it("labels an unpaid purchase as Pending", () => {
    expect(
      paymentStatusLabel(purchase({ paymentStatus: "unpaid", balance: 100 }), NOW).label
    ).toBe("Pending");
  });

  it("labels an overdue purchase as Overdue, outranking its payment status", () => {
    const overdue = purchase({
      paymentStatus: "partial",
      balance: 100,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(overdue, NOW).label).toBe("Overdue");
  });

  it("does not call a settled bill overdue", () => {
    const settled = purchase({
      paymentStatus: "paid",
      balance: 0,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(settled, NOW).label).toBe("Paid");
  });

  it("labels a cancelled purchase, outranking everything", () => {
    const cancelled = purchase({
      status: "cancelled",
      paymentStatus: "unpaid",
      balance: 100,
      dueDate: new Date(2026, 7, 1),
    });
    expect(paymentStatusLabel(cancelled, NOW).label).toBe("Cancelled");
  });
});
