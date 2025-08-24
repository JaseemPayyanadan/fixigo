"use client";
import React, { useState } from "react";

import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  NoSymbolIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button, LoadingSpinner } from "@/components/ui";
import ServiceCard from "./ServiceCard";
import type { ServiceListProps } from "./types";
import type { Branch, Technician, User } from "@/types";

interface ServiceListSharedProps extends ServiceListProps {
  services: any[]; // Using any for compatibility
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  error?: string | null;
  user: User | null;
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  onRetry?: () => void;
  onViewDetails?: (id: string) => void;
}

// Mobile Service Item Component
const MobileServiceItem: React.FC<{
  service: any;
  branches: Branch[];
  technicians: Technician[];
  user: User;
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}> = ({ service, branches, technicians, user, onEdit, onDelete, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const branchName = branches.find(b => b.id === service.branchId)?.name || "Unknown Branch";
  const technicianName = technicians.find(t => t.id === service.technician_id)?.name || "Unassigned";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header - Always visible */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {service.name || "Service Request"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {service.customer?.name || "Unknown Customer"}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className="ml-3 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
            {service.status}
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {service.device?.brand} {service.device?.model}
          </span>
          <span className="font-bold text-gray-900">
            {formatCurrency(service.price || 0)}
          </span>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Show Details
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
          {/* Customer Details */}
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{service.customer?.phone || "No phone"}</span>
          </div>

          {/* Device Details */}
          <div className="flex items-center gap-2 text-sm">
            <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">IMEI: {service.device?.imei || "N/A"}</span>
          </div>

          {/* Branch and Technician */}
          <div className="flex items-center gap-2 text-sm">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{branchName}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{technicianName}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {service.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Link href={`/services/details?id=${service.id}`} className="flex-1">
            <Button
              variant="secondary"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-3 py-1.5 w-full"
            >
              <EyeIcon className="w-3.5 h-3.5 mr-1" />
              View Details
            </Button>
          </Link>

            {(user.role === 'shop_admin' || user.role === 'branch_admin' || 
              (user.role === 'technician' && service.technician_id === user.id)) && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(service);
                }}
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 text-xs px-3 py-1.5 flex-1"
              >
                <PencilIcon className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceList: React.FC<ServiceListSharedProps> = ({
  services,
  branches,
  technicians,
  loading,
  error,
  user,
  onEdit,
  onDelete,
  onRetry,
  onViewDetails
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-16">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-6 text-lg">Loading services...</p>
          <p className="text-gray-500 mt-2 text-sm">Please wait while we fetch your service data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-red-900 mb-3">
            Error Loading Services
          </h3>
          <p className="text-red-700 text-sm mb-6">{error}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="secondary"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <DevicePhoneMobileIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            No Services Found
          </h3>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            It looks like there are no services to display at the moment. 
            {user?.role !== 'technician' && " Create your first service request to get started."}
          </p>
          
          {/* Show create button for admins */}
          {user && (user.role === 'shop_admin' || user.role === 'branch_admin') && (
            <Link href="/services/new">
              <Button className="inline-flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create First Service
              </Button>
            </Link>
          )}
          
          {/* Show different message for technicians */}
          {user?.role === 'technician' && (
            <div className="text-sm text-gray-500">
              <p>Services will appear here once they are assigned to you.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Services list
  return (
    <div className="space-y-6">
      {/* Desktop Grid View */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              branches={branches}
              technicians={technicians}
              user={user!}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-4">
        {services.map((service) => (
          <MobileServiceItem
            key={service.id}
            service={service}
            branches={branches}
            technicians={technicians}
            user={user!}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Services Count and Summary */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
          <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-medium text-gray-700">
            Showing {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceList;
