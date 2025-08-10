"use client";

import React from "react";

import { collection, getDocs, query, where } from "firebase/firestore";
import { HiCalendar, HiCheckCircle, HiClipboardList, HiClock, HiExclamation, HiStar, HiTrendingUp, HiUser } from "react-icons/hi";


import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";
import type { Service } from "@/types";

import { CompactDashboardContent, CompactDashboardHeader, CompactDashboardLayout, CompactErrorState, DashboardErrorBoundary, DashboardHeader, DashboardLoadingState, DashboardMetric, EnhancedMetricsGrid, RecentServicesCard } from "./shared/DashboardComponents";
import { formatCurrency } from "./shared/DashboardUtils";

export default function TechnicianDashboard() {
  const { user } = useUser();
  const { services, isLoading, servicesLoading, servicesError } = useDashboardData(user?.shopId, user?.branchId);

  // State for technician's services
  const [myServices, setMyServices] = React.useState<Service[]>([]);
  const [technicianServicesLoading, setTechnicianServicesLoading] = React.useState(true);

  // Fetch technician's services
  React.useEffect(() => {
    const fetchTechnicianServices = async () => {
      if (!user || user.role !== "technician") {
        setMyServices([]);
        setTechnicianServicesLoading(false);
        return;
      }

      try {
        setTechnicianServicesLoading(true);

        // First, get the technician document to find the correct ID
        const technicianQuery = query(collection(db, "technicians"), where("created_by", "==", user.id));
        const technicianSnapshot = await getDocs(technicianQuery);
        const technicianDoc = technicianSnapshot.docs[0];

        if (technicianDoc) {
          const technicianId = technicianDoc.id;
          console.log("TechnicianDashboard - Found technician document ID:", technicianId);

          // Filter services assigned to this technician
          const technicianServices = services.filter((service) => service.assignedTechnicianId === technicianId || (service as any).technician_id === technicianId);

          setMyServices(technicianServices);
        } else {
          console.log("TechnicianDashboard - No technician document found for UID:", user.id);
          setMyServices([]);
        }
      } catch (error) {
        console.error("Error fetching technician services:", error);
        setMyServices([]);
      } finally {
        setTechnicianServicesLoading(false);
      }
    };

    fetchTechnicianServices();
  }, [user, services]);

  // Calculate technician-specific metrics
  const technicianMetrics = React.useMemo(() => {
    const totalServices = myServices.length;
    const pendingServices = myServices.filter((s) => s.status === "pending").length;
    const inProgressServices = myServices.filter((s) => s.status === "in_progress").length;
    const completedServices = myServices.filter((s) => s.status === "completed").length;
    const urgentServices = myServices.filter((s) => s.status === "pending" || s.status === "in_progress").length;
    const myRevenue = myServices.reduce((sum, service) => sum + (service.price || 0), 0);
    const customerSatisfaction = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

    return {
      totalServices,
      pendingServices,
      inProgressServices,
      completedServices,
      urgentServices,
      myRevenue,
      customerSatisfaction,
    };
  }, [myServices]);

  // Get recent services for technician
  const myRecentServices = React.useMemo(() => myServices.slice(0, 5), [myServices]);

  // Build metrics array
  const dashboardMetrics: DashboardMetric[] = React.useMemo(
    () => [
      {
        id: "total",
        label: "Total Services",
        value: technicianMetrics.totalServices,
        icon: HiClipboardList,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Your assigned services",
      },
      {
        id: "pending",
        label: "Pending",
        value: technicianMetrics.pendingServices,
        icon: HiClock,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        description: "Awaiting your attention",
      },
      {
        id: "in_progress",
        label: "In Progress",
        value: technicianMetrics.inProgressServices,
        icon: HiTrendingUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        description: "Currently working on",
      },
      {
        id: "completed",
        label: "Completed",
        value: technicianMetrics.completedServices,
        icon: HiCheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Successfully finished",
      },
      {
        id: "urgent",
        label: "Urgent",
        value: technicianMetrics.urgentServices,
        icon: HiExclamation,
        color: "text-red-600",
        bgColor: "bg-red-100",
        description: "Requires immediate attention",
      },
      {
        id: "revenue",
        label: "My Revenue",
        value: formatCurrency(technicianMetrics.myRevenue),
        icon: HiStar,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "Revenue from your services",
      },
      {
        id: "satisfaction",
        label: "Satisfaction",
        value: `${technicianMetrics.customerSatisfaction}%`,
        icon: HiUser,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        description: "Customer satisfaction rate",
      },
      {
        id: "efficiency",
        label: "Efficiency",
        value: technicianMetrics.totalServices > 0 ? `${Math.round((technicianMetrics.completedServices / technicianMetrics.totalServices) * 100)}%` : "0%",
        icon: HiCalendar,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        description: "Completion rate",
      },
    ],
    [technicianMetrics]
  );

  // Handle retry for services
  const handleServicesRetry = React.useCallback(() => {
    // This would typically trigger a refetch
    window.location.reload();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Check if user is a technician
  if (user.role !== "technician") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Access Restricted</h2>
          <p className="text-sm text-gray-600">This dashboard is only available for technicians.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <CompactDashboardLayout>
        {/* Header */}
        <CompactDashboardHeader>
          <DashboardHeader title="Technician Dashboard" subtitle="Welcome back, {name}" user={user} />
        </CompactDashboardHeader>

        {/* Content */}
        <CompactDashboardContent>
          {/* Loading State */}
          {(isLoading || technicianServicesLoading) && <DashboardLoadingState message="Loading your services..." />}

          {/* Error States */}
          {servicesError && <CompactErrorState message={`Services: ${servicesError}`} />}

          {/* Metrics Grid */}
          <EnhancedMetricsGrid metrics={dashboardMetrics} columns={6} />

          {/* My Services */}
          <RecentServicesCard services={myRecentServices} loading={servicesLoading || technicianServicesLoading} error={servicesError} title="My Services" viewAllLink="/services" emptyMessage="No services assigned" createLink={undefined} onRetry={handleServicesRetry} />
        </CompactDashboardContent>
      </CompactDashboardLayout>
    </DashboardErrorBoundary>
  );
}
