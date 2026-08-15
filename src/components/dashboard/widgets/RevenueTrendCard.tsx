"use client";

import React from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { TREND_WINDOW_OPTIONS, type RevenueTrend, type TrendWindow } from "@/lib/dashboardAnalytics";

import { AreaChart } from "../charts/AreaChart";
import { CHART_COLORS } from "../charts/palette";

import { Card, CardHeader } from "./Card";

interface RevenueTrendCardProps {
  trend: RevenueTrend;
  trendWindow: TrendWindow;
  onWindowChange: (trendWindow: TrendWindow) => void;
}

const WINDOW_LABELS: Record<TrendWindow, string> = {
  7: "Last 7 Days",
  30: "Last 30 Days",
  90: "Last 90 Days",
};

const TAB_LABELS: Record<TrendWindow, string> = {
  7: "7 Days",
  30: "30 Days",
  90: "90 Days",
};

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Exact takings, to the rupee. Paise are noise at this scale. */
function formatRupees(value: number): string {
  return Number.isFinite(value) ? rupees.format(value) : "₹0";
}

/**
 * Axis ticks from actual earnings, abbreviated so five of them fit the gutter.
 * The scale itself is auto: it follows the day's takings. Kept to one decimal
 * rather than rounded to whole thousands, so a ₹7,500 tick reads "₹7.5k"
 * instead of claiming ₹8k.
 */
function formatAxisRupees(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  if (Math.abs(value) >= 100000) return `₹${trimZero(value / 100000)}L`;
  if (Math.abs(value) >= 1000) return `₹${trimZero(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

/**
 * Takings per day over a rolling window, with the headline total and its change
 * against the window before it.
 *
 * The window is the card's own state rather than the dashboard-wide period: the
 * other widgets answer "this month vs last", while a trend line wants a rolling
 * window that does not reset to a single point on the 1st of the month.
 */
export const RevenueTrendCard = React.memo(function RevenueTrendCard({
  trend,
  trendWindow,
  onWindowChange,
}: RevenueTrendCardProps) {
  const windowLabel = WINDOW_LABELS[trendWindow];
  const rising = trend.delta !== null && trend.delta >= 0;
  const DeltaIcon = rising ? TrendingUp : TrendingDown;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Revenue Trend"
        action={
          <div className="flex rounded-lg bg-gray-100 p-0.5" role="tablist" aria-label="Revenue trend window">
            {TREND_WINDOW_OPTIONS.map((option) => {
              const selected = option.value === trendWindow;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onWindowChange(option.value)}
                  className={`min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors sm:min-h-0 sm:py-1.5 ${
                    selected ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {TAB_LABELS[option.value]}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="text-xs font-medium text-gray-500">Total Revenue</p>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-2xl font-bold tracking-tight text-gray-900">{formatRupees(trend.total)}</p>
          {trend.delta !== null && (
            <p className="flex items-center gap-1 text-xs font-medium">
              <span className={rising ? "text-emerald-600" : "text-red-600"}>
                <DeltaIcon className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{" "}
                {rising ? "+" : ""}
                {Math.round(trend.delta)}%
              </span>
              <span className="text-gray-500">vs previous {trendWindow} days</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex-1">
          {trend.total === 0 ? (
            // An all-zero series plots as a flat line on the axis with a
            // zero-height fill, which reads as a broken chart rather than as
            // "no takings". Say it instead of drawing it.
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1 text-center">
              <p className="text-sm text-gray-500">No revenue recorded in this period</p>
              <p className="text-xs text-gray-400">
                Takings appear here once a repair is marked paid, or completed with a completion date.
              </p>
            </div>
          ) : (
            <AreaChart
              labels={trend.points.map((point) => point.label)}
              series={[
                {
                  key: "revenue",
                  label: "Revenue",
                  color: CHART_COLORS.series.total,
                  values: trend.points.map((point) => point.revenue),
                },
              ]}
              height={220}
              formatValue={formatAxisRupees}
              formatTooltipValue={formatRupees}
              yScale="data"
              showMarkers
              ariaLabel={`Revenue per day, ${windowLabel.toLowerCase()}`}
            />
          )}
        </div>
      </div>
    </Card>
  );
});
