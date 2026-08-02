"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ChevronDownIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";

import { PermissionGuard, RoleGuard } from "@/components";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { usePermissions } from "@/hooks/usePermissions";
import { useTechnicians } from "@/hooks/useTechnicians";
import { isIndexBuildingError, logger } from "@/lib/logger";
import TechnicianList from "@/modules/technician/TechnicianList";

export default function TechniciansPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:read"]}>
        <TechniciansContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function TechniciansContent() {
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);
  const { technicians, loading, error, deleteTechnician } = useTechnicians(user?.shopId, user?.role === "branch_admin" ? user?.branchId : undefined);
  const { canDeleteTechnician } = usePermissions();

  // State for filtering
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Filter technicians
  const filteredTechnicians = useMemo(() => {
    const filtered = technicians.filter((tech) => {
      const matchesStatus = statusFilter === "all" || tech.status === statusFilter;
      const matchesBranch = branchFilter === "all" || tech.branchId === branchFilter;

      return matchesStatus && matchesBranch;
    });

    return filtered;
  }, [technicians, statusFilter, branchFilter]);

  // Handle delete technician
  const handleDelete = async (technicianId: string) => {
    if (!canDeleteTechnician()) {
      logger.warn("User attempted to delete technician without permission", {
        userId: user?.id,
        technicianId,
      });
      return;
    }

    try {
      await deleteTechnician(technicianId);
      logger.info("Technician deleted successfully", { technicianId });
    } catch (error) {
      logger.error("Error deleting technician", { technicianId, error: error as Error });
    }
  };

  // Handle error states
  if (error) {
    const isIndexBuilding = isIndexBuildingError(error);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            {isIndexBuilding ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            ) : (
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserGroupIcon className="h-12 w-12 text-red-600" />
              </div>
            )}
            <h2 className="mt-4 text-xl font-semibold text-gray-900">{isIndexBuilding ? "Setting Up Database" : "Error Loading Technicians"}</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            {!isIndexBuilding && (
              <button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full flex flex-col px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Technicians</h1>
            <p className="text-gray-600">{user?.role === "shop_admin" ? "Manage all technicians across your business" : "Manage your team of skilled technicians"}</p>
          </div>


        {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex gap-4">
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="busy">Busy</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              </div>

              {/* Branch Filter */}
              <div className="relative">
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="appearance-none pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="all">All Branches</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              </div>
            </div>
          <PermissionGuard permissions={["technician:write"]} fallback={null}>
            <Link href="/technicians/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <PlusIcon className="w-5 h-5" />
              Add Technician
            </Link>
          </PermissionGuard>
          </div>
        </div>

        {/* Technicians List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 font-medium">Loading technicians...</span>
              </div>
            </div>
          ) : (
            <TechnicianList technicians={filteredTechnicians} branches={branches || []} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
