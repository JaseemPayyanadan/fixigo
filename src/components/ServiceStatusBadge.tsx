import React from 'react';
import { STATUS_VALUES } from '@/lib/fieldMapper';
import { getFieldValue } from '@/lib/fieldMapper';
import type { Service, ServiceStatus, ServicePriority } from '@/types';

interface ServiceStatusBadgeProps {
  service: Service;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  [STATUS_VALUES.SERVICE.PENDING]: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳',
    description: 'Awaiting assignment'
  },
  [STATUS_VALUES.SERVICE.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🔧',
    description: 'Work in progress'
  },
  [STATUS_VALUES.SERVICE.COMPLETED]: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅',
    description: 'Successfully completed'
  },
  [STATUS_VALUES.SERVICE.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌',
    description: 'Service cancelled'
  },
  [STATUS_VALUES.SERVICE.ON_HOLD]: {
    label: 'On Hold',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '⏸️',
    description: 'Temporarily paused'
  },
  [STATUS_VALUES.SERVICE.AWAITING_PARTS]: {
    label: 'Awaiting Parts',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '📦',
    description: 'Waiting for parts'
  },
  [STATUS_VALUES.SERVICE.READY_FOR_PICKUP]: {
    label: 'Ready for Pickup',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '📦',
    description: 'Ready for customer pickup'
  },
  [STATUS_VALUES.SERVICE.QUALITY_CHECK]: {
    label: 'Quality Check',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: '🔍',
    description: 'Under quality inspection'
  }
};

const priorityConfig = {
  [STATUS_VALUES.PRIORITY.LOW]: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '🟢'
  },
  [STATUS_VALUES.PRIORITY.MEDIUM]: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '🟡'
  },
  [STATUS_VALUES.PRIORITY.HIGH]: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '🟠'
  },
  [STATUS_VALUES.PRIORITY.URGENT]: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔴'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export const ServiceStatusBadge: React.FC<ServiceStatusBadgeProps> = ({ 
  service, 
  showIcon = true, 
  size = 'md' 
}) => {
  const status = getFieldValue(service as unknown as Record<string, unknown>, 'status', STATUS_VALUES.SERVICE.PENDING) as ServiceStatus;
  const priority = getFieldValue(service as unknown as Record<string, unknown>, 'priority', STATUS_VALUES.PRIORITY.MEDIUM) as ServicePriority;
  
  const statusInfo = statusConfig[status] || statusConfig[STATUS_VALUES.SERVICE.PENDING];
  const priorityInfo = priorityConfig[priority] || priorityConfig[STATUS_VALUES.PRIORITY.MEDIUM];

  return (
    <div className="flex flex-wrap gap-2">
      {/* Status Badge */}
      <span className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium
        ${statusInfo.color} ${sizeClasses[size]}
      `}>
        {showIcon && <span className="text-sm">{statusInfo.icon as string}</span>}
        <span>{statusInfo.label}</span>
      </span>

      {/* Priority Badge */}
      <span className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium
        ${priorityInfo.color} ${sizeClasses[size]}
      `}>
        {showIcon && <span className="text-sm">{priorityInfo.icon as string}</span>}
        <span>{priorityInfo.label}</span>
      </span>

      {/* Assigned Technician Indicator */}
      {Boolean(getFieldValue(service as unknown as Record<string, unknown>, 'assignedTechnicianId')) && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium bg-blue-100 text-blue-800 border-blue-200 text-sm">
          <span className="text-sm">👤</span>
          <span>Assigned</span>
        </span>
      )}
    </div>
  );
};

export const ServiceStatusTooltip: React.FC<{ service: Service }> = ({ service }) => {
  const status = getFieldValue(service as unknown as Record<string, unknown>, 'status', STATUS_VALUES.SERVICE.PENDING) as ServiceStatus;
  const statusInfo = statusConfig[status] || statusConfig[STATUS_VALUES.SERVICE.PENDING];

  return (
    <div className="absolute z-10 bg-gray-900 text-white text-sm rounded-lg py-2 px-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <div className="font-medium">{statusInfo.label}</div>
      <div className="text-gray-300 text-xs">{statusInfo.description}</div>
    </div>
  );
};

export const ServiceProgressIndicator: React.FC<{ service: Service }> = ({ service }) => {
  const status = getFieldValue(service as unknown as Record<string, unknown>, 'status', STATUS_VALUES.SERVICE.PENDING) as ServiceStatus;
  
  const getProgressPercentage = () => {
    switch (status) {
      case STATUS_VALUES.SERVICE.PENDING:
        return 0;
      case STATUS_VALUES.SERVICE.IN_PROGRESS:
        return 50;
      case STATUS_VALUES.SERVICE.COMPLETED:
        return 100;
      case STATUS_VALUES.SERVICE.ON_HOLD:
        return 25;
      case STATUS_VALUES.SERVICE.AWAITING_PARTS:
        return 30;
      case STATUS_VALUES.SERVICE.READY_FOR_PICKUP:
        return 90;
      case STATUS_VALUES.SERVICE.QUALITY_CHECK:
        return 85;
      default:
        return 0;
    }
  };

  const progress = getProgressPercentage();

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}; 