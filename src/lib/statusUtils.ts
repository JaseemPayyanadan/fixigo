// Status utility functions for consistent handling across the application

export type ServiceStatus = 
  | "pending" 
  | "to_do" 
  | "in_progress" 
  | "completed" 
  | "cancelled" 
  | "on_hold" 
  | "awaiting_parts" 
  | "ready_for_pickup" 
  | "quality_check" 
  | "urgent";

export interface StatusConfig {
  color: string;
  bg: string;
  icon: string;
  label: string;
}

// Status configuration mapping
const STATUS_CONFIG_MAP: Record<ServiceStatus, StatusConfig> = {
  'pending': { color: 'text-orange-600', bg: 'bg-orange-100', icon: '⏳', label: 'Pending' },
  'to_do': { color: 'text-blue-600', bg: 'bg-blue-100', icon: '📋', label: 'To Do' },
  'in_progress': { color: 'text-blue-600', bg: 'bg-blue-100', icon: '🔧', label: 'In Progress' },
  'completed': { color: 'text-green-600', bg: 'bg-green-100', icon: '✅', label: 'Completed' },
  'cancelled': { color: 'text-red-600', bg: 'bg-red-100', icon: '❌', label: 'Cancelled' },
  'urgent': { color: 'text-red-600', bg: 'bg-red-100', icon: '🚨', label: 'Urgent' },
  'awaiting_parts': { color: 'text-purple-600', bg: 'bg-purple-100', icon: '📦', label: 'Awaiting Parts' },
  'on_hold': { color: 'text-gray-600', bg: 'bg-gray-100', icon: '⏸️', label: 'On Hold' },
  'ready_for_pickup': { color: 'text-cyan-600', bg: 'bg-cyan-100', icon: '📱', label: 'Ready for Pickup' },
  'quality_check': { color: 'text-indigo-600', bg: 'bg-indigo-100', icon: '🔍', label: 'Quality Check' }
};

/**
 * Normalizes a status string to a standard format
 * Handles various input formats like "In Progress", "in_progress", "InProgress", etc.
 */
export function normalizeStatus(status: string): ServiceStatus {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  
  // Map common variations to standard statuses
  const statusMap: Record<string, ServiceStatus> = {
    'pending': 'pending',
    'to_do': 'to_do',
    'todo': 'to_do',
    'in_progress': 'in_progress',
    'inprogress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'urgent': 'urgent',
    'awaiting_parts': 'awaiting_parts',
    'awaitingparts': 'awaiting_parts',
    'on_hold': 'on_hold',
    'onhold': 'on_hold',
    'ready_for_pickup': 'ready_for_pickup',
    'readyforpickup': 'ready_for_pickup',
    'quality_check': 'quality_check',
    'qualitycheck': 'quality_check'
  };
  
  return statusMap[normalized] || 'pending';
}

/**
 * Gets the configuration for a status (colors, icons, labels)
 */
export function getStatusConfig(status: string): StatusConfig {
  const normalizedStatus = normalizeStatus(status);
  return STATUS_CONFIG_MAP[normalizedStatus] || STATUS_CONFIG_MAP['pending'];
}

/**
 * Gets all available status options
 */
export function getStatusOptions(): Array<{ value: ServiceStatus; label: string; config: StatusConfig }> {
  return Object.entries(STATUS_CONFIG_MAP).map(([value, config]) => ({
    value: value as ServiceStatus,
    label: config.label,
    config
  }));
}

/**
 * Checks if a status is considered "active" (not completed or cancelled)
 */
export function isActiveStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return !['completed', 'cancelled'].includes(normalizedStatus);
}

/**
 * Checks if a status is considered "completed"
 */
export function isCompletedStatus(status: string): boolean {
  return normalizeStatus(status) === 'completed';
}

/**
 * Checks if a status is considered "pending" (needs attention)
 */
export function isPendingStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return ['pending', 'to_do'].includes(normalizedStatus);
}
