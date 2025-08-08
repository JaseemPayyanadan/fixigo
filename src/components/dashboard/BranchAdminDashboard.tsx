"use client";
import React from 'react';
import { useUser } from '@/hooks/useUser';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useServices } from '@/hooks/useServices';
import { useInvoices } from '@/hooks/useInvoices';
import { 
  HiUserGroup, 
  HiClipboardList, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiClock, 
  HiCheckCircle, 
  HiStar,
  HiOfficeBuilding,
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

const RecentServicesCard: React.FC<{ services: Service[]; loading: boolean }> = ({ services, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Services</h3>
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
            return (
              <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <HiClipboardList className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">
                      {service.customer?.name || 'Unknown Customer'} • {service.device?.type || 'Unknown Device'}
                    </p>
                    {service.technician?.name && (
                      <p className="text-xs text-gray-400">Assigned to: {service.technician.name}</p>
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No services yet</h3>
          <p className="mt-2 text-sm text-gray-500">Get started by creating your first service.</p>
          <div className="mt-6">
            <Link
              href="/services/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Create Service
            </Link>
          </div>
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

export default function BranchAdminDashboard() {
  const { user } = useUser();
  const { technicians, loading: techniciansLoading } = useTechnicians(user?.shopId, user?.branchId);
  const { services, loading: servicesLoading } = useServices(user?.shopId, user?.branchId);
  const { invoices, loading: invoicesLoading } = useInvoices(user?.shopId, user?.branchId);

  // Check if any data is still loading
  const isLoading = techniciansLoading || servicesLoading || invoicesLoading;

  // Calculate metrics
  const totalServices = services?.length || 0;
  const pendingServices = services?.filter(s => s.status === 'pending' || s.status === 'in_progress').length || 0;
  const completedServices = services?.filter(s => s.status === 'completed').length || 0;
  const totalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;
  const activeServices = services?.filter(s => s.status === 'in_progress').length || 0;
  const totalCustomers = new Set(services?.map(s => s.customer?.name).filter(Boolean) || []).size;
  const customerSatisfaction = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

  // Get recent services
  const recentServices = services
    ?.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt))
    .slice(0, 5) || [];

  // Build metrics array
  const metrics: DashboardMetric[] = [
    {
      id: 'technicians',
      label: 'Technicians',
      value: technicians?.length || 0,
      icon: HiUserGroup,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'services',
      label: 'Total Services',
      value: totalServices,
      icon: HiClipboardList,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'revenue',
      label: 'Branch Revenue',
      value: formatCurrency(totalRevenue),
      icon: HiCurrencyDollar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'pending',
      label: 'Pending Services',
      value: pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
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
      id: 'active',
      label: 'Active Services',
      value: activeServices,
      icon: HiTrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'customers',
      label: 'Customers',
      value: totalCustomers,
      icon: HiOfficeBuilding,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      id: 'satisfaction',
      label: 'Customer Satisfaction',
      value: `${customerSatisfaction}%`,
      icon: HiStar,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
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
          <h1 className="text-3xl font-bold text-gray-900">Branch Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || 'Branch Admin'}
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
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <HiExclamation className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-blue-800 text-sm">
              Loading branch data... This may take a moment if you have a large number of services.
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

      {/* Recent Services */}
      <div>
        <RecentServicesCard services={recentServices} loading={servicesLoading} />
      </div>
    </div>
  );
}
