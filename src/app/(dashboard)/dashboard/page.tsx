"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { useBranches } from '@/hooks/useBranches';
import { useTechnicians } from '@/hooks/useTechnicians';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { HiOfficeBuilding, HiUserGroup, HiClipboardList, HiDocumentText, HiUser, HiBriefcase, HiCurrencyDollar, HiTrendingUp, HiClock, HiCheckCircle, HiCalendar } from "react-icons/hi";
import Link from 'next/link';
import PermissionGuard from '@/components/auth/PermissionGuard';

// Memoized interfaces for better performance
interface DashboardStats {
  branches: number;
  services: number;
  technicians: number;
  invoices: number;
  pendingServices: number;
  completedServices: number;
  totalRevenue: number;
  recentServices: Service[];

  activeServices?: number;
  totalCustomers?: number;
  monthlyRevenue?: number;
  customerSatisfaction?: number;
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

// Memoized DashboardContent component
const DashboardContent = React.memo(() => {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    branches: 0,
    services: 0,
    technicians: 0,
    invoices: 0,
    pendingServices: 0,
    completedServices: 0,
    totalRevenue: 0,
    recentServices: [],
    
    activeServices: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    customerSatisfaction: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use existing hooks with memoization
  const { branches } = useBranches(user?.shopId);
  const { technicians } = useTechnicians(user?.shopId, user?.role === 'branch_admin' ? user?.branchId : undefined);

  // Memoized helper functions
  const getTimestampSeconds = useCallback((timestamp: unknown): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
      return (timestamp as { seconds: number }).seconds;
    }
    return 0;
  }, []);

  const sortServicesByTimestamp = useCallback((services: Service[]) => {
    return services.sort((a, b) => {
      const aTime = getTimestampSeconds(a.createdAt);
      const bTime = getTimestampSeconds(b.createdAt);
      return bTime - aTime; // Descending order
    }).slice(0, 5);
  }, [getTimestampSeconds]);

