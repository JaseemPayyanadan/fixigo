"use client";
import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CubeIcon, 
  CurrencyDollarIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import type { Technician } from "@/types";

interface ServiceListItem {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  customer: {
    name: string;
    phone: string;
  };
  device: {
    brand: string;
    model: string;
    imei: string;
  };
  branchId: string;
  technician_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager_id?: string;
}

interface BranchAdminServiceListProps {
  services: ServiceListItem[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  search?: string;
  onEdit?: (service: ServiceListItem) => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "To Do": { 
    label: "To Do", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "In Progress": { 
    label: "In Progress", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <ExclamationTriangleIcon className="w-3 h-3" />
  },
  "Awaiting Parts": { 
    label: "Awaiting Parts", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <CubeIcon className="w-3 h-3" />
  },
  "On Hold": { 
    label: "On Hold", 
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <ExclamationTriangleIcon className="w-3 h-3" />
  },
  "Ready for Pickup": { 
    label: "Ready for Pickup", 
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <CheckCircleIcon className="w-3 h-3" />
  },
  "Completed": { 
    label: "Completed", 
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircleIcon className="w-3 h-3" />
  },
  "Cancelled": { 
    label: "Cancelled", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <TrashIcon className="w-3 h-3" />
  },
  "Pending": { 
    label: "Pending", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <ClockIcon className="w-3 h-3" />
  }
};

const BranchAdminServiceList: React.FC<BranchAdminServiceListProps> = ({ 
  services, 
  technicians,
  loading, 
  search, 
  onEdit, 
  onDelete 
}) => {
  const router = useRouter();
  
  // Memoized filtered services for better performance
  const filteredServices = useMemo(() => {
    if (!search) return services;
    
    const searchTerm = search.toLowerCase();
    return services.filter(service => {
      return (
        service.name?.toLowerCase().includes(searchTerm) ||
        service.description?.toLowerCase().includes(searchTerm) ||
        service.device?.model?.toLowerCase().includes(searchTerm) ||
        service.device?.brand?.toLowerCase().includes(searchTerm) ||
        service.device?.imei?.toLowerCase().includes(searchTerm) ||
        service.customer?.name?.toLowerCase().includes(searchTerm) ||
        service.customer?.phone?.toLowerCase().includes(searchTerm)
      );
    });
  }, [services, search]);

  // Memoized technician lookup for better performance
  const technicianMap = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string }>();
    technicians.forEach(tech => {
      map.set(tech.id, { name: tech.name, phone: tech.phone });
    });
    return map;
  }, [technicians]);

  // Optimized technician info getter
  const getTechnicianInfo = useCallback((technicianId: string) => {
    return technicianMap.get(technicianId);
  }, [technicianMap]);

  // Optimized date formatter
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString(undefined, { 
      day: "numeric", 
      month: "short",
      year: "numeric"
    });
  }, []);

  // Optimized price formatter
  const formatPrice = useCallback((price: number) => {
    return `₹${price.toLocaleString()}`;
  }, []);

  // Loading skeleton with improved design
  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-64">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Improved empty state
  if (filteredServices.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CubeIcon className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No services found</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {search ? `No services match "${search}". Try adjusting your search terms.` : "No services have been assigned to this branch yet."}
        </p>
        {!search && (
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <CubeIcon className="w-5 h-5" />
            Create New Service
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          const date = service.createdAt ? new Date(service.createdAt) : null;
          const status = service.status || "To Do";
          const statusInfo = statusConfig[status] || statusConfig["To Do"];
          const technicianInfo = service.technician_id ? getTechnicianInfo(service.technician_id) : null;
          
          return (
            <div key={service.id} className="group relative">
              <div 
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300 overflow-hidden cursor-pointer select-none transform hover:-translate-y-1"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.action-button')) {
                    return;
                  }
                  router.push(`/services/details?id=${service.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/services/details?id=${service.id}`);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View details for service ${service.name}`}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                        <CubeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">Service ID</div>
                        <div className="font-bold text-gray-900 text-sm">#{service.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.color} flex items-center gap-1`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-4">
                    {/* Service Name & Description */}
                    <div>
                      <div className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">{service.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{service.description}</div>
                    </div>

                    {/* Device Information */}
                    {service.device && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <DevicePhoneMobileIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{service.device.brand} {service.device.model}</div>
                          <div className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded mt-1 inline-block">IMEI: {service.device.imei}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Customer Information */}
                    {service.customer && (
                      <div className="flex items-start gap-3">
                        <UserIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{service.customer.name}</div>
                          {service.customer.phone && (
                            <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                              <span className="text-green-600">📞</span>
                              {service.customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technician Assignment */}
                    {technicianInfo && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <UserIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-green-600 font-medium mb-1">Assigned Technician</div>
                          <div className="font-semibold text-gray-900 text-sm">{technicianInfo.name}</div>
                          {technicianInfo.phone && (
                            <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                              <span className="text-green-600">📞</span>
                              {technicianInfo.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      {date ? formatDate(date) : "-"}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-gray-900 text-lg">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                      {formatPrice(service.price)}
                    </div>
                  </div>
                  
                  {/* Click indicator - shows on hover */}
                  <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                      Click to view details
                    </div>
                  </div>
                </div>

                {/* Quick Actions - Hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                  <div className="flex gap-1.5">
                    <Link
                      href={`/services/details?id=${service.id}`}
                      className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                      title="View Details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EyeIcon className="w-4 h-4 text-gray-600" />
                    </Link>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(service);
                        }}
                        className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                        title="Edit Service"
                      >
                        <PencilIcon className="w-4 h-4 text-green-600" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this service?")) {
                            onDelete(service.id);
                          }
                        }}
                        className="action-button p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:shadow-xl"
                        title="Delete Service"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BranchAdminServiceList;
