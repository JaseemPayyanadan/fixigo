import React from 'react';

import type { Service, Technician } from '@/types';

// Status configuration with improved accessibility
export const SERVICE_STATUS_CONFIG = {
  pending: { 
    label: "Pending", 
    color: "bg-gray-100 text-gray-800",
    description: "Service is waiting to be started"
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-blue-100 text-blue-800",
    description: "Service is currently being worked on"
  },
  completed: { 
    label: "Completed", 
    color: "bg-green-100 text-green-800",
    description: "Service has been finished successfully"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-100 text-red-800",
    description: "Service has been cancelled"
  },
  on_hold: { 
    label: "On Hold", 
    color: "bg-orange-100 text-orange-800",
    description: "Service is temporarily paused"
  },
  awaiting_parts: { 
    label: "Awaiting Parts", 
    color: "bg-purple-100 text-purple-800",
    description: "Waiting for required parts to arrive"
  },
  ready_for_pickup: { 
    label: "Ready for Pickup", 
    color: "bg-indigo-100 text-indigo-800",
    description: "Service is complete and ready for customer pickup"
  },
  quality_check: { 
    label: "Quality Check", 
    color: "bg-pink-100 text-pink-800",
    description: "Service is undergoing final quality inspection"
  }
} as const;

// Priority configuration
export const SERVICE_PRIORITY_CONFIG = {
  low: { 
    label: "Low", 
    color: "bg-green-100 text-green-800",
    description: "Low priority service"
  },
  medium: { 
    label: "Medium", 
    color: "bg-yellow-100 text-yellow-800",
    description: "Medium priority service"
  },
  high: { 
    label: "High", 
    color: "bg-orange-100 text-orange-800",
    description: "High priority service"
  },
  urgent: { 
    label: "Urgent", 
    color: "bg-red-100 text-red-800",
    description: "Urgent service requiring immediate attention"
  }
} as const;

// Get status configuration with fallback
export const getServiceStatusConfig = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return SERVICE_STATUS_CONFIG[normalizedStatus as keyof typeof SERVICE_STATUS_CONFIG] || 
         SERVICE_STATUS_CONFIG.pending;
};

// Get priority configuration with fallback
export const getServicePriorityConfig = (priority: string) => {
  const normalizedPriority = priority.toLowerCase();
  return SERVICE_PRIORITY_CONFIG[normalizedPriority as keyof typeof SERVICE_PRIORITY_CONFIG] || 
         SERVICE_PRIORITY_CONFIG.medium;
};

// Get technician name from technician ID
export const getTechnicianName = (technicianId: string, technicians: Technician[]): string => {
  if (!technicianId || !technicians || technicians.length === 0) {
    return `Tech #${technicianId?.slice(-8) || 'Unknown'}`;
  }
  
  const technician = technicians.find(tech => tech.id === technicianId);
  return technician ? technician.name : `Tech #${technicianId.slice(-8)}`;
};

// Get technician display info (name and phone)
export const getTechnicianDisplayInfo = (technicianId: string, technicians: Technician[]): { name: string; phone?: string } => {
  if (!technicianId || !technicians || technicians.length === 0) {
    return { name: `Tech #${technicianId?.slice(-8) || 'Unknown'}` };
  }
  
  const technician = technicians.find(tech => tech.id === technicianId);
  return technician ? { name: technician.name, phone: technician.phone } : { name: `Tech #${technicianId.slice(-8)}` };
};

// Format currency with proper locale and error handling
export const formatServicePrice = (price: number, currency = 'USD'): string => {
  if (isNaN(price) || !isFinite(price)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

// Format service duration
export const formatServiceDuration = (minutes: number): string => {
  if (isNaN(minutes) || minutes < 0) {
    return '0 min';
  }
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

// Get service age (how long ago it was created)
export const getServiceAge = (createdAt: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - createdAt.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
};

// Filter services by search term
export const filterServicesBySearch = (services: Service[], search: string): Service[] => {
  if (!search.trim()) return services;
  
  const searchTerm = search.toLowerCase().trim();
  
  return services.filter(service => {
    return (
      service.name?.toLowerCase().includes(searchTerm) ||
      service.description?.toLowerCase().includes(searchTerm) ||
      service.device?.brand?.toLowerCase().includes(searchTerm) ||
      service.device?.model?.toLowerCase().includes(searchTerm) ||
      service.device?.imei?.toLowerCase().includes(searchTerm) ||
      service.customer?.name?.toLowerCase().includes(searchTerm) ||
      service.customer?.phone?.toLowerCase().includes(searchTerm) ||
      service.customer?.email?.toLowerCase().includes(searchTerm)
    );
  });
};

// Sort services by field and direction
export const sortServices = (
  services: Service[], 
  field: keyof Service, 
  direction: 'asc' | 'desc'
): Service[] => {
  return [...services].sort((a, b) => {
    let aValue = a[field];
    let bValue = b[field];
    
    // Handle date fields
    if (field === 'createdAt' || field === 'updatedAt') {
      aValue = aValue instanceof Date ? aValue.getTime() : 0;
      bValue = bValue instanceof Date ? bValue.getTime() : 0;
    }
    
    // Handle string fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    // Handle number fields
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }
    
    return 0;
  });
};

// Loading state component for services
export const ServiceLoadingState: React.FC<{ 
  message?: string;
  className?: string;
}> = ({ 
  message = "Loading services...",
  className = ""
}) => (
  <div className={`text-center py-12 ${className}`} role="status" aria-live="polite">
    <div className="animate-spin rounded-full border-b-2 border-blue-600 mx-auto h-8 w-8" aria-hidden="true" />
    <p className="mt-4 text-gray-600">{message}</p>
  </div>
);

// Error state component for services
export const ServiceErrorState: React.FC<{ 
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ 
  message, 
  onRetry,
  className = ""
}) => (
  <div className={`text-center py-12 ${className}`} role="alert">
    <div className="text-red-500 mb-4" aria-hidden="true">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Services</h3>
    <p className="text-sm text-gray-500 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Empty state component for services
export const ServiceEmptyState: React.FC<{ 
  search?: string;
  onCreateNew?: () => void;
  className?: string;
}> = ({ 
  search,
  onCreateNew,
  className = ""
}) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
    <p className="text-gray-500 mb-4">
      {search ? `No services match "${search}"` : "Get started by creating your first service"}
    </p>
    {!search && onCreateNew && (
      <button
        onClick={onCreateNew}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create First Service
      </button>
    )}
  </div>
);

// Service card skeleton component for loading states
export const ServiceCardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse ${className}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </div>
    
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
    
    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
      <div className="h-3 bg-gray-200 rounded w-12"></div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
);

// Service list skeleton component
export const ServiceListSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 6, 
  className = "" 
}) => (
  <div className={`p-4 ${className}`}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