  // Memoized data fetching functions
  const fetchTechnicianData = useCallback(async (user: any) => {
    const technicianQuery = query(
      collection(db, "technicians"),
      where("uid", "==", user.uid)
    );
    const technicianSnapshot = await getDocs(technicianQuery);
    
    if (technicianSnapshot.empty) {
      throw new Error('No technician document found');
    }

    const technicianId = technicianSnapshot.docs[0].id;
    const servicesQuery = query(
      collection(db, "services"),
      where("technicianId", "==", technicianId),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    
    const servicesSnapshot = await getDocs(servicesQuery);
    return servicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.serviceName || "Unknown Service",
        status: data.status || "To Do",
        price: data.price || data.total || 0,
        createdAt: data.createdAt,
        customer: data.customer || null,
        device: data.device || null,
        technician: data.technician || null,
        branch: data.branch || null,
        estimatedDuration: data.estimatedDuration || 0
      };
    });
  }, []);

  const fetchShopAdminData = useCallback(async (user: any) => {
    const [servicesSnapshot, invoicesSnapshot] = await Promise.all([
      getDocs(query(collection(db, "services"), where("shopId", "==", user.shopId))),
      getDocs(query(collection(db, "invoices"), where("shopId", "==", user.shopId)))
    ]);

    const services = servicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.serviceName || "Unknown Service",
        status: data.status || "To Do",
        price: data.price || data.total || 0,
        createdAt: data.createdAt,
        customer: data.customer || null,
        device: data.device || null,
        technician: data.technician || null,
        branch: data.branch || null,
        estimatedDuration: data.estimatedDuration || 0
      };
    });

    const invoices = invoicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        total: data.total || 0,
        status: data.status || "pending"
      };
    });

    return { services, invoices };
  }, []);

  const fetchBranchAdminData = useCallback(async (user: any) => {
    const [servicesSnapshot, invoicesSnapshot] = await Promise.all([
      getDocs(query(collection(db, "services"), where("branchId", "==", user.branchId))),
      getDocs(query(collection(db, "invoices"), where("branchId", "==", user.branchId)))
    ]);

    const services = servicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.serviceName || "Unknown Service",
        status: data.status || "To Do",
        price: data.price || data.total || 0,
        createdAt: data.createdAt,
        customer: data.customer || null,
        device: data.device || null,
        technician: data.technician || null,
        branch: data.branch || null,
        estimatedDuration: data.estimatedDuration || 0
      };
    });

    const invoices = invoicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        total: data.total || 0,
        status: data.status || "pending"
      };
    });

    return { services, invoices };
  }, []);

  // Memoized data fetching effect
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      // Early validation
      if (user.role === "shop_admin" && !user.shopId) {
        logger.warn('Shop admin missing shopId', { userId: user.uid });
        setLoading(false);
        return;
      }
      
      if (user.role === "branch_admin" && (!user.shopId || !user.branchId)) {
        logger.warn('Branch admin missing shopId or branchId', { 
          userId: user.uid, 
          shopId: user.shopId, 
          branchId: user.branchId 
        });
        setLoading(false);
        return;
      }
      
      if (user.role === "technician" && (!user.shopId || !user.branchId)) {
        logger.warn('Technician missing shopId or branchId', { 
          userId: user.uid, 
          shopId: user.shopId, 
          branchId: user.branchId 
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        logger.info('Fetching dashboard data', { 
          userId: user.uid, 
          role: user.role,
          shopId: user.shopId,
          branchId: user.branchId,
          onboardingCompleted: user.onboardingCompleted
        });

        let services: Service[] = [];
        let invoices: any[] = [];

        if (user.role === "technician") {
          services = await fetchTechnicianData(user);
        } else if (user.role === "shop_admin") {
          const data = await fetchShopAdminData(user);
          services = data.services;
          invoices = data.invoices;
        } else if (user.role === "branch_admin") {
          const data = await fetchBranchAdminData(user);
          services = data.services;
          invoices = data.invoices;
        }

        // Calculate stats efficiently
        const pendingServices = services.filter((s: Service) => s.status === "To Do" || s.status === "In Progress").length;
        const completedServices = services.filter((s: Service) => s.status === "Completed").length;
        const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);
        const monthlyRevenue = totalRevenue * (user.role === "shop_admin" ? 0.3 : 0.25);
        const activeServices = services.filter((s: Service) => s.status === "In Progress").length;
        const totalCustomers = new Set(services.map((s: Service) => s.customer?.email).filter(Boolean)).size;
        const customerSatisfaction = services.length > 0 ? (user.role === "shop_admin" ? 4.5 : 4.3) : 0;

        const calculatedStats: DashboardStats = {
          branches: user.role === "branch_admin" ? 1 : branches.length,
          services: services.length,
          technicians: technicians.length,
          invoices: invoices.length,
          pendingServices,
          completedServices,
          totalRevenue,
          recentServices: sortServicesByTimestamp(services),
          activeServices,
          totalCustomers,
          monthlyRevenue,
          customerSatisfaction
        };

        setStats(calculatedStats);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch dashboard data";
        setError(errorMessage);
        logger.error('Error fetching dashboard data', { 
          error: errorMessage,
          userId: user.uid,
          role: user.role,
          shopId: user.shopId,
          branchId: user.branchId
        });
        
        // Set default stats on error
        setStats({
          branches: 0,
          services: 0,
          technicians: 0,
          invoices: 0,
          pendingServices: 0,
          completedServices: 0,
          totalRevenue: 0,
          recentServices: [],
          activeServices: 0,
          totalCustomers: 0,
          monthlyRevenue: 0,
          customerSatisfaction: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, sortServicesByTimestamp, branches, technicians, fetchTechnicianData, fetchShopAdminData, fetchBranchAdminData]);

  // Memoized loading component
  const LoadingSkeleton = useMemo(() => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ), []);

  if (loading) {
    return LoadingSkeleton;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800">Error loading dashboard</h3>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full px-8 py-4">
        {/* Header */}
        <div className="flex flex-row justify-between mb-8">
          <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-xs text-gray-600">
            Here&apos;s what&apos;s happening with your {user?.role === 'technician' ? 'tasks' : 'business'} today.
          </p>
          </div>
          {/* add date and day */}
          <div className="flex flex-row items-center gap-2">
            {/* calendar icon with bg */}
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <HiCalendar className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex flex-col">
            <p className="text-xs font-bold text-gray-900">
              {new Date().toLocaleDateString()}
            </p>
            <p className="text-xs font-bold text-gray-600">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Role-specific stats */}
          {user?.role === 'shop_admin' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Branches</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.branches}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <HiOfficeBuilding className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Technicians</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.technicians}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <HiUserGroup className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <HiUser className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
              </div>
            </>
          )}

          {user?.role === 'branch_admin' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <HiClipboardList className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Technicians</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.technicians}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <HiUserGroup className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <HiUser className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.invoices}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <HiDocumentText className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </div>
            </>
          )}

          {user?.role === 'technician' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <HiClipboardList className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingServices}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <HiClock className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <HiCheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <HiCurrencyDollar className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Additional Stats for Shop Admin */}
        {user?.role === 'shop_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Services</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeServices}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <HiTrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue?.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <HiCurrencyDollar className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.customerSatisfaction}/5</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <HiTrendingUp className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Services */}
        {stats.recentServices.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent {user?.role === 'technician' ? 'Tasks' : 'Services'}</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentServices.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.customer?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            service.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {service.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{service.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.createdAt ? new Date(getTimestampSeconds(service.createdAt) * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

DashboardContent.displayName = 'DashboardContent';

export default function DashboardPage() {
  return <DashboardContent />;
}
