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
  ClockIcon
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(service);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this service?")) {
      onDelete?.(service.id);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(service.id);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {service.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {service.description}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className={`ml-3 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
            <div className="flex items-center gap-1">
              <statusConfig.icon className="w-3 h-3" />
              {statusConfig.label}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Customer Information */}
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">
              {service.customer?.name || "Unknown Customer"}
            </p>
            <p className="text-gray-600 truncate">
              {service.customer?.phone || "No phone"}
            </p>
          </div>
        </div>

        {/* Device Information */}
        <div className="flex items-center gap-2 text-sm">
          <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">
              {service.device?.brand} {service.device?.model}
            </p>
            <p className="text-gray-600 text-xs truncate">
              IMEI: {service.device?.imei || "N/A"}
            </p>
          </div>
        </div>

        {/* Branch and Technician */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 truncate">{branchName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 truncate">{technicianName}</span>
          </div>
        </div>

        {/* Priority and Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityConfig.color}`}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>
          </div>
          
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              {formatServicePrice(service.price || 0)}
            </p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>{getServiceAge(service.createdAt)}</span>
          </div>
          
          <span>
            {service.createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* View Details Button */}
            <Button
              variant="secondary"
              onClick={handleViewDetails}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              View
            </Button>

            {/* Edit Button - Only show if user can edit */}
            {(user.role === 'shop_admin' || user.role === 'branch_admin' || 
              (user.role === 'technician' && service.assignedTechnicianId === user.id)) && (
              <Button
                variant="secondary"
                onClick={handleEdit}
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {/* Delete Button - Only show if user can delete */}
          {(user.role === 'shop_admin' || user.role === 'branch_admin') && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
