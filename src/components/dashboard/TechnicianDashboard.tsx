"use client";
import React from 'react';
import { 
  HiClipboardList, 
  HiClock, 
  HiCheckCircle, 
  HiTrendingUp, 
  HiStar,
  HiUser,
  HiCalendar,
  HiExclamation
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

export default function TechnicianDashboard() {
  const { user } = useUser();
  const { 
    services, 
    isLoading, 
    servicesLoading,
    servicesError
  } = useDashboardData(user?.shopId, user?.branchId);

  // Filter services assigned to this technician
  const myServices = React.useMemo(() => 
    services.filter(s => s.assignedTechnicianId === user?.id),
    [services, user?.id]
  );

  // Calculate technician-specific metrics
  const technicianMetrics = React.useMemo(() => {
    const totalServices = myServices.length;
    const pendingServices = myServices.filter(s => s.status === 'pending').length;
    const inProgressServices = myServices.filter(s => s.status === 'in_progress').length;
    const completedServices = myServices.filter(s => s.status === 'completed').length;
    const urgentServices = myServices.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
    const myRevenue = myServices.reduce((sum, service) => sum + (service.price || 0), 0);
    const customerSatisfaction = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

    return {
      totalServices,
      pendingServices,
      inProgressServices,
      completedServices,
      urgentServices,
      myRevenue,
      customerSatisfaction
    };
  }, [myServices]);

  // Get recent services for technician
  const myRecentServices = React.useMemo(() => 
    myServices.slice(0, 5),
    [myServices]
  );

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(() => [
    {
      id: 'total',
      label: 'Total Services',
      value: technicianMetrics.totalServices,
      icon: HiClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Your assigned services'
    },
    {
      id: 'pending',
      label: 'Pending',
      value: technicianMetrics.pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Awaiting your attention'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: technicianMetrics.inProgressServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Currently working on'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: technicianMetrics.completedServices,
      icon: HiCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Successfully finished'
    },
    {
      id: 'urgent',
      label: 'Urgent',
      value: technicianMetrics.urgentServices,
      icon: HiExclamation,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Requires immediate attention'
    },
    {
      id: 'revenue',
      label: 'My Revenue',
      value: formatCurrency(technicianMetrics.myRevenue),
      icon: HiStar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Revenue from your services'
    },
    {
      id: 'satisfaction',
      label: 'Satisfaction',
      value: `${technicianMetrics.customerSatisfaction}%`,
      icon: HiUser,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Customer satisfaction rate'
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      value: technicianMetrics.totalServices > 0 
        ? `${Math.round((technicianMetrics.completedServices / technicianMetrics.totalServices) * 100)}%` 
        : '0%',
      icon: HiCalendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Completion rate'
    }
  ], [technicianMetrics]);

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
          {isLoading && <DashboardLoadingState message="Loading your services..." />}

          {/* Error States */}
          {servicesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-800 text-sm">Services: {servicesError}</p>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <MetricsGrid metrics={dashboardMetrics} />

          {/* My Services */}
          <RecentServicesCard 
            services={myRecentServices} 
            loading={servicesLoading}
            error={servicesError}
            title="My Services"
            viewAllLink="/services"
            emptyMessage="No services assigned"
            createLink={undefined}
            onRetry={handleServicesRetry}
          />
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
