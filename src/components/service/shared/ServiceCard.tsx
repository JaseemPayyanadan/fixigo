"use client";
import React from "react";
import Link from "next/link";

import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  UserIcon,
  DevicePhoneMobileIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  PauseIcon
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui";
import type { ServiceCardProps } from "./types";
import { 
  getServiceStatusConfig, 
  getServicePriorityConfig, 
  getTechnicianDisplayInfo, 
  getBranchDisplayInfo,
  formatServicePrice,
  getServiceAge
} from "./ServiceUtils";

// Status badge configuration with improved styling
const getStatusBadgeConfig = (status: string) => {
  const statusMap: Record<string, { 
    label: string; 
    color: string; 
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
  }> = {
    "Completed": {
      label: "Completed",
      color: "text-emerald-700",
      icon: CheckCircleIcon,
      bgColor: "bg-emerald-100 border-emerald-200"
    },
    "In Progress": {
      label: "In Progress",
      color: "text-amber-700",
      icon: ExclamationTriangleIcon,
      bgColor: "bg-amber-100 border-amber-200"
    },
    "To Do": {
      label: "To Do",
      color: "text-blue-700",
      icon: ClipboardDocumentListIcon,
      bgColor: "bg-blue-100 border-blue-200"
    },
    "Pending": {
      label: "Pending",
      color: "text-blue-700",
      icon: PauseIcon,
      bgColor: "bg-blue-100 border-blue-200"
    },
    "Awaiting Parts": {
      label: "Awaiting Parts",
      color: "text-orange-700",
      icon: ClockIcon,
      bgColor: "bg-orange-100 border-orange-200"
    },
    "Ready for Pickup": {
      label: "Ready for Pickup",
      color: "text-cyan-700",
      icon: CheckCircleIcon,
      bgColor: "bg-cyan-100 border-cyan-200"
    },
    "Cancelled": {
      label: "Cancelled",
      color: "text-red-700",
      icon: TrashIcon,
      bgColor: "bg-red-100 border-red-200"
    }
  };

  return statusMap[status] || statusMap["To Do"];
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  branches,
  technicians,
  user,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  const statusConfig = getServiceStatusConfig(service.status as any);
  const priorityConfig = getServicePriorityConfig(service.priority as any);
  const technicianName = getTechnicianDisplayInfo(service.assignedTechnicianId, technicians);
  const branchName = getBranchDisplayInfo(service.branchId, branches);
  const statusBadge = getStatusBadgeConfig(service.status);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit?.(service);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this service?")) {
      onDelete?.(service.id);
    }
  };



  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Link href={`/services/details?id=${service.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
        {/* Top Bar - Service ID + Status Badge */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                #{service.id.slice(-8)}
              </span>
            </div>
            
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusBadge.bgColor} ${statusBadge.color}`}>
              <statusBadge.icon className="w-3.5 h-3.5" />
              {statusBadge.label}
            </div>
          </div>
        </div>

        {/* Middle - Service Issue/Summary */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {service.name || "Service Request"}
          </h3>
          {service.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>

        {/* Details Section - 2-column grid with icons */}
        <div className="px-6 py-4 space-y-3">
          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {service.customer?.name || "Unknown Customer"}
                </p>
                <p className="text-gray-600 text-xs truncate">
                  {service.customer?.phone || "No phone"}
                </p>
              </div>
            </div>

            {/* Device Details */}
            <div className="flex items-center gap-2 text-sm">
              <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {service.device?.brand} {service.device?.model}
                </p>
                <p className="text-gray-600 text-xs truncate">
                  IMEI: {service.device?.imei || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Branch and Technician */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <BuildingOfficeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 truncate">{branchName}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 truncate">{technicianName}</span>
            </div>
          </div>
        </div>

        {/* Footer - Date and Amount */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>{service.createdAt.toLocaleDateString()}</span>
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(service.price || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden by default, shown on hover */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* View Details Button */}
              <Link href={`/services/details?id=${service.id}`}>
                <Button
                  variant="secondary"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-3 py-1.5"
                >
                  <EyeIcon className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
              </Link>

              {/* Edit Button - Only show if user can edit */}
              {(user.role === 'shop_admin' || user.role === 'branch_admin' || 
                (user.role === 'technician' && service.technician_id === user.id)) && (
                <Button
                  variant="secondary"
                  onClick={handleEdit}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 text-xs px-3 py-1.5"
                >
                  <PencilIcon className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Delete Button - Only show if user can delete */}
            {(user.role === 'shop_admin' || user.role === 'branch_admin') && (
              <Button
                variant="danger"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-3 py-1.5"
              >
                <TrashIcon className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
