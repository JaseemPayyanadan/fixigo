import React, { useMemo, useCallback } from "react";
import type { Branch, Service, Technician } from "../../types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon, TrashIcon, CurrencyDollarIcon, CubeIcon } from "@heroicons/react/24/outline";
import { 
  filterServicesBySearch, 
  getServiceStatusConfig, 
  formatServicePrice, 
  getServiceAge,
  getTechnicianDisplayInfo,
  ServiceErrorState,
  ServiceEmptyState,
  ServiceListSkeleton
} from "../../components/service/shared/ServiceUtils";

interface ServiceListProps {
  services: Service[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  error?: string | null;
  search?: string;
  onEdit?: (service: Service) => void;
  onDelete?: (id: string) => void;
  onRetry?: () => void;
}

const ServiceList: React.FC<ServiceListProps> = ({ 
  services, 
  loading, 
  error,
  search, 
  technicians,
  onEdit, 
  onDelete,
  onRetry
}) => {
  const router = useRouter();
  
  // Memoized filtered services
  const filteredServices = useMemo(() => 
    filterServicesBySearch(services, search || ''),
    [services, search]
  );

  // Memoized navigation handler
  const handleServiceClick = useCallback((serviceId: string) => {
    router.push(`/services/details?id=${serviceId}`);
  }, [router]);

  // Memoized edit handler
  const handleEdit = useCallback((service: Service, e: React.MouseEvent) => {
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

  // Memoized keyboard navigation
  const handleKeyDown = useCallback((serviceId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleServiceClick(serviceId);
    }
  }, [handleServiceClick]);

  // Loading state
  if (loading) {
    return <ServiceListSkeleton count={6} />;
  }

  // Error state
  if (error) {
    return (
      <ServiceErrorState 
        message={error} 
        onRetry={onRetry}
        className="p-4"
      />
    );
  }

  // Empty state
  if (filteredServices.length === 0) {
    return (
      <ServiceEmptyState 
        search={search}
        onCreateNew={() => router.push('/services/new')}
        className="p-4"
      />
    );
  }

  return (
    <div className="p-4" role="region" aria-label="Services list">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const date = service.createdAt ? new Date(service.createdAt) : null;
          const status = service.status || "pending";
          const statusInfo = getServiceStatusConfig(status);
          const serviceAge = date ? getServiceAge(date) : null;
          const technicianInfo = service.assignedTechnicianId ? getTechnicianDisplayInfo(service.assignedTechnicianId, technicians) : null;
          
          return (
            <div key={service.id} className="group relative">
              <div 
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 overflow-hidden cursor-pointer select-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                onClick={() => handleServiceClick(service.id)}
                onKeyDown={(e) => handleKeyDown(service.id, e)}
                tabIndex={0}
                role="button"
                aria-label={`View details for service ${service.name}`}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
                        <CubeIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">ID Service</div>
                        <div className="font-bold text-gray-900">#{service.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div 
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                      title={statusInfo.description}
                    >
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-gray-900 truncate" title={service.name}>
                        {service.name}
                      </div>
                      <div className="font-normal text-sm text-gray-600 truncate" title={service.description}>
                        {service.description}
                      </div>
                    </div>

                    {service.device && (
                      <div>
                        <div className="font-medium text-gray-900 truncate" title={`${service.device.brand} ${service.device.model}`}>
                          {service.device.brand} {service.device.model}
                        </div>
                      </div>
                    )}
                    
                    {service.customer && (
                      <div>
                        <div className="font-medium text-gray-900 truncate" title={service.customer.name}>
                          {service.customer.name}
                        </div>
                      </div>
                    )}

                    {/* Technician Assignment */}
                    {technicianInfo && (
                      <div>
                        <div className="text-xs text-gray-500">Assigned to</div>
                        <div className="font-medium text-gray-900 truncate" title={technicianInfo.name}>
                          {technicianInfo.name}
                        </div>
                        {technicianInfo.phone && (
                          <div className="text-xs text-gray-500">📞 {technicianInfo.phone}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {serviceAge || "-"}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-gray-900">
                      <CurrencyDollarIcon className="w-3 h-3" aria-hidden="true" />
                      {formatServicePrice(service.price)}
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
                      className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors border border-gray-200"
                      title="View Details"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`View details for ${service.name}`}
                    >
                      <EyeIcon className="w-3 h-3 text-gray-600" />
                    </Link>
                    {onEdit && (
                      <button
                        onClick={(e) => handleEdit(service, e)}
                        className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors border border-gray-200"
                        title="Edit Service"
                        aria-label={`Edit ${service.name}`}
                      >
                        <PencilIcon className="w-3 h-3 text-blue-600" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => handleDelete(service.id, e)}
                        className="action-button p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors border border-gray-200"
                        title="Delete Service"
                        aria-label={`Delete ${service.name}`}
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