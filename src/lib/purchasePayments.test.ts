import { describe, expect, it } from "vitest";

import { isOverdue, paidAmountOf, summarizePayments } from "@/lib/purchasePayments";

describe("paidAmountOf", () => {
  it("is 0 for no payments", () => {
    expect(paidAmountOf([])).toBe(0);
  });

  it("sums and rounds", () => {
    expect(paidAmountOf([{ amount: 10000 }, { amount: 5000 }, { amount: 0.005 }])).toBe(15000.01);
  });
});

describe("summarizePayments", () => {
  it("reports unpaid when nothing has been paid", () => {
    expect(summarizePayments(8500, [])).toEqual({
      paidAmount: 0,
      balance: 8500,
      paymentStatus: "unpaid",
    });
  });

  it("reports partial when some has been paid", () => {
    expect(summarizePayments(8500, [{ amount: 6000 }])).toEqual({
      paidAmount: 6000,
      balance: 2500,
      paymentStatus: "partial",
    });
  });

  it("reports paid when the exact balance is settled", () => {
    expect(summarizePayments(8500, [{ amount: 6000 }, { amount: 2500 }])).toEqual({
      paidAmount: 8500,
      balance: 0,
      paymentStatus: "paid",
    });
  });

  it("treats a sub-paisa remainder as paid rather than stranding a partial bill", () => {
    const result = summarizePayments(100, [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }]);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe("paid");
  });

  it("never reports a negative balance", () => {
    const result = summarizePayments(1000, [{ amount: 1500 }]);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe("paid");
  });

  it("reports paid for a zero-value purchase with no payments", () => {
    expect(summarizePayments(0, []).paymentStatus).toBe("paid");
  });
});

describe("isOverdue", () => {
  const due = new Date(2026, 7, 1);

  it("is false when there is no due date", () => {
    expect(isOverdue(2500, undefined, new Date(2026, 7, 5))).toBe(false);
  });

  it("is false when the balance is settled, however old the due date", () => {
    expect(isOverdue(0, due, new Date(2026, 11, 31))).toBe(false);
  });

  it("is true when the due date has passed and a balance remains", () => {
    expect(isOverdue(2500, due, new Date(2026, 7, 5))).toBe(true);
  });

  it("is false on the due date itself", () => {
    expect(isOverdue(2500, due, new Date(2026, 7, 1, 23, 59))).toBe(false);
  });
});
