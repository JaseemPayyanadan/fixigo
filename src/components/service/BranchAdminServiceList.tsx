"use client";

import React, { useMemo } from "react";

import Link from "next/link";

import { CubeIcon } from "@heroicons/react/24/outline";

import { ServiceTable, type ServiceTableItem } from "./shared/ServiceTable";
import type { Technician } from "@/types";

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager_id?: string;
}

interface BranchAdminServiceListProps {
  services: ServiceTableItem[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  search?: string;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (id: string) => void;
}

const BranchAdminServiceList: React.FC<BranchAdminServiceListProps> = ({
  services,
  branches,
  technicians,
  loading,
  search,
  onEdit,
  onDelete,
}) => {
  const technicianNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const technician of technicians) map.set(technician.id, technician.name);
    return map;
  }, [technicians]);
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const branch of branches) map.set(branch.id, branch.name);
    return map;
  }, [branches]);

  const filteredServices = useMemo(() => {
    if (!search) return services;

    const searchTerm = search.toLowerCase();
    return services.filter((service) => {
      const technicianName = service.technician_id ? technicianNameById.get(service.technician_id) : undefined;
      const branchName = branchNameById.get(service.branchId);
      return (
        service.name?.toLowerCase().includes(searchTerm) ||
        service.description?.toLowerCase().includes(searchTerm) ||
        service.device?.model?.toLowerCase().includes(searchTerm) ||
        service.device?.brand?.toLowerCase().includes(searchTerm) ||
        service.device?.imei?.toLowerCase().includes(searchTerm) ||
        service.customer?.name?.toLowerCase().includes(searchTerm) ||
        service.customer?.phone?.toLowerCase().includes(searchTerm) ||
        technicianName?.toLowerCase().includes(searchTerm) ||
        branchName?.toLowerCase().includes(searchTerm)
      );
    });
  }, [services, search, technicianNameById, branchNameById]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="space-y-0 divide-y divide-gray-100">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-4 px-4 py-4 motion-reduce:animate-none">
              <div className="h-4 w-32 rounded bg-gray-100" />
              <div className="h-4 w-28 rounded bg-gray-100" />
              <div className="h-5 w-20 rounded-full bg-gray-100" />
              <div className="ml-auto h-4 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (filteredServices.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <CubeIcon className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="mb-3 text-xl font-semibold text-gray-900">No repairs found</h3>
        <p className="mx-auto mb-6 max-w-md text-gray-600">
          {search
            ? `No repairs match "${search}". Try adjusting your search.`
            : "Get started by creating your first repair."}
        </p>
        {!search && (
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <CubeIcon className="h-5 w-5" />
            Create first repair
          </Link>
        )}
      </div>
    );
  }

  return (
    <ServiceTable
      services={filteredServices}
      branches={branches}
      technicians={technicians}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default BranchAdminServiceList;
