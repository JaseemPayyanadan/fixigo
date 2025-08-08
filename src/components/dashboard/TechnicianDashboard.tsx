"use client";
import React from 'react';
import { useUser } from '@/hooks/useUser';
import { useServices } from '@/hooks/useServices';
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
import Link from 'next/link';

interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface Service {
  id: string;
  name: string;
  status: string;
  price: number;
  createdAt: unknown;
  customer?: { name: string; phone: string; email: string };
  device?: { type: string; brand: string; model: string };
  technician?: { name: string; id: string };
  branch?: { name: string; id: string };
  estimatedDuration?: number;
  estimatedCompletion?: Date;
}

const MetricCard: React.FC<DashboardMetric> = ({ 
  label, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color, 
  bgColor 
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
);

const MyServicesCard: React.FC<{ services: Service[]; loading: boolean }> = ({ services, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Services</h3>
        <Link 
          href="/services" 
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>
    </div>
    <div className="p-6">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      ) : services.length > 0 ? (
        <div className="space-y-4">
          {services.map((service) => {
            const statusColors = getStatusColor(service.status);
            const isUrgent = service.status === 'pending' || service.status === 'in_progress';
            return (
              <div key={service.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                isUrgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isUrgent ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <HiClipboardList className={`h-5 w-5 ${
                        isUrgent ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">
                      {service.customer?.name || 'Unknown Customer'} • {service.device?.type || 'Unknown Device'}
                    </p>
                    {service.estimatedCompletion && (
                      <p className="text-xs text-gray-400">
                        Due: {new Date(service.estimatedCompletion).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {service.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(service.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <HiClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No services assigned</h3>
          <p className="mt-2 text-sm text-gray-500">You don&apos;t have any services assigned yet.</p>
        </div>
      )}
    </div>
  </div>
);

const getStatusColor = (status: string): { bg: string; text: string } => {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'in_progress':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getTimestampSeconds = (timestamp: unknown): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
    return (timestamp as { seconds: number }).seconds;
  }
  return 0;
};

export default function TechnicianDashboard() {
  const { user } = useUser();
  const { services, loading: servicesLoading } = useServices(user?.shopId, user?.branchId);

  // Filter services assigned to this technician
  const myServices = services?.filter(s => s.assignedTechnicianId === user?.id) || [];

  // Calculate metrics
  const totalServices = myServices.length;
  const pendingServices = myServices.filter(s => s.status === 'pending').length;
  const inProgressServices = myServices.filter(s => s.status === 'in_progress').length;
  const completedServices = myServices.filter(s => s.status === 'completed').length;
  const urgentServices = myServices.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
  const totalRevenue = myServices.reduce((sum, service) => sum + (service.price || 0), 0);
  const customerSatisfaction = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

  // Get recent services
  const recentServices = myServices
    .sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt))
    .slice(0, 5);

  // Build metrics array
  const metrics: DashboardMetric[] = [
    {
      id: 'total',
      label: 'Total Services',
      value: totalServices,
      icon: HiClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'pending',
      label: 'Pending',
      value: pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: inProgressServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: completedServices,
      icon: HiCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'urgent',
      label: 'Urgent',
      value: urgentServices,
      icon: HiExclamation,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      id: 'revenue',
      label: 'My Revenue',
      value: formatCurrency(totalRevenue),
      icon: HiStar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'satisfaction',
      label: 'Satisfaction',
      value: `${customerSatisfaction}%`,
      icon: HiUser,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      value: totalServices > 0 ? `${Math.round((completedServices / totalServices) * 100)}%` : '0%',
      icon: HiCalendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || 'Technician'}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Loading State */}
      {servicesLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <HiExclamation className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-blue-800 text-sm">
              Loading your services... This may take a moment.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* My Services */}
      <div>
        <MyServicesCard services={recentServices} loading={servicesLoading} />
      </div>
    </div>
  );
}
