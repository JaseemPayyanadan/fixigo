"use client";
import React, { useMemo, useCallback } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";

import type { ServiceListProps } from "../types";
import { 
  filterServices, 
  sortServices, 
  getServiceDisplayInfo, 
  getServiceActions,
  canAccessService 
} from "../utils";

interface BaseServiceListProps extends ServiceListProps {
  children?: React.ReactNode;
  customFilters?: React.ReactNode;
  customActions?: (service: any) => React.ReactNode;
}

const BaseServiceList: React.FC<BaseServiceListProps> = ({ 
  services, 
  branches, 
  technicians,
  loading, 
  error,
  search, 
  user,
  onEdit, 
  onDelete,
  onRetry,
  children,
  customFilters,
  customActions
}) => {
  const router = useRouter();
  
  // Filter and sort services based on user role and permissions
  const filteredServices = useMemo(() => {
    if (!user) return [];
    
    let accessibleServices = services.filter(service => canAccessService(service, user));
    
    // Apply search filter
    if (search) {
      accessibleServices = filterServices(accessibleServices, { search });
    }
    
    // Sort by creation date (newest first)
    return sortServices(accessibleServices, 'createdAt', 'desc');
  }, [services, user, search]);

  // Memoized navigation handler
  const handleServiceClick = useCallback((serviceId: string) => {
    router.push(`/services/details?id=${serviceId}`);
  }, [router]);

  // Memoized edit handler
  const handleEdit = useCallback((service: any, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(service);
  }, [onEdit]);

  // Memoized delete handler
  const handleDelete = useCallback((serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this service?")) {
      onDelete?.(serviceId);
    }
  }, [onDelete]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-800 text-sm">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (filteredServices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
        <p className="text-gray-500">
          {search ? `No services match "${search}"` : "No services available yet."}
        </p>
        {!search && (
          <div className="mt-6">
            <Link
              href="/services/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Create Service
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Filters */}
      {customFilters}
      
      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const displayInfo = getServiceDisplayInfo(service, branches, technicians);
          const actions = user ? getServiceActions(service, user) : {
            canEdit: false,
            canDelete: false,
            canAssign: false,
            canUpdateStatus: false,
            canViewDetails: true
          };
          
          return (
            <div key={service.id} className="group relative">
              <div 
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleServiceClick(service.id)}
              >
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${displayInfo.statusColor}`}>
                    <displayInfo.statusIcon className="w-3 h-3 mr-1" />
                    {service.status}
                  </span>
                </div>

                {/* Service Information */}
                <div className="mt-8 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {service.description}
                    </p>
                  </div>

                  {/* Device Information */}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600">D</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 font-medium mb-1">Device</div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {service.device.brand} {service.device.model}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">IMEI: {service.device.imei}</div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <UserIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-600 font-medium mb-1">Customer</div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {service.customer.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service.customer.phone}
                      </div>
                    </div>
                  </div>

                  {/* Branch Information */}
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <BuildingOfficeIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-purple-600 font-medium mb-1">Branch</div>
                      <div className="font-semibold text-gray-900 text-sm">{displayInfo.branchName}</div>
                    </div>
                  </div>

                  {/* Technician Assignment */}
                  {service.assignedTechnicianId && (
                    <div className="flex items-start gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <UserIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-600 font-medium">
                          Assigned to {displayInfo.technicianName}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ClockIcon className="w-3 h-3" />
                    {displayInfo.age}
                  </div>
                  <div className="flex items-center gap-1 font-bold text-gray-900 text-lg">
                    <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                    {displayInfo.formattedPrice}
                  </div>
                </div>
                
                {/* Click indicator - shows on hover */}
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 shadow-sm">
                    Click to view details
                  </div>
                </div>
              </div>

              {/* Quick Actions - Hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                <div className="flex gap-1.5">
                  {actions.canViewDetails && (
                    <Link
                      href={`/services/details?id=${service.id}`}
                      className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                      title="View Details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EyeIcon className="w-4 h-4 text-gray-600" />
                    </Link>
                  )}
                  
                  {actions.canEdit && onEdit && (
                    <button
                      onClick={(e) => handleEdit(service, e)}
                      className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                      title="Edit Service"
                    >
                      <PencilIcon className="w-4 h-4 text-purple-600" />
                    </button>
                  )}
                  
                  {actions.canDelete && onDelete && (
                    <button
                      onClick={(e) => handleDelete(service.id, e)}
                      className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                      title="Delete Service"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                  
                  {/* Custom Actions */}
                  {customActions && customActions(service)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role-specific children */}
      {children}
    </div>
  );
};

export default BaseServiceList;
