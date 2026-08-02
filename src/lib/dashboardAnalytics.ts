// Pure analytics helpers backing the shop admin dashboard widgets.
//
// Everything here takes plain data and returns plain data: no React, no
// Firestore, no clock reads except the `now` argument callers pass in. That
// keeps the date-bucketing and percentage maths testable, which is where this
// kind of code usually goes quietly wrong.

import { countsAsRevenue, revenueDateOf } from "@/lib/paymentUtils";
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

/**
 * Shown when a service carries a technician id we cannot resolve to a name —
 * usually a technician who has since been deleted, or one belonging to another
 * branch. Deliberately not "Unassigned": the job *is* assigned, we just cannot
 * say to whom, and conflating the two hides work that still has an owner.
 */
export const UNKNOWN_TECHNICIAN = "Unknown technician";

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

/**
 * Adds (or subtracts) whole calendar days.
 *
 * Deliberately not `time + n * DAY_MS`: a day is not always 86,400,000ms. Across
 * a daylight-saving transition that arithmetic lands an hour either side of
 * midnight, and "an hour before midnight" is the *previous* day — so a bar
 * chart would silently drop or double a day twice a year. Rebuilding from the
 * calendar fields lets the platform apply the offset.
 */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

/**
 * The date's position on the calendar, as a count of days. Built through
 * `Date.UTC` purely to get a fixed-length day for the subtraction — the fields
 * going in are local, so the result is a local calendar day index.
 */
