"use client";
import React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { 
  TrendingUp, 
  TrendingDown, 
  Monitor, 
  Battery, 
  Smartphone, 
  Tablet,
  Laptop,
  Headphones,
  Watch,
  Camera,
  Gamepad2,
  Speaker
} from "lucide-react";

import { PageFallback, Pulse } from "@/components/ui/PageSkeleton";

import { Service } from "@/types";

import { ErrorState, formatCurrency, getStatusColor } from "./DashboardUtils";

// Device type to icon mapping
const getDeviceIcon = (deviceType?: string) => {
  if (!deviceType) return Monitor;
  
  const type = deviceType.toLowerCase();
  if (type.includes('phone') || type.includes('mobile')) return Smartphone;
  if (type.includes('laptop') || type.includes('computer')) return Laptop;
  if (type.includes('tablet') || type.includes('ipad')) return Tablet;
  if (type.includes('battery')) return Battery;
  if (type.includes('headphone') || type.includes('earphone')) return Headphones;
  if (type.includes('watch') || type.includes('smartwatch')) return Watch;
  if (type.includes('camera')) return Camera;
  if (type.includes('game') || type.includes('console')) return Gamepad2;
  if (type.includes('speaker') || type.includes('audio')) return Speaker;
  
  return Monitor;
};

// Metric Card Component - Enhanced with icons, trends, and consistent sizing
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
  showTrend?: boolean;
}

// Enhanced metric card with modern design, consistent sizing, and trend indicators
export const MetricCard: React.FC<DashboardMetric> = React.memo(({ 
  label, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color, 
  bgColor, 
  description, 
  showTrend = true 
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 group relative overflow-hidden shadow-sm" role="region" aria-label={`${label}: ${value}`}>
    {/* Subtle background pattern */}
    <div className={`absolute inset-0 opacity-5 ${bgColor.replace("bg-", "from-").replace("-100", "-200")} bg-gradient-to-br`} />

    <div className="relative z-10">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${bgColor} group-hover:scale-105 transition-transform duration-200`} aria-hidden="true">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-sm font-medium text-gray-600" id={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {label}
            </p>
          </div>
          
          <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors mb-1" aria-describedby={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
          
          {description && (
            <p className="text-xs text-gray-500 line-clamp-1 group-hover:text-gray-600 transition-colors">
              {description}
            </p>
          )}
          
          {/* Trend indicator */}
          {showTrend && change !== undefined && (
            <div className="flex items-center mt-3">
              <span className={`text-sm font-semibold flex items-center gap-1 ${changeType === "increase" ? "text-emerald-600" : "text-rose-600"}`}>
                {changeType === "increase" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {change}%
              </span>
              <span className="text-xs text-gray-400 ml-2">vs last month</span>
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

// Enhanced Service Card Component - Clickable with better status badges and device icons
export const ServiceCard: React.FC<{ service: Service }> = React.memo(({ service }) => {
  const router = useRouter();
  const statusColors = getStatusColor(service.status);
  const DeviceIcon = getDeviceIcon(service.device?.type);
  
  const handleClick = () => {
    router.push(`/services/details?id=${service.id}`);
  };

  return (
    <div 
      className="group flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-colors duration-150 hover:border-gray-100 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 motion-reduce:transition-none" 
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Service: ${service.name} - Status: ${service.status}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50" aria-hidden="true">
          <DeviceIcon className="h-4 w-4 text-blue-600" />
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
            {service.name}
          </p>
          <p className="truncate text-[11px] text-gray-500">
            {service.customer?.name || "Unknown Customer"} • {service.device?.brand || "Unknown"} {service.device?.model || "Device"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 whitespace-nowrap ${statusColors.text} ${statusColors.bg}`}>
          {service.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        <span className="text-xs font-semibold tabular-nums text-gray-900">{formatCurrency(service.price)}</span>
      </div>
    </div>
  );
});

ServiceCard.displayName = "ServiceCard";

