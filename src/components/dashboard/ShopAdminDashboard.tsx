"use client";

import React from "react";

import { Activity, CheckCircle, ClipboardList, IndianRupee } from "lucide-react";

import {
  buildDailySeries,
  filterByRange,
  getPeriodRange,
  periodDelta,
  seriesValues,
  statusBreakdown,
  summarize,
  topServices,
  topTechnicians,
  type DashboardPeriod,
} from "@/lib/dashboardAnalytics";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUser } from "@/hooks/useUser";

import { CHART_COLORS } from "./charts/palette";
import {
  CompactErrorState,
  DashboardErrorBoundary,
  DashboardLoadingState,
  RecentServicesCard,
} from "./shared/DashboardComponents";
import { formatCurrency } from "./shared/DashboardUtils";
import {
  DashboardGreeting,
  QuickActionsCard,
  RankedListCard,
  ServiceStatusCard,
  ServicesOverviewCard,
  StatCard,
  type StatCardProps,
} from "./widgets";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "technicians", label: "Technicians" },
  { id: "actions", label: "Actions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ShopAdminDashboard() {
  const { user } = useUser();
  const { isLoading, services, recentServices, servicesLoading, servicesError } = useDashboardData(user?.shopId);
  const { technicians } = useTechnicians(user?.shopId);

  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  // Each widget owns its own period so they can be compared side by side.
  const [overviewPeriod, setOverviewPeriod] = React.useState<DashboardPeriod>("this_month");
  const [techniciansPeriod, setTechniciansPeriod] = React.useState<DashboardPeriod>("this_month");
  const [servicesPeriod, setServicesPeriod] = React.useState<DashboardPeriod>("this_month");

  // Pinned per render pass so every widget below measures against the same
  // instant rather than drifting as each one calls `new Date()`.
  const now = React.useMemo(() => new Date(), []);

  const overview = React.useMemo(() => {
    const { current, previous } = getPeriodRange(overviewPeriod, now);
    const currentServices = filterByRange(services, current);
    const previousServices = filterByRange(services, previous);

    return {
      points: buildDailySeries(services, overviewPeriod, now),
      breakdown: statusBreakdown(currentServices),
      summary: summarize(currentServices),
      previousSummary: summarize(previousServices),
    };
  }, [services, overviewPeriod, now]);

  const metrics = React.useMemo<StatCardProps[]>(() => {
    const { summary, previousSummary, points } = overview;

    return [
      {
        label: "Total Services",
        value: String(summary.totalServices),
        note: summary.pendingServices > 0 ? `${summary.pendingServices} pending` : undefined,
        icon: ClipboardList,
        iconClassName: "bg-blue-600",
        color: CHART_COLORS.series.total,
        trend: seriesValues(points, "total"),
        delta: periodDelta(summary.totalServices, previousSummary.totalServices),
      },
      {
        label: "Total Revenue",
        value: formatCurrency(summary.revenue),
        note: `from ${summary.completedServices} completed`,
        icon: IndianRupee,
        iconClassName: "bg-emerald-600",
        color: CHART_COLORS.series.completed,
        trend: seriesValues(points, "completed"),
        delta: periodDelta(summary.revenue, previousSummary.revenue),
      },
      {
        label: "Completed",
        value: String(summary.completedServices),
        icon: CheckCircle,
        iconClassName: "bg-violet-600",
        color: CHART_COLORS.series.total,
        trend: seriesValues(points, "completed"),
        delta: periodDelta(summary.completedServices, previousSummary.completedServices),
      },
      {
        label: "Active Services",
        value: String(summary.activeServices),
        icon: Activity,
        iconClassName: "bg-orange-500",
        color: CHART_COLORS.series.pending,
        trend: seriesValues(points, "pending"),
        delta: periodDelta(summary.activeServices, previousSummary.activeServices),
      },
    ];
  }, [overview]);

  const rankedTechnicians = React.useMemo(
    () => topTechnicians(filterByRange(services, getPeriodRange(techniciansPeriod, now).current), technicians),
    [services, technicians, techniciansPeriod, now]
  );

  const rankedServices = React.useMemo(
    () => topServices(filterByRange(services, getPeriodRange(servicesPeriod, now).current)),
    [services, servicesPeriod, now]
  );

  const handleServicesRetry = React.useCallback(() => {
    window.location.reload();
  }, []);

  // Arrow keys move between tabs, as expected of a tablist.
  const handleTabKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;

    event.preventDefault();
    setActiveTab((current) => {
      const next = TABS[(TABS.findIndex((tab) => tab.id === current) + step + TABS.length) % TABS.length];
      document.getElementById(`dashboard-tab-${next.id}`)?.focus();
      return next.id;
    });
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="space-y-5 p-4 md:p-6">
          <DashboardGreeting name={user.name || "there"} />

          {isLoading && <DashboardLoadingState />}
          {servicesError && <CompactErrorState message={`Services: ${servicesError}`} retry={handleServicesRetry} />}

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} {...metric} />
            ))}
          </div>

          {/* Tab strip */}
          <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-2 gap-2 sm:grid-cols-4" onKeyDown={handleTabKeyDown}>
            {TABS.map((tab) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  id={`dashboard-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`dashboard-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    selected ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab panel — one full-width card per row */}
          <div id={`dashboard-panel-${activeTab}`} role="tabpanel" aria-labelledby={`dashboard-tab-${activeTab}`} className="grid grid-cols-1 gap-4">
            {activeTab === "overview" && (
              <>
                <ServicesOverviewCard points={overview.points} period={overviewPeriod} onPeriodChange={setOverviewPeriod} />
                <ServiceStatusCard breakdown={overview.breakdown} />
              </>
            )}

            {activeTab === "services" && (
              <>
                <RecentServicesCard
                  services={recentServices}
                  loading={servicesLoading}
                  error={servicesError}
                  title="Recent Services"
                  viewAllLink="/services"
                  emptyMessage="No services yet"
                  createLink="/services/new"
                  onRetry={handleServicesRetry}
                />
                <RankedListCard
                  title="Top Services"
                  items={rankedServices}
                  color={CHART_COLORS.series.completed}
                  period={servicesPeriod}
                  onPeriodChange={setServicesPeriod}
                  emptyMessage="No services in this period"
                />
              </>
            )}

            {activeTab === "technicians" && (
              <RankedListCard
                title="Top Technicians"
                items={rankedTechnicians}
                color={CHART_COLORS.series.total}
                period={techniciansPeriod}
                onPeriodChange={setTechniciansPeriod}
                emptyMessage="No assigned services in this period"
                showInitials
                unit="services"
              />
            )}

            {activeTab === "actions" && <QuickActionsCard />}
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
