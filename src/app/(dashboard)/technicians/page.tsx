"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { CheckCircleIcon, MagnifyingGlassIcon, PlusIcon, StarIcon, UserGroupIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

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

  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const total = technicians.length;
    const active = technicians.filter((t) => t.status === "active").length;
    const online = Math.floor(total * 0.7); // Mock online count
    const averageRating = technicians.length > 0 ? technicians.reduce((sum, t) => sum + (t.rating || 0), 0) / technicians.length : 0;
    const totalCompleted = technicians.reduce((sum, t) => sum + (t.completedServices || 0), 0);
    const totalCurrent = technicians.reduce((sum, t) => sum + (t.totalServices || 0), 0);

    return {
      total,
      active,
      online,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalCompleted,
      totalCurrent,
    };
  }, [technicians]);

  // Filter and sort technicians
  const filteredTechnicians = useMemo(() => {
    const filtered = technicians.filter((tech) => {
      const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || tech.email.toLowerCase().includes(searchTerm.toLowerCase()) || tech.phone.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || tech.status === statusFilter;
      const matchesBranch = branchFilter === "all" || tech.branchId === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });

    // Sort technicians
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return a.status.localeCompare(b.status);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "completed":
          return (b.completedServices || 0) - (a.completedServices || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [technicians, searchTerm, statusFilter, branchFilter, sortBy]);

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
          <PermissionGuard permissions={["technician:write"]} fallback={null}>
            <Link href="/technicians/new" className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105">
              <PlusIcon className="w-5 h-5" />
              Add Technician
            </Link>
          </PermissionGuard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Technicians</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.active} active</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Now</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
                <p className="text-xs text-gray-500 mt-1">Available for work</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.averageRating}/5.0</p>
                <p className="text-xs text-gray-500 mt-1">Customer satisfaction</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Services</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.totalCompleted}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <WrenchScrewdriverIcon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search technicians..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-4">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="busy">Busy</option>
              </select>

              {/* Branch Filter */}
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Branches</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
                <option value="rating">Sort by Rating</option>
                <option value="completed">Sort by Completed</option>
              </select>
            </div>
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
