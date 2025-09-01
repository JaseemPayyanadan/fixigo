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
  Search,
  ChevronRight,
  List
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";
import type { Service } from "@/types";
import { formatCurrency } from "./shared/DashboardUtils";





// Enhanced Service Card with Swipe Actions
const ServiceCard: React.FC<{ service: Service; onViewDetails: (id: string) => void }> = ({ service, onViewDetails }) => {
  const [isSwiped, setIsSwiped] = useState(false);
  
  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; bg: string; icon: string; label: string }> = {
      'pending': { color: 'text-orange-600', bg: 'bg-orange-100', icon: '⏳', label: 'Pending' },
      'in_progress': { color: 'text-blue-600', bg: 'bg-blue-100', icon: '🔧', label: 'In Progress' },
      'completed': { color: 'text-green-600', bg: 'bg-green-100', icon: '✅', label: 'Completed' },
      'urgent': { color: 'text-red-600', bg: 'bg-red-100', icon: '🚨', label: 'Urgent' },
      'awaiting_parts': { color: 'text-purple-600', bg: 'bg-purple-100', icon: '📦', label: 'Awaiting Parts' },
      'on_hold': { color: 'text-gray-600', bg: 'bg-gray-100', icon: '⏸️', label: 'On Hold' },
      'ready_for_pickup': { color: 'text-cyan-600', bg: 'bg-cyan-100', icon: '📱', label: 'Ready' },
      'quality_check': { color: 'text-indigo-600', bg: 'bg-indigo-100', icon: '🔍', label: 'Quality Check' }
    };
    
    return statusMap[status] || statusMap['pending'];
  };

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

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
          const technicianServices = services.filter((service) => service.technician_id === technicianId || (service as any).technician_id === technicianId);

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

    return {
      totalServices,
      pendingServices,
      inProgressServices,
      completedServices,
      urgentServices,
    };
  }, [myServices]);



  // Filter services based on search and filter
  const filteredServices = React.useMemo(() => {
    let filtered = myServices;
    
    if (searchQuery) {
      filtered = filtered.filter(service => 
        service.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.device?.model?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedFilter !== "all") {
      filtered = filtered.filter(service => service.status === selectedFilter);
    }
    
    return filtered.slice(0, 5); // Show only 5 recent services
  }, [myServices, searchQuery, selectedFilter]);

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

      {/* Sticky Search & Filter Section */}
      <div className="sticky top-24 z-10 bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filter Dropdown */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="awaiting_parts">Awaiting Parts</option>
            <option value="on_hold">On Hold</option>
          </select>
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

        {/* Metrics Grid */}
        {!isLoading && !technicianServicesLoading && (
          <div className="space-y-4">
            {/* Priority Cards - Larger */}
            <div className="grid grid-cols-1 gap-4">
              {/* Total Services */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Total Services</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{technicianMetrics.totalServices}</p>
                <p className="text-xs text-gray-500">Your assigned services</p>
              </div>
            </div>

            {/* Secondary Cards - 2x3 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pending */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Pending</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{technicianMetrics.pendingServices}</p>
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600">In Progress</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{technicianMetrics.inProgressServices}</p>
              </div>

              {/* Completed */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Completed</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{technicianMetrics.completedServices}</p>
              </div>

              {/* Urgent */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-600">Urgent</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{technicianMetrics.urgentServices}</p>
              </div>
            </div>


          </div>
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

            {filteredServices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium mb-2">No services found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery || selectedFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "You don't have any services assigned yet"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredServices.map((service) => (
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
