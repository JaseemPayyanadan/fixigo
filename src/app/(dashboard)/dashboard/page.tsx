"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { useBranches } from '@/hooks/useBranches';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useServices } from '@/hooks/useServices';
import { useInvoices } from '@/hooks/useInvoices';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger, isIndexBuildingError, getIndexBuildingMessage } from '@/lib/logger';
import { 
  HiOfficeBuilding, 
  HiUserGroup, 
  HiClipboardList, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiClock, 
  HiCheckCircle, 
  HiUser,
  HiChartBar,
  HiCalendar,
  HiStar,
  HiExclamationTriangle
} from "react-icons/hi";
import Link from 'next/link';
import PermissionGuard from '@/components/auth/PermissionGuard';
import type { User } from "@/types";

// Types
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

interface DashboardData {
  metrics: DashboardMetric[];
  recentServices: Service[];
  loading: boolean;
  error: string | null;
}

// Utility functions
const getTimestampSeconds = (timestamp: unknown): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
    return (timestamp as { seconds: number }).seconds;
  }
  return 0;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

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

// Dashboard Components
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

const RecentServicesCard: React.FC<{ services: Service[] }> = ({ services }) => (
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
      {services.length > 0 ? (
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

const QuickActionsCard: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-4">
      <Link
        href="/services/new"
        className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <HiClipboardList className="h-5 w-5 text-blue-600 mr-3" />
        <span className="text-sm font-medium text-gray-900">New Service</span>
      </Link>
      <Link
        href="/technicians/new"
        className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
      >
        <HiUserGroup className="h-5 w-5 text-purple-600 mr-3" />
        <span className="text-sm font-medium text-gray-900">Add Technician</span>
      </Link>
      <Link
        href="/branch/new"
        className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
      >
        <HiOfficeBuilding className="h-5 w-5 text-green-600 mr-3" />
        <span className="text-sm font-medium text-gray-900">New Branch</span>
      </Link>
      <Link
        href="/reports"
        className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
      >
        <HiChartBar className="h-5 w-5 text-orange-600 mr-3" />
        <span className="text-sm font-medium text-gray-900">View Reports</span>
      </Link>
    </div>
  </div>
);

// Main Dashboard Component
const DashboardContent: React.FC = () => {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData>({
    metrics: [],
    recentServices: [],
    loading: true,
    error: null
  });

  // Use hooks for data
  const { branches } = useBranches(user?.shopId);
  const { technicians } = useTechnicians(user?.shopId, user?.role === 'branch_admin' ? user?.branchId : undefined);
  const { services } = useServices(user?.shopId, user?.role === 'branch_admin' ? user?.branchId : undefined);
  const { invoices } = useInvoices(user?.shopId, user?.role === 'branch_admin' ? user?.branchId : undefined);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      let servicesData: Service[] = [];
      let invoicesData: any[] = [];

      // Fetch data based on user role
      if (user.role === 'technician') {
        const servicesQuery = query(
          collection(db, "services"),
          where("shopId", "==", user.shopId),
          where("branchId", "==", user.branchId),
          where("assignedTechnicianId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(servicesQuery);
        servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[];
      } else {
        // For shop_admin and branch_admin
        const servicesQuery = query(
          collection(db, "services"),
          where("shopId", "==", user.shopId),
          ...(user.role === 'branch_admin' ? [where("branchId", "==", user.branchId)] : []),
          orderBy("createdAt", "desc")
        );
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("shopId", "==", user.shopId),
          ...(user.role === 'branch_admin' ? [where("branchId", "==", user.branchId)] : []),
          orderBy("createdAt", "desc")
        );

        const [servicesSnapshot, invoicesSnapshot] = await Promise.all([
          getDocs(servicesQuery),
          getDocs(invoicesQuery)
        ]);

        servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[];

        invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Calculate metrics
      const totalServices = servicesData.length;
      const pendingServices = servicesData.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
      const completedServices = servicesData.filter(s => s.status === 'completed').length;
      const totalRevenue = invoicesData.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      const activeServices = servicesData.filter(s => s.status === 'in_progress').length;
      const totalCustomers = new Set(servicesData.map(s => s.customer?.name).filter(Boolean)).size;
      const customerSatisfaction = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

      // Sort recent services
      const recentServices = servicesData
        .sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt))
        .slice(0, 5);

      // Create metrics array
      const metrics: DashboardMetric[] = [
        {
          id: 'branches',
          label: 'Branches',
          value: branches?.length || 0,
          icon: HiOfficeBuilding,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
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
          id: 'technicians',
          label: 'Technicians',
          value: technicians?.length || 0,
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
          id: 'satisfaction',
          label: 'Customer Satisfaction',
          value: `${customerSatisfaction}%`,
          icon: HiStar,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100'
        }
      ];

      setData({
        metrics,
        recentServices,
        loading: false,
        error: null
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard data";
      
      // Check if it's an index building error
      const finalErrorMessage = isIndexBuildingError(errorMessage) 
        ? getIndexBuildingMessage(errorMessage)
        : errorMessage;
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: finalErrorMessage
      }));
      logger.error("Error fetching dashboard data", {
        error: errorMessage,
        userId: user?.uid,
        role: user?.role
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, branches, technicians, services, invoices]);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    const isIndexBuilding = isIndexBuildingError(data.error);
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          {isIndexBuilding ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          ) : (
            <HiExclamationTriangle className="mx-auto h-12 w-12 text-red-500" />
          )}
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {isIndexBuilding ? 'Setting Up Database' : 'Error Loading Dashboard'}
          </h2>
          <p className="mt-2 text-gray-600">{data.error}</p>
          {!isIndexBuilding && (
            <button 
              onClick={fetchDashboardData}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || 'User'}
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Services - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentServicesCard services={data.recentServices} />
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div>
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
};

// Main Export
export default function DashboardPage() {
  return (
    <PermissionGuard permissions={['dashboard:read']}>
      <DashboardContent />
    </PermissionGuard>
  );
}
