"use client";
import React from "react";

import Link from "next/link";

import { HiClipboardList } from "react-icons/hi";

import { Service } from "@/types";

import { ErrorState, formatCurrency, getStatusColor, LoadingSpinner } from "./DashboardUtils";

// Metric Card Component - Ultra compact and modern design
export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description?: string;
}

// Ultra compact metric card with modern design
export const MetricCard: React.FC<DashboardMetric> = React.memo(({ label, value, change, changeType, icon: Icon, color, bgColor, description }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-2.5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group relative overflow-hidden" role="region" aria-label={`${label}: ${value}`}>
    {/* Subtle background pattern */}
    <div className={`absolute inset-0 opacity-3 ${bgColor.replace("bg-", "from-").replace("-100", "-200")} bg-gradient-to-br`} />

    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1 rounded-md ${bgColor} group-hover:scale-105 transition-transform duration-200`} aria-hidden="true">
              <Icon className={`h-3 w-3 ${color}`} />
            </div>
            <p className="text-xs font-medium text-gray-600" id={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {label}
            </p>
          </div>
          <p className="text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors" aria-describedby={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
          {description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 group-hover:text-gray-600 transition-colors">{description}</p>}
          {change !== undefined && (
            <div className="flex items-center mt-1.5">
              <span className={`text-xs font-semibold ${changeType === "increase" ? "text-emerald-600" : "text-rose-600"}`}>
                {changeType === "increase" ? "↗" : "↘"} {change}%
              </span>
              <span className="text-xs text-gray-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Hover effect overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </div>
));

MetricCard.displayName = "MetricCard";

// Service Card Component - Ultra compact with modern visuals
export const ServiceCard: React.FC<{ service: Service }> = React.memo(({ service }) => {
  const statusColors = getStatusColor(service.status);

  return (
    <div className="flex items-center justify-between p-2 bg-white rounded-md hover:bg-gray-50 transition-all duration-150 border border-gray-100 hover:border-gray-200 hover:shadow-sm group" role="article" aria-label={`Service: ${service.name} - Status: ${service.status}`}>
      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center group-hover:scale-105 transition-transform duration-150" aria-hidden="true">
            <HiClipboardList className="h-3 w-3 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{service.name}</p>
          <p className="text-xs text-gray-500 truncate group-hover:text-gray-600 transition-colors">
            {service.customer?.name || "Unknown Customer"} • {service.device?.type || "Unknown Device"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.text} ${statusColors.bg}`}>{service.status}</span>
        <span className="text-xs font-semibold text-gray-900">{formatCurrency(service.price)}</span>
      </div>
    </div>
  );
});

ServiceCard.displayName = "ServiceCard";

// Recent Services Card Component - Ultra compact
export const RecentServicesCard: React.FC<{
  services: Service[];
  loading: boolean;
  error?: string | null;
  title?: string;
  viewAllLink?: string;
  emptyMessage?: string;
  createLink?: string;
  onRetry?: () => void;
}> = React.memo(({ services, loading, error, title = "Recent Services", viewAllLink = "/services", emptyMessage = "No services yet", createLink = "/services/new", onRetry }) => (
  <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
    <div className="px-3 py-2.5 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded-md hover:bg-blue-50">
            View all →
          </Link>
        )}
      </div>
    </div>
    <div className="p-2.5">
      {error ? (
        <ErrorState message={error} retry={onRetry} />
      ) : loading ? (
        <LoadingSpinner text="Loading services..." />
      ) : services.length > 0 ? (
        <div className="space-y-1.5" role="list" aria-label="Recent services">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <HiClipboardList className="mx-auto h-5 w-5 text-gray-400" aria-hidden="true" />
          <h3 className="mt-1.5 text-sm font-medium text-gray-900">{emptyMessage}</h3>
          <p className="mt-1 text-xs text-gray-500">Get started by creating your first service.</p>
          {createLink && (
            <div className="mt-2.5">
              <Link href={createLink} className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Create Service
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

RecentServicesCard.displayName = "RecentServicesCard";

// Dashboard Header Component - Ultra compact
export const DashboardHeader: React.FC<{
  title: string;
  subtitle?: string;
  user?: { name?: string };
}> = React.memo(({ title, subtitle, user }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
    <div>
      <h1 className="text-base font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle.replace("{name}", user?.name || "User")}</p>}
    </div>
    <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
      {new Date().toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </div>
  </div>
));

DashboardHeader.displayName = "DashboardHeader";

// Loading State Component - Ultra compact
export const DashboardLoadingState: React.FC<{ message?: string }> = React.memo(({ message = "Loading dashboard data..." }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5" role="status" aria-live="polite">
    <div className="flex items-center">
      <svg className="h-3.5 w-3.5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-blue-800 text-sm">{message}</p>
    </div>
  </div>
));

DashboardLoadingState.displayName = "DashboardLoadingState";

// Ultra Compact Dashboard Layout Component
export const UltraCompactDashboardLayout: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => <div className={`min-h-screen bg-gray-50 ${className}`}>{children}</div>);

UltraCompactDashboardLayout.displayName = "UltraCompactDashboardLayout";

// Ultra Compact Dashboard Header
export const UltraCompactDashboardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm ${className}`}>
    <div className="px-3 py-2">{children}</div>
  </div>
));

UltraCompactDashboardHeader.displayName = "UltraCompactDashboardHeader";

// Ultra Compact Dashboard Content
export const UltraCompactDashboardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => <div className={`p-2.5 space-y-2.5 ${className}`}>{children}</div>);

UltraCompactDashboardContent.displayName = "UltraCompactDashboardContent";

// Compact Dashboard Layout Component
export const CompactDashboardLayout: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => <div className={`min-h-screen bg-gray-50 ${className}`}>{children}</div>);

CompactDashboardLayout.displayName = "CompactDashboardLayout";

// Compact Dashboard Header
export const CompactDashboardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm ${className}`}>
    <div className="px-3 py-2.5">{children}</div>
  </div>
));

CompactDashboardHeader.displayName = "CompactDashboardHeader";

// Compact Dashboard Content
export const CompactDashboardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => <div className={`p-3 space-y-3 ${className}`}>{children}</div>);

CompactDashboardContent.displayName = "CompactDashboardContent";

// Enhanced Metrics Grid with ultra compact responsive design
export const EnhancedMetricsGrid: React.FC<{
  metrics: DashboardMetric[];
  columns?: number;
  className?: string;
}> = React.memo(({ metrics, columns = 6, className = "" }) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    8: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8",
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[8]} gap-2.5 ${className}`} role="grid" aria-label="Dashboard metrics">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
});

EnhancedMetricsGrid.displayName = "EnhancedMetricsGrid";

// Compact Error State
export const CompactErrorState: React.FC<{
  message: string;
  retry?: () => void;
  className?: string;
}> = React.memo(({ message, retry, className = "" }) => (
  <div className={`bg-red-50 border border-red-200 rounded-lg p-2.5 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg className="h-3.5 w-3.5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-red-800 text-sm">{message}</p>
      </div>
      {retry && (
        <button onClick={retry} className="text-xs text-red-600 hover:text-red-800 underline">
          Try again
        </button>
      )}
    </div>
  </div>
));

CompactErrorState.displayName = "CompactErrorState";

// Error Boundary Component for Dashboard
export const DashboardErrorBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = React.memo(({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Dashboard error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Something went wrong</h3>
            <p className="text-sm text-gray-600 mb-4">There was an error loading the dashboard.</p>
            <button onClick={window.location.reload} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Reload Page
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
});

DashboardErrorBoundary.displayName = "DashboardErrorBoundary";
