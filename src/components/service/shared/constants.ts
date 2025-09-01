// Service Status Constants
export const SERVICE_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  AWAITING_PARTS: "awaiting_parts",
  READY_FOR_PICKUP: "ready_for_pickup",
  QUALITY_CHECK: "quality_check"
} as const;

// Service Priority Constants
export const SERVICE_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent"
} as const;

// Service Status Labels
export const SERVICE_STATUS_LABELS = {
  [SERVICE_STATUSES.PENDING]: "Pending",
  [SERVICE_STATUSES.IN_PROGRESS]: "In Progress",
  [SERVICE_STATUSES.COMPLETED]: "Completed",
  [SERVICE_STATUSES.CANCELLED]: "Cancelled",
  [SERVICE_STATUSES.ON_HOLD]: "On Hold",
  [SERVICE_STATUSES.AWAITING_PARTS]: "Awaiting Parts",
  [SERVICE_STATUSES.READY_FOR_PICKUP]: "Ready for Pickup",
  [SERVICE_STATUSES.QUALITY_CHECK]: "Quality Check"
} as const;

// Service Priority Labels
export const SERVICE_PRIORITY_LABELS = {
  [SERVICE_PRIORITIES.LOW]: "Low",
  [SERVICE_PRIORITIES.MEDIUM]: "Medium",
  [SERVICE_PRIORITIES.HIGH]: "High",
  [SERVICE_PRIORITIES.URGENT]: "Urgent"
} as const;

// Service Status Colors
export const SERVICE_STATUS_COLORS = {
  [SERVICE_STATUSES.PENDING]: "bg-blue-100 text-blue-800 border-blue-200",
  [SERVICE_STATUSES.IN_PROGRESS]: "bg-amber-100 text-amber-800 border-amber-200",
  [SERVICE_STATUSES.COMPLETED]: "bg-emerald-100 text-emerald-800 border-emerald-200",
  [SERVICE_STATUSES.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
  [SERVICE_STATUSES.AWAITING_PARTS]: "bg-orange-100 text-orange-800 border-orange-200",
  [SERVICE_STATUSES.READY_FOR_PICKUP]: "bg-cyan-100 text-cyan-800 border-cyan-200",
  [SERVICE_STATUSES.QUALITY_CHECK]: "bg-indigo-100 text-indigo-800 border-indigo-200"
} as const;

// Service Priority Colors
export const SERVICE_PRIORITY_COLORS = {
  [SERVICE_PRIORITIES.LOW]: "text-green-600 bg-green-50 border-green-200",
  [SERVICE_PRIORITIES.MEDIUM]: "text-yellow-600 bg-yellow-50 border-yellow-200",
  [SERVICE_PRIORITIES.HIGH]: "text-orange-600 bg-orange-50 border-orange-200",
  [SERVICE_PRIORITIES.URGENT]: "text-red-600 bg-red-50 border-red-200"
} as const;

// Service Priority Icons
export const SERVICE_PRIORITY_ICONS = {
  [SERVICE_PRIORITIES.LOW]: "🟢",
  [SERVICE_PRIORITIES.MEDIUM]: "🟡",
  [SERVICE_PRIORITIES.HIGH]: "🟠",
  [SERVICE_PRIORITIES.URGENT]: "🔴"
} as const;

// Service Status Descriptions
export const SERVICE_STATUS_DESCRIPTIONS = {
  [SERVICE_STATUSES.PENDING]: "Service request created, waiting to be assigned",
  [SERVICE_STATUSES.IN_PROGRESS]: "Work on the service has begun",
  [SERVICE_STATUSES.COMPLETED]: "Service has been completed successfully",
  [SERVICE_STATUSES.CANCELLED]: "Service has been cancelled",
  [SERVICE_STATUSES.ON_HOLD]: "Service is temporarily paused",
  [SERVICE_STATUSES.AWAITING_PARTS]: "Waiting for required parts to arrive",
  [SERVICE_STATUSES.READY_FOR_PICKUP]: "Service completed, ready for customer pickup",
  [SERVICE_STATUSES.QUALITY_CHECK]: "Service undergoing final quality inspection"
} as const;

// Service Priority Descriptions
export const SERVICE_PRIORITY_DESCRIPTIONS = {
  [SERVICE_PRIORITIES.LOW]: "Standard priority service",
  [SERVICE_PRIORITIES.MEDIUM]: "Normal priority service",
  [SERVICE_PRIORITIES.HIGH]: "High priority service",
  [SERVICE_PRIORITIES.URGENT]: "Urgent service requiring immediate attention"
} as const;

// Service Form Validation Rules
export const SERVICE_VALIDATION_RULES = {
  CUSTOMER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  CUSTOMER_PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    REQUIRED: true,
    PATTERN: /^[0-9+\-\s()]{10,}$/
  },
  DEVICE_BRAND: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REQUIRED: true
  },
  DEVICE_MODEL: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  DEVICE_IMEI: {
    MIN_LENGTH: 15,
    MAX_LENGTH: 15,
    REQUIRED: true,
    PATTERN: /^[0-9]{15}$/
  },
  SERVICE_NAME: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 200,
    REQUIRED: true
  },
  SERVICE_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
    REQUIRED: true
  },
  SERVICE_PRICE: {
    MIN_VALUE: 0,
    MAX_VALUE: 999999,
    REQUIRED: true
  }
} as const;

