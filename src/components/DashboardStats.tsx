"use client";

import React from 'react';

import { 
  HiOfficeBuilding, 
  HiUserGroup, 
  HiBriefcase, 
  HiCurrencyDollar, 
  HiClock, 
  HiCheckCircle, 
  HiStar,
  HiExclamationCircle
} from "react-icons/hi";

interface DashboardStatsProps {
  metrics: {
    totalBranches: number;
    totalTechnicians: number;
    totalServices: number;
    totalRevenue: number;
    pendingServices: number;
    completedServices: number;
    activeServices: number;
    customerSatisfaction: number;
  };
  isLoading?: boolean;
  error?: string | null;
}

// Compact metric card component
const CompactMetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  trend?: { value: number; type: 'up' | 'down' };
  description?: string;
}> = ({ label, value, icon: Icon, color, bgColor, trend, description }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm hover:border-gray-200 transition-all duration-200 group">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded-md ${bgColor} group-hover:scale-105 transition-transform duration-200`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <p className="text-xs font-medium text-gray-600">{label}</p>
        </div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-1.5">
            <span className={`text-xs font-semibold ${
              trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {trend.type === 'up' ? '↗' : '↘'} {trend.value}%
            </span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function DashboardStats({ metrics, isLoading, error }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <HiExclamationCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800 text-sm">Error loading dashboard stats: {error}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const stats = [
    {
      label: 'Branches',
      value: metrics.totalBranches,
      icon: HiOfficeBuilding,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Active branches'
    },
    {
      label: 'Technicians',
      value: metrics.totalTechnicians,
      icon: HiUserGroup,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Active technicians'
    },
    {
      label: 'Total Services',
      value: metrics.totalServices,
      icon: HiBriefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'All services'
    },
    {
      label: 'Revenue',
      value: formatCurrency(metrics.totalRevenue),
      icon: HiCurrencyDollar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Total revenue'
    },
    {
      label: 'Pending',
      value: metrics.pendingServices,
      icon: HiClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Awaiting attention'
    },
    {
      label: 'Completed',
      value: metrics.completedServices,
      icon: HiCheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      description: 'Successfully completed'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stats.map((stat, index) => (
          <CompactMetricCard key={index} {...stat} />
        ))}
      </div>
      
      {/* Secondary metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-100">
                <HiStar className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Active Services</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{metrics.activeServices}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-pink-100">
                <HiStar className="h-3.5 w-3.5 text-pink-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Satisfaction</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{metrics.customerSatisfaction}%</span>
          </div>
        </div>
      </div>
    </div>
  );
} 