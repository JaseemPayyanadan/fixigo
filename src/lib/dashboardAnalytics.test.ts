import { describe, expect, it } from "vitest";

import {
  activeServicesKpi,
  buildDailySeries,
  buildInsights,
  countDelayed,
  countOpenAsOf,
  filterByPeriod,
  getPeriodRange,
  metricsForDay,
  recentDays,
  revenueTrend,
  periodDelta,
  pipelineBreakdown,
  statusBreakdown,
  summarize,
  topServices,
  technicianPerformance,
  todayCounts,
  topTechnicians,
  weeklySeries,
} from "@/lib/dashboardAnalytics";
import type { Service, Technician } from "@/types";

// Fixed clock: 2026-07-23, mid-month, so "this month" is a partial window.
const NOW = new Date(2026, 6, 23, 14, 30);

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Screen replacement",
    description: "",
    customer: { name: "Test", phone: "", email: "" },
    device: { type: "phone", brand: "Acme", model: "X" },
    status: "pending",
    priority: "medium",
    shopId: "shop-1",
    branchId: "branch-1",
    price: 100,
    createdAt: new Date(2026, 6, 10),
    updatedAt: new Date(2026, 6, 10),
    ...overrides,
  } as Service;
}

function technician(id: string, name: string): Technician {
  return { id, name } as Technician;
}

describe("getPeriodRange", () => {
  it("bounds this month from the 1st to now", () => {
    const { current } = getPeriodRange("this_month", NOW);
    expect(current.start).toEqual(new Date(2026, 6, 1));
    expect(current.end.getDate()).toBe(23);
  });

  it("uses the whole previous month as the comparison window", () => {
    const { previous } = getPeriodRange("this_month", NOW);
    expect(previous.start).toEqual(new Date(2026, 5, 1));
    expect(previous.end.getMonth()).toBe(5);
    expect(previous.end.getDate()).toBe(30);
  });

  it("bounds last month to that calendar month", () => {
    const { current, previous } = getPeriodRange("last_month", NOW);
    expect(current.start).toEqual(new Date(2026, 5, 1));
    expect(current.end.getMonth()).toBe(5);
    expect(previous.start).toEqual(new Date(2026, 4, 1));
  });

  it("spans three calendar months for last_3_months", () => {
    const { current } = getPeriodRange("last_3_months", NOW);
    expect(current.start).toEqual(new Date(2026, 4, 1));
  });

  it("rolls the year backwards in January", () => {
    const { current } = getPeriodRange("last_month", new Date(2026, 0, 15));
    expect(current.start).toEqual(new Date(2025, 11, 1));
  });
});

describe("filterByPeriod", () => {
  it("keeps only services created inside the window", () => {
    const services = [
      service({ createdAt: new Date(2026, 6, 5) }),
      service({ createdAt: new Date(2026, 5, 28) }),
    ];
    expect(filterByPeriod(services, "this_month", NOW)).toHaveLength(1);
  });

  it("includes a service created on the first instant of the window", () => {
    const services = [service({ createdAt: new Date(2026, 6, 1, 0, 0, 0) })];
    expect(filterByPeriod(services, "this_month", NOW)).toHaveLength(1);
  });

  it("drops services with an unreadable createdAt rather than bucketing them at epoch", () => {
    const services = [service({ createdAt: undefined as unknown as Date })];
    expect(filterByPeriod(services, "this_month", NOW)).toHaveLength(0);
  });
});