// Service Default Values
export const SERVICE_DEFAULTS = {
  PRIORITY: SERVICE_PRIORITIES.MEDIUM,
  STATUS: SERVICE_STATUSES.PENDING,
  CURRENCY: "INR",
  LOCALE: "en-IN"
} as const;

// Service Pagination
export const SERVICE_PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
} as const;

// Service Sort Fields
export const SERVICE_SORT_FIELDS = {
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  NAME: "name",
  PRICE: "price",
  STATUS: "status",
  PRIORITY: "priority",
  CUSTOMER_NAME: "customer.name",
  DEVICE_BRAND: "device.brand",
  DEVICE_MODEL: "device.model"
} as const;

// Service Sort Directions
export const SERVICE_SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc"
} as const;

// Service Filter Options
export const SERVICE_FILTER_OPTIONS = {
  STATUS: Object.values(SERVICE_STATUSES),
  PRIORITY: Object.values(SERVICE_PRIORITIES),
  DATE_RANGES: {
    TODAY: "today",
    THIS_WEEK: "this_week",
    THIS_MONTH: "this_month",
    LAST_30_DAYS: "last_30_days",
    LAST_90_DAYS: "last_90_days",
    CUSTOM: "custom"
  }
} as const;

// Service Export Formats
export const SERVICE_EXPORT_FORMATS = {
  CSV: "csv",
  EXCEL: "xlsx",
  PDF: "pdf"
} as const;

// Service Notification Types
export const SERVICE_NOTIFICATION_TYPES = {
  CREATED: "service_created",
  ASSIGNED: "service_assigned",
  STATUS_CHANGED: "service_status_changed",
  COMPLETED: "service_completed",
  CANCELLED: "service_cancelled",
  DUE_SOON: "service_due_soon",
  OVERDUE: "service_overdue"
} as const;

// Service Workflow Steps
export const SERVICE_WORKFLOW_STEPS = {
  CREATED: 1,
  ASSIGNED: 2,
  IN_PROGRESS: 3,
  QUALITY_CHECK: 4,
  COMPLETED: 5,
  READY_FOR_PICKUP: 6
} as const;

// Service Time Estimates
export const SERVICE_TIME_ESTIMATES = {
  MIN_ESTIMATE: 15, // minutes
  MAX_ESTIMATE: 1440, // 24 hours in minutes
  DEFAULT_ESTIMATE: 120 // 2 hours in minutes
} as const;

// Service Cost Limits
export const SERVICE_COST_LIMITS = {
  MIN_PRICE: 0,
  MAX_PRICE: 999999,
  CURRENCY_SYMBOL: "₹",
  DECIMAL_PLACES: 0
} as const;
