import { describe, expect, it } from "vitest";

import {
  countsAsRevenue,
  isPaid,
  isPartiallyPaid,
  outstandingAmountOf,
  paidDateOf,
  paymentLabelOf,
  paymentStatusOf,
  shouldOpenCollectPaymentModal,
} from "@/lib/paymentUtils";

describe("paymentStatusOf", () => {
  it("uses the stored flag when the document carries one", () => {
    expect(paymentStatusOf({ status: "completed", paymentStatus: "pending" })).toBe("pending");
    expect(paymentStatusOf({ status: "in_progress", paymentStatus: "paid" })).toBe("paid");
  });

  it("reads a completed service with no flag as paid, so historical revenue survives", () => {
    expect(paymentStatusOf({ status: "completed" })).toBe("paid");
    expect(paymentStatusOf({ status: "Completed" })).toBe("paid");
  });

  it("reads unfinished work with no flag as pending", () => {
    expect(paymentStatusOf({ status: "in_progress" })).toBe("pending");
    expect(paymentStatusOf({ status: "ready_for_pickup" })).toBe("pending");
    expect(paymentStatusOf({})).toBe("pending");
  });

  it("does not treat a cancelled service as paid", () => {
    expect(isPaid({ status: "cancelled" })).toBe(false);
  });
});

describe("countsAsRevenue", () => {
  it("books a completed repair whether or not the money has been collected", () => {
    expect(countsAsRevenue({ status: "completed", paymentStatus: "pending" })).toBe(true);
    expect(countsAsRevenue({ status: "completed", paymentStatus: "paid" })).toBe(true);
    expect(countsAsRevenue({ status: "completed" })).toBe(true);
  });

  it("books work paid for before it is finished", () => {
    expect(countsAsRevenue({ status: "ready_for_pickup", paymentStatus: "paid" })).toBe(true);
  });

  it("leaves unfinished, unpaid work out", () => {
    expect(countsAsRevenue({ status: "in_progress" })).toBe(false);
    expect(countsAsRevenue({ status: "pending", paymentStatus: "pending" })).toBe(false);
    expect(countsAsRevenue({ status: "awaiting_parts" })).toBe(false);
  });

  it("never books cancelled work", () => {
    expect(countsAsRevenue({ status: "cancelled" })).toBe(false);
    expect(countsAsRevenue({ status: "cancelled", paymentStatus: "pending" })).toBe(false);
  });

  it("reads a display-cased status the same as a stored one", () => {
    expect(countsAsRevenue({ status: "Completed" })).toBe(true);
  });

  it("is distinct from isPaid, which still answers whether money was collected", () => {
    const finishedButOwed = { status: "completed", paymentStatus: "pending" } as const;
    expect(countsAsRevenue(finishedButOwed)).toBe(true);
    expect(isPaid(finishedButOwed)).toBe(false);
  });
});

describe("paidDateOf", () => {
  const paidAt = new Date(2026, 6, 20);
  const completedDate = new Date(2026, 6, 18);
  const actualCompletion = new Date(2026, 6, 17);

  it("prefers the payment timestamp", () => {
    expect(paidDateOf({ paidAt, completedDate, actualCompletion })).toEqual(paidAt);
  });

  it("falls back to completion for services settled before payment tracking existed", () => {
    expect(paidDateOf({ completedDate, actualCompletion })).toEqual(completedDate);
    expect(paidDateOf({ actualCompletion })).toEqual(actualCompletion);
  });

  it("returns undefined rather than inventing a date", () => {
    expect(paidDateOf({ status: "completed" })).toBeUndefined();
  });
});


describe("partial payment helpers", () => {
  it("labels partial and computes outstanding", () => {
    const service = { status: "completed", paymentStatus: "partial" as const, paidAmount: 400, price: 1000 };
    expect(paymentLabelOf(service)).toBe("Partially Paid");
    expect(isPartiallyPaid(service)).toBe(true);
    expect(isPaid(service)).toBe(false);
    expect(outstandingAmountOf(service)).toBe(600);
  });

  it("treats paid as zero outstanding", () => {
    expect(outstandingAmountOf({ paymentStatus: "paid", price: 1000 })).toBe(0);
  });
});

describe("shouldOpenCollectPaymentModal", () => {
  it("opens when moving to Completed with no prior paymentStatus", () => {
    expect(shouldOpenCollectPaymentModal("Completed", undefined)).toBe(true);
  });

  it("opens when moving to Completed while pending", () => {
    expect(shouldOpenCollectPaymentModal("Completed", "pending")).toBe(true);
  });

  it("does not open when already paid", () => {
    expect(shouldOpenCollectPaymentModal("Completed", "paid")).toBe(false);
  });

  it("opens when only partially paid so staff can settle the balance", () => {
    expect(shouldOpenCollectPaymentModal("Completed", "partial")).toBe(true);
  });

  it("does not open for Ready for Pickup", () => {
    expect(shouldOpenCollectPaymentModal("Ready for Pickup", "pending")).toBe(false);
    expect(shouldOpenCollectPaymentModal("Ready for Pickup", undefined)).toBe(false);
  });

  it("does not open for non-completed statuses", () => {
    expect(shouldOpenCollectPaymentModal("In Progress", "pending")).toBe(false);
    expect(shouldOpenCollectPaymentModal("To Do", undefined)).toBe(false);
  });

  it("normalizes completed variants", () => {
    expect(shouldOpenCollectPaymentModal("completed", "pending")).toBe(true);
    expect(shouldOpenCollectPaymentModal("COMPLETED", undefined)).toBe(true);
  });
});
