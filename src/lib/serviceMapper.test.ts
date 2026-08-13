import { describe, expect, it } from "vitest";

import { countDelayed, metricsForDay } from "./dashboardAnalytics";
import { readOptionalDate } from "./dateUtils";
import { mapServiceDoc } from "./serviceMapper";

const NOW = new Date(2026, 6, 24, 12, 0, 0);

/** Stands in for a Firestore `Timestamp`. */
function ts(date: Date) {
  return { toDate: () => date };
}

describe("readOptionalDate", () => {
  it("unwraps a Firestore timestamp", () => {
    const date = new Date(2026, 0, 2);
    expect(readOptionalDate(ts(date))).toEqual(date);
  });

  it("passes through a Date", () => {
    const date = new Date(2026, 0, 2);
    expect(readOptionalDate(date)).toEqual(date);
  });

  it("parses date strings", () => {
    expect(readOptionalDate("2026-01-02T00:00:00.000Z")).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });

  it("returns undefined for absent or unparseable values", () => {
    expect(readOptionalDate(undefined)).toBeUndefined();
    expect(readOptionalDate(null)).toBeUndefined();
    expect(readOptionalDate("not a date")).toBeUndefined();
    expect(readOptionalDate(new Date("nonsense"))).toBeUndefined();
  });
});

describe("mapServiceDoc payment fields", () => {
  it("reads a stored payment flag and timestamp", () => {
    const paidAt = new Date(2026, 6, 22);
    const service = mapServiceDoc("s1", { paymentStatus: "paid", paidAt: ts(paidAt) }, NOW);

    expect(service.paymentStatus).toBe("paid");
    expect(service.paidAt).toEqual(paidAt);
  });

  it("leaves the flag undefined on documents that predate payment tracking", () => {
    const service = mapServiceDoc("s1", { status: "completed" }, NOW);

    expect(service.paymentStatus).toBeUndefined();
    expect(service.paidAt).toBeUndefined();
  });

  it("ignores a payment status it does not recognise", () => {
    expect(mapServiceDoc("s1", { paymentStatus: "refunded" }, NOW).paymentStatus).toBeUndefined();
  });

  it("maps partial payment with paidAmount", () => {
    const service = mapServiceDoc("s1", { paymentStatus: "partial", paidAmount: 250 }, NOW);
    expect(service.paymentStatus).toBe("partial");
    expect(service.paidAmount).toBe(250);
  });
});

describe("mapServiceDoc reopen fields", () => {
  it("maps reopen metadata when present", () => {
    const reopenedAt = new Date(2026, 7, 3);
    const service = mapServiceDoc(
      "s1",
      {
        isReopened: true,
        reopenReason: "Same issue",
        reopenedAt: ts(reopenedAt),
        reopenCount: 2,
      },
      NOW
    );
    expect(service.isReopened).toBe(true);
    expect(service.reopenReason).toBe("Same issue");
    expect(service.reopenedAt).toEqual(reopenedAt);
    expect(service.reopenCount).toBe(2);
  });

  it("defaults isReopened to false when absent", () => {
    expect(mapServiceDoc("s1", {}, NOW).isReopened).toBe(false);
  });
});

describe("mapServiceDoc statusHistory", () => {
  it("maps and sorts statusHistory newest-first", () => {
    const earlier = new Date(2026, 7, 1);
    const later = new Date(2026, 7, 4);
    const service = mapServiceDoc(
      "s1",
      {
        statusHistory: [
          { status: "pending", timestamp: ts(earlier), updatedBy: "Bob" },
          { status: "completed", timestamp: ts(later), updatedBy: "Ada" },
        ],
      },
      NOW
    );
    expect(service.statusHistory).toEqual([
      { status: "completed", timestamp: later, updatedBy: "Ada" },
      { status: "pending", timestamp: earlier, updatedBy: "Bob" },
    ]);
  });

  it("defaults missing statusHistory to []", () => {
    expect(mapServiceDoc("s1", {}, NOW).statusHistory).toEqual([]);
  });
});

describe("mapServiceDoc", () => {
  it("leaves absent completion dates absent rather than defaulting them to now", () => {
    const service = mapServiceDoc("s1", { status: "completed" }, NOW);

    expect(service.completedDate).toBeUndefined();
    expect(service.actualCompletion).toBeUndefined();
    expect(service.estimatedCompletion).toBeUndefined();
  });

  it("maps completedDate, which the dashboard needs to date completed work", () => {
    const completed = new Date(2026, 6, 20);
    const service = mapServiceDoc("s1", { status: "completed", completedDate: ts(completed) }, NOW);

    expect(service.completedDate).toEqual(completed);
  });

  it("falls back to `now` only for the required createdAt/updatedAt", () => {
    const service = mapServiceDoc("s1", {}, NOW);

    expect(service.createdAt).toEqual(NOW);
    expect(service.updatedAt).toEqual(NOW);
  });
});

// These are the failures the mapping bug actually produced on screen. They
// exercise the mapper and the analytics together, because neither is wrong on
// its own — the damage happens where they meet.
describe("mapped services feeding the dashboard", () => {
  it("does not count historic completed work as completed today", () => {
    const services = [
      // Completed long ago, and the document carries no completion date at all.
      mapServiceDoc("old", { status: "completed", price: 5000, createdAt: ts(new Date(2025, 0, 1)) }, NOW),
    ];

    const today = metricsForDay(services, NOW);

    expect(today.completed).toBe(0);
    expect(today.revenue).toBe(0);
  });

  it("does not count open work without an estimate as delayed", () => {
    const services = [
      mapServiceDoc("open", { status: "in_progress", createdAt: ts(new Date(2026, 6, 1)) }, NOW),
    ];

    expect(countDelayed(services, NOW)).toBe(0);
  });

  it("still counts work that genuinely is overdue or completed today", () => {
    const services = [
      mapServiceDoc(
        "overdue",
        { status: "in_progress", estimatedCompletion: ts(new Date(2026, 6, 1)), createdAt: ts(new Date(2026, 5, 1)) },
        NOW
      ),
      mapServiceDoc(
        "done",
        { status: "completed", price: 1200, completedDate: ts(NOW), createdAt: ts(new Date(2026, 6, 20)) },
        NOW
      ),
    ];

    expect(countDelayed(services, NOW)).toBe(1);
    expect(metricsForDay(services, NOW).completed).toBe(1);
    expect(metricsForDay(services, NOW).revenue).toBe(1200);
  });
});
