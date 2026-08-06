"use client";

import React from "react";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

import { TableSkeleton } from "@/components/ui/PageSkeleton";
import type { Technician } from "@/types";

import { ServiceTable, type ServiceTableItem } from "./shared/ServiceTable";

interface Branch {
  id: string;
  name: string;
}

interface TechnicianServiceListProps {
  /** Already filtered by the page — this component does not search again. */
  services: ServiceTableItem[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  /** Only used to word the empty state; filtering happens upstream. */
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
  if (loading) {
    return <TableSkeleton rows={8} />;
  }

  if (services.length === 0) {
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
        services={services}
        branches={branches}
        technicians={technicians}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <p className="text-center text-sm text-gray-500">
        Showing {services.length} repair{services.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default TechnicianServiceList;
