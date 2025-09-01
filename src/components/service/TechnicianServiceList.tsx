"use client";
import React from 'react';

import Link from 'next/link';

import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  UserIcon, 
  BuildingOfficeIcon, 
  ClockIcon
} from '@heroicons/react/24/outline';

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

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  shopId: string;
  branchId: string;
  userId?: string;
  created_by?: string;
  skills: string[];
  status: string;
  bio?: string;
  specializations?: string[];
  experience?: number;
  rating?: number;
  totalServices?: number;
  completedServices?: number;
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface TechnicianServiceListProps {
  services: ServiceListItem[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  search?: string;
  user?: any; // Add user prop for technician context
  onEdit?: (service: ServiceListItem) => void;
  onDelete?: (id: string) => void;
}

// Utility function to format price
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Utility function to format date
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Status configuration
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "To Do": { 
    label: "To Do", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "In Progress": { 
    label: "In Progress", 
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "Awaiting Parts": { 
 
    label: "Awaiting Parts", 
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "Ready for Pickup": { 
    label: "Ready for Pickup", 
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "Completed": { 
    label: "Completed", 
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "Cancelled": { 
    label: "Cancelled", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <ClockIcon className="w-3 h-3" />
  },
  "Pending": { 
    label: "Pending", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <ClockIcon className="w-3 h-3" />
  }
};

// Utility function to get status color
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'in progress':
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'pending':
    case 'to do':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'awaiting parts':
    case 'awaiting_parts':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ready for pickup':
    case 'ready_for_pickup':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const TechnicianServiceList: React.FC<TechnicianServiceListProps> = ({ 
  services, 
  branches, 
  technicians,
  loading, 
  search, 
  user,
  onEdit, 
  onDelete 
}) => {
  // Console logging for debugging
  console.log("🔍 TechnicianServiceList Debug Info:", {
    user: {
      id: user?.id,
      role: user?.role,
      branchId: user?.branchId,
      shopId: user?.shopId
    },
    services: {
      total: services?.length || 0,
      sample: services?.slice(0, 2) || []
    },
    branches: {
      total: branches?.length || 0,
      sample: branches?.slice(0, 2) || []
    },
    loading,
    search
  });

  // Filter services based on search
  const filteredServices = React.useMemo(() => {
    console.log("🔍 Filtering services:", {
      totalServices: services?.length || 0,
      searchTerm: search,
      userRole: user?.role,
      userBranchId: user?.branchId
    });

    if (!search) {
      console.log("📋 No search term, returning all services");
      return services;
    }
    
    const filtered = services.filter(service => 
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase()) ||
      service.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      service.customer.phone.includes(search) ||
      service.device.brand.toLowerCase().includes(search.toLowerCase()) ||
      service.device.model.toLowerCase().includes(search.toLowerCase()) ||
      service.device.imei.includes(search)
    );
    
    console.log("🔍 Search filtering results:", {
      originalCount: services?.length || 0,
      filteredCount: filtered.length,
      searchTerm: search
    });
    
    return filtered;
  }, [services, search, user?.role, user?.branchId]);

  // Get branch name by ID
  const getBranchName = (branchId: string): string => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown Branch';
  };

  // Get technician info by ID
  const getTechnicianInfo = (technicianId: string): Technician | null => {
    return technicians.find(tech => tech.id === technicianId) || null;
  };

  if (loading) {
    console.log("⏳ Showing loading state:", { loading });
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredServices.length === 0) {
    console.log("📭 No services found:", {
      totalServices: services?.length || 0,
      filteredServices: filteredServices?.length || 0,
      search,
      userRole: user?.role,
      userBranchId: user?.branchId
    });
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
        <p className="text-gray-500 mb-4">
          {search ? `No services match "${search}"` : "No services available for this technician"}
        </p>
        {!search && (
          <div className="text-sm text-gray-400 space-y-1">
            <p>Services will appear here when:</p>
            <p>• You are assigned to services in your branch</p>
            <p>• You create new services in your branch</p>
            <p>• Services are created in your assigned branch</p>
          </div>
        )}
      </div>
    );
  }

  console.log("🎯 Rendering services:", {
    totalServices: services?.length || 0,
    filteredServices: filteredServices?.length || 0,
    userRole: user?.role,
    userBranchId: user?.branchId
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const date = service.createdAt ? new Date(service.createdAt) : null;
          
          // Map internal status values to display values
          let displayStatus = service.status;
          if (service.status === "pending") displayStatus = "To Do";
          else if (service.status === "in_progress") displayStatus = "In Progress";
          else if (service.status === "awaiting_parts") displayStatus = "Awaiting Parts";
          else if (service.status === "ready_for_pickup") displayStatus = "Ready for Pickup";
          
          const status = displayStatus || "To Do";
          const statusInfo = statusConfig[status] || statusConfig["To Do"];
          const branchName = getBranchName(service.branchId);
          const technicianInfo = service.technician_id ? getTechnicianInfo(service.technician_id) : null;
          
          console.log("🔧 Rendering service:", {
            id: service.id,
            name: service.name,
            branchId: service.branchId,
            branchName,
            technician_id: service.technician_id,
            userBranchId: user?.branchId,
            status: service.status
          });
          
          return (
            <div key={service.id} className="group relative">
              <div 
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-300 cursor-pointer relative overflow-hidden select-none transform hover:-translate-y-1"
                role="button"
                tabIndex={0}
                aria-label={`View details for service ${service.name}`}
                onClick={() => window.location.href = `/services/details?id=${service.id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.location.href = `/services/details?id=${service.id}`;
                  }
                }}
              >
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>

                {/* Service Information */}
                <div className="mt-8 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Customer Information (First) */}
                  {service.customer && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <UserIcon className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-green-600 font-medium mb-1">Customer</div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {service.customer.name}
                        </div>
                        {service.customer.phone && (
                          <div className="text-xs text-gray-500">
                            {service.customer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Device Details (Second) */}
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

                  {/* Assigned Branch */}
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <BuildingOfficeIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-purple-600 font-medium mb-1">Assigned Branch</div>
                      <div className="font-semibold text-gray-900 text-sm">{branchName}</div>
                    </div>
                  </div>

                  {/* Service Assignment Status */}
                  {service.technician_id && (
                    <div className="flex items-start gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <UserIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-blue-600 font-medium">
                          {service.technician_id === user?.id || service.technician_id === user?.uid ? "Assigned to You" : "Assigned to Another Technician"}
                        </div>
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
                    {formatPrice(service.price)}
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
                      <PencilIcon className="w-4 h-4 text-purple-600" />
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
          );
        })}
      </div>
    </div>
  );
};

export default TechnicianServiceList;