// Enhanced Recent Services Card Component with better visual design
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
  <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-5 pt-4 pb-3">
      <h2 className="truncate text-base font-semibold tracking-tight text-gray-900">{title}</h2>
      {viewAllLink && (
        <Link
          href={viewAllLink}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:px-3 sm:py-1.5"
        >
          View all
        </Link>
      )}
    </div>
    
    <div className="flex flex-1 flex-col px-3 pb-4">
      {error ? (
        <ErrorState message={error} retry={onRetry} />
      ) : loading ? (
        <div className="space-y-2 px-2 py-2" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading services</span>
          {Array.from({ length: 4 }, (_, index) => (
            <Pulse key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="space-y-0.5" role="list" aria-label="Recent services">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-10 text-center">
          <p className="text-sm font-medium text-gray-900">{emptyMessage}</p>
          <p className="mt-1 text-sm text-gray-500">Create a service to get started.</p>
          {createLink && (
            <Link
              href={createLink}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create service
            </Link>
          )}
        </div>
      )}
    </div>
  </div>
));

RecentServicesCard.displayName = "RecentServicesCard";

// Enhanced Dashboard Header Component with search and user avatar
export const DashboardHeader: React.FC<{
  title: string;
  subtitle?: string;
  user?: { name?: string };
  onSearch?: (query: string) => void;
  onFilterChange?: (filter: string) => void;
}> = React.memo(({ title, subtitle, user, onSearch, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    onFilterChange?.(filter);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">
            {subtitle.replace("{name}", user?.name || "User")}
          </p>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by service ID, customer, or technician…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50 text-sm shadow-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </form>

        {/* Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:bg-gray-50 cursor-pointer"
          >
            <option value="all">All</option>
            <option value="service">Service</option>
            <option value="customer">Customer</option>
            <option value="technician">Technician</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Date Display */}
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
});

DashboardHeader.displayName = "DashboardHeader";

// Enhanced Loading State Component
export const DashboardLoadingState: React.FC<{ message?: string }> = React.memo(({ message = "Loading dashboard data..." }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{message}</span>
    <div className="space-y-3">
      <Pulse className="h-24 w-full rounded-2xl" />
      <Pulse className="h-24 w-full rounded-2xl" />
    </div>
  </div>
));

DashboardLoadingState.displayName = "DashboardLoadingState";

// Full-page placeholder shown while the session is still resolving, before any
// shop or branch scope is known. Distinct from DashboardLoadingState, which
// sits inside an already-rendered dashboard while its data loads.
export const DashboardUserLoading: React.FC = React.memo(() => (
  <PageFallback label="Loading user data" />
));

DashboardUserLoading.displayName = "DashboardUserLoading";

// Enhanced Dashboard Layout Components with better shadows and responsive design
export const UltraCompactDashboardLayout: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`min-h-screen bg-gray-50 ${className}`}>
    {children}
  </div>
));

UltraCompactDashboardLayout.displayName = "UltraCompactDashboardLayout";

// Enhanced Dashboard Header with better shadows
export const UltraCompactDashboardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`border-b border-gray-100 bg-white sticky top-0 z-10 shadow-md ${className}`}>
    <div className="px-4 py-4">{children}</div>
  </div>
));

UltraCompactDashboardHeader.displayName = "UltraCompactDashboardHeader";

// Enhanced Dashboard Content with better spacing
export const UltraCompactDashboardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`p-4 space-y-4 ${className}`}>
    {children}
  </div>
));

UltraCompactDashboardContent.displayName = "UltraCompactDashboardContent";

// Enhanced Compact Dashboard Layout Components
export const CompactDashboardLayout: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`min-h-screen bg-gray-50 ${className}`}>
    {children}
  </div>
));

CompactDashboardLayout.displayName = "CompactDashboardLayout";

// Enhanced Compact Dashboard Header
export const CompactDashboardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`border-b border-gray-100 bg-white sticky top-0 z-10 shadow-md ${className}`}>
    <div className="px-4 py-4">{children}</div>
  </div>
));

CompactDashboardHeader.displayName = "CompactDashboardHeader";

// Enhanced Compact Dashboard Content
export const CompactDashboardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = React.memo(({ children, className = "" }) => (
  <div className={`p-4 space-y-4 ${className}`}>
    {children}
  </div>
));

CompactDashboardContent.displayName = "CompactDashboardContent";

// Enhanced Metrics Grid with better responsive design and consistent card sizing
export const EnhancedMetricsGrid: React.FC<{
  metrics: DashboardMetric[];
  columns?: number;
  className?: string;
}> = React.memo(({ metrics, columns = 6, className = "" }) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
    8: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8",
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[8]} gap-4 ${className}`} role="grid" aria-label="Dashboard metrics">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
});

EnhancedMetricsGrid.displayName = "EnhancedMetricsGrid";

// Enhanced Error State Component
export const CompactErrorState: React.FC<{
  message: string;
  retry?: () => void;
  className?: string;
}> = React.memo(({ message, retry, className = "" }) => (
  <div className={`rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm ${className}`} role="alert">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-sm font-medium text-red-800">{message}</p>
      </div>
      {retry && (
        <button 
          onClick={retry} 
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0"
        >
          Retry
        </button>
      )}
    </div>
  </div>
));

CompactErrorState.displayName = "CompactErrorState";

// Enhanced Error Boundary Component for Dashboard
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
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Something went wrong</h3>
            <p className="text-base text-gray-600 mb-6">There was an error loading the dashboard.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
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
