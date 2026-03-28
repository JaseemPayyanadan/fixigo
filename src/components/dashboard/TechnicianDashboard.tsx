"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { 
  CheckCircle, 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ChevronRight,
  List
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";
import { getStatusConfig, normalizeStatus } from "@/lib/statusUtils";
import type { Service } from "@/types";
import { formatCurrency } from "./shared/DashboardUtils";
import { ServiceMetricsGauge } from "./shared";





// Enhanced Service Card with Swipe Actions
const ServiceCard: React.FC<{ service: Service; onViewDetails: (id: string) => void }> = ({ service, onViewDetails }) => {
  const [isSwiped, setIsSwiped] = useState(false);
  


  const statusConfig = getStatusConfig(service.status);

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Swipe Actions Background */}
      <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-end pr-4 transition-transform duration-300 ${isSwiped ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex gap-3">
          <button 
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            onClick={() => onViewDetails(service.id)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Service Card Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <List className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {service.customer?.name || "Unknown Customer"}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {service.device?.brand || "Unknown"} {service.device?.model || "Device"}
              </p>
            </div>
          </div>
          
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.color} ${statusConfig.bg}`}>
            <span className="text-xs">{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(service.price)}
            </span>
            <span className="text-xs text-gray-500">
              • {service.name}
            </span>
          </div>
          
          <button 
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            onClick={() => onViewDetails(service.id)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TechnicianDashboard() {
  const router = useRouter();
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
        // Try both userId and created_by fields for compatibility
        const technicianQuery = query(collection(db, "technicians"), where("userId", "==", user.id));
        const technicianSnapshot = await getDocs(technicianQuery);
        let technicianDoc = technicianSnapshot.docs[0];

        // If not found with userId, try created_by field
        if (!technicianDoc) {
          const technicianQuery2 = query(collection(db, "technicians"), where("created_by", "==", user.id));
          const technicianSnapshot2 = await getDocs(technicianQuery2);
          technicianDoc = technicianSnapshot2.docs[0];
        }

        if (technicianDoc) {
          const technicianId = technicianDoc.id;
          console.log("TechnicianDashboard - Found technician document ID:", technicianId);

          // Filter services assigned to this technician
          // Check both technician document ID and user ID for services
          const technicianServices = services.filter((service) => 
            service.technician_id === technicianId || 
            service.technician_id === user.id ||
            (service as any).technician_id === technicianId ||
            (service as any).technician_id === user.id
          );

          console.log("TechnicianDashboard - Filtered services:", {
            totalServices: services.length,
            technicianServices: technicianServices.length,
            technicianId,
            userId: user.id,
            sampleServices: technicianServices.slice(0, 3).map(s => ({
              id: s.id,
              status: s.status,
              name: s.name
            }))
          });

          setMyServices(technicianServices);
        } else {
          console.log("TechnicianDashboard - No technician document found for UID:", user.id);
          // Fallback: filter services by user ID directly
          const technicianServices = services.filter((service) => 
            service.technician_id === user.id || 
            (service as any).technician_id === user.id
          );
          setMyServices(technicianServices);
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

  // Calculate technician-specific metrics using the same logic as other dashboards
  const technicianMetrics = React.useMemo(() => {
    if (!myServices || myServices.length === 0) {
      return {
        totalServices: 0,
        pendingServices: 0,
        inProgressServices: 0,
        completedServices: 0,
        urgentServices: 0,
        activeServices: 0,
      };
    }

    // Use the same calculation logic as DashboardUtils with support for both status formats
    const metrics = myServices.reduce((acc, service) => {
      acc.totalServices++;
      
      // Normalize status to handle both lowercase and display formats
      const normalizedStatus = normalizeStatus(service.status);
      
      console.log('🔍 Processing service status:', {
        originalStatus: service.status,
        normalizedStatus,
        serviceId: service.id
      });
      
      switch (normalizedStatus) {
        case 'pending':
        case 'to_do':
          acc.pendingServices++;
          acc.activeServices++;
          break;
        case 'in_progress':
          acc.inProgressServices++;
          acc.activeServices++;
          break;
        case 'awaiting_parts':
          acc.activeServices++;
          break;
        case 'quality_check':
          acc.activeServices++;
          break;
        case 'ready_for_pickup':
          acc.activeServices++;
          break;
        case 'completed':
          acc.completedServices++;
          break;
        case 'cancelled':
          // Cancelled services are not counted in active or completed
          break;
        case 'on_hold':
          acc.activeServices++;
          break;
        case 'urgent':
          acc.urgentServices++;
          acc.activeServices++;
          break;
        default:
          // For unknown statuses, treat as pending
          acc.pendingServices++;
          acc.activeServices++;
          console.warn('Unknown service status:', service.status, 'for service:', service.id);
      }
      
      return acc;
    }, {
      totalServices: 0,
      pendingServices: 0,
      inProgressServices: 0,
      completedServices: 0,
      urgentServices: 0,
      activeServices: 0,
    });

    console.log('🔍 Final technician metrics:', {
      totalServices: metrics.totalServices,
      pendingServices: metrics.pendingServices,
      inProgressServices: metrics.inProgressServices,
      completedServices: metrics.completedServices,
      urgentServices: metrics.urgentServices,
      activeServices: metrics.activeServices,
      servicesCount: myServices.length
    });

    return metrics;
  }, [myServices]);



  // Get recent services (show only 5 most recent)
  const recentServices = React.useMemo(() => {
    return myServices.slice(0, 5);
  }, [myServices]);

  const handleViewDetails = useCallback((serviceId: string) => {
    router.push(`/services/${serviceId}`);
  }, [router]);

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Dashboard Header with Today's Summary */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="px-4 py-4">
          <div className="mb-3">
            <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.name || 'Technician'}</p>
          </div>
        </div>
      </div>



      {/* Dashboard Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Loading State */}
        {(isLoading || technicianServicesLoading) && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Loading your services...</p>
          </div>
        )}

        {/* Error State */}
        {servicesError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-700">Error loading services: {servicesError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Service Metrics Gauge */}
        {!isLoading && !technicianServicesLoading && (
          <ServiceMetricsGauge metrics={technicianMetrics} />
        )}

        {/* My Services Section */}
        {!isLoading && !technicianServicesLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">My Services</h2>
              <button 
                onClick={() => router.push('/services')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>

            {recentServices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium mb-2">No services found</p>
                <p className="text-sm text-gray-400">
                  You don't have any services assigned yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
