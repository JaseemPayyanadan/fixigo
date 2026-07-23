// Pure analytics helpers backing the shop admin dashboard widgets.
//
// Everything here takes plain data and returns plain data: no React, no
// Firestore, no clock reads except the `now` argument callers pass in. That
// keeps the date-bucketing and percentage maths testable, which is where this
// kind of code usually goes quietly wrong.

import { normalizeStatus } from "@/lib/statusUtils";
import type { Service, Technician } from "@/types";

export type DashboardPeriod = "this_month" | "last_month" | "last_3_months";

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
];

export interface DateRange {
  start: Date;
  end: Date;
}

/** The period the user selected, plus the equivalent preceding window used for deltas. */
export interface PeriodRange {
  current: DateRange;
  previous: DateRange;
}

/** One bucket of the Services Overview series. */
export interface SeriesPoint {
  date: Date;
  label: string;
  total: number;
  completed: number;
  pending: number;
}

export type StatusBucketKey = "completed" | "in_progress" | "to_do";

export interface StatusBucket {
  key: StatusBucketKey;
  label: string;
  count: number;
  /** Share of the non-cancelled total, 0-100. `0` when there is nothing to divide by. */
  percentage: number;
}

export interface StatusBreakdown {
  buckets: StatusBucket[];
  total: number;
}

export interface RankedItem {
  id: string;
  label: string;
  count: number;
}

const DAY_MS = 86_400_000;

// Which lifecycle states roll up into each donut segment. `cancelled` is
// deliberately absent: folding abandoned work into any of these three would
// overstate it, so it is excluded from the breakdown entirely.
const STATUS_BUCKETS: Record<StatusBucketKey, { label: string; statuses: string[] }> = {
  completed: { label: "Completed", statuses: ["completed"] },
  in_progress: {
    label: "In Progress",
    statuses: ["in_progress", "awaiting_parts", "quality_check", "on_hold", "ready_for_pickup", "urgent"],
  },
  to_do: { label: "To Do", statuses: ["pending", "to_do"] },
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 0, 0, 0, 0);
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Firestore timestamps arrive as `Date` once mapped, but historical records and
 * partially-migrated documents can carry strings or `undefined`. Anything we
 * cannot read as a date is treated as absent rather than as epoch zero, which
 * would otherwise drag every chart back to 1970.
 */
function toDate(value: unknown): Date | null {
  if (isValidDate(value)) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : null;
  }
  return null;
}

export function getPeriodRange(period: DashboardPeriod, now: Date = new Date()): PeriodRange {
  const thisMonthStart = startOfMonth(now);

  switch (period) {
    case "last_month": {
      const start = addMonths(thisMonthStart, -1);
      const end = new Date(thisMonthStart.getTime() - 1);
      return {
        current: { start, end },
        previous: { start: addMonths(thisMonthStart, -2), end: new Date(start.getTime() - 1) },
      };
    }
    case "last_3_months": {
      const start = addMonths(thisMonthStart, -2);
      return {
        current: { start, end: endOfDay(now) },
        previous: { start: addMonths(thisMonthStart, -5), end: new Date(start.getTime() - 1) },
      };
    }
    case "this_month":
    default: {
      return {
        current: { start: thisMonthStart, end: endOfDay(now) },
        previous: { start: addMonths(thisMonthStart, -1), end: new Date(thisMonthStart.getTime() - 1) },
      };
    }
  }
}

export function filterByRange(services: Service[], range: DateRange): Service[] {
  return services.filter((service) => {
    const created = toDate(service.createdAt);
    if (!created) return false;
    return created >= range.start && created <= range.end;
  });
}

export function filterByPeriod(services: Service[], period: DashboardPeriod, now: Date = new Date()): Service[] {
  return filterByRange(services, getPeriodRange(period, now).current);
}

function bucketKeyFor(status: string): StatusBucketKey | null {
  const normalized = normalizeStatus(status);
  if (normalized === "cancelled") return null;

  for (const [key, config] of Object.entries(STATUS_BUCKETS)) {
    if (config.statuses.includes(normalized)) return key as StatusBucketKey;
  }
  return null;
}

