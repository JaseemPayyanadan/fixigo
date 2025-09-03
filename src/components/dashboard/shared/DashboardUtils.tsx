import React from 'react';

import { normalizeStatus } from '@/lib/statusUtils';
import { Service } from '@/types';

// Status color mapping for consistent styling across dashboard components
export const STATUS_COLORS = {
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-800' },
  pending: { bg: 'bg-blue-100', text: 'text-blue-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
  awaiting_parts: { bg: 'bg-orange-100', text: 'text-orange-800' },
  ready_for_pickup: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  quality_check: { bg: 'bg-indigo-100', text: 'text-indigo-800' }
} as const;

// Get status color based on service status
export const getStatusColor = (status: string): { bg: string; text: string } => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[normalizedStatus as keyof typeof STATUS_COLORS] || 
         { bg: 'bg-gray-100', text: 'text-gray-800' };
};

// Format currency with proper locale
export const formatCurrency = (amount: number, currency = 'INR'): string => {
  if (isNaN(amount) || !isFinite(amount)) {
    return '₹0.00';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Extract timestamp seconds from Firestore timestamp with error handling
export const getTimestampSeconds = (timestamp: unknown): number => {
  if (!timestamp) return 0;
  
  try {
    if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
      return (timestamp as { seconds: number }).seconds;
    }
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    if (timestamp instanceof Date) {
      return Math.floor(timestamp.getTime() / 1000);
    }
    return 0;
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return 0;
  }
};

export interface DashboardMetrics {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  activeServices: number;
  totalCustomers: number;
}

// Calculate dashboard metrics from services data with performance optimization
export const calculateDashboardMetrics = (services: Service[] = []): {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  activeServices: number;
  totalCustomers: number;
} => {
  if (!services || services.length === 0) {
    return {
      totalServices: 0,
      pendingServices: 0,
      completedServices: 0,
      activeServices: 0,
      totalCustomers: 0
    };
  }

  // Use a single pass through the array for better performance
  const metrics = services.reduce((acc, service) => {
    acc.totalServices++;
    
    // Normalize status to handle both lowercase and display formats
    const normalizedStatus = normalizeStatus(service.status);
    
    switch (normalizedStatus) {
      case 'pending':
      case 'to_do':
        acc.pendingServices++;
        acc.activeServices++; // Include pending in active services
        break;
      case 'in_progress':
        acc.activeServices++;
        break;
      case 'awaiting_parts':
        acc.activeServices++; // Include awaiting parts in active services
        break;
      case 'quality_check':
        acc.activeServices++; // Include quality check in active services
        break;
      case 'ready_for_pickup':
        acc.activeServices++; // Include ready for pickup in active services
        break;
      case 'completed':
        acc.completedServices++;
        break;
      case 'cancelled':
        // Cancelled services are not counted in active or completed
        break;
      case 'on_hold':
        acc.activeServices++; // Include on hold in active services
        break;
      case 'urgent':
        acc.activeServices++; // Include urgent in active services
        break;
      default:
        // For unknown statuses, treat as pending
        acc.pendingServices++;
        acc.activeServices++;
        console.warn('Unknown service status in DashboardUtils:', service.status, 'for service:', service.id);
    }
    
    // Track unique customers
    if (service.customer?.name) {
      acc.customerNames.add(service.customer.name);
    }
    
    return acc;
  }, {
    totalServices: 0,
    pendingServices: 0,
    completedServices: 0,
    activeServices: 0,
    customerNames: new Set<string>()
  });

  return {
    totalServices: metrics.totalServices,
    pendingServices: metrics.pendingServices,
    completedServices: metrics.completedServices,
    activeServices: metrics.activeServices,
    totalCustomers: metrics.customerNames.size
  };
};

// Get recent services with proper sorting and error handling
export const getRecentServices = (services: Service[] = [], limit = 5): Service[] => {
  if (!services || services.length === 0) return [];
  
  try {
    const sorted = services.sort((a, b) => {
      const aTime = getTimestampSeconds(a.createdAt);
      const bTime = getTimestampSeconds(b.createdAt);
      return bTime - aTime;
    });
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error sorting recent services:', error);
    return services.slice(0, limit);
  }
};

// Format date for display with error handling
export const formatDate = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    return formatDate(dateObj);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

// Loading state component with improved accessibility
export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  text?: string;
  className?: string;
}> = ({ 
  size = 'md', 
  text = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`text-center py-12 ${className}`} role="status" aria-live="polite">
      <div 
        className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      <p className="mt-4 text-gray-600">{text}</p>
    </div>
  );
};

// Error state component with improved accessibility
export const ErrorState: React.FC<{ 
  message: string; 
  retry?: () => void;
  className?: string;
}> = ({ 
  message, 
  retry,
  className = ''
}) => (
  <div className={`text-center py-12 ${className}`} role="alert">
    <div className="text-red-500 mb-4" aria-hidden="true">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
    <p className="text-sm text-gray-500 mb-4">{message}</p>
    {retry && (
      <button
        onClick={retry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Utility to calculate percentage with error handling
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0 || isNaN(value) || isNaN(total)) {
    return 0;
  }
  return Math.round((value / total) * 100);
};

// Utility to format large numbers with K/M suffixes
export const formatNumber = (num: number): string => {
  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)  }M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)  }K`;
  }
  return num.toString();
};

// Utility to get priority color
export const getPriorityColor = (priority: string): { bg: string; text: string } => {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'high':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'medium':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'low':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};
