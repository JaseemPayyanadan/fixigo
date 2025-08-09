"use client";
import React from 'react';
import Link from 'next/link';
import { HiClipboardList } from "react-icons/hi";
import { Service } from '@/types';
import { getStatusColor, formatCurrency, LoadingSpinner, ErrorState } from './DashboardUtils';

// Metric Card Component
export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description?: string;
}

export const MetricCard: React.FC<DashboardMetric> = React.memo(({ 
  label, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color, 
  bgColor,
  description 
}) => (
  <div 
    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
    role="region"
    aria-label={`${label}: ${value}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-600" id={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {label}
        </p>
        <p className="text-xl font-semibold text-gray-900 mt-1" aria-describedby={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {change !== undefined && (
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? '+' : ''}{change}%
            </span>
            <span className="text-xs text-gray-500 ml-1">from last month</span>
          </div>
        )}
      </div>
      <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`} aria-hidden="true">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </div>
  </div>
));

MetricCard.displayName = 'MetricCard';

// Service Card Component
export const ServiceCard: React.FC<{ service: Service }> = React.memo(({ service }) => {
  const statusColors = getStatusColor(service.status);
  
  return (
    <div 
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      role="article"
      aria-label={`Service: ${service.name} - Status: ${service.status}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
            <HiClipboardList className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {service.customer?.name || 'Unknown Customer'} • {service.device?.type || 'Unknown Device'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3 flex-shrink-0">
        <span 
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}
          aria-label={`Status: ${service.status}`}
        >
          {service.status.replace('_', ' ')}
        </span>
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(service.price)}
        </span>
      </div>
    </div>
  );
});

ServiceCard.displayName = 'ServiceCard';

// Recent Services Card Component
export const RecentServicesCard: React.FC<{ 
  services: Service[]; 
  loading: boolean;
  error?: string | null;
  title?: string;
  viewAllLink?: string;
  emptyMessage?: string;
  createLink?: string;
  onRetry?: () => void;
}> = React.memo(({ 
  services, 
  loading, 
  error,
  title = "Recent Services",
  viewAllLink = "/services",
  emptyMessage = "No services yet",
  createLink = "/services/new",
  onRetry
}) => (
  <div className="bg-white rounded-lg border border-gray-200">
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
        {viewAllLink && (
          <Link 
            href={viewAllLink} 
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all
          </Link>
        )}
      </div>
    </div>
    <div className="p-4">
      {error ? (
        <ErrorState message={error} retry={onRetry} />
      ) : loading ? (
        <LoadingSpinner text="Loading services..." />
      ) : services.length > 0 ? (
        <div className="space-y-3" role="list" aria-label="Recent services">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <HiClipboardList className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-medium text-gray-900">{emptyMessage}</h3>
          <p className="mt-1 text-xs text-gray-500">Get started by creating your first service.</p>
          {createLink && (
            <div className="mt-4">
              <Link
                href={createLink}
                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Create Service
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

RecentServicesCard.displayName = 'RecentServicesCard';

// Dashboard Header Component
export const DashboardHeader: React.FC<{ 
  title: string; 
  subtitle?: string;
  user?: { name?: string };
}> = React.memo(({ title, subtitle, user }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
    <div>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-600 mt-1">
          {subtitle.replace('{name}', user?.name || 'User')}
        </p>
      )}
    </div>
    <div className="text-xs text-gray-500">
      {new Date().toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })}
    </div>
  </div>
));

DashboardHeader.displayName = 'DashboardHeader';

// Loading State Component
export const DashboardLoadingState: React.FC<{ message?: string }> = React.memo(({ 
  message = "Loading dashboard data..."
}) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="status" aria-live="polite">
    <div className="flex items-center">
      <svg className="h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-blue-800 text-sm">{message}</p>
    </div>
  </div>
));

DashboardLoadingState.displayName = 'DashboardLoadingState';

// Metrics Grid Component with improved responsiveness
export const MetricsGrid: React.FC<{ metrics: DashboardMetric[] }> = React.memo(({ metrics }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="grid" aria-label="Dashboard metrics">
    {metrics.map((metric) => (
      <MetricCard key={metric.id} {...metric} />
    ))}
  </div>
));

MetricsGrid.displayName = 'MetricsGrid';

// Error Boundary Component for Dashboard
export const DashboardErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = React.memo(({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Dashboard error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return fallback || (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Something went wrong</h3>
          <p className="text-sm text-gray-600 mb-4">There was an error loading the dashboard.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
});

DashboardErrorBoundary.displayName = 'DashboardErrorBoundary';
