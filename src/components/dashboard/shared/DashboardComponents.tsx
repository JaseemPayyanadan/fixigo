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
}

export const MetricCard: React.FC<DashboardMetric> = React.memo(({ 
  label, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color, 
  bgColor 
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
));

MetricCard.displayName = 'MetricCard';

// Service Card Component
export const ServiceCard: React.FC<{ service: Service }> = React.memo(({ service }) => {
  const statusColors = getStatusColor(service.status);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <HiClipboardList className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{service.name}</p>
          <p className="text-sm text-gray-500">
            {service.customer?.name || 'Unknown Customer'} • {service.device?.type || 'Unknown Device'}
          </p>
          {service.branch?.name && (
            <p className="text-xs text-gray-400">{service.branch.name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
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
  title?: string;
  viewAllLink?: string;
  emptyMessage?: string;
  createLink?: string;
}> = React.memo(({ 
  services, 
  loading, 
  title = "Recent Services",
  viewAllLink = "/services",
  emptyMessage = "No services yet",
  createLink = "/services/new"
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Link 
          href={viewAllLink} 
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>
    </div>
    <div className="p-6">
      {loading ? (
        <LoadingSpinner text="Loading services..." />
      ) : services.length > 0 ? (
        <div className="space-y-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <HiClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">{emptyMessage}</h3>
          <p className="mt-2 text-sm text-gray-500">Get started by creating your first service.</p>
          {createLink && (
            <div className="mt-6">
              <Link
                href={createLink}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="text-gray-600 mt-1">
          {subtitle.replace('{name}', user?.name || 'User')}
        </p>
      )}
    </div>
    <div className="text-sm text-gray-500">
      {new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </div>
  </div>
));

DashboardHeader.displayName = 'DashboardHeader';

// Loading State Component
export const DashboardLoadingState: React.FC<{ message?: string }> = React.memo(({ 
  message = "Loading dashboard data... This may take a moment if you have a large number of services."
}) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <div className="flex items-center">
      <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-blue-800 text-sm">{message}</p>
    </div>
  </div>
));

DashboardLoadingState.displayName = 'DashboardLoadingState';

// Metrics Grid Component
export const MetricsGrid: React.FC<{ metrics: DashboardMetric[] }> = React.memo(({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {metrics.map((metric) => (
      <MetricCard key={metric.id} {...metric} />
    ))}
  </div>
));

MetricsGrid.displayName = 'MetricsGrid';
