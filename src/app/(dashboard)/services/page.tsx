"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { PermissionGuard, RoleGuard } from "../../../components";
import { BranchAdminServiceList, ShopAdminServiceList, TechnicianServiceList } from "../../../components/service";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { useTechnicians } from "../../../hooks/useTechnicians";
import { db } from "../../../lib/firebase";
import type { ServicePaymentStatus } from "../../../lib/paymentUtils";
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
  paymentStatus?: ServicePaymentStatus;
  isReopened?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const STATUS_OPTIONS = ["All", "To Do", "In Progress", "Awaiting Parts", "Ready for Pickup", "Completed", "Cancelled", "Pending"];

// Status filter chips configuration
const STATUS_FILTERS = [
  { key: "completed", label: "Completed", count: 0, color: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200", icon: CheckCircleIcon },
  { key: "in_progress", label: "In Progress", count: 0, color: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200", icon: ClockIcon },
  { key: "pending", label: "To Do", count: 0, color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200", icon: ClipboardDocumentListIcon },
  { key: "awaiting_parts", label: "Awaiting Parts", count: 0, color: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200", icon: ExclamationTriangleIcon },
  { key: "ready_for_pickup", label: "Ready for Pickup", count: 0, color: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200", icon: CheckCircleIcon },
  { key: "cancelled", label: "Cancelled", count: 0, color: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200", icon: ExclamationTriangleIcon },
];

interface StatusFilterChip {
  key: string;
  label: string;
  count: number;
  color: string;
}

/**
 * Phone-sized replacement for the status chip strip: one button carrying the
 * active filter, opening a list of the same statuses with their counts. The
 * chips need a horizontal scroll to fit a phone, which hides most of the
 * statuses behind a swipe — a menu shows all of them at once.
 */
function StatusFilterDropdown({
  chips,
  statusFilter,
  totalCount,
  onSelect,
  className = "",
}: {
  chips: StatusFilterChip[];
  statusFilter: string;
  totalCount: number;
  /** Chip key, or `null` for "All statuses". */
  onSelect: (key: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // The chip labels are the display status values the filter stores, so the
  // active chip is the one whose label matches.
  const activeChip = chips.find((chip) => chip.label === statusFilter);
  const isFiltered = statusFilter !== "All";

  const choose = (key: string | null) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by status: ${activeChip?.label ?? "All statuses"}`}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
          isFiltered
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        <FunnelIcon className="h-5 w-5" />
        {/* A filter narrows what the list shows, so it has to be visible from
            the closed button — the label that said which one is gone. */}
        {isFiltered && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!isFiltered}
            onClick={() => choose(null)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <CheckIcon className={`h-4 w-4 shrink-0 ${isFiltered ? "invisible" : "text-blue-600"}`} />
            <span>All statuses</span>
            <span className="ml-auto text-xs font-semibold text-gray-500">{totalCount}</span>
          </button>

          {chips.map((chip) => {
            const selected = chip.label === statusFilter;
            return (
              <button
                key={chip.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(chip.key)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <CheckIcon className={`h-4 w-4 shrink-0 ${selected ? "text-blue-600" : "invisible"}`} />
                <span className="truncate">{chip.label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-500">{chip.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  // Seeded from ?q= — the app header's search box navigates here with it, and
  // the header's box is itself hidden below `lg`, which is why this page needs
  // an input of its own. Typing in that input filters locally rather than
  // pushing a URL per keystroke; a later ?q= still wins.
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);
  const [statusFilter, setStatusFilter] = useState("All");

  // Transform legacy data to match current schema for internal use
  const transformServiceData = (data: any): Service => {
    // Keep the original status value instead of transforming it
    const status = data.status || "To Do";

    return {
      id: data.id,
      name: data.name || data.device?.name || "",
      description: data.description || "",
      price: data.price || 0,
      status: status,
      priority: data.priority || "medium",
      shopId: data.shopId || "",
      branchId: data.branchId || "",
      // Carried through explicitly — without it every row renders as
      // "Unassigned" no matter who the repair is assigned to.
      technician_id: data.technician_id || "",

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
      // Left absent on documents written before payment tracking, so
      // `isPaid` falls back to the work status rather than reading them as
      // unpaid.
      paymentStatus: data.paymentStatus === "paid" || data.paymentStatus === "pending" ? data.paymentStatus : undefined,
      isReopened: data.isReopened === true,
      reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
      reopenedAt: data.reopenedAt?.toDate?.(),
      reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
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
      paymentStatus: service.paymentStatus,
      isReopened: service.isReopened === true,
      branchId: service.branchId,
      technician_id: service.technician_id,
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
            const data = { id: doc.id, ...doc.data() } as any;
            console.log("🔍 Raw service data from Firestore:", {
              id: data.id,
              name: data.name,
              status: data.status,
              rawData: data
            });
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
              const techResponse = await fetch("/api/technicians/me");
              if (!techResponse.ok) throw new Error("Failed to fetch technician record");
              const { technician } = await techResponse.json();
              technicianDocId = technician?.id || null;
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
    console.log("🔍 Filtering services with statusFilter:", statusFilter);
    console.log("🔍 Total services before filtering:", services.length);
    
    const filtered = services.filter((service) => {
      const matchesSearch =
        !search ||
        service.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.model?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.brand?.toLowerCase().includes(search.toLowerCase()) ||
        service.device?.imei?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        service.customer?.phone?.toLowerCase().includes(search.toLowerCase());

      // Use original display status values for filtering
      const matchesStatus = statusFilter === "All" || service.status === statusFilter;

      if (statusFilter !== "All") {
        console.log(`🔍 Service ${service.name}: status=${service.status}, matchesStatus=${matchesStatus}`);
      }

      return matchesSearch && matchesStatus;
    });
    
    console.log("🔍 Filtered services count:", filtered.length);
    return filtered;
  }, [services, search, statusFilter]);

  // Get status filter chips with counts
  const statusFilterChips = useMemo(() => {
    // Debug: Log unique status values in services
    const uniqueStatuses = [...new Set(services.map(s => s.status))];
    console.log("🔍 Services status values:", uniqueStatuses);
    console.log("🔍 Total services:", services.length);
    
    const chips = STATUS_FILTERS.map(filter => {
      const count = services.filter(s => {
        if (filter.key === "completed") return s.status === "Completed";
        if (filter.key === "in_progress") return s.status === "In Progress";
        if (filter.key === "pending") return s.status === "To Do";
        if (filter.key === "awaiting_parts") return s.status === "Awaiting Parts";
        if (filter.key === "ready_for_pickup") return s.status === "Ready for Pickup";
        if (filter.key === "cancelled") return s.status === "Cancelled";
        return false;
      }).length;
      
      console.log(`🔍 ${filter.label}: ${count} services`);
      
      return {
        ...filter,
        count
      };
    });
    
    return chips;
  }, [services]);

  // Writes through and updates the row in place. Re-fetching the whole list
  // for a one-field change would blank the table on a slow connection, and the
  // row already knows everything the new state needs.
  const handleStatusFilterClick = (statusKey: string | null) => {
    if (statusKey === null) setStatusFilter("All");
    else if (statusKey === "completed") setStatusFilter("Completed");
    else if (statusKey === "in_progress") setStatusFilter("In Progress");
    else if (statusKey === "pending") setStatusFilter("To Do");
    else if (statusKey === "awaiting_parts") setStatusFilter("Awaiting Parts");
    else if (statusKey === "ready_for_pickup") setStatusFilter("Ready for Pickup");
    else if (statusKey === "cancelled") setStatusFilter("Cancelled");
  };

  // Debug: Log current state
  console.log("🔍 Current state:", {
    statusFilter,
    totalServices: services.length,
    filteredServicesCount: filteredServices.length,
    sampleServices: filteredServices.slice(0, 2).map(s => ({ id: s.id, name: s.name, status: s.status })),
    allServiceStatuses: [...new Set(services.map(s => s.status))],
    statusDistribution: services.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

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
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Status Filter Chips - Horizontal Scroll */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search. The app header carries one from `lg` up and hides it
              below that, so this fills the gap on phones and tablets. */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs lg:hidden">
            <label htmlFor="services-search" className="sr-only">
              Search repairs
            </label>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="services-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search repairs..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phones get the filter menu, `sm` and up the chip strip. */}
          <StatusFilterDropdown
            chips={statusFilterChips}
            statusFilter={statusFilter}
            totalCount={services.length}
            onSelect={handleStatusFilterClick}
            className="shrink-0 sm:hidden"
          />

          {/* Chips take the leftover width so the button stays pinned right
              while the chip strip keeps its own horizontal scroll. */}
          <div className="relative hidden min-w-0 flex-1 sm:block">
            {/* Scroll indicator shadows - only show on larger screens */}
            <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10 rounded-l-lg"></div>
            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10 rounded-r-lg"></div>
            
            {/* Horizontal scrollable container */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-1 min-w-max px-1">
                {statusFilterChips.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => handleStatusFilterClick(filter.key)}
                    className={`inline-flex items-center gap-1.5 px-2 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap ${filter.color}`}
                  >
                    {filter.label}
                    <span className="ml-0.5 px-1.5 py-0.5 bg-white/50 rounded-full text-xs font-bold">
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* New Service Button */}
          <PermissionGuard permissions={["service:write"]} fallback={null}>
            {/* Square icon button on phones, labelled button from `sm` up. */}
            <Link
              href="/services/new"
              aria-label="New service"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">New Service</span>
            </Link>
          </PermissionGuard>
        </div>

        {/* Services List */}
        {user?.role === "shop_admin" && <ShopAdminServiceList services={filteredServices} branches={branches} technicians={technicians} loading={loading} search={search} />}
        {user?.role === "branch_admin" && <BranchAdminServiceList services={filteredServices} branches={branches} technicians={technicians} loading={loading} search={search} />}
        {user?.role === "technician" && (
          <TechnicianServiceList
            services={filteredServices}
            branches={branches}
            technicians={technicians}
            loading={loading}
            search={search}
           
          />
        )}


      </div>
    </div>
  );
}
