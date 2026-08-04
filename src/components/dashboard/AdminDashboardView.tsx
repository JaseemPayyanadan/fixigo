"use client";

import React from "react";

import { Activity, CheckCircle, ClipboardList, IndianRupee } from "lucide-react";

import {
  filterByRange,
  getPeriodRange,
  recentDays,
  periodDelta,
  revenueTrend,
  summarize,
  technicianPerformance,
  topServices,
  type DashboardPeriod,
  type DayMetrics,
  type TrendWindow,
} from "@/lib/dashboardAnalytics";
import type { Service, Technician } from "@/types";

import { CHART_COLORS } from "./charts/palette";
import {
  CompactErrorState,
  DashboardErrorBoundary,
  RecentServicesCard,
} from "./shared/DashboardComponents";
import { formatCurrency } from "./shared/DashboardUtils";
import {
  DashboardSkeleton,
  RankedListCard,
  RevenueTrendCard,
  StatCard,
  TopTechniciansTable,
  type StatCardProps,
} from "./widgets";

export interface AdminDashboardViewProps {
  services: Service[];
  recentServices: Service[];
  technicians: Technician[];
  isLoading?: boolean;
  servicesLoading?: boolean;
  servicesError?: string | null;
  /** Overrides the clock, so the preview route renders deterministically. */
  now?: Date;
}

/**
 * The admin dashboard. Both the shop-admin and branch-admin screens render this
 * component; they differ only in the data they pass, so the two roles cannot
 * drift into unrelated layouts.
 *
 * Takes data rather than fetching it. That keeps scoping (shop-wide vs one
 * branch) in the callers where it belongs, and lets the preview route render
 * the whole screen against fixtures with no Firestore involved.
 *
 * Widgets below this point are presentational — every number is computed here
 * from the pure helpers in `dashboardAnalytics`.
 */
export function AdminDashboardView({
  services,
  recentServices,
  technicians,
  isLoading = false,
  servicesLoading = false,
  servicesError = null,
  now: nowOverride,
}: AdminDashboardViewProps) {
  const [techniciansPeriod, setTechniciansPeriod] = React.useState<DashboardPeriod>("this_month");
  const [repairsPeriod, setRepairsPeriod] = React.useState<DashboardPeriod>("this_month");
  const [trendWindow, setTrendWindow] = React.useState<TrendWindow>(30);

  // Pinned per render pass so every widget measures against the same instant
  // rather than drifting as each one calls `new Date()`.
  const now = React.useMemo(() => nowOverride ?? new Date(), [nowOverride]);

  const metrics = React.useMemo(() => buildMetrics(services, now), [services, now]);

  const trend = React.useMemo(() => revenueTrend(services, trendWindow, now), [services, trendWindow, now]);

  const technicianRows = React.useMemo(
    () => technicianPerformance(filterByRange(services, getPeriodRange(techniciansPeriod, now).current), technicians),
    [services, technicians, techniciansPeriod, now]
  );

  const commonRepairs = React.useMemo(
    () => topServices(filterByRange(services, getPeriodRange(repairsPeriod, now).current)),
    [services, repairsPeriod, now]
  );

  const handleRetry = React.useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-5 p-4 md:p-6">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {servicesError && <CompactErrorState message={`Services: ${servicesError}`} retry={handleRetry} />}

              {/* Band 1 — KPIs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <StatCard key={metric.label} {...metric} />
                ))}
              </div>

              {/* Band 2 — revenue trend + recent work */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <RevenueTrendCard trend={trend} trendWindow={trendWindow} onWindowChange={setTrendWindow} />
                </div>
                <div className="lg:col-span-5">
                  <RecentServicesCard
                    services={recentServices}
                    loading={servicesLoading}
                    error={servicesError}
                    title="Recent Repairs"
                    viewAllLink="/services"
                    emptyMessage="No services yet"
                    createLink="/services/new"
                    onRetry={handleRetry}
                  />
                </div>
              </div>

              {/* Band 3 — technician performance */}
              <TopTechniciansTable
                rows={technicianRows}
                period={techniciansPeriod}
                onPeriodChange={setTechniciansPeriod}
              />

              {/* Band 4 — most common repairs */}
              <RankedListCard
                title="Most Common Repairs"
                items={commonRepairs}
                color={CHART_COLORS.series.total}
                period={repairsPeriod}
                onPeriodChange={setRepairsPeriod}
                emptyMessage="No services in this period"
              />
            </>
          )}
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}

/**
 * The KPI row is all-time, not period-scoped: these are lifetime totals for the
 * shop, so "Total Revenue" is every rupee earned rather than this month's take.
 * A month-over-month comparison would also have no answer until a shop has been
 * trading for two months, leaving every card as a dash on a young shop.
 *
 * Because the values are cumulative, so are their sparklines: each plots the
 * running total across the last 14 days, baselined on whatever the total was
 * before that window opened so the line ends exactly on the printed figure.
 * The delta is then how much the total grew between yesterday's close and now,
 * which is what the "vs yesterday" caption on the card means.
 *
 * Active Services carries no trend or delta. Unlike the cumulative measures, it
 * counts services *currently* in an in-flight status, and only a service's
 * present status is stored — there is no way to know what it held a week ago.
 * Passing an empty trend reserves the sparkline's height without drawing a
 * line, so all four cards stay identical in shape.
 *
 * Sparkline strokes match their card's accent rather than the shared
 * CHART_COLORS series slots — they are decorative (aria-hidden, with the value
 * and delta always written out), so they carry no meaning on colour.
 */
function buildMetrics(services: Service[], now: Date): StatCardProps[] {
  const summary = summarize(services);
  const days = recentDays(services, 14, now);
  const today = days[days.length - 1];

  /**
   * Walks the 14-day window forward from the total that predates it, so the
   * series ends on `total` however little of it the window accounts for.
   */
  const cumulative = (total: number, dailyValue: (day: DayMetrics) => number): number[] => {
    let running = total - days.reduce((sum, day) => sum + dailyValue(day), 0);
    return days.map((day) => (running += dailyValue(day)));
  };

  return [
    {
      label: "Total Services",
      value: String(summary.totalServices),
      note: summary.pendingServices > 0 ? `${summary.pendingServices} pending` : undefined,
      icon: ClipboardList,
      iconClassName: "bg-blue-600",
      color: "#2563eb",
      trend: cumulative(summary.totalServices, (day) => day.received),
      delta: periodDelta(summary.totalServices, summary.totalServices - today.received),
    },
    {
      label: "Total Revenue",
      value: formatCurrency(summary.revenue),
      icon: IndianRupee,
      iconClassName: "bg-emerald-600",
      color: "#059669",
      trend: cumulative(summary.revenue, (day) => day.revenue),
      delta: periodDelta(summary.revenue, summary.revenue - today.revenue),
    },
    {
      label: "Completed",
      value: String(summary.completedServices),
      icon: CheckCircle,
      iconClassName: "bg-violet-600",
      color: "#7c3aed",
      trend: cumulative(summary.completedServices, (day) => day.completed),
      delta: periodDelta(summary.completedServices, summary.completedServices - today.completed),
    },
    {
      label: "Active Services",
      value: String(summary.activeServices),
      icon: Activity,
      iconClassName: "bg-orange-500",
      color: "#f97316",
      trend: [],
      delta: null,
    },
  ];
}
