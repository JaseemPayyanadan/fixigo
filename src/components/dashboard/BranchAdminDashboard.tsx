"use client";

import React from "react";

import { HiCheckCircle, HiClipboardList, HiClock, HiCurrencyDollar, HiOfficeBuilding, HiStar, HiTrendingUp, HiUserGroup } from "react-icons/hi";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";

import { CompactDashboardContent, CompactDashboardHeader, CompactDashboardLayout, CompactErrorState, DashboardErrorBoundary, DashboardHeader, DashboardLoadingState, DashboardMetric, EnhancedMetricsGrid, RecentServicesCard } from "./shared/DashboardComponents";
import { formatCurrency } from "./shared/DashboardUtils";

export default function BranchAdminDashboard() {
  const { user } = useUser();
  const { isLoading, metrics, totalRevenue, technicians, recentServices, servicesLoading, servicesError, techniciansError } = useDashboardData(user?.shopId, user?.branchId);

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(
    () => [
      {
        id: "technicians",
        label: "Technicians",
        value: technicians.length,
        icon: HiUserGroup,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        description: "Active technicians in branch",
      },
      {
        id: "services",
        label: "Total Services",
        value: metrics.totalServices,
        icon: HiClipboardList,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "All services in this branch",
      },
      {
        id: "revenue",
        label: "Branch Revenue",
        value: formatCurrency(totalRevenue),
        icon: HiCurrencyDollar,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "Total revenue for this branch",
      },
      {
        id: "pending",
        label: "Pending Services",
        value: metrics.pendingServices,
        icon: HiClock,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        description: "Services awaiting attention",
      },
      {
        id: "completed",
        label: "Completed",
        value: metrics.completedServices,
        icon: HiCheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Successfully completed services",
      },
      {
        id: "active",
        label: "Active Services",
        value: metrics.activeServices,
        icon: HiTrendingUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Currently in progress",
      },
      {
        id: "customers",
        label: "Customers",
        value: metrics.totalCustomers,
        icon: HiOfficeBuilding,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        description: "Unique customers served",
      },
      {
        id: "satisfaction",
        label: "Customer Satisfaction",
        value: `${metrics.customerSatisfaction}%`,
        icon: HiStar,
        color: "text-pink-600",
        bgColor: "bg-pink-100",
        description: "Branch satisfaction rate",
      },
    ],
    [technicians.length, metrics, totalRevenue]
  );

  // Handle retry for services
  const handleServicesRetry = React.useCallback(() => {
    // This would typically trigger a refetch
    window.location.reload();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <CompactDashboardLayout>
        {/* Header */}
        <CompactDashboardHeader>
          <DashboardHeader title="Branch Dashboard" subtitle="Welcome back, {name}" user={user} />
        </CompactDashboardHeader>

        {/* Content */}
        <CompactDashboardContent>
          {/* Loading State */}
          {isLoading && <DashboardLoadingState />}

          {/* Error States */}
          {(servicesError || techniciansError) && <CompactErrorState message={`${servicesError ? `Services: ${servicesError}` : ""} ${techniciansError ? `Technicians: ${techniciansError}` : ""}`.trim()} />}

          {/* Metrics Grid */}
          <EnhancedMetricsGrid metrics={dashboardMetrics} columns={6} />

          {/* Recent Services */}
          <RecentServicesCard services={recentServices} loading={servicesLoading} error={servicesError} title="Recent Services" viewAllLink="/services" emptyMessage="No services yet" createLink="/services/new" onRetry={handleServicesRetry} />
        </CompactDashboardContent>
      </CompactDashboardLayout>
    </DashboardErrorBoundary>
  );
}
