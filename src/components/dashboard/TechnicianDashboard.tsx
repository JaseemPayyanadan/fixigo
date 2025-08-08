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
  DashboardMetric 
} from './shared/DashboardComponents';
import { formatCurrency } from './shared/DashboardUtils';

export default function TechnicianDashboard() {
  const { user } = useUser();
  const { services, isLoading, metrics, totalRevenue, recentServices, servicesLoading } = useDashboardData(user?.shopId, user?.branchId);

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
      bgColor: 'bg-blue-100'
    },
    {
      id: 'pending',
      label: 'Pending',
      value: technicianMetrics.pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: technicianMetrics.inProgressServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: technicianMetrics.completedServices,
      icon: HiCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'urgent',
      label: 'Urgent',
      value: technicianMetrics.urgentServices,
      icon: HiExclamation,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      id: 'revenue',
      label: 'My Revenue',
      value: formatCurrency(technicianMetrics.myRevenue),
      icon: HiStar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'satisfaction',
      label: 'Satisfaction',
      value: `${technicianMetrics.customerSatisfaction}%`,
      icon: HiUser,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      value: technicianMetrics.totalServices > 0 
        ? `${Math.round((technicianMetrics.completedServices / technicianMetrics.totalServices) * 100)}%` 
        : '0%',
      icon: HiCalendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ], [technicianMetrics]);

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
        title="My Dashboard" 
        subtitle="Welcome back, {name}"
        user={user}
      />

      {/* Loading State */}
      {isLoading && <DashboardLoadingState message="Loading your services... This may take a moment." />}

      {/* Metrics Grid */}
      <MetricsGrid metrics={dashboardMetrics} />

      {/* My Services */}
      <RecentServicesCard 
        services={myRecentServices} 
        loading={servicesLoading}
        title="My Services"
        viewAllLink="/services"
        emptyMessage="No services assigned"
        createLink={null}
      />
    </div>
  );
}
