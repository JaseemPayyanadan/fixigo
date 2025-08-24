import React from "react";

import type { Branch, Service, Technician } from "@/types";
import type { ServiceStatus, ServicePriority } from "./types";

import { formatServicePrice, getServiceAge, getServicePriorityConfig, getServiceStatusConfig, getTechnicianDisplayInfo } from "./ServiceUtils";

// Service details loading state
export const ServiceDetailsLoadingState: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = "Loading service details...", className = "" }) => (
  <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Service details error state
export const ServiceDetailsErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({ message, onRetry, onGoBack, className = "" }) => (
  <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Service</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            Try Again
          </button>
        )}
        {onGoBack && (
          <button onClick={onGoBack} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
            Go Back
          </button>
        )}
      </div>
    </div>
  </div>
);

// Service status badge component
export const ServiceStatusBadge: React.FC<{
  status: ServiceStatus;
  className?: string;
}> = ({ status, className = "" }) => {
  const statusConfig = getServiceStatusConfig(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} ${className}`} title={statusConfig.description}>
      <div className="w-2 h-2 rounded-full bg-current opacity-75" />
      {statusConfig.label}
    </div>
  );
};

// Service priority badge component
export const ServicePriorityBadge: React.FC<{
  priority: ServicePriority;
  className?: string;
}> = ({ priority, className = "" }) => {
  const priorityConfig = getServicePriorityConfig(priority);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${priorityConfig.color} ${className}`} title={priorityConfig.description}>
      <div className="w-2 h-2 rounded-full bg-current opacity-75" />
      {priorityConfig.label}
    </div>
  );
};

// Service information card component
export const ServiceInfoCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

// Service details header component
export const ServiceDetailsHeader: React.FC<{
  service: Service;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}> = ({ service, onBack, onEdit, onDelete, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" aria-label="Go back">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <p className="text-gray-600">Service ID: #{service.id.slice(-8)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 bg-white rounded-lg font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors" aria-label="Delete service">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors" aria-label="Edit service">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>
    </div>
  </div>
);

// Service status management component
export const ServiceStatusManagement: React.FC<{
  status: ServiceStatus;
  onStatusChange: (status: ServiceStatus) => void;
  updating: boolean;
  lastUpdated?: Date;
  createdAt?: Date;
  className?: string;
}> = ({ status, onStatusChange, updating, lastUpdated, createdAt, className = "" }) => {
  const statusConfig = getServiceStatusConfig(status);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`${statusConfig.color} flex items-center gap-2 px-4 py-2 rounded-lg font-semibold`}>
            <div className="w-2 h-2 rounded-full bg-current opacity-75" />
            {statusConfig.label}
          </div>
          <select value={status} onChange={(e) => onStatusChange(e.target.value as ServiceStatus)} disabled={updating} className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" aria-label="Change service status">
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="on_hold">On Hold</option>
            <option value="awaiting_parts">Awaiting Parts</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="quality_check">Quality Check</option>
          </select>
          {updating && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" aria-hidden="true" />
              Updating...
            </div>
          )}
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}</div>
          <div>Created: {createdAt ? getServiceAge(createdAt) : "-"}</div>
        </div>
      </div>
    </div>
  );
};

// Get service display information
export const getServiceDisplayInfo = (service: Service, technicians: Technician[], branches: Branch[]) => {
  const branchName = branches.find((b) => b.id === service.branchId)?.name || service.branchId;
  const technicianInfo = service.technician_id ? getTechnicianDisplayInfo(service.technician_id, technicians) : null;

  return {
    branchName,
    technicianInfo,
    formattedPrice: formatServicePrice(service.price),
    serviceAge: service.createdAt ? getServiceAge(service.createdAt) : null,
    lastUpdated: service.updatedAt ? getServiceAge(service.updatedAt) : null,
  };
};

// Service details skeleton component
export const ServiceDetailsSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`min-h-screen bg-gray-50 ${className}`}>
    <div className="max-w-6xl mx-auto p-8">
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded w-20"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Status Management Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
