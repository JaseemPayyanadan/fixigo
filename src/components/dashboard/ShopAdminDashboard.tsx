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
  DashboardMetric 
} from './shared/DashboardComponents';
import { formatCurrency } from './shared/DashboardUtils';

export default function ShopAdminDashboard() {
  const { user } = useUser();
  const { isLoading, metrics, totalRevenue, branches, technicians, recentServices, servicesLoading } = useDashboardData(user?.shopId);

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(() => [
    {
      id: 'branches',
      label: 'Branches',
      value: branches.length,
      icon: HiOfficeBuilding,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'services',
      label: 'Total Services',
      value: metrics.totalServices,
      icon: HiClipboardList,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'technicians',
      label: 'Technicians',
      value: technicians.length,
      icon: HiUserGroup,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: HiCurrencyDollar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'pending',
      label: 'Pending Services',
      value: metrics.pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: metrics.completedServices,
      icon: HiCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'active',
      label: 'Active Services',
      value: metrics.activeServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'satisfaction',
      label: 'Customer Satisfaction',
      value: `${metrics.customerSatisfaction}%`,
      icon: HiStar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ], [branches.length, technicians.length, metrics, totalRevenue]);

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <DashboardHeader 
        title="Shop Dashboard" 
        subtitle="Welcome back, {name}"
        user={user}
      />

      {/* Loading State */}
      {isLoading && <DashboardLoadingState />}

      {/* Metrics Grid */}
      <MetricsGrid metrics={dashboardMetrics} />

      {/* Recent Services */}
      <RecentServicesCard 
        services={recentServices} 
        loading={servicesLoading}
        title="Recent Services"
        viewAllLink="/services"
        emptyMessage="No services yet"
        createLink="/services/new"
      />
    </div>
  );
}