function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
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

  const spanDays = dayNumber(end) - dayNumber(start) + 1;
  const bucketDays = spanDays > 45 ? 7 : 1;
  const bucketCount = Math.ceil(spanDays / bucketDays);

  const created = new Array<number>(bucketCount).fill(0);
  const completed = new Array<number>(bucketCount).fill(0);

  const startDay = dayNumber(start);

  const indexFor = (date: Date): number | null => {
    const offset = dayNumber(date) - startDay;
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

    const bucketDate = addDays(start, i * bucketDays);
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

/**
 * Resolves the two forms a service's `technician_id` can take.
 *
 * `ServiceForm` writes `user.id` when a technician files their own job, and only
 * rewrites it to the technician *document* id once the technicians list has
 * loaded — so both forms exist in the stored data. Grouping on the raw value
 * splits one person into two rows: one correctly named, one unknown.
 *
 * Only `userId` is treated as an alias. `created_by` records who *created* the
 * technician record, not who the technician is, so aliasing on it would credit
 * one person's work to another.
 */
function technicianIndex(technicians: Technician[]): {
  canonicalId: (rawId: string) => string;
  nameFor: (id: string) => string;
} {
  const canonical = new Map<string, string>();
  const names = new Map<string, string>();

  for (const technician of technicians) {
    names.set(technician.id, technician.name);
    canonical.set(technician.id, technician.id);
    if (technician.userId) canonical.set(technician.userId, technician.id);
  }

  return {
    canonicalId: (rawId) => canonical.get(rawId) ?? rawId,
    nameFor: (id) => names.get(id)?.trim() || UNKNOWN_TECHNICIAN,
  };
}

export function topTechnicians(services: Service[], technicians: Technician[], limit = 4): RankedItem[] {
  const { canonicalId, nameFor } = technicianIndex(technicians);
  const counts = new Map<string, number>();

  for (const service of services) {
    if (!service.technician_id) continue;
    const id = canonicalId(service.technician_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rank(counts, limit).map((item) => ({ ...item, label: nameFor(item.id) }));
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
  /** Sum of prices for services that have been paid for. */
  revenue: number;
}

export function summarize(services: Service[]): MetricSummary {
  let completedServices = 0;
  let activeServices = 0;
  let pendingServices = 0;
  let revenue = 0;

  for (const service of services) {
    // Revenue is recognised on completion: finishing the job books its price,
    // and so does taking payment before handover. See `countsAsRevenue` for
    // what that does and does not claim.
    if (countsAsRevenue(service)) {
      const price = Number(service.price);
      if (Number.isFinite(price)) revenue += price;
    }

    const bucket = bucketKeyFor(service.status);
    if (bucket === "in_progress") activeServices += 1;
    if (bucket === "to_do") pendingServices += 1;
    if (bucket === "completed") completedServices += 1;
  }

  return {
    totalServices: services.length,
    pendingServices,
    completedServices,
    activeServices,
    revenue,
  };
}

// ---------------------------------------------------------------------------
// Pipeline, today-tiles, technician performance, weekly bars and insights.
// These back the redesigned admin dashboard; see
// docs/superpowers/specs/2026-07-23-admin-dashboard-redesign-design.md
// ---------------------------------------------------------------------------

/** Open lifecycle stages — completed work lives in the KPI row, not here. */
const PIPELINE_STAGES: Array<{ status: string; label: string }> = [
  { status: "pending", label: "Received" },
  { status: "in_progress", label: "Repairing" },
  { status: "awaiting_parts", label: "Waiting Parts" },
  { status: "quality_check", label: "Quality Check" },
  { status: "ready_for_pickup", label: "Ready for Delivery" },
];

export interface PipelineStage {
  status: string;
  label: string;
  count: number;
  /** 0-1 share of the pipeline total. `0` when there is nothing to divide by. */
  fraction: number;
}

/**
 * Counts open work by lifecycle stage. Completed and cancelled jobs are
 * excluded: a shop with months of history would otherwise see the pipeline
 * dominated by "Completed", which hides the work that still needs action.
 */
export function pipelineBreakdown(services: Service[]): { stages: PipelineStage[]; total: number } {
  const counts = new Map<string, number>(PIPELINE_STAGES.map((stage) => [stage.status, 0]));

  for (const service of services) {
    const normalized = normalizeStatus(service.status);
    if (!counts.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  const stages = PIPELINE_STAGES.map(({ status, label }) => {
    const count = counts.get(status) ?? 0;
    return { status, label, count, fraction: total === 0 ? 0 : count / total };
  });

  return { stages, total };
}

export interface TodayCounts {
  received: number;
  repairing: number;
  waitingParts: number;
  readyForDelivery: number;
  completedToday: number;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * The compact tile row. `received` and `completedToday` are genuinely "today";
 * the three middle tiles are current open counts by status, which is what makes
 * them useful — a shop cares how many devices are waiting for parts right now,
 * not how many entered that state since midnight.
 */
export function todayCounts(services: Service[], now: Date = new Date()): TodayCounts {
  const counts: TodayCounts = {
    received: 0,
    repairing: 0,
    waitingParts: 0,
    readyForDelivery: 0,
    completedToday: 0,
  };

  for (const service of services) {
    const created = toDate(service.createdAt);
    if (created && isSameDay(created, now)) counts.received += 1;

    const status = normalizeStatus(service.status);
    if (status === "in_progress") counts.repairing += 1;
    if (status === "awaiting_parts") counts.waitingParts += 1;
    if (status === "ready_for_pickup") counts.readyForDelivery += 1;

    if (status === "completed") {
      const completed = toDate(service.completedDate) ?? toDate(service.actualCompletion);
      if (completed && isSameDay(completed, now)) counts.completedToday += 1;
    }
  }

  return counts;
}

/**
 * Open work whose estimated completion has passed. Services with no estimate
 * are not counted: an absent estimate is unknown, not overdue.
 */
export function countDelayed(services: Service[], now: Date = new Date()): number {
  return services.filter((service) => {
    const status = normalizeStatus(service.status);
    if (status === "completed" || status === "cancelled") return false;

    const due = toDate(service.estimatedCompletion);
    return due !== null && due < now;
  }).length;
}

export interface TechnicianRow {
  id: string;
  name: string;
  initials: string;
  completed: number;
  active: number;
  /** Mean `actualDuration` of completed work, in days. `null` when none is recorded. */
  avgDays: number | null;
  /** Mean customer rating. `null` when no completed job was rated. */
  rating: number | null;
  /** 0-1 share of this technician's work that is complete. Drives the ring gauge. */
  completionRate: number;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Per-technician performance for the leaderboard table.
 *
 * `avgDays` and `rating` are `null` rather than `0` when there is nothing to
 * average. A technician with no completed work has not taken "0 days" and does
 * not have a zero-star rating; rendering either as a number reads as terrible
 * performance instead of absent data.
 *
 * Technicians with no services at all are omitted rather than listed with zeros
 * — an empty row communicates nothing and pushes real rows off the card.
 */
export function technicianPerformance(
  services: Service[],
  technicians: Technician[],
  limit = 5
): TechnicianRow[] {
  const rows = new Map<
    string,
    { completed: number; active: number; durations: number[]; ratings: number[]; total: number }
  >();

  const { canonicalId, nameFor } = technicianIndex(technicians);

  for (const service of services) {
    if (!service.technician_id) continue;
    const id = canonicalId(service.technician_id);

    const row =
      rows.get(id) ?? { completed: 0, active: 0, durations: [], ratings: [], total: 0 };
    row.total += 1;

    const status = normalizeStatus(service.status);
    if (status === "completed") {
      row.completed += 1;

      const duration = Number(service.actualDuration);
      if (Number.isFinite(duration) && duration > 0) row.durations.push(duration);

      const rating = Number(service.customerFeedback?.rating);
      if (Number.isFinite(rating) && rating > 0) row.ratings.push(rating);
    } else if (status !== "cancelled") {
      row.active += 1;
    }

    rows.set(id, row);
  }

  return [...rows.entries()]
    .map(([id, row]) => {
      const name = nameFor(id);
      return {
        id,
        name,
        initials: initialsFor(name),
        completed: row.completed,
        active: row.active,
        avgDays: mean(row.durations.map((minutes) => minutes / 1440)),
        rating: mean(row.ratings),
        completionRate: row.total === 0 ? 0 : row.completed / row.total,
      };
    })
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Mean rounded to one decimal, or `null` for an empty set. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

export interface WeekdayPoint {
  label: string;
  date: Date;
  count: number;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Services created on each day of the current Monday-Sunday week, zero-filled. */
export function weeklySeries(services: Service[], now: Date = new Date()): WeekdayPoint[] {
  // getDay() is Sunday-based; shift so Monday is index 0.
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = addDays(now, -mondayOffset);
  const mondayDay = dayNumber(monday);

  const points = WEEKDAY_LABELS.map((label, index) => ({
    label,
    date: addDays(monday, index),
    count: 0,
  }));

  for (const service of services) {
    const created = toDate(service.createdAt);
    if (!created) continue;

    const offset = dayNumber(created) - mondayDay;
    if (offset >= 0 && offset < 7) points[offset].count += 1;
  }

  return points;
}

export type TrendWindow = 7 | 30 | 90;

export const TREND_WINDOW_OPTIONS: Array<{ value: TrendWindow; label: string }> = [
  { value: 7, label: "Last 7 Days" },
  { value: 30, label: "Last 30 Days" },
  { value: 90, label: "Last 90 Days" },
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface RevenueTrendPoint {
  label: string;
  date: Date;
  revenue: number;
}

export interface RevenueTrend {
  /** One point per day of the window, oldest first, ending today. */
  points: RevenueTrendPoint[];
  total: number;
  /** Takings over the equally long window immediately before this one. */
  previousTotal: number;
  /** Percent change against `previousTotal`, or null when there is no base to compare against. */
  delta: number | null;
}

/**
 * Daily takings over a rolling window ending today, with the preceding window
 * of the same length summed for comparison.
 *
 * Revenue is dated by when the money came in rather than when the work
 * finished, matching `metricsForDay` — see `paidDateOf` for why a repair paid
 * days after collection belongs on the day it was paid.
 *
 * Days are bucketed by calendar-day index so the series stays correct across a
 * DST change, and zero-filled so a quiet day plots as a trough instead of
 * shortening the line.
 */
export function revenueTrend(services: Service[], days: TrendWindow = 30, now: Date = new Date()): RevenueTrend {
  const start = addDays(startOfDay(now), -(days - 1));
  const startDay = dayNumber(start);

  const points = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    return { label: `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`, date, revenue: 0 };
  });

  let total = 0;
  let previousTotal = 0;

  for (const service of services) {
    if (!countsAsRevenue(service)) continue;

    const paidAt = toDate(revenueDateOf(service));
    if (!paidAt) continue;

    const price = Number(service.price);
    if (!Number.isFinite(price)) continue;

    const offset = dayNumber(paidAt) - startDay;
    if (offset >= 0 && offset < days) {
      points[offset].revenue += price;
      total += price;
    } else if (offset < 0 && offset >= -days) {
      previousTotal += price;
    }
  }

  return { points, total, previousTotal, delta: periodDelta(total, previousTotal) };
}

export interface Insight {
  kind: "delay" | "technician" | "repair" | "volume";
  text: string;
}

/**
 * Derived observations for the insights card.
 *
 * Every entry is guarded by a predicate and omitted when it does not hold. The
 * card is never padded to a fixed length — an insight that has to be invented
 * to fill a row is worse than an empty card.
 */
export function buildInsights(
  services: Service[],
  technicians: Technician[],
  now: Date = new Date()
): Insight[] {
  const insights: Insight[] = [];

  const delayed = countDelayed(services, now);
  if (delayed > 0) {
    insights.push({
      kind: "delay",
      text: `${delayed} ${delayed === 1 ? "device is" : "devices are"} past the estimated completion date.`,
    });
  }

  const [topTechnician] = technicianPerformance(services, technicians, 1);
  if (topTechnician && topTechnician.completed > 0) {
    insights.push({
      kind: "technician",
      text: `${topTechnician.name} completed the most repairs — ${topTechnician.completed} in this period.`,
    });
  }

  const [topRepair] = topServices(services, 1);
  if (topRepair) {
    insights.push({
      kind: "repair",
      text: `${topRepair.label} is the most common repair, with ${topRepair.count} ${topRepair.count === 1 ? "job" : "jobs"}.`,
    });
  }

  const week = weeklySeries(services, now);
  const weekTotal = week.reduce((sum, point) => sum + point.count, 0);
  if (weekTotal > 0) {
    const busiest = week.reduce((best, point) => (point.count > best.count ? point : best));
    if (busiest.count > 0) {
      insights.push({
        kind: "volume",
        text: `${busiest.label} was the busiest day this week with ${busiest.count} ${busiest.count === 1 ? "device" : "devices"} received.`,
      });
    }
  }

  return insights;
}

/**
 * How many devices were open (received, not yet completed or cancelled) as of a
 * given moment.
 *
 * Reconstructed from createdAt and completedDate rather than read from a
 * snapshot history — the app stores no per-day state, so this is the only
 * honest way to compare "devices in the shop" against an earlier date. It works
 * because those two timestamps bracket a service's open interval.
 *
 * The same reconstruction is NOT possible for status-specific counts like
 * "ready for delivery": only a service's *current* status is stored, so there
 * is no way to know what status it held last month.
 */
export function countOpenAsOf(services: Service[], asOf: Date): number {
  return services.filter((service) => {
    const status = normalizeStatus(service.status);
    if (status === "cancelled") return false;

    const created = toDate(service.createdAt);
    if (!created || created > asOf) return false;

    if (status !== "completed") return true;

    const completed = toDate(service.completedDate) ?? toDate(service.actualCompletion);
    // Completed, but we cannot tell when — treat it as still open at `asOf`
    // rather than silently dropping it from the historical count.
    return completed === null || completed > asOf;
  }).length;
}

export interface DayMetrics {
  /** Sum of prices for services paid for on that day. */
  revenue: number;
  completed: number;
  received: number;
  /** Devices still open at the end of that day. */
  open: number;
}

/**
 * Everything the KPI row needs about a single day. Feeds the cumulative
 * sparklines, which walk these daily figures forward from the running total.
 *
 * Revenue is dated by when the money came in, not by when the work finished.
 * The two coincide for anything settled at handover, but a repair paid for
 * days after collection belongs on the day it was paid — that is the day the
 * shop's takings changed.
 */
export function metricsForDay(services: Service[], day: Date): DayMetrics {
  const dayEnd = endOfDay(day);
  let revenue = 0;
  let completed = 0;
  let received = 0;

  for (const service of services) {
    const created = toDate(service.createdAt);
    if (created && isSameDay(created, day)) received += 1;

    if (countsAsRevenue(service)) {
      const paidAt = toDate(revenueDateOf(service));
      if (paidAt && isSameDay(paidAt, day)) {
        const price = Number(service.price);
        if (Number.isFinite(price)) revenue += price;
      }
    }

    if (normalizeStatus(service.status) !== "completed") continue;

    const completedAt = toDate(service.completedDate) ?? toDate(service.actualCompletion);
    if (!completedAt || !isSameDay(completedAt, day)) continue;

    completed += 1;
  }

  return { revenue, completed, received, open: countOpenAsOf(services, dayEnd) };
}

/** The last `days` days ending today, oldest first. Drives the KPI sparklines. */
export function recentDays(
  services: Service[],
  days: number,
  now: Date = new Date()
): Array<DayMetrics & { date: Date }> {
  const today = startOfDay(now);

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, -(days - 1 - index));
    return { date, ...metricsForDay(services, date) };
  });
}
