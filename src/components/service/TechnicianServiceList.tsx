"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CubeIcon, 
  BuildingOfficeIcon, 
  CurrencyDollarIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { getTechnicianDisplayInfo } from "./shared/ServiceUtils";
import type { Technician } from "@/types";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  shop_id: string;
  branch_id: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: string;
  status?: string;
  technician_id?: string;
  device?: {
    brand: string;
    model: string;
    serial: string;
    color: string;
    // Legacy field - will be ignored in UI
    type?: string;
  };
  customer?: {
    name: string;
    phone?: string;
    place?: string;
    // Legacy field - will be mapped to place
    email?: string;
  };
}

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager_id?: string;
}

interface TechnicianServiceListProps {
  services: Service[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  search?: string;
  onEdit?: (service: Service) => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; priority: string }> = {
  "To Do": { label: "To Do", color: "bg-gray-100 text-gray-800", priority: "low" },
  "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-800", priority: "medium" },
  "Awaiting Parts": { label: "Awaiting Parts", color: "bg-yellow-100 text-yellow-800", priority: "medium" },
  "On Hold": { label: "On Hold", color: "bg-orange-100 text-orange-800", priority: "high" },
  "Ready for Pickup": { label: "Ready for Pickup", color: "bg-purple-100 text-purple-800", priority: "low" },
  "Completed": { label: "Completed", color: "bg-green-100 text-green-800", priority: "completed" },
  "Cancelled": { label: "Cancelled", color: "bg-red-100 text-red-800", priority: "low" },
  "Pending": { label: "Pending", color: "bg-gray-100 text-gray-800", priority: "low" }
};

const TechnicianServiceList: React.FC<TechnicianServiceListProps> = ({ 
  services, 
  branches, 
  technicians,
  loading, 
  search, 
  onEdit, 
  onDelete 
}) => {
  const router = useRouter();
  
  // Filter services by search
  const filtered = search
    ? services.filter(s => {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.device?.model?.toLowerCase().includes(q) ||
          s.device?.brand?.toLowerCase().includes(q) ||
          s.customer?.name?.toLowerCase().includes(q) ||
          s.customer?.phone?.toLowerCase().includes(q) ||
          s.customer?.place?.toLowerCase().includes(q)
        );
      })
    : services;

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
        <p className="text-gray-500 mb-4">
          {search ? `No services match "${search}"` : "No services assigned to you yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => {
          const date = service.createdAt ? new Date(service.createdAt) : null;
          const status = service.status || "To Do";
          const statusInfo = statusConfig[status] || statusConfig["To Do"];
          const technicianInfo = service.technician_id ? getTechnicianDisplayInfo(service.technician_id, technicians) : null;
          
          return (
            <div key={service.id} className="group relative">
              <div 
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 overflow-hidden cursor-pointer select-none"
                onClick={(e) => {
                  // Don't navigate if clicking on action buttons
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                tabIndex={0}
                role="button"
                aria-label={`View details for service ${service.name}`}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CubeIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Service ID</div>
                        <div className="font-bold text-gray-900">#{service.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-3">
                    {/* Service Name & Description */}
                    <div>
                      <div className="font-semibold text-gray-900 truncate">{service.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{service.description}</div>
                    </div>

                    {/* Device Information - Technician Focus */}
                    {service.device && (
                      <div className="flex items-center gap-2 text-sm">
                        <DevicePhoneMobileIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-900">{service.device.brand} {service.device.model}</div>
                          <div className="text-xs text-gray-500">IMEI: {service.device.serial}</div>
                          {service.device.color && (
                            <div className="text-xs text-gray-500">Color: {service.device.color}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Customer Information - Technician Focus */}
                    {service.customer && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-900">{service.customer.name}</div>
                          {service.customer.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3" />
                              {service.customer.phone}
                            </div>
                          )}
                          {service.customer.place && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {service.customer.place}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Priority - Technician specific */}
                    <div className="flex items-center gap-2 text-sm">
                      {statusInfo.priority === "high" ? (
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      ) : statusInfo.priority === "completed" ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <div className="text-xs text-gray-500">Status Priority</div>
                        <div className={`font-medium capitalize ${
                          statusInfo.priority === "high" ? "text-red-600" :
                          statusInfo.priority === "completed" ? "text-green-600" :
                          "text-gray-900"
                        }`}>
                          {statusInfo.priority === "high" ? "High Priority" :
                           statusInfo.priority === "completed" ? "Completed" :
                           statusInfo.priority === "medium" ? "Medium Priority" :
                           "Low Priority"}
                        </div>
                      </div>
                    </div>

                    {/* Created By Information */}
                    {service.created_by && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-500">Created by</div>
                          <div className="font-medium text-gray-900">{service.created_by.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{service.created_by.role}</div>
                        </div>
                      </div>
                    )}

                    {/* Technician Assignment - Show assigned technician name */}
                    {technicianInfo && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-500">Assigned to</div>
                          <div className="font-medium text-gray-900">{technicianInfo.name}</div>
                          {technicianInfo.phone && (
                            <div className="text-xs text-gray-500">📞 {technicianInfo.phone}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      {date ? date.toLocaleDateString(undefined, { 
                        day: "numeric", 
                        month: "short",
                        year: "numeric"
                      }) : "-"}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-gray-900">
                      <CurrencyDollarIcon className="w-3 h-3" />
                      ₹{service.price?.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Click indicator - shows on hover */}
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                      Click to view details
                    </div>
                  </div>
                </div>

                {/* Quick Actions - Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="flex gap-1">
                    <Link
                      href={`/services/details?id=${service.id}`}
                      className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-200"
                      title="View Details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EyeIcon className="w-3 h-3 text-gray-600" />
                    </Link>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(service);
                        }}
                        className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-200"
                        title="Edit Service"
                      >
                        <PencilIcon className="w-3 h-3 text-blue-600" />
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
                        className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-200"
                        title="Delete Service"
                      >
                        <TrashIcon className="w-3 h-3 text-red-600" />
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

export default TechnicianServiceList;
