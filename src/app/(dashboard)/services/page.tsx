"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  DevicePhoneMobileIcon, 
  PlusIcon,
  ClipboardDocumentListIcon,
  PauseIcon
} from "@heroicons/react/24/outline";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { PermissionGuard, RoleGuard } from "../../../components";
import { BranchAdminServiceList, ShopAdminServiceList, TechnicianServiceList } from "../../../components/service";
import { SearchFilter } from "../../../components/ui";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { useTechnicians } from "../../../hooks/useTechnicians";
import { db } from "../../../lib/firebase";
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

// Status filter chips configuration
const STATUS_FILTERS = [
  { key: "completed", label: "Completed", count: 0, color: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200", icon: CheckCircleIcon },
  { key: "in_progress", label: "In Progress", count: 0, color: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200", icon: ClockIcon },
  { key: "pending", label: "To Do", count: 0, color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200", icon: ClipboardDocumentListIcon },
  { key: "on_hold", label: "Pending", count: 0, color: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200", icon: PauseIcon },
];

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
        Completed: "completed",
        Pending: "pending",
        Cancelled: "cancelled",
        "Awaiting Parts": "awaiting_parts",
        "On Hold": "on_hold",
        "Ready for Pickup": "ready_for_pickup",
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

      customer: {
        name: data.customer?.name || "",
        phone: data.customer?.phone || "",
        email: data.customer?.email || "",
        address: data.customer?.address,
      },
      device: {
        type: data.device?.type || "Unknown",
        brand: data.device?.brand || "",
        model: data.device?.model || "",
        imei: data.device?.imei || "",
        color: data.device?.color,
      },
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
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
      technician_id: (service as any).technician_id || service.technician_id,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      device: {
        brand: service.device.brand,
        model: service.device.model,
        imei: service.device.imei || "",
      },
      customer: {
        name: service.customer.name,
        phone: service.customer.phone,
      },
    };
  };

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.shopId) return;

      setLoading(true);
      try {
        console.log("Fetching services for:", { shopId: user.shopId, branchId: user.branchId, role: user.role });

        let allServices: Service[] = [];

        try {
          // Build query based on user role and access level
          let servicesQuery;

          if (user.branchId) {
            // Branch admin or technician - only show services for their branch
            servicesQuery = query(collection(db, "services"), where("shopId", "==", user.shopId), where("branchId", "==", user.branchId), orderBy("createdAt", "desc"));
          } else {
            // Shop admin - show all services for the shop
            servicesQuery = query(collection(db, "services"), where("shopId", "==", user.shopId), orderBy("createdAt", "desc"));
          }

          const querySnapshot = await getDocs(servicesQuery);
          const allServicesData = querySnapshot.docs.map((doc) => {
            const data = { id: doc.id, ...doc.data() };
            return transformServiceData(data);
          });

          console.log("Total services fetched:", allServicesData.length);

          // For technicians, filter to show only assigned services or services they created
          if (user.role === "technician") {
            console.log("🔍 Filtering services for technician:", {
              userId: user.id,
              userUid: user.uid,
              userBranchId: user.branchId
            });

            // Resolve technician document ID (canonical technicianId)
            let technicianDocId: string | null = null;
            try {
              const techQuery = query(collection(db, "technicians"), where("created_by", "==", user.id));
              const techSnap = await getDocs(techQuery);
              technicianDocId = techSnap.docs[0]?.id || null;
              console.log("👤 Technician document ID:", technicianDocId);
            } catch (e) {
              console.warn("⚠️ Failed to resolve technician document ID", e);
            }

            allServices = allServicesData.filter((service) => {
              // Get the raw data to check all possible fields
              const rawData = querySnapshot.docs.find((doc) => doc.id === service.id)?.data() as any;
              
              // Check if service is in technician's assigned branch
              const isInTechnicianBranch = service.branchId === user.branchId;
              
              // Check if service is assigned to this technician (prefer technicianDocId)
              const isAssignedToTechnician =
                (technicianDocId && (rawData?.technician_id === technicianDocId || service.technician_id === technicianDocId)) ||
                // Backward-compat: some records may store user id/uid instead of technician doc id
                rawData?.technician_id === user.id ||
                rawData?.technician_id === user.uid ||
                service.technician_id === user.id ||
                service.technician_id === user.uid;

              // Check if service was created by this technician
              const isCreatedByTechnician = 
                rawData?.created_by?.id === user.id ||
                rawData?.created_by?.id === user.uid ||
                rawData?.created_by?.uid === user.id ||
                rawData?.created_by?.uid === user.uid;

              const shouldShow = isInTechnicianBranch && (isAssignedToTechnician || isCreatedByTechnician);
              
              return shouldShow;
            });

            console.log("✅ Technician services after filtering:", {
              totalFetched: allServicesData.length,
              totalFiltered: allServices.length,
              filteredServices: allServices.map(s => ({ id: s.id, name: s.name, branchId: s.branchId, technician_id: s.technician_id }))
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
            allServices = allServicesData.filter((service) => service.shopId === user.shopId);
            console.log("Fallback - Filtered services:", allServices.length);
          } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
          }
        }

        // Transform to ServiceListItem for display
        console.log("Final services count:", allServices.length);
        const serviceListItems = allServices.map(transformToServiceListItem);
        console.log(
          "ServiceListItem details:",
          serviceListItems.map((item) => ({
            id: item.id,
            name: item.name,
            technician_id: item.technician_id,
            status: item.status,
          }))
        );
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
    return services.filter((service) => {
      const matchesSearch =
        !search ||
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
    const completed = services.filter((s) => s.status === "Completed").length;
    const inProgress = services.filter((s) => s.status === "In Progress").length;
    const pending = services.filter((s) => s.status === "To Do" || s.status === "Pending").length;
    const totalRevenue = services.filter((s) => s.status === "Completed").reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      totalRevenue,
    };
  }, [services]);

  // Get status filter chips with counts
  const statusFilterChips = useMemo(() => {
    return STATUS_FILTERS.map(filter => ({
      ...filter,
      count: services.filter(s => {
        if (filter.key === "completed") return s.status === "Completed";
        if (filter.key === "in_progress") return s.status === "In Progress";
        if (filter.key === "pending") return s.status === "To Do";
        if (filter.key === "on_hold") return s.status === "Pending";
        return false;
      }).length
    }));
  }, [services]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const handleStatusFilterClick = (statusKey: string) => {
    if (statusKey === "completed") setStatusFilter("Completed");
    else if (statusKey === "in_progress") setStatusFilter("In Progress");
    else if (statusKey === "pending") setStatusFilter("To Do");
    else if (statusKey === "on_hold") setStatusFilter("Pending");
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-1">Manage and track service requests</p>
          </div>
          <PermissionGuard permissions={["service:write"]} fallback={null}>
            <Link 
              href="/services/new" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              New Service
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
            onClick={() => setStatusFilter("All")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm font-medium text-gray-600">Total Services</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
            onClick={() => setStatusFilter("Completed")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-sm font-medium text-gray-600">Completed</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
            onClick={() => setStatusFilter("In Progress")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
            onClick={() => setStatusFilter("To Do")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                <p className="text-sm font-medium text-gray-600">To Do</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <SearchFilter
                search={search}
                onSearchChange={setSearch}
                placeholder="Search services by name, description, device, or customer..."
                filters={[
                  {
                    key: "status",
                    label: "Status",
                    value: statusFilter,
                    options: STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
                    onChange: setStatusFilter,
                  },
                ]}
                onClear={clearFilters}
                showClear={true}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
            </div>
          </div>
          
          {/* Status Filter Chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilterChips.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleStatusFilterClick(filter.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 hover:scale-105 ${filter.color}`}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
                <span className="ml-1 px-2 py-0.5 bg-white/50 rounded-full text-xs font-bold">
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Services List */}
        {user?.role === "shop_admin" && <ShopAdminServiceList services={filteredServices} branches={branches} technicians={technicians} loading={loading} search={search} />}
        {user?.role === "branch_admin" && <BranchAdminServiceList services={filteredServices} branches={branches} technicians={technicians} loading={loading} search={search} />}
        {user?.role === "technician" && (
          <>
            {console.log("🚀 Rendering TechnicianServiceList with data:", {
              user: {
                id: user?.id,
                role: user?.role,
                branchId: user?.branchId,
                shopId: user?.shopId
              },
              services: {
                total: filteredServices?.length || 0,
                sample: filteredServices?.slice(0, 2) || []
              },
              branches: {
                total: branches?.length || 0,
                sample: branches?.slice(0, 2) || []
              },
              technicians: {
                total: technicians?.length || 0,
                sample: technicians?.slice(0, 2) || []
              },
              loading,
              search
            })}
            <TechnicianServiceList services={filteredServices} branches={branches} technicians={technicians} loading={loading} search={search} user={user} />
          </>
        )}

        {/* Floating New Service Button for Mobile */}
        <PermissionGuard permissions={["service:write"]} fallback={null}>
          <div className="fixed bottom-6 right-6 lg:hidden">
            <Link 
              href="/services/new" 
              className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            >
              <PlusIcon className="w-6 h-6" />
            </Link>
          </div>
        </PermissionGuard>
      </div>
    </div>
  );
}
