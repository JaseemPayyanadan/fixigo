import { describe, expect, it } from "vitest";

import {
  buildDailySeries,
  filterByPeriod,
  getPeriodRange,
  periodDelta,
  statusBreakdown,
  summarize,
  topServices,
  topTechnicians,
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

  it("labels unknown technician ids as Unassigned rather than leaking the id", () => {
    const ranked = topTechnicians([service({ technician_id: "ghost" })], technicians);
    expect(ranked[0].label).toBe("Unassigned");
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
});
