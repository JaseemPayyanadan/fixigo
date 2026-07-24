"use client";

import React from "react";

import { CheckCircle, Clock, IndianRupee, Smartphone, Truck } from "lucide-react";

import {
  countDelayed,
  filterByRange,
  getPeriodRange,
  recentDays,
  periodDelta,
  pipelineBreakdown,
  technicianPerformance,
  topServices,
  weeklySeries,
  type DashboardPeriod,
} from "@/lib/dashboardAnalytics";
import { normalizeStatus } from "@/lib/statusUtils";
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
  PipelineCard,
  RankedListCard,
  StatCard,
  TopTechniciansTable,
  WeeklyActivityCard,
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

  // Pinned per render pass so every widget measures against the same instant
  // rather than drifting as each one calls `new Date()`.
  const now = React.useMemo(() => nowOverride ?? new Date(), [nowOverride]);

  const metrics = React.useMemo(() => buildMetrics(services, now), [services, now]);

  const pipeline = React.useMemo(() => pipelineBreakdown(services), [services]);
  const week = React.useMemo(() => weeklySeries(services, now), [services, now]);

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {metrics.map((metric) => (
                  <StatCard key={metric.label} {...metric} />
                ))}
              </div>

              {/* Band 2 — pipeline + recent work */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <PipelineCard stages={pipeline.stages} total={pipeline.total} />
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

              {/* Band 4 — charts */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <WeeklyActivityCard points={week} />
                </div>
                <div className="lg:col-span-5">
                  <RankedListCard
                    title="Most Common Repairs"
                    items={commonRepairs}
                    color={CHART_COLORS.series.total}
                    period={repairsPeriod}
                    onPeriodChange={setRepairsPeriod}
                    emptyMessage="No services in this period"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}

/**
 * The KPI row is day-scoped — "Revenue today", compared against yesterday —
 * rather than period-scoped. A month-over-month comparison has no answer until
 * a shop has been trading for two months, so every card would read as a dash
 * on a young shop, which looks broken rather than honest. Day-over-day always
 * has an answer once there is a day of history.
 *
 * Sparklines plot the last 14 days of the same measure.
 *
 * Ready for Delivery and Delayed Jobs still carry no delta: only a service's
 * *current* status is stored, so there is no way to know how many sat in
 * `ready_for_pickup` yesterday, and no estimate history for what was overdue
 * then. Those two pass `delta: null` and an empty trend, which reserves the
 * sparkline's height without drawing a line so the five cards stay identical
 * in shape.
 *
 * Card order and accent hues follow the design: purple, blue, green, orange,
 * red. Sparkline strokes match their card's accent rather than the shared
 * CHART_COLORS series slots — they are decorative (aria-hidden, with the value
 * and delta always written out), so they carry no meaning on colour.
 */
function buildMetrics(services: Service[], now: Date): StatCardProps[] {
  const days = recentDays(services, 14, now);
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];

  const readyForDelivery = services.filter(
    (service) => normalizeStatus(service.status) === "ready_for_pickup"
  ).length;

  return [
    {
      label: "Revenue Today",
      value: formatCurrency(today.revenue),
      icon: IndianRupee,
      iconClassName: "bg-violet-600",
      color: "#7c3aed",
      trend: days.map((day) => day.revenue),
      delta: periodDelta(today.revenue, yesterday.revenue),
    },
    {
      label: "Devices in Shop",
      value: String(today.open),
      icon: Smartphone,
      iconClassName: "bg-blue-600",
      color: "#2563eb",
      trend: days.map((day) => day.open),
      delta: periodDelta(today.open, yesterday.open),
    },
    {
      label: "Ready for Delivery",
      value: String(readyForDelivery),
      icon: Truck,
      iconClassName: "bg-emerald-500",
      color: "#10b981",
      trend: [],
      delta: null,
    },
    {
      label: "Completed Today",
      value: String(today.completed),
      icon: CheckCircle,
      iconClassName: "bg-amber-500",
      color: "#f59e0b",
      trend: days.map((day) => day.completed),
      delta: periodDelta(today.completed, yesterday.completed),
    },
    {
      label: "Delayed Jobs",
      value: String(countDelayed(services, now)),
      icon: Clock,
      iconClassName: "bg-red-500",
      color: "#ef4444",
      trend: [],
      delta: null,
    },
  ];
}
