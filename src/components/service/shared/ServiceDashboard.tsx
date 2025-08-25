"use client";
import React from "react";

import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

import type { Service, Branch, Technician } from "@/types";
import { calculateServiceStats } from "./ServiceUtils";
import { SERVICE_STATUSES, SERVICE_PRIORITIES } from "./constants";

interface ServiceDashboardProps {
  services: Service[];
  branches: Branch[];
  technicians: Technician[];
  loading?: boolean;
}

const ServiceDashboard: React.FC<ServiceDashboardProps> = ({
  services,
  branches,
  technicians,
  loading = false
}) => {
  const stats = calculateServiceStats(services);
  
  // Calculate additional metrics
  const activeTechnicians = technicians.filter(t => t.status === 'active').length;
  const activeBranches = branches.filter(b => b.status === 'active').length;
  
  // Status distribution
  const statusDistribution = {
    pending: services.filter(s => s.status === SERVICE_STATUSES.PENDING).length,
    inProgress: services.filter(s => s.status === SERVICE_STATUSES.IN_PROGRESS).length,
    completed: services.filter(s => s.status === SERVICE_STATUSES.COMPLETED).length,
    onHold: services.filter(s => s.status === SERVICE_STATUSES.ON_HOLD).length,
    awaitingParts: services.filter(s => s.status === SERVICE_STATUSES.AWAITING_PARTS).length,
    readyForPickup: services.filter(s => s.status === SERVICE_STATUSES.READY_FOR_PICKUP).length,
    qualityCheck: services.filter(s => s.status === SERVICE_STATUSES.QUALITY_CHECK).length,
    cancelled: services.filter(s => s.status === SERVICE_STATUSES.CANCELLED).length
  };

  // Priority distribution
  const priorityDistribution = {
    low: services.filter(s => s.priority === SERVICE_PRIORITIES.LOW).length,
    medium: services.filter(s => s.priority === SERVICE_PRIORITIES.MEDIUM).length,
    high: services.filter(s => s.priority === SERVICE_PRIORITIES.HIGH).length,
    urgent: services.filter(s => s.priority === SERVICE_PRIORITIES.URGENT).length
  };

  // Calculate completion rate
  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  
  // Calculate average service value
  const averageServiceValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Services */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Completed Services */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500">{completionRate.toFixed(1)}% completion rate</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs text-gray-500">Currently active</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">
                ₹{stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                ₹{averageServiceValue.toFixed(0)} avg per service
              </p>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Services */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Active Technicians */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Technicians</p>
              <p className="text-xl font-bold text-indigo-600">{activeTechnicians}</p>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Active Branches */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Branches</p>
              <p className="text-xl font-bold text-purple-600">{activeBranches}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status and Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'in_progress' ? 'bg-blue-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'on_hold' ? 'bg-orange-500' :
                    status === 'awaiting_parts' ? 'bg-purple-500' :
                    status === 'ready_for_pickup' ? 'bg-emerald-500' :
                    status === 'quality_check' ? 'bg-indigo-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    priority === 'low' ? 'bg-green-500' :
                    priority === 'medium' ? 'bg-yellow-500' :
                    priority === 'high' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {priority}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{completionRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              ₹{averageServiceValue.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">Average Service Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {stats.averageCompletionTime > 0 ? 
                Math.round(stats.averageCompletionTime / (1000 * 60 * 60 * 24)) : 0
              }
            </p>
            <p className="text-sm text-gray-600">Avg. Completion Time (Days)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDashboard;
