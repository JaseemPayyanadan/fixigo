// Date-bucketing across a daylight-saving transition.
//
// Kept in its own file because it pins the timezone process-wide: vitest runs
// each test file in its own worker, so the override cannot leak into suites
// that assume the machine's local zone.
//
// The app currently serves IST, which has no DST — so none of this is reachable
// today. It is covered anyway because the failure is silent (a bar chart quietly
// drops or doubles one day, twice a year) and would be very hard to trace back
// from a bug report.

process.env.TZ = "America/New_York";

import { describe, expect, it } from "vitest";

import { buildDailySeries, recentDays, weeklySeries } from "./dashboardAnalytics";
import type { Service } from "@/types";

// US clocks go back on 2 November 2025 — that day is 25 hours long.
const FALL_BACK = new Date(2025, 10, 2);

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: "s1",
    name: "Screen Replacement",
    description: "",
    customer: { name: "A", phone: "", email: "" },
    device: {} as Service["device"],
    status: "pending",
    priority: "medium",
    shopId: "shop1",
    branchId: "branch1",
    price: 100,
    createdAt: FALL_BACK,
    updatedAt: FALL_BACK,
    ...overrides,
  } as Service;
}

/** Local calendar day, so a one-hour drift shows up as a different string. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

describe("day bucketing across a DST transition", () => {
  it("confirms the fixture week actually contains a transition", () => {
    expect(new Date(2025, 10, 1).getTimezoneOffset()).not.toBe(new Date(2025, 10, 3).getTimezoneOffset());
  });

  it("recentDays walks back one calendar day at a time", () => {
    const days = recentDays([], 5, new Date(2025, 10, 4, 12, 0, 0));

    expect(days.map((day) => dayKey(day.date))).toEqual([
      "2025-10-31",
      "2025-11-1",
      "2025-11-2",
      "2025-11-3",
      "2025-11-4",
    ]);
  });

  it("recentDays lands every bucket on midnight, not an hour either side", () => {
    for (const day of recentDays([], 5, new Date(2025, 10, 4, 12, 0, 0))) {
      expect(day.date.getHours()).toBe(0);
    }
  });

  // Going back across a *spring-forward* boundary is the dangerous direction:
  // the short day leaves the subtraction an hour shy of midnight, which is the
  // previous calendar day, so the whole sparkline slides one day out of step.
  it("recentDays walks back correctly across spring-forward too", () => {
    // US clocks go forward on 9 March 2025 — that day is 23 hours long.
    const days = recentDays([], 5, new Date(2025, 2, 12, 12, 0, 0));

    expect(days.map((day) => dayKey(day.date))).toEqual([
      "2025-3-8",
      "2025-3-9",
      "2025-3-10",
      "2025-3-11",
      "2025-3-12",
    ]);
  });

  it("attributes a service to the right day across spring-forward", () => {
    const completedOn = new Date(2025, 2, 8, 10, 0, 0);
    const days = recentDays(
      [service({ status: "completed", price: 250, completedDate: completedOn, createdAt: completedOn })],
      5,
      new Date(2025, 2, 12, 12, 0, 0)
    );

    expect(days[0].completed).toBe(1);
    expect(days[0].revenue).toBe(250);
    expect(days.reduce((sum, day) => sum + day.completed, 0)).toBe(1);
  });

  it("weeklySeries spans Monday to Sunday without repeating or skipping a day", () => {
    // 2 November 2025 is the Sunday of the week beginning Monday 27 October.
    const week = weeklySeries([], new Date(2025, 10, 2, 12, 0, 0));

    expect(week.map((point) => dayKey(point.date))).toEqual([
      "2025-10-27",
      "2025-10-28",
      "2025-10-29",
      "2025-10-30",
      "2025-10-31",
      "2025-11-1",
      "2025-11-2",
    ]);
  });

  it("counts a service created on the transition day under that weekday", () => {
    const week = weeklySeries(
      [service({ createdAt: new Date(2025, 10, 2, 9, 0, 0) })],
      new Date(2025, 10, 2, 12, 0, 0)
    );

    const sunday = week[6];
    expect(sunday.label).toBe("Sun");
    expect(sunday.count).toBe(1);
    expect(week.reduce((sum, point) => sum + point.count, 0)).toBe(1);
  });

  it("buildDailySeries emits one bucket per calendar day", () => {
    const points = buildDailySeries([], "this_month", new Date(2025, 10, 10, 12, 0, 0));

    expect(points).toHaveLength(10);
    expect(points.map((point) => dayKey(point.date))).toEqual([
      "2025-11-1",
      "2025-11-2",
      "2025-11-3",
      "2025-11-4",
      "2025-11-5",
      "2025-11-6",
      "2025-11-7",
      "2025-11-8",
      "2025-11-9",
      "2025-11-10",
    ]);
  });
});
