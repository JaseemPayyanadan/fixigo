// Pure analytics helpers for the Purchases report — spend bucketed by
// calendar day. Mirrors `revenueTrend`/`revenueForRange` in `dashboardAnalytics.ts`,
// reading `Purchase` records instead of `Service`; kept separate because the two
// live in different domains (purchases have their own totals/returns/refunds
// shape) and nothing here depends on service data.

import type { Purchase } from "@/types/purchase";

const DAY_MS = 86_400_000;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type TrendWindow = 7 | 30 | 90;

export const TREND_WINDOW_OPTIONS: Array<{ value: TrendWindow; label: string }> = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
];

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PurchaseTrendPoint {
  label: string;
  date: Date;
  amount: number;
}

export interface PurchaseTrend {
  /** One point per day of the window (or per week, past 45 days), oldest first. */
  points: PurchaseTrendPoint[];
  total: number;
  /** Spend over the equally long window immediately before this one. */
  previousTotal: number;
  /** Percent change against `previousTotal`, or null when there is no base to compare against. */
  delta: number | null;
}

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

/** Adds whole calendar days, rebuilt from local fields so a DST transition never shifts the result onto the wrong day. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

/** The date's local calendar day, as a fixed-length index — lets day math use subtraction instead of millisecond arithmetic that DST would throw off. */
function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function periodDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function toDate(value: Date | string | number | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Cancelled purchases carry no real spend, so they're excluded — same rule
 * `summarizePurchases` uses for the Purchases page's own summary cards.
 */
function isCounted(purchase: Purchase): boolean {
  return purchase.status !== "cancelled";
}

function amountOf(purchase: Purchase): number | null {
  const amount = Number(purchase.grandTotal);
  return Number.isFinite(amount) ? amount : null;
}

/** Daily spend over a rolling window ending today, with the preceding window of the same length summed for comparison. */
export function purchaseTrend(purchases: Purchase[], days: TrendWindow = 7, now: Date = new Date()): PurchaseTrend {
  const start = addDays(startOfDay(now), -(days - 1));
  const startDay = dayNumber(start);

  const points: PurchaseTrendPoint[] = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    return { label: `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`, date, amount: 0 };
  });

  let total = 0;
  let previousTotal = 0;

  for (const purchase of purchases) {
    if (!isCounted(purchase)) continue;

    const purchaseDate = toDate(purchase.purchaseDate);
    if (!purchaseDate) continue;

    const amount = amountOf(purchase);
    if (amount === null) continue;

    const offset = dayNumber(purchaseDate) - startDay;
    if (offset >= 0 && offset < days) {
      points[offset].amount += amount;
      total += amount;
    } else if (offset < 0 && offset >= -days) {
      previousTotal += amount;
    }
  }

  return { points, total, previousTotal, delta: periodDelta(total, previousTotal) };
}

/**
 * Daily spend across an arbitrary `[start, end]` range, with the equal-length
 * window immediately before `start` summed for comparison. Backs the Reports
 * page's custom date range. Ranges longer than 45 days bucket by week so a
 * multi-month range still renders a readable number of points.
 */
export function purchaseTrendForRange(purchases: Purchase[], range: DateRange): PurchaseTrend {
  const start = startOfDay(range.start);
  const end = endOfDay(range.end);
  if (end < start) return { points: [], total: 0, previousTotal: 0, delta: null };

  const spanDays = dayNumber(end) - dayNumber(start) + 1;
  const bucketDays = spanDays > 45 ? 7 : 1;
  const bucketCount = Math.ceil(spanDays / bucketDays);
  const startDay = dayNumber(start);
  const previousStartDay = dayNumber(addDays(start, -spanDays));

  const points: PurchaseTrendPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const date = addDays(start, index * bucketDays);
    return { label: `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`, date, amount: 0 };
  });

  let total = 0;
  let previousTotal = 0;

  for (const purchase of purchases) {
    if (!isCounted(purchase)) continue;

    const purchaseDate = toDate(purchase.purchaseDate);
    if (!purchaseDate) continue;

    const amount = amountOf(purchase);
    if (amount === null) continue;

    const offset = dayNumber(purchaseDate) - startDay;
    if (offset >= 0 && offset < spanDays) {
      points[Math.floor(offset / bucketDays)].amount += amount;
      total += amount;
      continue;
    }

    const previousOffset = dayNumber(purchaseDate) - previousStartDay;
    if (previousOffset >= 0 && previousOffset < spanDays) {
      previousTotal += amount;
    }
  }

  return { points, total, previousTotal, delta: periodDelta(total, previousTotal) };
}
