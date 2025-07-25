"use client";
import React, { useState, useEffect } from "react";

import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { useTechnicians } from "@/hooks/useTechnicians";
import { PermissionGuard } from "@/components";
import { HiOfficeBuilding, HiUserGroup, HiClipboardList, HiDocumentText, HiUser, HiBriefcase, HiCurrencyDollar, HiTrendingUp, HiClock, HiCheckCircle } from "react-icons/hi";
import Link from "next/link";
import logger from "@/lib/logger";
import { timestampToDate } from "@/lib/utils";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DashboardStats {
  branches: number;
  services: number;
  technicians: number;
  invoices: number;
  pendingServices: number;
  completedServices: number;
  totalRevenue: number;
  recentServices: Service[];
  // Additional stats for different roles
  totalShops?: number;
  activeServices?: number;
  totalCustomers?: number;
  monthlyRevenue?: number;
  averageServiceTime?: number;
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

function DashboardContent() {
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
    totalShops: 0,
    activeServices: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    averageServiceTime: 0,
    customerSatisfaction: 0
  });
  const [loading, setLoading] = useState(true);


  // Use existing hooks
  const { branches } = useBranches(user?.shopId);
        const { technicians } = useTechnicians(user?.shopId, user?.role === 'branch_admin' ? user?.branchId : undefined);

  // Helper function to safely get timestamp seconds
  const getTimestampSeconds = (timestamp: unknown): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
      return (timestamp as { seconds: number }).seconds;
    }
    return 0;
  };

  // Helper function to sort services by timestamp
  const sortServicesByTimestamp = React.useCallback((services: Service[]) => {
    return services.sort((a, b) => {
      const aTime = getTimestampSeconds(a.createdAt);
      const bTime = getTimestampSeconds(b.createdAt);
      return bTime - aTime; // Descending order
    }).slice(0, 5);
  }, []);

  // Log user data for debugging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Dashboard user data', {
        userId: user?.uid,
        userRole: user?.role,
                  userEmail: user?.email,
          shopId: user?.shopId,
          hasShopId: !!user?.shopId
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        logger.info('Fetching dashboard data', { userId: user.uid, role: user.role });

        if (user.role === "technician") {
          // Technician dashboard logic
          logger.debug('Loading technician dashboard', { 
            userId: user.uid, 
            branchId: user.branchId,
            shopId: user.shopId 
          });

          // Find technician document by UID
          const technicianQuery = query(
            collection(db, "technicians"),
            where("uid", "==", user.uid)
          );
          const technicianSnapshot = await getDocs(technicianQuery);
          
          if (!technicianSnapshot.empty) {
            const technicianId = technicianSnapshot.docs[0].id;
            logger.debug('Found technician document', { technicianId });

            // Fetch services for this technician
            const servicesQuery = query(
              collection(db, "services"),
              where("technicianId", "==", technicianId),
              orderBy("createdAt", "desc"),
              limit(10)
            );
            const servicesSnapshot = await getDocs(servicesQuery);
            
            const services: Service[] = servicesSnapshot.docs.map(doc => {
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

            logger.debug('Technician services data', { 
              servicesCount: services.length,
              services: services 
            });

            const pendingServices = services.filter((s: Service) => s.status === "To Do" || s.status === "In Progress").length;
            const completedServices = services.filter((s: Service) => s.status === "Completed").length;
            const totalRevenue = services
              .filter((s: Service) => s.status === "Completed")
              .reduce((sum: number, s: Service) => sum + (s.price || 0), 0);

            // Calculate additional stats for technicians
            const activeServices = services.filter((s: Service) => s.status === "In Progress").length;
            const averageServiceTime = services.length > 0 ? 
              services.reduce((sum: number, s: Service) => sum + (s.estimatedDuration || 0), 0) / services.length : 0;
            const customerSatisfaction = services.length > 0 ? 4.2 : 0; // Mock data

            logger.debug('Technician stats calculated', {
              pendingServices,
              completedServices,
              totalRevenue,
              activeServices,
              averageServiceTime,
              customerSatisfaction
            });

            setStats({
              branches: 0,
              services: services.length,
              technicians: 0,
              invoices: 0,
              pendingServices,
              completedServices,
              totalRevenue,
              recentServices: sortServicesByTimestamp(services),
              activeServices,
              averageServiceTime,
              customerSatisfaction
            });
          } else {
            logger.warn('No technician document found', { userId: user.uid });
          }
        } else if (user.role === "shop_admin") {
          // Shop admin dashboard logic - comprehensive data
          logger.debug('Loading shop admin dashboard', { 
            userId: user.uid, 
            role: user.role,
            shopId: user.shopId 
          });

          // Fetch all data for shop admin using Firebase directly
          const [servicesSnapshot, invoicesSnapshot] = await Promise.all([
            getDocs(query(collection(db, "services"), where("shopId", "==", user.shopId))),
            getDocs(query(collection(db, "invoices"), where("shopId", "==", user.shopId)))
          ]);

          const services: Service[] = servicesSnapshot.docs.map(doc => {
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

          // Calculate comprehensive stats for shop admin
          const pendingServices = services.filter((s: Service) => s.status === "To Do" || s.status === "In Progress").length;
          const completedServices = services.filter((s: Service) => s.status === "Completed").length;
          const totalRevenue = invoices.reduce((sum: number, inv: Record<string, unknown>) => sum + (Number(inv.total) || 0), 0);
          const monthlyRevenue = totalRevenue * 0.3; // Mock monthly calculation
          const activeServices = services.filter((s: Service) => s.status === "In Progress").length;
          const totalCustomers = new Set(services.map((s: Service) => s.customer?.email).filter(Boolean)).size;
          const averageServiceTime = services.length > 0 ? 
            services.reduce((sum: number, s: Service) => sum + (s.estimatedDuration || 0), 0) / services.length : 0;
          const customerSatisfaction = services.length > 0 ? 4.5 : 0; // Mock data

          logger.debug('Shop admin dashboard stats calculated', {
            branches: branches.length,
            services: services.length,
            technicians: technicians.length,
            invoices: invoices.length,
            pendingServices,
            completedServices,
            totalRevenue,
            totalCustomers,
            monthlyRevenue,
            activeServices,
            averageServiceTime,
            customerSatisfaction
          });

          setStats({
            branches: branches.length,
            services: services.length,
            technicians: technicians.length,
            invoices: invoices.length,
            pendingServices,
            completedServices,
            totalRevenue,
            recentServices: sortServicesByTimestamp(services),
            totalShops: 1, // Shop admin manages one shop
            activeServices,
            totalCustomers,
            monthlyRevenue,
            averageServiceTime,
            customerSatisfaction
          });
        } else if (user.role === "branch_admin") {
          // Branch admin dashboard logic
          logger.debug('Loading branch admin dashboard', { 
            userId: user.uid, 
            role: user.role,
            shopId: user.shopId,
            branchId: user.branchId
          });

          // Fetch branch-specific data
          const [servicesSnapshot, invoicesSnapshot] = await Promise.all([
            getDocs(query(collection(db, "services"), where("branchId", "==", user.branchId))),
            getDocs(query(collection(db, "invoices"), where("branchId", "==", user.branchId)))
          ]);

          const services: Service[] = servicesSnapshot.docs.map(doc => {
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

          // Calculate branch-specific stats
          const pendingServices = services.filter((s: Service) => s.status === "To Do" || s.status === "In Progress").length;
          const completedServices = services.filter((s: Service) => s.status === "Completed").length;
          const totalRevenue = invoices.reduce((sum: number, inv: Record<string, unknown>) => sum + (Number(inv.total) || 0), 0);
          const monthlyRevenue = totalRevenue * 0.25; // Mock monthly calculation
          const activeServices = services.filter((s: Service) => s.status === "In Progress").length;
          const totalCustomers = new Set(services.map((s: Service) => s.customer?.email).filter(Boolean)).size;
          const averageServiceTime = services.length > 0 ? 
            services.reduce((sum: number, s: Service) => sum + (s.estimatedDuration || 0), 0) / services.length : 0;
          const customerSatisfaction = services.length > 0 ? 4.3 : 0; // Mock data

          logger.debug('Branch admin dashboard stats calculated', {
            services: services.length,
            technicians: technicians.length,
            invoices: invoices.length,
            pendingServices,
            completedServices,
            totalRevenue,
            totalCustomers,
            monthlyRevenue,
            activeServices,
            averageServiceTime,
            customerSatisfaction
          });

          setStats({
            branches: 1, // Branch admin manages one branch
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
            averageServiceTime,
            customerSatisfaction
          });
        }
      } catch (error) {
        logger.error('Error fetching dashboard data', error as Error, { userId: user.uid });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, sortServicesByTimestamp, branches, technicians]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your {user?.role === 'technician' ? 'tasks' : 'business'} today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Role-specific stats */}
          {user?.role === 'shop_admin' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Shops</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalShops}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <HiOfficeBuilding className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Branches</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.branches}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <HiOfficeBuilding className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Technicians</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.technicians}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <HiUserGroup className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <HiUser className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </div>
            </>
          )}

          {user?.role === 'branch_admin' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <HiClipboardList className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Technicians</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.technicians}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <HiUserGroup className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <HiUser className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.invoices}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <HiDocumentText className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </>
          )}

          {user?.role === 'technician' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <HiClipboardList className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingServices}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <HiClock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <HiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <HiCurrencyDollar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Additional Stats Row for Shop Admin */}
        {user?.role === 'shop_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Services</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeServices}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <HiTrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <HiCurrencyDollar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Service Time</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageServiceTime?.toFixed(1)}h</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <HiClock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.customerSatisfaction}/5</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <HiTrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Admin Quick Actions */}
            {user?.role !== 'technician' && (
              <>
                <PermissionGuard permissions={["service:write"]} fallback={null}>
                  <Link
                    href="/services/new"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Service
                  </Link>
                </PermissionGuard>

                <PermissionGuard permissions={["branch:write"]} fallback={null}>
                  <Link
                    href="/branch/new"
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <HiOfficeBuilding className="w-5 h-5" />
                    Manage Branches
                  </Link>
                </PermissionGuard>

                <PermissionGuard permissions={["technician:write"]} fallback={null}>
                  <Link
                    href="/technicians"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <HiUserGroup className="w-5 h-5" />
                    Manage Technicians
                  </Link>
                </PermissionGuard>

                <PermissionGuard permissions={["invoice:read"]} fallback={null}>
                  <Link
                    href="/invoices"
                    className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <HiDocumentText className="w-5 h-5" />
                    View Invoices
                  </Link>
                </PermissionGuard>
              </>
            )}

            {/* Technician Quick Actions */}
            {user?.role === 'technician' && (
              <>
                <Link
                  href="/my-tasks"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <HiClipboardList className="w-5 h-5" />
                  View My Tasks
                </Link>

                <Link
                  href="/profile"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <HiUser className="w-5 h-5" />
                  My Profile
                </Link>

                <Link
                  href="/services"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <HiBriefcase className="w-5 h-5" />
                  View Services
                </Link>

                <PermissionGuard permissions={["invoice:read"]} fallback={null}>
                  <Link
                    href="/invoices"
                    className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <HiDocumentText className="w-5 h-5" />
                    View Invoices
                  </Link>
                </PermissionGuard>
              </>
            )}
          </div>
        </div>

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
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      {user?.role !== 'technician' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Technician
                        </th>
                      )}
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
                          {service.device && (
                            <div className="text-sm text-gray-500">
                              {service.device.brand} {service.device.model}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            service.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            service.status === 'To Do' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {service.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{service.price?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.customer?.name}</div>
                          <div className="text-sm text-gray-500">{service.customer?.phone}</div>
                        </td>
                        {user?.role !== 'technician' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {service.technician?.name || 'Unassigned'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.createdAt ? timestampToDate(service.createdAt).toLocaleDateString() : 'N/A'}
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
}

export default function DashboardPage() {
  return <DashboardContent />;
}
