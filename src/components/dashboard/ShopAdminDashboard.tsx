"use client";

import React from "react";

import { 
  Building2, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  DollarSign
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";

import { 
  CompactErrorState, 
  DashboardErrorBoundary, 
  DashboardHeader, 
  DashboardLoadingState, 
  DashboardMetric, 
  EnhancedMetricsGrid, 
  RecentServicesCard, 
  UltraCompactDashboardContent, 
  UltraCompactDashboardHeader, 
  UltraCompactDashboardLayout 
} from "./shared/DashboardComponents";
import { formatCurrency, formatCustomerSatisfaction } from "./shared/DashboardUtils";

export default function ShopAdminDashboard() {
  const { user } = useUser();
  const { isLoading, metrics, totalRevenue, branches, technicians, recentServices, servicesLoading, servicesError, branchesError, techniciansError } = useDashboardData(user?.shopId);

  // Build metrics array with enhanced data and trend indicators
  const dashboardMetrics: DashboardMetric[] = React.useMemo(
    () => [
      {
        id: "branches",
        label: "Branches",
        value: branches.length,
        icon: Building2,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Total active branches",
        change: 12,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "services",
        label: "Total Services",
        value: metrics.totalServices,
        icon: ClipboardList,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "All services across branches",
        change: 8,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "technicians",
        label: "Technicians",
        value: technicians.length,
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        description: "Active technicians",
        change: 5,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "revenue",
        label: "Total Revenue",
        value: formatCurrency(totalRevenue),
        icon: DollarSign,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "Total revenue across all branches",
        change: 15,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "pending",
        label: "Pending Services",
        value: metrics.pendingServices,
        icon: Clock,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        description: "Services awaiting attention",
        change: -3,
        changeType: "decrease" as const,
        showTrend: true
      },
      {
        id: "completed",
        label: "Completed",
        value: metrics.completedServices,
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Successfully completed services",
        change: 22,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "active",
        label: "Active Services",
        value: metrics.activeServices,
        icon: TrendingUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Currently in progress",
        change: 7,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "satisfaction",
        label: "Customer Satisfaction",
        value: formatCustomerSatisfaction(metrics.customerSatisfaction),
        icon: Star,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        description: "Overall satisfaction rate",
        showTrend: false // Don't show trend for satisfaction
      },
    ],
    [branches.length, technicians.length, metrics, totalRevenue]
  );

  // Handle search functionality
  const handleSearch = React.useCallback((query: string) => {
    console.log('Search query:', query);
    // TODO: Implement search functionality
  }, []);

  // Handle filter changes
  const handleFilterChange = React.useCallback((filter: string) => {
    console.log('Filter changed to:', filter);
    // TODO: Implement filter functionality
  }, []);

  // Handle retry for services
  const handleServicesRetry = React.useCallback(() => {
    // This would typically trigger a refetch
    window.location.reload();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <UltraCompactDashboardLayout>
        {/* Header */}
        <UltraCompactDashboardHeader>
          <DashboardHeader 
            title="Dashboard" 
            subtitle="Welcome back, {name}" 
            user={user}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
          />
        </UltraCompactDashboardHeader>

        {/* Content */}
        <UltraCompactDashboardContent>
          {/* Loading State */}
          {isLoading && <DashboardLoadingState />}

          {/* Error States */}
          {(servicesError || branchesError || techniciansError) && (
            <CompactErrorState 
              message={`${servicesError ? `Services: ${servicesError}` : ""} ${branchesError ? `Branches: ${branchesError}` : ""} ${techniciansError ? `Technicians: ${techniciansError}` : ""}`.trim()} 
            />
          )}

          {/* Metrics Grid */}
          <EnhancedMetricsGrid metrics={dashboardMetrics} columns={8} />

          {/* Recent Services */}
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
        </UltraCompactDashboardContent>
      </UltraCompactDashboardLayout>
    </DashboardErrorBoundary>
  );
}
