// Application constants
export const APP_NAME = "Fixigo";
export const APP_DESCRIPTION = "Professional service management platform";

// Navigation constants
export const NAV_ITEMS = {
  DASHBOARD: "/dashboard",
  SERVICES: "/services",
  TECHNICIANS: "/technicians",
  BRANCHES: "/branch",
  INVOICES: "/invoices",
  MY_TASKS: "/my-tasks",
  PROFILE: "/profile",
} as const;

// Auth constants
export const AUTH_ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  ONBOARDING: "/onboarding",
  UNAUTHORIZED: "/unauthorized",
} as const;

// Status constants
export const SERVICE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
} as const;

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

// Role constants
export const USER_ROLES = {
  SHOP_ADMIN: "shop_admin",
  BRANCH_ADMIN: "branch_admin",
  TECHNICIAN: "technician",
} as const;

// API constants
export const API_ENDPOINTS = {
  SHOPS: "/api/shops",
  BRANCHES: "/api/branches",
  TECHNICIANS: "/api/technicians",
  SERVICES: "/api/services",
  INVOICES: "/api/invoices",
  TASKS: "/api/tasks",
} as const;

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  INPUT: "yyyy-MM-dd",
  DATETIME: "MMM dd, yyyy HH:mm",
  TIME: "HH:mm",
} as const;

// Validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
  PASSWORDS_DONT_MATCH: "Passwords don't match",
  INVALID_PHONE: "Please enter a valid phone number",
  NETWORK_ERROR: "Network error. Please try again.",
  UNAUTHORIZED: "You are not authorized to access this resource",
  NOT_FOUND: "Resource not found",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: "Changes saved successfully",
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  LOGOUT_SUCCESS: "Logged out successfully",
} as const; 