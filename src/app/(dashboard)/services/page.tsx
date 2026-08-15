"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { PermissionGuard, RoleGuard } from "../../../components";
import { Button } from "../../../components/ui/Button";
import { PageFallback } from "../../../components/ui/PageSkeleton";
import { BranchAdminServiceList, ShopAdminServiceList, TechnicianServiceList } from "../../../components/service";
import { useUser } from "../../../hooks";
import { useBranches } from "../../../hooks/useBranches";
import { useTechnicians } from "../../../hooks/useTechnicians";
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
  paidAmount?: number;
  isReopened?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
 * Status filter as a single button carrying the active filter, opening a
 * list of the same statuses with their counts, rather than a chip strip
 * that needs horizontal scroll to fit every status.
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          isFiltered
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        <FunnelIcon className="h-4 w-4" />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw, loosely-shaped Firestore document
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
      paymentStatus:
        data.paymentStatus === "paid" ||
        data.paymentStatus === "pending" ||
        data.paymentStatus === "partial"
          ? data.paymentStatus
          : undefined,
      paidAmount: typeof data.paidAmount === "number" ? data.paidAmount : undefined,
      isReopened: data.isReopened === true,
      reopenReason: typeof data.reopenReason === "string" ? data.reopenReason : undefined,
      reopenedAt: data.reopenedAt?.toDate?.() || (data.reopenedAt ? new Date(data.reopenedAt) : undefined),
      reopenCount: typeof data.reopenCount === "number" ? data.reopenCount : undefined,
      createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date()),
      updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : new Date()),
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
      paidAmount: service.paidAmount,
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

  // Fetch services via Admin SDK API (client Firestore is blocked by rules)
  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.shopId) return;

      setLoading(true);
      try {
        const response = await fetch("/api/services");
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error || "Failed to fetch services"
          );
        }

        const body = await response.json();
        const allServicesData = Array.isArray(body?.services) ? body.services : [];
        const allServices = allServicesData.map((data: Service) =>
          transformServiceData(data)
        );

        const serviceListItems = allServices.map(transformToServiceListItem);
        setServices(serviceListItems);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
  }, [user?.shopId, user?.branchId, user?.role, user?.id, user?.uid]);


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
    return <PageFallback label="Loading services" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">

        {/* Search + status filter button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search. The app header carries one from `lg` up and hides it
              below that, so this fills the gap on phones and tablets. */}
          <div className="relative min-w-0 flex-1 sm:max-w-[16rem] lg:hidden">
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
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter + New Service stay pinned right. Search's `flex-1`
              already pushes them there below `lg`; `lg:ml-auto` does the
              same once search is hidden at `lg` and up. */}
          <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
          <StatusFilterDropdown
            chips={statusFilterChips}
            statusFilter={statusFilter}
            totalCount={services.length}
            onSelect={handleStatusFilterClick}
            className="shrink-0"
          />

          {/* New Service Button */}
          <PermissionGuard permissions={["service:write"]} fallback={null}>
            <Button href="/services/new" size="sm">
              <PlusIcon className="h-4 w-4" />
              New Service
            </Button>
          </PermissionGuard>
          </div>
        </div>

        {/* Services List */}
        <div className="flex min-h-0 flex-1 flex-col">
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
    </div>
  );
}
