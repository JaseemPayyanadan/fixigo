"use client";

import React from "react";

import { 
  Users, 
  ClipboardList, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Star, 
  TrendingUp, 
  Building2 
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";

import { CompactDashboardContent, CompactDashboardHeader, CompactDashboardLayout, CompactErrorState, DashboardErrorBoundary, DashboardHeader, DashboardLoadingState, DashboardMetric, EnhancedMetricsGrid, RecentServicesCard } from "./shared/DashboardComponents";
import { formatCurrency, formatCustomerSatisfaction } from "./shared/DashboardUtils";

export default function BranchAdminDashboard() {
  const { user } = useUser();
  const { isLoading, metrics, totalRevenue, technicians, recentServices, servicesLoading, servicesError, techniciansError } = useDashboardData(user?.shopId, user?.branchId);

  // Build metrics array with enhanced data and trend indicators
  const dashboardMetrics: DashboardMetric[] = React.useMemo(
    () => [
      {
        id: "technicians",
        label: "Technicians",
        value: technicians.length,
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        description: "Active technicians in branch",
        change: 3,
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
        description: "All services in this branch",
        change: 15,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "revenue",
        label: "Branch Revenue",
        value: formatCurrency(totalRevenue),
        icon: DollarSign,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "Total revenue for this branch",
        change: 18,
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
        change: -5,
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
        change: 25,
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
        change: 12,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "customers",
        label: "Customers",
        value: metrics.totalCustomers,
        icon: Building2,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        description: "Unique customers served",
        change: 8,
        changeType: "increase" as const,
        showTrend: true
      },
      {
        id: "satisfaction",
        label: "Customer Satisfaction",
        value: formatCustomerSatisfaction(metrics.customerSatisfaction),
        icon: Star,
        color: "text-pink-600",
        bgColor: "bg-pink-100",
        description: "Branch satisfaction rate",
        showTrend: false // Don't show trend for satisfaction
      },
    ],
    [technicians.length, metrics, totalRevenue]
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
          <DashboardHeader 
            title="Branch Dashboard" 
            subtitle="Welcome back, {name}" 
            user={user}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
          />
        </CompactDashboardHeader>

        {/* Content */}
        <CompactDashboardContent>
          {/* Loading State */}
          {isLoading && <DashboardLoadingState />}

          {/* Error States */}
          {(servicesError || techniciansError) && (
            <CompactErrorState 
              message={`${servicesError ? `Services: ${servicesError}` : ""} ${techniciansError ? `Technicians: ${techniciansError}` : ""}`.trim()} 
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
        </CompactDashboardContent>
      </CompactDashboardLayout>
    </DashboardErrorBoundary>
  );
}
