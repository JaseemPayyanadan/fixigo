"use client";

import React, { useMemo } from "react";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

import { LoadingSpinner } from "@/components/ui";
import type { Technician } from "@/types";

import { ServiceTable, type ServiceTableItem } from "./shared/ServiceTable";

interface Branch {
  id: string;
  name: string;
}

interface TechnicianServiceListProps {
  services: ServiceTableItem[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  search?: string;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (id: string) => void;
}

const TechnicianServiceList: React.FC<TechnicianServiceListProps> = ({
  services,
  branches,
  technicians,
  loading,
  search,
  onEdit,
  onDelete,
}) => {
  const filteredServices = useMemo(() => {
    if (!search) return services;

    const searchTerm = search.toLowerCase();
    return services.filter((service) => {
      return (
        service.name?.toLowerCase().includes(searchTerm) ||
        service.description?.toLowerCase().includes(searchTerm) ||
        service.customer?.name?.toLowerCase().includes(searchTerm) ||
        service.customer?.phone?.includes(search) ||
        service.device?.brand?.toLowerCase().includes(searchTerm) ||
        service.device?.model?.toLowerCase().includes(searchTerm) ||
        service.device?.imei?.includes(search)
      );
    });
  }, [services, search]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-6 text-lg text-gray-600">Loading repairs...</p>
      </div>
    );
  }

  if (filteredServices.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <DevicePhoneMobileIcon className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="mb-3 text-xl font-semibold text-gray-900">No repairs found</h3>
        <p className="mx-auto max-w-md text-sm text-gray-600">
          {search
            ? `No repairs match "${search}".`
            : "Repairs assigned to you will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServiceTable
        services={filteredServices}
        branches={branches}
        technicians={technicians}
        showBranch={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <p className="text-center text-sm text-gray-500">
        Showing {filteredServices.length} repair{filteredServices.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default TechnicianServiceList;
