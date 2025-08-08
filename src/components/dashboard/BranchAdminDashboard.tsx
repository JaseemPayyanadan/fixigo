"use client";
import React from 'react';
import { 
  HiUserGroup, 
  HiClipboardList, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiClock, 
  HiCheckCircle, 
  HiStar,
  HiOfficeBuilding
} from "react-icons/hi";
import { useUser } from '@/hooks/useUser';
import { useDashboardData } from '@/hooks/useDashboardData';
import { 
  DashboardHeader, 
  DashboardLoadingState, 
  MetricsGrid, 
  RecentServicesCard,
  DashboardMetric,
  DashboardErrorBoundary
} from './shared/DashboardComponents';
import { formatCurrency } from './shared/DashboardUtils';

export default function BranchAdminDashboard() {
  const { user } = useUser();
  const { 
    isLoading, 
    metrics, 
    totalRevenue, 
    technicians, 
    recentServices, 
    servicesLoading,
    servicesError,
    techniciansError
  } = useDashboardData(user?.shopId, user?.branchId);

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(() => [
    {
      id: 'technicians',
      label: 'Technicians',
      value: technicians.length,
      icon: HiUserGroup,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Active technicians in branch'
    },
    {
      id: 'services',
      label: 'Total Services',
      value: metrics.totalServices,
      icon: HiClipboardList,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'All services in this branch'
    },
    {
      id: 'revenue',
      label: 'Branch Revenue',
      value: formatCurrency(totalRevenue),
      icon: HiCurrencyDollar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Total revenue for this branch'
    },
    {
      id: 'pending',
      label: 'Pending Services',
      value: metrics.pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Services awaiting attention'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: metrics.completedServices,
      icon: HiCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Successfully completed services'
    },
    {
      id: 'active',
      label: 'Active Services',
      value: metrics.activeServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Currently in progress'
    },
    {
      id: 'customers',
      label: 'Customers',
      value: metrics.totalCustomers,
      icon: HiOfficeBuilding,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Unique customers served'
    },
    {
      id: 'satisfaction',
      label: 'Customer Satisfaction',
      value: `${metrics.customerSatisfaction}%`,
      icon: HiStar,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      description: 'Branch satisfaction rate'
    }
  ], [technicians.length, metrics, totalRevenue]);

  // Handle retry for services
  const handleServicesRetry = React.useCallback(() => {
    // This would typically trigger a refetch
    window.location.reload();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <DashboardHeader 
          title="Branch Dashboard" 
          subtitle="Welcome back, {name}"
          user={user}
        />

        {/* Loading State */}
        {isLoading && <DashboardLoadingState message="Loading branch data... This may take a moment if you have a large number of services." />}

        {/* Error States */}
        {(servicesError || techniciansError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-800 text-sm">
                {servicesError && `Services: ${servicesError}`}
                {techniciansError && `Technicians: ${techniciansError}`}
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <MetricsGrid metrics={dashboardMetrics} />

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
      </div>
    </DashboardErrorBoundary>
  );
}
