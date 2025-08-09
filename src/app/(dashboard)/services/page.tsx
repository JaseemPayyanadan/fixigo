"use client";
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { useTechnicians } from "../../../hooks/useTechnicians";
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
  status: string;
  customer: {
    name: string;
    phone: string;
  };
  device: {
    brand: string;
    model: string;
    imei: string;
  };
  branchId: string;
  technician_id?: string;
  createdAt: Date;
  updatedAt: Date;
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
  const { technicians } = useTechnicians(user?.shopId, user?.branchId);

  
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Transform legacy data to match current schema for internal use
  const transformServiceData = (data: any): Service => {
    const mapStatus = (status: string): Service["status"] => {
      const statusMap: Record<string, Service["status"]> = {
        "To Do": "pending",
        "In Progress": "in_progress",
        "Completed": "completed",
        "Pending": "pending",
        "Cancelled": "cancelled",
        "Awaiting Parts": "awaiting_parts",
        "On Hold": "on_hold",
        "Ready for Pickup": "ready_for_pickup"
      };
      return statusMap[status] || "pending";
    };

    return {
      id: data.id,
      name: data.name || data.device?.name || "",
      description: data.description || "",
      price: data.price || 0,
      status: mapStatus(data.status || "pending"),
      priority: data.priority || "medium",
      shopId: data.shopId || "",
      branchId: data.branchId || "",
      estimatedDuration: data.estimatedDuration || 60,
      customer: {
        name: data.customer?.name || "",
        phone: data.customer?.phone || "",
        email: data.customer?.email || "",
        address: data.customer?.address
      },
      device: {
        type: data.device?.type || "Unknown",
        brand: data.device?.brand || "",
        model: data.device?.model || "",
        imei: data.device?.imei || "",
        color: data.device?.color
      },
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  };

  // Transform Service to ServiceListItem for component compatibility
  const transformToServiceListItem = (service: Service): ServiceListItem => {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      status: service.status,
      branchId: service.branchId,
      technician_id: (service as any).technician_id || service.assignedTechnicianId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      device: {
        brand: service.device.brand,
        model: service.device.model,
        imei: service.device.imei || ""
      },
      customer: {
        name: service.customer.name,
        phone: service.customer.phone
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
          // Fetch services using standardized field names (shopId, branchId)
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
          } else if (user.role === "technician") {
            // For technicians, we need to fetch services they're assigned to OR created by them
            // Since Firestore doesn't support OR queries easily, we'll fetch all shop services and filter in memory
            q = query(
              servicesRef, 
              where("shopId", "==", user.shopId),
              orderBy("createdAt", "desc")
            );
          } else {
            // For shop admins, fetch all services for the shop
            q = query(
              servicesRef, 
              where("shopId", "==", user.shopId),
              orderBy("createdAt", "desc")
            );
          }
          
          const querySnapshot = await getDocs(q);
          
          const allServicesData = querySnapshot.docs.map((doc) => {
            const data = { id: doc.id, ...doc.data() } as any;
            return transformServiceData(data);
          });

          // For technicians, filter to show only assigned services or services they created
          if (user.role === "technician") {
            
            allServices = allServicesData.filter(service => {
              // Check for assignment - look for technician_id in the raw data
              const rawData = querySnapshot.docs.find(doc => doc.id === service.id)?.data() as any;
              const isAssigned = rawData?.technician_id === user.id || rawData?.technician_id === user.uid;
              
              // Check for creation - look for created_by in the raw data
              const isCreated = 
                rawData?.created_by?.id === user.id || 
                rawData?.created_by?.id === user.uid ||
                rawData?.created_by?.uid === user.uid ||
                rawData?.created_by?.uid === user.id;
              
              return isAssigned || isCreated;
            });
          } else {
            allServices = allServicesData;
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
              service.shopId === user.shopId
            );
            console.log("Fallback - Filtered services:", allServices.length);
          } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
          }
        }
        
        // Transform to ServiceListItem for display
        console.log("Final services count:", allServices.length);
        const serviceListItems = allServices.map(transformToServiceListItem);
        console.log("ServiceListItem details:", serviceListItems.map(item => ({
          id: item.id,
          name: item.name,
          technician_id: item.technician_id,
          status: item.status
        })));
        setServices(serviceListItems);
        
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user?.shopId, user?.branchId, user?.role, user?.id, user?.uid, user?.name, user?.email]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = !search || 
        service.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.model?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.brand?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.imei?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.phone?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || service.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [services, search, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = services.length;
    const completed = services.filter(s => s.status === "Completed").length;
    const inProgress = services.filter(s => s.status === "In Progress").length;
    const pending = services.filter(s => s.status === "To Do" || s.status === "Pending").length;
    const totalRevenue = services
      .filter(s => s.status === "Completed")
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
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Services</h1>
            <p className="text-slate-500 text-sm">Manage service requests</p>
          </div>
          <PermissionGuard permissions={["service:write"]} fallback={null}>
            <Link
              href="/services/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              New Service
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats Cards and Search in Same Row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <DevicePhoneMobileIcon className="w-4 h-4 text-blue-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-900">{stats.total}</span>
                  <span className="text-xs font-medium text-slate-500">Total</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-emerald-600">{stats.completed}</span>
                  <span className="text-xs font-medium text-slate-500">Completed</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-amber-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-600">{stats.inProgress}</span>
                  <span className="text-xs font-medium text-slate-500">In Progress</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-600">{stats.pending}</span>
                  <span className="text-xs font-medium text-slate-500">Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="lg:w-80">
            <SearchFilter
              search={search}
              onSearchChange={setSearch}
              placeholder="Search services..."
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
            />
          </div>
        </div>

        {/* Services List */}
        {user?.role === "shop_admin" && (
          <ShopAdminServiceList
            services={filteredServices}
            branches={branches}
            technicians={technicians}
            loading={loading}
            search={search}
          />
        )}
        {user?.role === "branch_admin" && (
          <BranchAdminServiceList
            services={filteredServices}
            branches={branches}
            technicians={technicians}
            loading={loading}
            search={search}
          />
        )}
        {user?.role === "technician" && (
          <TechnicianServiceList
            services={filteredServices}
            branches={branches}
            technicians={technicians}
            loading={loading}
            search={search}
            user={user}
          />
        )}

        </div>
      </div>
    );
} 