"use client";
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { RoleGuard, PermissionGuard } from "../../../components";
import { ShopAdminServiceList, BranchAdminServiceList, TechnicianServiceList } from "../../../components/service";
import { SearchFilter } from "../../../components/ui";
import { PlusIcon, ClockIcon, CheckCircleIcon, CurrencyDollarIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { Service } from "../../../types";

// Local interface for compatibility with service list components
interface ServiceListItem {
  id: string;
  name: string;
  description: string;
  price: number;
  shop_id: string;
  branch_id: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: string;
  status?: string;
  technician_id?: string;
  device?: {
    brand: string;
    model: string;
    serial: string;
    color: string;
    type?: string;
  };
  customer?: {
    name: string;
    phone?: string;
    place?: string;
    email?: string;
  };
}

const STATUS_OPTIONS = ["All", "To Do", "In Progress", "Awaiting Parts", "On Hold", "Ready for Pickup", "Completed", "Cancelled", "Pending"];

export default function ServicesPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin", "technician"]}>
      <PermissionGuard permissions={["service:read"]}>
        <ServicesContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function ServicesContent() {
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);

  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Transform legacy data to match current schema for internal use
  const transformServiceData = (data: any): Service => {
    // Map status values to match the Service type
    const mapStatus = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'completed':
        case 'completed':
          return 'completed';
        case 'in progress':
        case 'in_progress':
          return 'in_progress';
        case 'pending':
        case 'to do':
          return 'pending';
        case 'cancelled':
          return 'cancelled';
        case 'on hold':
        case 'on_hold':
          return 'on_hold';
        case 'awaiting parts':
        case 'awaiting_parts':
          return 'awaiting_parts';
        case 'ready for pickup':
        case 'ready_for_pickup':
          return 'ready_for_pickup';
        case 'quality check':
        case 'quality_check':
          return 'quality_check';
        default:
          return 'pending';
      }
    };

    return {
      id: data.id,
      name: data.name || "",
      description: data.description || "",
      price: data.price || 0,
      shopId: data.shopId || data.shop_id || "",
      branchId: data.branchId || data.branch_id || "",
      status: mapStatus(data.status),
      priority: data.priority || "medium",
      assignedTechnicianId: data.assignedTechnicianId || data.technician_id,
      estimatedDuration: data.estimatedDuration || 0,
      actualDuration: data.actualDuration || 0,
      scheduledDate: data.scheduledDate?.toDate(),
      completedDate: data.completedDate?.toDate(),
      notes: data.notes || "",
      workNotes: data.workNotes || [],
      partsUsed: data.partsUsed || [],
      customerFeedback: data.customerFeedback,
      qualityScore: data.qualityScore || 0,
      estimatedCompletion: data.estimatedCompletion?.toDate(),
      actualCompletion: data.actualCompletion?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      customer: {
        name: data.customer?.name || "",
        phone: data.customer?.phone || "",
        email: data.customer?.email || data.customer?.place || "",
        address: data.customer?.address
      },
      device: {
        type: data.device?.type || "Unknown",
        brand: data.device?.brand || "",
        model: data.device?.model || "",
        serial: data.device?.serial,
        color: data.device?.color,
        issue: data.device?.issue
      }
    };
  };

  // Transform Service to ServiceListItem for component compatibility
  const transformToServiceListItem = (service: Service): ServiceListItem => {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      shop_id: service.shopId,
      branch_id: service.branchId,
      created_by: (service as any).created_by,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      paymentStatus: (service as any).paymentStatus,
      status: service.status,
      technician_id: service.assignedTechnicianId,
      device: {
        brand: service.device.brand,
        model: service.device.model,
        serial: service.device.serial || "",
        color: service.device.color || "",
        type: service.device.type
      },
      customer: {
        name: service.customer.name,
        phone: service.customer.phone,
        place: service.customer.email,
        email: service.customer.email
      }
    };
  };

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.shopId) {
        setServices([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        let allServices: Service[] = [];

        // Try different approaches to fetch services
        
        try {
          // First, try the main services collection with consistent field names
          const servicesRef = collection(db, "services");
          let q;
          
          if (user.role === "branch_admin" && user.branchId) {
            // For branch admins, filter by their branch
            q = query(
              servicesRef, 
              where("shopId", "==", user.shopId),
              where("branchId", "==", user.branchId),
              orderBy("createdAt", "desc")
            );
          } else {
            // For shop admins and technicians, fetch all services for the shop
            q = query(
              servicesRef, 
              where("shopId", "==", user.shopId),
              orderBy("createdAt", "desc")
            );
          }
          
          const querySnapshot = await getDocs(q);
          allServices = querySnapshot.docs.map((doc) => {
            const data = { id: doc.id, ...doc.data() };
            return transformServiceData(data);
          });
          
          // If no services found, try with legacy field names
          if (allServices.length === 0) {
            console.log("No services found with new field names, trying legacy field names");
            
            if (user.role === "branch_admin" && user.branchId) {
              q = query(
                servicesRef, 
                where("shop_id", "==", user.shopId),
                where("branch_id", "==", user.branchId),
                orderBy("createdAt", "desc")
              );
            } else {
              q = query(
                servicesRef, 
                where("shop_id", "==", user.shopId),
                orderBy("createdAt", "desc")
              );
            }
            
            const legacyQuerySnapshot = await getDocs(q);
            allServices = legacyQuerySnapshot.docs.map((doc) => {
              const data = { id: doc.id, ...doc.data() };
              return transformServiceData(data);
            });
          }
          
        } catch (error) {
          console.error("Error fetching services:", error);
          
          // Fallback: try to get all services and filter in memory
          try {
            const servicesRef = collection(db, "services");
            const allServicesQuery = query(servicesRef);
            const allServicesSnapshot = await getDocs(allServicesQuery);
            const allServicesData = allServicesSnapshot.docs.map((doc) => {
              const data = { id: doc.id, ...doc.data() };
              return transformServiceData(data);
            });
            
            console.log("Fallback - Total services:", allServicesData.length);
            allServices = allServicesData.filter(service => 
              service.shopId === user.shopId || 
              (service as any).shop_id === user.shopId
            );
            console.log("Fallback - Filtered services:", allServices.length);
          } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
          }
        }
        
        setServices(allServices);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user?.shopId, user?.branchId, user?.role]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = !search || 
        service.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.model?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.brand?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || service.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [services, search, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = services.length;
    const completed = services.filter(s => s.status === "completed").length;
    const inProgress = services.filter(s => s.status === "in_progress").length;
    const pending = services.filter(s => s.status === "pending").length;
    const totalRevenue = services
      .filter(s => s.status === "completed")
      .reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      totalRevenue
    };
  }, [services]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Debug Indicator */}
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        🔧 Services page improvements loaded successfully! Data fetching enhanced with loading states and error handling.
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">Manage and track your service requests</p>
        </div>
        <PermissionGuard permissions={["service:write"]} fallback={null}>
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Service
          </Link>
        </PermissionGuard>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Search services by customer, device, or service name..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            options: STATUS_OPTIONS.map(status => ({ value: status, label: status })),
            onChange: setStatusFilter
          }
        ]}
        onClear={clearFilters}
        showClear={true}
        className="mb-6"
      />

      {/* Services List */}
      {user?.role === "shop_admin" && (
        <ShopAdminServiceList
          services={filteredServices.map(transformToServiceListItem)}
          branches={branches}
          loading={loading}
          search={search}
        />
      )}
      {user?.role === "branch_admin" && (
        <BranchAdminServiceList
          services={filteredServices.map(transformToServiceListItem)}
          branches={branches}
          loading={loading}
          search={search}
        />
      )}
      {user?.role === "technician" && (
        <TechnicianServiceList
          services={filteredServices.map(transformToServiceListItem)}
          branches={branches}
          loading={loading}
          search={search}
        />
      )}

    </div>
  );
} 