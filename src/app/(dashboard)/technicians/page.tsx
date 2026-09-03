"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { CheckIcon, FunnelIcon, MagnifyingGlassIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";

import { PermissionGuard, RoleGuard } from "@/components";
import { Button } from "@/components/ui/Button";
import { ListPageSkeleton, TableSkeleton } from "@/components/ui/PageSkeleton";
import SlideOver from "@/components/ui/SlideOver";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { usePermissions } from "@/hooks/usePermissions";
import { useTechnicians } from "@/hooks/useTechnicians";
import { isIndexBuildingError, logger } from "@/lib/logger";
import TechnicianFormHost, { type TechnicianFormActionState } from "@/modules/technician/TechnicianFormHost";
import TechnicianTable from "@/modules/technician/TechnicianTable";
import TechnicianViewDialog from "@/modules/technician/TechnicianViewDialog";
import type { Branch, Technician } from "@/types";

const DESKTOP_MQ = "(min-width: 768px)";

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
}

const STATUS_OPTIONS: Array<{ key: Technician["status"]; label: string }> = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

/**
 * One button carrying both filter dimensions (status, branch), rather than
 * two separate `<select>`s sitting inline — matches the single filter button
 * the repairs list uses.
 */
function TechnicianFilterDropdown({
  branches,
  statusFilter,
  branchFilter,
  onStatusChange,
  onBranchChange,
}: {
  branches: Branch[];
  statusFilter: string;
  branchFilter: string;
  onStatusChange: (status: string) => void;
  onBranchChange: (branchId: string) => void;
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

  const isFiltered = statusFilter !== "all" || branchFilter !== "all";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter technicians"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          isFiltered ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        <FunnelIcon className="h-4 w-4" />
        {isFiltered && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</p>
          <button
            type="button"
            role="option"
            aria-selected={statusFilter === "all"}
            onClick={() => onStatusChange("all")}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <CheckIcon className={`h-4 w-4 shrink-0 ${statusFilter === "all" ? "text-blue-600" : "invisible"}`} />
            All statuses
          </button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={statusFilter === option.key}
              onClick={() => onStatusChange(option.key)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <CheckIcon className={`h-4 w-4 shrink-0 ${statusFilter === option.key ? "text-blue-600" : "invisible"}`} />
              {option.label}
            </button>
          ))}

          <hr className="my-1 border-gray-100" />

          <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Branch</p>
          <button
            type="button"
            role="option"
            aria-selected={branchFilter === "all"}
            onClick={() => onBranchChange("all")}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <CheckIcon className={`h-4 w-4 shrink-0 ${branchFilter === "all" ? "text-blue-600" : "invisible"}`} />
            All branches
          </button>
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              role="option"
              aria-selected={branchFilter === branch.id}
              onClick={() => onBranchChange(branch.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <CheckIcon className={`h-4 w-4 shrink-0 ${branchFilter === branch.id ? "text-blue-600" : "invisible"}`} />
              <span className="truncate">{branch.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TechniciansPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:read"]}>
        <Suspense fallback={<ListPageSkeleton cards={0} rows={8} label="Loading technicians" />}>
          <TechniciansContent />
        </Suspense>
      </PermissionGuard>
    </RoleGuard>
  );
}

function TechniciansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const editId = searchParams.get("edit");
  const slideMode = newParam === "1" || Boolean(editId);

  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);
  const { technicians, loading, error, deleteTechnician, refresh } = useTechnicians(
    user?.shopId,
    user?.role === "branch_admin" ? user?.branchId : undefined
  );
  const { canDeleteTechnician } = usePermissions();

  // unknown until matchMedia runs — avoid bouncing desktop users to /technicians/new
  const [viewport, setViewport] = useState<"unknown" | "mobile" | "desktop">("unknown");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Technician | null>(null);
  const [formState, setFormState] = useState<TechnicianFormActionState>({
    submitting: false,
    submitLabel: "Create Technician",
  });

  const technicianFormId = "technician-slide-form";

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);
    const sync = () => setViewport(media.matches ? "desktop" : "mobile");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Mobile keeps the full-page form; bounce query-param opens over to the route.
  useEffect(() => {
    if (!slideMode || viewport !== "mobile") return;
    if (editId) {
      router.replace(`/technicians/edit?id=${editId}`);
      return;
    }
    router.replace("/technicians/new");
  }, [slideMode, viewport, editId, router]);

  const closeSlide = () => router.replace("/technicians");

  const openNew = () => {
    if (isDesktopViewport()) {
      router.push("/technicians?new=1");
      return;
    }
    router.push("/technicians/new");
  };

  const openEdit = (technician: Technician) => {
    if (isDesktopViewport()) {
      router.push(`/technicians?edit=${technician.id}`);
      return;
    }
    router.push(`/technicians/edit?id=${technician.id}`);
  };

  const handleSlideSuccess = async () => {
    closeSlide();
    await refresh();
  };

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branches || []) map.set(branch.id, branch.name);
    return map;
  }, [branches]);

  const filteredTechnicians = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return technicians.filter((tech) => {
      const matchesSearch =
        !searchTerm ||
        tech.name?.toLowerCase().includes(searchTerm) ||
        tech.email?.toLowerCase().includes(searchTerm) ||
        tech.phone?.toLowerCase().includes(searchTerm) ||
        branchNameById.get(tech.branchId)?.toLowerCase().includes(searchTerm);
      const matchesStatus = statusFilter === "all" || tech.status === statusFilter;
      const matchesBranch = branchFilter === "all" || tech.branchId === branchFilter;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [technicians, search, statusFilter, branchFilter, branchNameById]);

  const handleDelete = async (technician: Technician) => {
    if (!canDeleteTechnician()) {
      logger.warn("User attempted to delete technician without permission", {
        userId: user?.id,
        technicianId: technician.id,
      });
      return;
    }
    if (!window.confirm(`Deactivate '${technician.name}'? They will no longer be able to log in, but their service history is kept.`)) {
      return;
    }

    try {
      await deleteTechnician(technician.id);
      logger.info("Technician deleted successfully", { technicianId: technician.id });
    } catch (err) {
      logger.error("Error deleting technician", { technicianId: technician.id, error: err as Error });
    }
  };

  if (error) {
    const isIndexBuilding = isIndexBuildingError(error);

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          {isIndexBuilding ? (
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          ) : (
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <UserGroupIcon className="h-12 w-12 text-red-600" />
            </div>
          )}
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {isIndexBuilding ? "Setting Up Database" : "Error Loading Technicians"}
          </h2>
          <p className="mt-2 text-gray-600">{error}</p>
          {!isIndexBuilding && (
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const showSlide = slideMode && viewport === "desktop";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-[16rem]">
            <label htmlFor="technicians-search" className="sr-only">
              Search technicians
            </label>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="technicians-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search technicians..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 ml-auto">
            <TechnicianFilterDropdown
              branches={branches || []}
              statusFilter={statusFilter}
              branchFilter={branchFilter}
              onStatusChange={setStatusFilter}
              onBranchChange={setBranchFilter}
            />

            <PermissionGuard permissions={["technician:write"]} fallback={null}>
              <Button onClick={openNew} size="sm">
                <PlusIcon className="h-4 w-4" />
                Add Technician
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <TechnicianTable
              technicians={filteredTechnicians}
              branches={branches || []}
              onView={setViewing}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      <TechnicianViewDialog technician={viewing} branches={branches || []} onClose={() => setViewing(null)} />

      <SlideOver
        open={showSlide}
        title={editId ? "Edit Technician" : "Add Technician"}
        description={editId ? "Update the technician's details" : "Add a new technician to your team"}
        onClose={closeSlide}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeSlide} disabled={formState.submitting}>
              Cancel
            </Button>
            <Button type="submit" form={technicianFormId} disabled={formState.submitting}>
              {formState.submitting ? "Saving…" : formState.submitLabel}
            </Button>
          </div>
        }
      >
        <TechnicianFormHost
          editId={editId}
          formId={technicianFormId}
          hideSubmit
          onActionStateChange={setFormState}
          onSuccess={handleSlideSuccess}
          onCancel={closeSlide}
        />
      </SlideOver>
    </div>
  );
}
