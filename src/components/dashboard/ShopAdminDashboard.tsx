"use client";
import React from 'react';
import { 
  HiOfficeBuilding, 
  HiUserGroup, 
  HiClipboardList, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiClock, 
  HiCheckCircle, 
  HiStar
} from "react-icons/hi";
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUser } from '@/hooks/useUser';
import { 
  DashboardHeader, 
  DashboardLoadingState, 
  MetricsGrid, 
  RecentServicesCard,
  DashboardMetric,
  DashboardErrorBoundary
} from './shared/DashboardComponents';
import { formatCurrency } from './shared/DashboardUtils';

export default function ShopAdminDashboard() {
  const { user } = useUser();
  const { 
    isLoading, 
    metrics, 
    totalRevenue, 
    branches, 
    technicians, 
    recentServices, 
    servicesLoading,
    servicesError,
    branchesError,
    techniciansError
  } = useDashboardData(user?.shopId);

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(() => [
    {
      id: 'branches',
      label: 'Branches',
      value: branches.length,
      icon: HiOfficeBuilding,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Total active branches'
    },
    {
      id: 'services',
      label: 'Total Services',
      value: metrics.totalServices,
      icon: HiClipboardList,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'All services across branches'
    },
    {
      id: 'technicians',
      label: 'Technicians',
      value: technicians.length,
      icon: HiUserGroup,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Active technicians'
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: HiCurrencyDollar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Total revenue across all branches'
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
      id: 'satisfaction',
      label: 'Customer Satisfaction',
      value: `${metrics.customerSatisfaction}%`,
      icon: HiStar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Overall satisfaction rate'
    }
  ], [branches.length, technicians.length, metrics, totalRevenue]);

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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="px-6 py-4">
            <DashboardHeader 
              title="Dashboard" 
              subtitle="Welcome back, {name}"
              user={user}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading State */}
          {isLoading && <DashboardLoadingState />}

          {/* Error States */}
          {(servicesError || branchesError || techniciansError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-800 text-sm">
                  {servicesError && `Services: ${servicesError}`}
                  {branchesError && `Branches: ${branchesError}`}
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
      </div>
    </DashboardErrorBoundary>
  );
}
