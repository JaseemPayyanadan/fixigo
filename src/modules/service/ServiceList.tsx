import React from "react";
import type { Branch } from "../../types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon, TrashIcon, CurrencyDollarIcon, CubeIcon } from "@heroicons/react/24/outline";

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
  device?: {
    type: string;
    brand: string;
    model: string;
    serial: string;
  };
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

interface ServiceListProps {
  services: Service[];
  branches: Branch[];
  loading: boolean;
  search?: string;
  onEdit?: (service: Service) => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; progress: number }> = {
  "To Do": { label: "To Do", color: "bg-gray-100 text-gray-700", progress: 0 },
  "In Progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-700", progress: 1 },
  "Awaiting Parts": { label: "Awaiting Parts", color: "bg-blue-100 text-blue-700", progress: 1 },
  "On Hold": { label: "On Hold", color: "bg-orange-100 text-orange-700", progress: 1 },
  "Ready for Pickup": { label: "Ready for Pickup", color: "bg-purple-100 text-purple-700", progress: 2 },
  Completed: { label: "Completed", color: "bg-green-100 text-green-700", progress: 3 },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", progress: 0 },
  Pending: { label: "Pending", color: "bg-gray-100 text-gray-700", progress: 0 },
};

const ServiceList: React.FC<ServiceListProps> = ({ services, loading, search, onEdit, onDelete }) => {
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
          s.customer?.name?.toLowerCase().includes(q)
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
              <div className="bg-gray-200 rounded-lg h-40"></div>
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
          {search ? `No services match "${search}"` : "Get started by creating your first service"}
        </p>
        {!search && (
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create First Service
          </Link>
        )}
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
                        <div className="text-xs text-gray-500">ID Service</div>
                        <div className="font-bold text-gray-900">#{service.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-2">
                    <div>
                      {/* <div className="text-xs text-gray-500">Service</div> */}
                      <div className="font-medium text-gray-900 truncate">{service.name}</div>
                      <div className="font-normal text-sm text-gray-600 truncate">{service.description}</div>
                    </div>

                    
                    {service.device && (
                      <div>
                        {/* <div className="text-xs text-gray-500">Device</div> */}
                        <div className="font-medium text-gray-900 truncate">{service.device.brand} {service.device.model}</div>
                      </div>
                    )}
                    
                    {service.customer && (
                      <div>
                        {/* <div className="text-xs text-gray-500">Customer</div> */}
                        <div className="font-medium text-gray-900 truncate">{service.customer.name}</div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {date ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "-"}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-gray-900">
                                              <CurrencyDollarIcon className="w-3 h-3" />
                      {service.price?.toLocaleString()}
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

export default ServiceList; 