export function statusBreakdown(services: Service[]): StatusBreakdown {
  const counts: Record<StatusBucketKey, number> = { completed: 0, in_progress: 0, to_do: 0 };

  for (const service of services) {
    const key = bucketKeyFor(service.status);
    if (key) counts[key] += 1;
  }

  const total = counts.completed + counts.in_progress + counts.to_do;

  const buckets = (Object.keys(STATUS_BUCKETS) as StatusBucketKey[]).map((key) => ({
    key,
    label: STATUS_BUCKETS[key].label,
    count: counts[key],
    percentage: total === 0 ? 0 : (counts[key] / total) * 100,
  }));

  return { buckets, total };
}

/**
 * Builds the Services Overview series.
 *
 * `total` and `completed` are cumulative through each bucket, so the lines read
 * as growth across the period. `pending` is the open backlog *as of* that
 * bucket (cumulative total minus cumulative completed) rather than a running
 * sum, because a cumulative backlog count would be meaningless.
 *
 * Ranges longer than 45 days bucket by week to keep the path readable.
 */
export function buildDailySeries(services: Service[], period: DashboardPeriod, now: Date = new Date()): SeriesPoint[] {
  const { current } = getPeriodRange(period, now);
  const start = startOfDay(current.start);
  const end = endOfDay(current.end);

  if (end < start) return [];

  const spanDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const bucketDays = spanDays > 45 ? 7 : 1;
  const bucketCount = Math.ceil(spanDays / bucketDays);

  const created = new Array<number>(bucketCount).fill(0);
  const completed = new Array<number>(bucketCount).fill(0);

  const indexFor = (date: Date): number | null => {
    const offset = Math.floor((startOfDay(date).getTime() - start.getTime()) / DAY_MS);
    if (offset < 0 || offset >= spanDays) return null;
    return Math.floor(offset / bucketDays);
  };

  for (const service of services) {
    const createdAt = toDate(service.createdAt);
    if (createdAt) {
      const index = indexFor(createdAt);
      if (index !== null) created[index] += 1;
    }

    // Fall back to `updatedAt` for completed work that predates the
    // `completedDate` field, so older records still land on the curve.
    if (normalizeStatus(service.status) === "completed") {
      const completedAt = toDate(service.completedDate) ?? toDate(service.actualCompletion) ?? toDate(service.updatedAt);
      if (completedAt) {
        const index = indexFor(completedAt);
        if (index !== null) completed[index] += 1;
      }
    }
  }

  const points: SeriesPoint[] = [];
  let runningTotal = 0;
  let runningCompleted = 0;

  for (let i = 0; i < bucketCount; i += 1) {
    runningTotal += created[i];
    runningCompleted += completed[i];

    const bucketDate = new Date(start.getTime() + i * bucketDays * DAY_MS);
    points.push({
      date: bucketDate,
      label: bucketDate.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      total: runningTotal,
      completed: runningCompleted,
      pending: Math.max(0, runningTotal - runningCompleted),
    });
  }

  return points;
}

export function seriesValues(points: SeriesPoint[], key: "total" | "completed" | "pending"): number[] {
  return points.map((point) => point[key]);
}

export function topServices(services: Service[], limit = 4): RankedItem[] {
  const counts = new Map<string, number>();

  for (const service of services) {
    const name = service.name?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return rank(counts, limit);
}

export function topTechnicians(services: Service[], technicians: Technician[], limit = 4): RankedItem[] {
  const names = new Map(technicians.map((technician) => [technician.id, technician.name]));
  const counts = new Map<string, number>();

  for (const service of services) {
    const id = service.technician_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rank(counts, limit).map((item) => ({
    ...item,
    label: names.get(item.id)?.trim() || "Unassigned",
  }));
}

function rank(counts: Map<string, number>, limit: number): RankedItem[] {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: id, count }))
    // Tie-break on label so equal counts render in a stable order rather than
    // shuffling between renders.
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * Percentage change between two periods, or `null` when there is no honest
 * answer. A previous value of zero has no defined growth rate — returning
 * `+100%` there would invent a trend out of nothing.
 */
export function periodDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface MetricSummary {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  activeServices: number;
  revenue: number;
}

export function summarize(services: Service[]): MetricSummary {
  let completedServices = 0;
  let activeServices = 0;
  let pendingServices = 0;
  let revenue = 0;

  for (const service of services) {
    const bucket = bucketKeyFor(service.status);
    if (bucket === "completed") completedServices += 1;
    if (bucket === "in_progress") activeServices += 1;
    if (bucket === "to_do") pendingServices += 1;

    const price = Number(service.price);
    if (Number.isFinite(price)) revenue += price;
  }

  return {
    totalServices: services.length,
    pendingServices,
    completedServices,
    activeServices,
    revenue,
  };
}
