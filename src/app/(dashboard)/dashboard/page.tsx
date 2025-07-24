"use client"
import React, { useEffect, useState } from "react";
import { AuthGuard, RoleGuard, OnboardingGuide } from "@/components";
import { useUser } from "@/hooks";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, where, query, getDocs } from "firebase/firestore";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  price: number;
  status: string;
  customer?: { name: string };
  createdAt: unknown; // Firestore timestamp
}

interface DashboardStats {
  branches: number;
  services: number;
  technicians: number;
  invoices: number;
  pendingServices: number;
  completedServices: number;
  totalRevenue: number;
  recentServices: Service[];
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["shop_admin", "branch_admin", "technician"]}>
        <DashboardContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    branches: 0,
    services: 0,
    technicians: 0,
    invoices: 0,
    pendingServices: 0,
    completedServices: 0,
    totalRevenue: 0,
    recentServices: []
  });
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);

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

  // Debug user data
  useEffect(() => {
    console.log('Dashboard - Current user:', user);
    console.log('Dashboard - ShopId:', user?.shopId);
    console.log('Dashboard - User role:', user?.role);
    console.log('Dashboard - User UID:', user?.uid);
    console.log('Dashboard - User email:', user?.email);
    console.log('Dashboard - User data keys:', user ? Object.keys(user) : 'No user');
    console.log('Dashboard - User shopId:', user?.shopId);
    console.log('Dashboard - User shop_id:', user?.shop_id);
    
    // Test if user has shopId
    if (user?.shopId) {
      console.log('Dashboard - User has shopId:', user.shopId);
    } else {
      console.log('Dashboard - User does not have shopId');
    }
  }, [user]);

  // Check if shop_admin needs to complete onboarding
  useEffect(() => {
    if (user && user.role === "shop_admin" && !user.shopId) {
      router.push("/shop-onboarding");
    }
  }, [user, router]);

  // Show onboarding guide for users who have completed onboarding but might need guidance
  useEffect(() => {
    if (user && user.role === "shop_admin" && user.shopId) {
      const hasSeenGuide = localStorage.getItem('hasSeenOnboardingGuide');
      if (!hasSeenGuide && stats.branches === 0 && stats.technicians === 0) {
        setShowOnboardingGuide(true);
      }
    }
  }, [user, stats.branches, stats.technicians]);

    useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        if (user.role === "shop_admin" && user.shopId) {
          // Shop admin: all branches and all services for the shop
          const branchSnap = await getCountFromServer(collection(db, `shops/${user.shopId}/branches`));
          const serviceQ = query(collection(db, "services"), where("shop_id", "==", user.shopId));
          const serviceSnap = await getCountFromServer(serviceQ);
          const technicianQ = query(collection(db, "technicians"), where("shop_id", "==", user.shopId));
          const technicianSnap = await getCountFromServer(technicianQ);
          const invoiceQ = query(collection(db, "invoices"), where("shopId", "==", user.shopId));
          const invoiceSnap = await getCountFromServer(invoiceQ);

          // Get services data using simple getDocs to avoid index issues
          const servicesQuery = query(
            collection(db, "services"), 
            where("shop_id", "==", user.shopId)
          );

          const servicesSnapshot = await getDocs(servicesQuery);
          const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
          
          // Sort by createdAt in memory to avoid index requirement
          const sortedServices = sortServicesByTimestamp(services);
          
          const pendingServices = sortedServices.filter(s => s.status === "To Do").length;
          const completedServices = sortedServices.filter(s => s.status === "Completed").length;
          const totalRevenue = sortedServices.reduce((sum, s) => sum + (s.price || 0), 0);

          setStats({
            branches: branchSnap.data().count,
            services: serviceSnap.data().count,
            technicians: technicianSnap.data().count,
            invoices: invoiceSnap.data().count,
            pendingServices,
            completedServices,
            totalRevenue,
            recentServices: sortedServices
          });
          setLoading(false);
        } else if (user.role === "branch_admin" && user.branch_id && user.shopId) {
          // Branch admin: only their branch and its services
          const branchDocRef = collection(db, `shops/${user.shopId}/branches`);
          const branchDocs = await getDocs(branchDocRef);
          const branch = branchDocs.docs.find(doc => doc.id === user.branch_id);
          setBranchName(branch ? branch.data().name : "Branch");

          const serviceQ = query(collection(db, "services"), where("branch_id", "==", user.branch_id));
          const serviceSnap = await getCountFromServer(serviceQ);
          const technicianQ = query(collection(db, "technicians"), where("branch_id", "==", user.branch_id));
          const technicianSnap = await getCountFromServer(technicianQ);
          const invoiceQ = query(collection(db, "invoices"), where("branchId", "==", user.branch_id));
          const invoiceSnap = await getCountFromServer(invoiceQ);

          // Get services data using simple getDocs to avoid index issues
          const servicesQuery = query(
            collection(db, "services"), 
            where("branch_id", "==", user.branch_id)
          );

          const servicesSnapshot = await getDocs(servicesQuery);
          const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
          
          // Sort by createdAt in memory to avoid index requirement
          const sortedServices = sortServicesByTimestamp(services);
          
          const pendingServices = sortedServices.filter(s => s.status === "To Do").length;
          const completedServices = sortedServices.filter(s => s.status === "Completed").length;
          const totalRevenue = sortedServices.reduce((sum, s) => sum + (s.price || 0), 0);

          setStats({
            branches: 1, // Branch admin only sees their branch
            services: serviceSnap.data().count,
            technicians: technicianSnap.data().count,
            invoices: invoiceSnap.data().count,
            pendingServices,
            completedServices,
            totalRevenue,
            recentServices: sortedServices
          });
          setLoading(false);
        } else if (user.role === "technician" && user.branch_id && user.shopId) {
          // Technician: only their assigned services
          const serviceQ = query(collection(db, "services"), where("technician_id", "==", user.uid));
          const serviceSnap = await getCountFromServer(serviceQ);

          // Get services data using simple getDocs to avoid index issues
          const servicesQuery = query(
            collection(db, "services"), 
            where("technician_id", "==", user.uid)
          );

          const servicesSnapshot = await getDocs(servicesQuery);
          const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
          
          // Sort by createdAt in memory to avoid index requirement
          const sortedServices = sortServicesByTimestamp(services);
          
          const pendingServices = sortedServices.filter(s => s.status === "To Do").length;
          const completedServices = sortedServices.filter(s => s.status === "Completed").length;
          const totalRevenue = sortedServices.reduce((sum, s) => sum + (s.price || 0), 0);

          setStats({
            branches: 0, // Technicians don't see branch stats
            services: serviceSnap.data().count,
            technicians: 0, // Technicians don't see technician stats
            invoices: 0, // Technicians don't see invoice stats
            pendingServices,
            completedServices,
            totalRevenue,
            recentServices: sortedServices
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Set default stats on error
        setStats({
          branches: 0,
          services: 0,
          technicians: 0,
          invoices: 0,
          pendingServices: 0,
          completedServices: 0,
          totalRevenue: 0,
          recentServices: []
        });
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, sortServicesByTimestamp]);

  if (!user) return null;

  // Don't render if shop_admin needs onboarding
  if (user.role === "shop_admin" && !user.shopId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Guide */}
        {showOnboardingGuide && (
          <OnboardingGuide 
            user={user} 
            onDismiss={() => {
              setShowOnboardingGuide(false);
              localStorage.setItem('hasSeenOnboardingGuide', 'true');
            }} 
          />
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">
                Welcome back, {user.name || user.email}!
              </h1>
              <p className="text-gray-600 text-sm">
                {user.role === "shop_admin" 
                  ? "Here's an overview of your business performance" 
                  : user.role === "branch_admin"
                  ? `Here&apos;s what&apos;s happening at ${branchName || "your branch"}`
                  : "Here&apos;s an overview of your assigned tasks and performance"
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              {user.role !== "technician" && (
                <Link
                  href="/services/new"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Service
                </Link>
              )}
              {user.role === "technician" && (
                <Link
                  href="/my-tasks"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View My Tasks
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Total Services/Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user.role === "technician" ? "Total Tasks" : "Total Services"}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
              </div>
            </div>
          </div>

          {/* Pending Services/Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingServices}</p>
              </div>
            </div>
          </div>

          {/* Completed Services/Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
              </div>
            </div>
          </div>

          {/* Total Revenue/Earnings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user.role === "technician" ? "Total Earnings" : "Total Revenue"}
                </p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats for Shop Admin */}
        {user.role === "shop_admin" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Branches */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Branches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.branches}</p>
                </div>
              </div>
            </div>

            {/* Technicians */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Technicians</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.technicians}</p>
                </div>
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.invoices}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Services */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Services</h3>
                <Link
                  href="/services"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {stats.recentServices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No recent services</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          service.status === "Completed" ? "bg-green-500" :
                          service.status === "To Do" ? "bg-yellow-500" :
                          "bg-blue-500"
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-500">{service.customer?.name || "N/A"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{service.price || 0}</p>
                        <p className="text-xs text-gray-500">{service.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/services/new"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-700 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Create Service</p>
                    <p className="text-sm text-gray-500">Add new service request</p>
                  </div>
                </Link>

                <Link
                  href="/services"
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-700 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">View Services</p>
                    <p className="text-sm text-gray-500">Manage all services</p>
                  </div>
                </Link>

                {user.role === "shop_admin" && (
                  <>
                    <Link
                      href="/branch"
                      className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-700 transition-colors">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Manage Branches</p>
                        <p className="text-sm text-gray-500">Add or edit branches</p>
                      </div>
                    </Link>

                    <Link
                      href="/technicians"
                      className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-700 transition-colors">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Manage Technicians</p>
                        <p className="text-sm text-gray-500">Add or edit technicians</p>
                      </div>
                    </Link>
                  </>
                )}

                <Link
                  href="/invoices"
                  className="flex items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-teal-700 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">View Invoices</p>
                    <p className="text-sm text-gray-500">Manage invoices</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