describe("statusBreakdown", () => {
  it("groups the eight lifecycle states into three buckets", () => {
    const { buckets, total } = statusBreakdown([
      service({ status: "completed" }),
      service({ status: "in_progress" }),
      service({ status: "awaiting_parts" }),
      service({ status: "pending" }),
    ]);

    expect(total).toBe(4);
    expect(buckets.find((b) => b.key === "completed")?.count).toBe(1);
    expect(buckets.find((b) => b.key === "in_progress")?.count).toBe(2);
    expect(buckets.find((b) => b.key === "to_do")?.count).toBe(1);
  });

  it("excludes cancelled services from the total", () => {
    const { total, buckets } = statusBreakdown([
      service({ status: "completed" }),
      service({ status: "cancelled" }),
    ]);

    expect(total).toBe(1);
    expect(buckets.find((b) => b.key === "completed")?.percentage).toBe(100);
  });

  it("returns zero percentages instead of NaN when there is nothing to divide by", () => {
    const { buckets, total } = statusBreakdown([]);
    expect(total).toBe(0);
    expect(buckets.every((b) => b.percentage === 0)).toBe(true);
  });

  it("percentages sum to 100 across non-empty buckets", () => {
    const { buckets } = statusBreakdown([
      service({ status: "completed" }),
      service({ status: "completed" }),
      service({ status: "pending" }),
    ]);
    const sum = buckets.reduce((acc, b) => acc + b.percentage, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe("buildDailySeries", () => {
  it("emits one point per day for a month window", () => {
    const points = buildDailySeries([], "this_month", NOW);
    expect(points).toHaveLength(23);
  });

  it("switches to weekly buckets when the span exceeds 45 days", () => {
    const points = buildDailySeries([], "last_3_months", NOW);
    // 1 May - 23 Jul is 84 days => 12 weekly buckets
    expect(points).toHaveLength(12);
  });

  it("accumulates the total across buckets", () => {
    const points = buildDailySeries(
      [service({ createdAt: new Date(2026, 6, 2) }), service({ createdAt: new Date(2026, 6, 4) })],
      "this_month",
      NOW
    );

    expect(points[0].total).toBe(0);
    expect(points[1].total).toBe(1);
    expect(points[3].total).toBe(2);
    expect(points.at(-1)?.total).toBe(2);
  });

  it("treats pending as open backlog, not a running sum", () => {
    const points = buildDailySeries(
      [
        service({
          createdAt: new Date(2026, 6, 2),
          status: "completed",
          completedDate: new Date(2026, 6, 5),
        }),
      ],
      "this_month",
      NOW
    );

    expect(points[2].pending).toBe(1); // created, not yet completed
    expect(points[5].pending).toBe(0); // completed, backlog cleared
    expect(points[5].completed).toBe(1);
  });

  it("never reports negative backlog", () => {
    const points = buildDailySeries(
      [
        service({
          createdAt: new Date(2026, 6, 20),
          status: "completed",
          completedDate: new Date(2026, 6, 2),
        }),
      ],
      "this_month",
      NOW
    );

    expect(points.every((p) => p.pending >= 0)).toBe(true);
  });

  it("ignores services created outside the window", () => {
    const points = buildDailySeries([service({ createdAt: new Date(2026, 3, 1) })], "this_month", NOW);
    expect(points.at(-1)?.total).toBe(0);
  });
});

describe("periodDelta", () => {
  it("computes percentage growth", () => {
    expect(periodDelta(120, 100)).toBeCloseTo(20);
  });

  it("computes percentage decline", () => {
    expect(periodDelta(80, 100)).toBeCloseTo(-20);
  });

  it("returns null when the prior period was empty, rather than inventing +100%", () => {
    expect(periodDelta(5, 0)).toBeNull();
  });

  it("returns null for a non-finite input", () => {
    expect(periodDelta(Number.NaN, 10)).toBeNull();
  });
});

describe("topServices", () => {
  it("ranks by frequency", () => {
    const ranked = topServices([
      service({ name: "Battery" }),
      service({ name: "Screen" }),
      service({ name: "Battery" }),
    ]);

    expect(ranked[0]).toMatchObject({ label: "Battery", count: 2 });
    expect(ranked[1]).toMatchObject({ label: "Screen", count: 1 });
  });

  it("breaks ties alphabetically so the order is stable", () => {
    const ranked = topServices([service({ name: "Zebra" }), service({ name: "Apple" })]);
    expect(ranked.map((r) => r.label)).toEqual(["Apple", "Zebra"]);
  });

  it("honours the limit", () => {
    const services = ["a", "b", "c", "d", "e"].map((name) => service({ name }));
    expect(topServices(services, 3)).toHaveLength(3);
  });

  it("skips services with a blank name", () => {
    expect(topServices([service({ name: "  " })])).toHaveLength(0);
  });
});

describe("topTechnicians", () => {
  const technicians = [technician("t1", "Fasna"), technician("t2", "Anshid")];

  it("resolves technician ids to names", () => {
    const ranked = topTechnicians(
      [service({ technician_id: "t1" }), service({ technician_id: "t1" }), service({ technician_id: "t2" })],
      technicians
    );

    expect(ranked[0]).toMatchObject({ label: "Fasna", count: 2 });
  });

  // ServiceForm stores `user.id` when a technician files their own job, and only
  // rewrites it to the technician document id once the technicians list has
  // loaded — so one person's work can be split across two ids in the data.
  it("credits work filed under a technician's user id to the same person", () => {
    const linked = { id: "t3", name: "Rijas", userId: "user-99" } as Technician;

    const ranked = topTechnicians(
      [
        service({ technician_id: "t3" }),
        service({ technician_id: "user-99" }),
        service({ technician_id: "user-99" }),
      ],
      [linked]
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ label: "Rijas", count: 3 });
  });

  it("labels unresolvable technician ids as unknown rather than leaking the id", () => {
    const ranked = topTechnicians([service({ technician_id: "ghost" })], technicians);
    expect(ranked[0].label).toBe("Unknown technician");
    // The job is assigned — we just cannot name the assignee. Calling it
    // "Unassigned" would hide work that still has an owner.
    expect(ranked[0].label).not.toBe("Unassigned");
  });

  it("ignores services with no technician", () => {
    expect(topTechnicians([service({ technician_id: undefined })], technicians)).toHaveLength(0);
  });
});

describe("summarize", () => {
  it("counts each bucket and sums revenue from completed services only", () => {
    const result = summarize([
      service({ status: "completed", price: 300 }),
      service({ status: "in_progress", price: 200 }),
      service({ status: "pending", price: 100 }),
    ]);

    expect(result).toMatchObject({
      totalServices: 3,
      completedServices: 1,
      activeServices: 1,
      pendingServices: 1,
      revenue: 300,
    });
  });

  it("excludes cancelled services from revenue even when they carry a price", () => {
    const result = summarize([service({ status: "cancelled", price: 500 })]);
    expect(result.revenue).toBe(0);
  });

  it("ignores a non-numeric price instead of producing NaN revenue", () => {
    const result = summarize([service({ status: "completed", price: undefined as unknown as number })]);
    expect(result.revenue).toBe(0);
  });

  it("counts a service the customer has paid for even before the work is finished", () => {
    const result = summarize([
      service({ status: "ready_for_pickup", paymentStatus: "paid", price: 400 }),
    ]);
    expect(result.revenue).toBe(400);
  });

  it("books completed work as revenue even when it has not been collected yet", () => {
    const result = summarize([service({ status: "completed", paymentStatus: "pending", price: 700 })]);
    expect(result).toMatchObject({ completedServices: 1, revenue: 700 });
  });

  it("leaves unfinished, unpaid work out of revenue", () => {
    const result = summarize([service({ status: "in_progress", paymentStatus: "pending", price: 700 })]);
    expect(result.revenue).toBe(0);
  });
});

describe("pipelineBreakdown", () => {
  it("returns every open stage even when a status has no services", () => {
    const { stages, total } = pipelineBreakdown([service({ status: "pending" })]);
    expect(stages).toHaveLength(6);
    expect(total).toBe(1);
    expect(stages.find((s) => s.status === "awaiting_parts")).toMatchObject({ count: 0, fraction: 0 });
  });

  it("splits fractions by share of open work only", () => {
    const { stages, total } = pipelineBreakdown([
      service({ status: "pending" }),
      service({ status: "pending" }),
      service({ status: "completed" }),
      service({ status: "completed" }),
    ]);

    expect(total).toBe(2);
    expect(stages.find((s) => s.status === "pending")).toMatchObject({ count: 2, fraction: 1 });
    expect(stages.find((s) => s.status === "completed")).toBeUndefined();
  });

  it("does not divide by zero when there are no services", () => {
    const { stages, total } = pipelineBreakdown([]);
    expect(total).toBe(0);
    expect(stages.every((s) => s.fraction === 0)).toBe(true);
  });

  it("excludes cancelled work from the pipeline", () => {
    const { total } = pipelineBreakdown([service({ status: "cancelled" }), service({ status: "pending" })]);
    expect(total).toBe(1);
  });
});

describe("todayCounts", () => {
  it("counts services created today, not earlier ones", () => {
    const counts = todayCounts(
      [service({ createdAt: NOW }), service({ createdAt: new Date(2026, 6, 22, 23, 59) })],
      NOW
    );
    expect(counts.received).toBe(1);
  });

  it("counts a service completed at 23:59 today but not one at 00:01 tomorrow", () => {
    const counts = todayCounts(
      [
        service({ status: "completed", completedDate: new Date(2026, 6, 23, 23, 59) }),
        service({ status: "completed", completedDate: new Date(2026, 6, 24, 0, 1) }),
      ],
      NOW
    );
    expect(counts.completedToday).toBe(1);
  });

  it("buckets open work by status regardless of age", () => {
    const counts = todayCounts(
      [
        service({ status: "in_progress", createdAt: new Date(2026, 0, 1) }),
        service({ status: "awaiting_parts", createdAt: new Date(2026, 0, 1) }),
        service({ status: "ready_for_pickup", createdAt: new Date(2026, 0, 1) }),
      ],
      NOW
    );
    expect(counts).toMatchObject({ repairing: 1, waitingParts: 1, readyForDelivery: 1 });
  });
});

describe("countDelayed", () => {
  it("counts open work past its estimated completion", () => {
    expect(countDelayed([service({ estimatedCompletion: new Date(2026, 6, 20) })], NOW)).toBe(1);
  });

  it("ignores work that is already completed or cancelled", () => {
    const overdue = new Date(2026, 6, 20);
    const services = [
      service({ status: "completed", estimatedCompletion: overdue }),
      service({ status: "cancelled", estimatedCompletion: overdue }),
    ];
    expect(countDelayed(services, NOW)).toBe(0);
  });

  it("ignores services with no estimate rather than treating them as overdue", () => {
    expect(countDelayed([service({ estimatedCompletion: undefined })], NOW)).toBe(0);
  });
});

describe("technicianPerformance", () => {
  const tech = technician("t1", "Nijin");

  it("returns null rating and avgDays for a technician with no completed work", () => {
    const rows = technicianPerformance([service({ technician_id: "t1", status: "pending" })], [tech]);
    expect(rows[0]).toMatchObject({ completed: 0, active: 1, avgDays: null, rating: null });
  });

  it("merges work filed under a technician's user id into one row", () => {
    const linked = { id: "t9", name: "Rijas", userId: "user-42" } as Technician;

    const rows = technicianPerformance(
      [
        service({ technician_id: "t9", status: "completed" }),
        service({ technician_id: "user-42", status: "completed" }),
        service({ technician_id: "user-42", status: "in_progress" }),
      ],
      [linked]
    );

    // One person, not a named row plus an "Unknown technician" row.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "t9", name: "Rijas", completed: 2, active: 1 });
    expect(rows[0].completionRate).toBeCloseTo(2 / 3);
  });

  it("averages duration in days over completed work only", () => {
    const rows = technicianPerformance(
      [
        service({ technician_id: "t1", status: "completed", actualDuration: 1440 }),
        service({ technician_id: "t1", status: "completed", actualDuration: 2880 }),
        service({ technician_id: "t1", status: "pending", actualDuration: 99999 }),
      ],
      [tech]
    );
    expect(rows[0].avgDays).toBe(1.5);
  });

  it("averages only rated feedback", () => {
    const rows = technicianPerformance(
      [
        service({ technician_id: "t1", status: "completed", customerFeedback: { rating: 5, date: NOW } }),
        service({ technician_id: "t1", status: "completed", customerFeedback: { rating: 4, date: NOW } }),
        service({ technician_id: "t1", status: "completed" }),
      ],
      [tech]
    );
    expect(rows[0].rating).toBe(4.5);
  });

  it("reports completion rate as a 0-1 share of that technician's work", () => {
    const rows = technicianPerformance(
      [
        service({ technician_id: "t1", status: "completed" }),
        service({ technician_id: "t1", status: "completed" }),
        service({ technician_id: "t1", status: "completed" }),
        service({ technician_id: "t1", status: "pending" }),
      ],
      [tech]
    );
    expect(rows[0].completionRate).toBe(0.75);
  });

  it("derives initials from the technician name", () => {
    const rows = technicianPerformance([service({ technician_id: "t1" })], [technician("t1", "Arun Kumar")]);
    expect(rows[0].initials).toBe("AK");
  });

  it("omits technicians with no services at all", () => {
    const rows = technicianPerformance([], [tech]);
    expect(rows).toEqual([]);
  });
});

describe("weeklySeries", () => {
  it("returns Monday through Sunday of the current week", () => {
    const points = weeklySeries([], NOW);
    expect(points).toHaveLength(7);
    expect(points[0].label).toBe("Mon");
    expect(points[6].label).toBe("Sun");
  });

  it("zero-fills days with no work", () => {
    const points = weeklySeries([service({ createdAt: NOW })], NOW);
    expect(points.reduce((sum, p) => sum + p.count, 0)).toBe(1);
    expect(points.filter((p) => p.count === 0)).toHaveLength(6);
  });

  it("excludes services outside the current week", () => {
    const points = weeklySeries([service({ createdAt: new Date(2026, 6, 1) })], NOW);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });
});

describe("revenueTrend", () => {
  /** Paid on `date` for `price`, dated by `paidAt` so the fallbacks stay out of it. */
  function paid(date: Date, price: number): Service {
    return service({ status: "completed", paymentStatus: "paid", paidAt: date, price });
  }

  it("returns one point per day of the window, oldest first and ending today", () => {
    const { points } = revenueTrend([], 30, NOW);
    expect(points).toHaveLength(30);
    expect(points[0].date).toEqual(new Date(2026, 5, 24));
    expect(points[29].date).toEqual(new Date(2026, 6, 23));
  });

  it("labels points by day and short month", () => {
    const { points } = revenueTrend([], 30, NOW);
    expect(points[0].label).toBe("24 Jun");
    expect(points[29].label).toBe("23 Jul");
  });

  it("follows the requested window length", () => {
    expect(revenueTrend([], 7, NOW).points).toHaveLength(7);
    expect(revenueTrend([], 90, NOW).points).toHaveLength(90);
  });

  it("sums takings onto the day the money came in", () => {
    const { points, total } = revenueTrend([paid(new Date(2026, 6, 23, 9), 500), paid(new Date(2026, 6, 23, 18), 250)], 30, NOW);
    expect(points[29].revenue).toBe(750);
    expect(total).toBe(750);
  });

  it("zero-fills days with no takings", () => {
    const { points } = revenueTrend([paid(NOW, 500)], 30, NOW);
    expect(points.filter((p) => p.revenue === 0)).toHaveLength(29);
  });

  it("plots a repair on the day it was marked paid", () => {
    // The shape `setServicePayment` writes: the flag, and when it was set.
    const { points, total } = revenueTrend(
      [service({ status: "ready_for_pickup", paymentStatus: "paid", paidAt: new Date(2026, 6, 20), price: 3000 })],
      30,
      NOW
    );
    expect(total).toBe(3000);
    expect(points[26].revenue).toBe(3000); // 20 Jul, the 27th day of the window
  });

  it("dates money by when it was taken, not when the work finished", () => {
    const { points } = revenueTrend(
      [
        service({
          status: "completed",
          paymentStatus: "paid",
          completedDate: new Date(2026, 6, 1),
          paidAt: new Date(2026, 6, 23),
          price: 2000,
        }),
      ],
      30,
      NOW
    );
    expect(points[29].revenue).toBe(2000); // paid today
    expect(points[7].revenue).toBe(0); // completed on the 1st
  });

  it("still counts repairs completed before payment tracking existed", () => {
    // No paymentStatus and no paidAt: completion is both the marking and the date.
    const { total } = revenueTrend(
      [service({ status: "completed", completedDate: new Date(2026, 6, 15), price: 1500 })],
      30,
      NOW
    );
    expect(total).toBe(1500);
  });

  it("leaves a paid repair off the chart when nothing dates the payment", () => {
    // Marked paid but with no paidAt and no completion date — there is no
    // honest day to plot it on, so it is counted nowhere rather than today.
    const { total } = revenueTrend([service({ status: "ready_for_pickup", paymentStatus: "paid", price: 4000 })], 30, NOW);
    expect(total).toBe(0);
  });

  it("plots completed work whether or not it has been collected", () => {
    const { total } = revenueTrend(
      [service({ status: "completed", paymentStatus: "pending", price: 900, completedDate: NOW })],
      30,
      NOW
    );
    expect(total).toBe(900);
  });

  it("leaves work that is neither finished nor paid off the chart", () => {
    const { total } = revenueTrend(
      [service({ status: "in_progress", paymentStatus: "pending", price: 900, createdAt: NOW })],
      30,
      NOW
    );
    expect(total).toBe(0);
  });

  it("leaves cancelled work off the chart even when it carries a price", () => {
    const { total } = revenueTrend([service({ status: "cancelled", price: 4000, completedDate: NOW })], 30, NOW);
    expect(total).toBe(0);
  });

  it("ignores a non-numeric price instead of producing NaN revenue", () => {
    const { total } = revenueTrend([paid(NOW, undefined as unknown as number)], 30, NOW);
    expect(total).toBe(0);
  });

  it("counts the preceding window of the same length as the comparison", () => {
    const { total, previousTotal } = revenueTrend([paid(NOW, 400), paid(new Date(2026, 5, 20), 200)], 30, NOW);
    expect(total).toBe(400);
    expect(previousTotal).toBe(200);
  });

  it("leaves takings older than both windows out of the comparison", () => {
    const { previousTotal } = revenueTrend([paid(new Date(2026, 2, 1), 5000)], 30, NOW);
    expect(previousTotal).toBe(0);
  });

  it("reports the change against the previous window as a percentage", () => {
    const { delta } = revenueTrend([paid(NOW, 120), paid(new Date(2026, 5, 20), 100)], 30, NOW);
    expect(delta).toBeCloseTo(20);
  });

  it("has no delta to report when the previous window earned nothing", () => {
    expect(revenueTrend([paid(NOW, 400)], 30, NOW).delta).toBeNull();
  });
});

describe("buildInsights", () => {
  it("returns nothing when no insight applies", () => {
    expect(buildInsights([], [], NOW)).toEqual([]);
  });

  it("reports delayed work when some exists", () => {
    const insights = buildInsights([service({ estimatedCompletion: new Date(2026, 6, 20) })], [], NOW);
    expect(insights.some((i) => i.kind === "delay")).toBe(true);
  });

  it("names the most common repair when there is work to rank", () => {
    const insights = buildInsights([service({ name: "Battery replacement" }), service({ name: "Battery replacement" })], [], NOW);
    expect(insights.find((i) => i.kind === "repair")?.text).toContain("Battery replacement");
  });
});

describe("countOpenAsOf", () => {
  it("counts work created by the date and not yet completed then", () => {
    const services = [
      service({ createdAt: new Date(2026, 6, 1), status: "in_progress" }),
      service({ createdAt: new Date(2026, 6, 1), status: "completed", completedDate: new Date(2026, 6, 5) }),
    ];
    // On the 3rd both were still open; by the 10th one had been completed.
    expect(countOpenAsOf(services, new Date(2026, 6, 3))).toBe(2);
    expect(countOpenAsOf(services, new Date(2026, 6, 10))).toBe(1);
  });

  it("ignores work created after the date", () => {
    expect(countOpenAsOf([service({ createdAt: new Date(2026, 6, 20) })], new Date(2026, 6, 10))).toBe(0);
  });

  it("excludes cancelled work", () => {
    const services = [service({ createdAt: new Date(2026, 6, 1), status: "cancelled" })];
    expect(countOpenAsOf(services, new Date(2026, 6, 10))).toBe(0);
  });
});

describe("metricsForDay", () => {
  it("sums revenue from work completed that day only", () => {
    const services = [
      service({ status: "completed", price: 500, completedDate: new Date(2026, 6, 23, 10, 0) }),
      service({ status: "completed", price: 900, completedDate: new Date(2026, 6, 22, 10, 0) }),
    ];
    expect(metricsForDay(services, NOW).revenue).toBe(500);
  });

  it("dates revenue by when payment was taken, not when the work finished", () => {
    const services = [
      service({
        status: "completed",
        price: 500,
        completedDate: new Date(2026, 6, 20, 10, 0),
        paymentStatus: "paid",
        paidAt: NOW,
      }),
    ];
    expect(metricsForDay(services, NOW).revenue).toBe(500);
    expect(metricsForDay(services, new Date(2026, 6, 20, 12)).revenue).toBe(0);
  });

  it("books uncollected work on the day it was completed", () => {
    const services = [
      service({ status: "completed", price: 500, completedDate: NOW, paymentStatus: "pending" }),
    ];
    expect(metricsForDay(services, NOW)).toMatchObject({ revenue: 500, completed: 1 });
  });

  it("counts work received that day", () => {
    const services = [service({ createdAt: NOW }), service({ createdAt: new Date(2026, 6, 22) })];
    expect(metricsForDay(services, NOW).received).toBe(1);
  });

  it("reports devices still open at the end of that day", () => {
    const services = [
      service({ createdAt: new Date(2026, 6, 20), status: "in_progress" }),
      service({ createdAt: new Date(2026, 6, 20), status: "completed", completedDate: new Date(2026, 6, 21) }),
    ];
    expect(metricsForDay(services, NOW).open).toBe(1);
    expect(metricsForDay(services, new Date(2026, 6, 20, 12)).open).toBe(2);
  });

  it("returns zeroes for a day with no activity", () => {
    expect(metricsForDay([], NOW)).toMatchObject({ revenue: 0, completed: 0, received: 0, open: 0 });
  });
});

describe("recentDays", () => {
  it("returns one entry per day, oldest first, ending today", () => {
    const days = recentDays([], 7, NOW);
    expect(days).toHaveLength(7);
    expect(days[6].date.getDate()).toBe(23);
    expect(days[0].date.getDate()).toBe(17);
  });

  it("places a service's revenue on the day it was completed", () => {
    const days = recentDays(
      [service({ status: "completed", price: 400, completedDate: new Date(2026, 6, 21, 9, 0) })],
      7,
      NOW
    );
    expect(days.find((d) => d.date.getDate() === 21)?.revenue).toBe(400);
    expect(days.find((d) => d.date.getDate() === 23)?.revenue).toBe(0);
  });
});

describe("activeServicesKpi", () => {
  it("plots the reconstructed open count so the sparkline has a real series", () => {
    const services = [
      service({ createdAt: new Date(2026, 6, 10), status: "in_progress" }),
      service({ createdAt: new Date(2026, 6, 20), status: "completed", completedDate: new Date(2026, 6, 21) }),
    ];

    const kpi = activeServicesKpi(services, NOW, 5);

    // 19th: one open; 20th: both; 21st onward: the completed job has left.
    expect(kpi.trend).toEqual([1, 2, 1, 1, 1]);
    expect(kpi.value).toBe(1);
    expect(kpi.trend.at(-1)).toBe(kpi.value);
    expect(kpi.delta).toBe(0);
  });

  it("reports a delta when today's open count differs from yesterday's", () => {
    const services = [
      service({ createdAt: new Date(2026, 6, 10), status: "in_progress" }),
      service({ createdAt: new Date(2026, 6, 23), status: "pending" }),
    ];

    const kpi = activeServicesKpi(services, NOW, 3);

    expect(kpi.trend).toEqual([1, 1, 2]);
    expect(kpi.value).toBe(2);
    expect(kpi.delta).toBe(100);
  });
});
