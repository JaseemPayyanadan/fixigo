"use client";
import React from 'react';
import Link from 'next/link';

import {  
  UserIcon, 
  ClockIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  PauseIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

import { Button, LoadingSpinner } from '@/components/ui';
import { normalizeStatus } from '@/lib/statusUtils';

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
  user?: any;
  onEdit?: (service: ServiceListItem) => void;
  onDelete?: (id: string) => void;
}

// Status badge configuration with chip-style design
const getStatusBadgeConfig = (status: string) => {
  const statusMap: Record<string, { 
    label: string; 
    color: string; 
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
  }> = {
    "Completed": {
      label: "Completed",
      color: "text-green-700",
      icon: CheckCircleIcon,
      bgColor: "bg-green-50"
    },
    "In Progress": {
      label: "In Progress",
      color: "text-blue-700",
      icon: ExclamationTriangleIcon,
      bgColor: "bg-blue-50"
    },
    "To Do": {
      label: "To Do",
      color: "text-blue-700",
      icon: ClipboardDocumentListIcon,
      bgColor: "bg-blue-50"
    },
    "Pending": {
      label: "Pending",
      color: "text-orange-700",
      icon: PauseIcon,
      bgColor: "bg-orange-50"
    },
    "Awaiting Parts": {
      label: "Awaiting Parts",
      color: "text-orange-700",
      icon: ClockIcon,
      bgColor: "bg-orange-50"
    },
    "Ready for Pickup": {
      label: "Ready for Pickup",
      color: "text-cyan-700",
      icon: CheckCircleIcon,
      bgColor: "bg-cyan-50"
    },
    "Cancelled": {
      label: "Cancelled",
      color: "text-red-700",
      icon: NoSymbolIcon,
      bgColor: "bg-red-50"
    },
    "Urgent": {
      label: "Urgent",
      color: "text-red-700",
      icon: ExclamationTriangleIcon,
      bgColor: "bg-red-50"
    }
  };

  // Map internal status values to display values
  const normalizedStatus = normalizeStatus(status);
  
  // Map normalized status to display status
  const statusDisplayMap: Record<string, string> = {
    'pending': 'Pending',
    'to_do': 'To Do',
    'in_progress': 'In Progress',
    'awaiting_parts': 'Awaiting Parts',
    'ready_for_pickup': 'Ready for Pickup',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'urgent': 'Urgent',
    'on_hold': 'On Hold',
    'quality_check': 'Quality Check'
  };
  
  const displayStatus = statusDisplayMap[normalizedStatus] || 'To Do';

  return statusMap[displayStatus] || statusMap["To Do"];
};

// Single Service Card Component (Responsive)
const ServiceCard: React.FC<{
  service: ServiceListItem;
  branches: Branch[];
  technicians: Technician[];
  user: any;
  onEdit?: (service: ServiceListItem) => void;
  onDelete?: (id: string) => void;
}> = ({ service, branches, technicians, user, onEdit, onDelete }) => {
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
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.bgColor} ${statusBadge.color}`}>
              {statusBadge.label}
            </div>
          </div>
        </div>

        {/* Middle - Service Issue/Summary */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
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
          {/* Device Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <DevicePhoneMobileIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {service.device?.brand} {service.device?.model}
                </p>
                <p className="text-gray-600 text-xs truncate">
                  IMEI: {service.device?.imei || "N/A"}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {service.customer?.name || "Unknown Customer"}
                </p>
                <p className="text-gray-600 text-xs truncate">
                  {service.customer?.phone || "No phone"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Date and Amount */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>{service.createdAt ? new Date(service.createdAt).toLocaleDateString() : "N/A"}</span>
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(service.price || 0)}
              </p>
            </div>
          </div>
        </div>


      </div>
    </Link>
  );
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

  // Empty state
  if (filteredServices.length === 0) {
    console.log("📭 No services found:", {
      totalServices: services?.length || 0,
      filteredServices: filteredServices?.length || 0,
      search,
      userRole: user?.role,
      userBranchId: user?.branchId
    });
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
          {search ? `No services match "${search}"` : "No services available for this technician"}
        </p>
        {!search && (
            <div className="text-sm text-gray-500">
            <p>Services will appear here when:</p>
            <p>• You are assigned to services in your branch</p>
            <p>• You create new services in your branch</p>
            <p>• Services are created in your assigned branch</p>
          </div>
        )}
        </div>
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
    <div className="space-y-6">
      {/* Responsive Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredServices.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            branches={branches}
            technicians={technicians}
            user={user}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
                
      {/* Services Count and Summary */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
          <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-medium text-gray-700">
            Showing {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
          </p>
            </div>
      </div>
    </div>
  );
};

export default TechnicianServiceList;
