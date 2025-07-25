// Place your shared TypeScript types and interfaces here

export type Role = "shop_admin" | "branch_admin" | "technician" | "super_admin";

// Permission-based access control
export type Permission = 
  | "shop:read" | "shop:write" | "shop:delete"
  | "branch:read" | "branch:write" | "branch:delete"
  | "technician:read" | "technician:write" | "technician:delete"
  | "service:read" | "service:write" | "service:delete"
  | "invoice:read" | "invoice:write" | "invoice:delete"
  | "task:read" | "task:write" | "task:delete"
  | "user:read" | "user:write" | "user:delete"
  | "onboarding:manage"
  | "report:read" | "report:write" | "report:delete"
  | "feedback:read" | "feedback:write" | "feedback:delete"
  | "worklog:read" | "worklog:write" | "worklog:delete"
  | "notification:read" | "notification:write" | "notification:delete"
  | "audit:read" | "audit:write"
  | "setting:read" | "setting:write" | "setting:delete";

// Role hierarchy and permissions mapping
export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  inheritsFrom?: Role[];
}

// Enhanced user interface with standardized field names
export interface User {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: Role;
  permissions?: Permission[]; // Explicit permissions (overrides role defaults)
  shopId: string; // Standardized field name
  branchId?: string; // Standardized field name
  onboardingCompleted?: boolean;
  status?: "active" | "inactive" | "suspended";
  bio?: string;
  specializations?: string[];
  assignedServices?: string[]; // For technicians to track their services
  createdAt: Date;
  updatedAt: Date;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownerId: string;
  gstNumber?: string;
  businessType?: string;
  description?: string;
  status: "active" | "inactive";
  settings?: {
    notifications?: boolean;
    billing?: Record<string, unknown>;
    security?: Record<string, unknown>;
    workflow?: Record<string, unknown>;
    custom?: Record<string, unknown>;
  };
  businessHours?: {
    monday?: { open: string; close: string; closed: boolean };
    tuesday?: { open: string; close: string; closed: boolean };
    wednesday?: { open: string; close: string; closed: boolean };
    thursday?: { open: string; close: string; closed: boolean };
    friday?: { open: string; close: string; closed: boolean };
    saturday?: { open: string; close: string; closed: boolean };
    sunday?: { open: string; close: string; closed: boolean };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "maintenance";
  shopId: string; // Standardized field name
  managerId: string;
  location?: string; // Legacy field for backward compatibility
  contactNumber?: string; // Legacy field for backward compatibility
  branchEmail?: string; // Legacy field for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

export interface Technician {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  email: string;
  phone: string;
  role: "technician";
  branchId: string; // Standardized field name
  shopId: string; // Standardized field name
  skills: string[];
  status: "active" | "inactive";
  bio?: string;
  specializations?: string[];
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  experience?: number; // Years of experience
  rating?: number; // Average rating (1-5)
  totalServices?: number;
  completedServices?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string; // Standardized field name
  description: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address?: string;
  };
  device: {
    type: string;
    brand: string;
    model: string;
    serial?: string;
    color?: string;
    issue?: string;
  };
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | "awaiting_parts" | "ready_for_pickup" | "quality_check";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTechnicianId?: string; // Standardized field name
  branchId: string; // Standardized field name
  shopId: string; // Standardized field name
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  scheduledDate?: Date;
  completedDate?: Date;
  price: number;
  total?: number; // Legacy field for backward compatibility
  notes?: string;
  workNotes?: string[];
  partsUsed?: Array<{
    name: string;
    quantity: number;
    cost: number;
  }>;
  customerFeedback?: {
    rating: number;
    comment?: string;
    date: Date;
  };
  qualityScore?: number; // New field for quality assessment
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  serviceId: string; // Standardized field name
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  tax: number;
  total: number;
  discount?: number;
  advance?: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "partial" | "refunded";
  paymentMethod?: string;
  paymentDate?: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  branchId: string; // Standardized field name
  shopId: string; // Standardized field name
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTechnicianId: string; // Standardized field name
  serviceId?: string; // Standardized field name
  dueDate: Date;
  completedDate?: Date;
  notes?: string;
  branchId: string; // Standardized field name
  shopId: string; // Standardized field name
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkLog {
  id: string;
  serviceId: string; // Standardized field name
  technicianId: string; // Standardized field name
  action: string;
  description: string;
  timestamp: Date;
  duration?: number; // in minutes
  partsUsed?: string[];
  notes?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string; // Standardized field name
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  relatedId?: string; // ID of related service, invoice, etc.
  relatedType?: "service" | "invoice" | "task";
  createdAt: Date;
}

// New collections for enhanced features
export interface CustomerFeedback {
  id: string;
  serviceId: string;
  shopId: string;
  rating: number; // 1-5 stars
  comment?: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  shopId: string;
  type: "sales" | "services" | "technicians" | "customers" | "financial";
  data: Record<string, unknown>;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  createdBy: string;
}

export interface AuditLog {
  id: string;
  operation: "create" | "update" | "delete" | "read";
  resourcePath: string;
  userId: string;
  userRole: string;
  timestamp: Date;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  shopId?: string;
}

export interface Setting {
  id: string;
  shopId: string;
  type: "notification" | "billing" | "security" | "workflow" | "custom";
  value: Record<string, unknown>;
  updatedAt: Date;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

export interface ShopOnboardingFormData {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pinCode: string;
  gstNumber?: string;
  businessType: string;
  description?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter and sort types
export interface FilterOptions {
  status?: string;
  priority?: string;
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

// Dashboard statistics
export interface DashboardStats {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageServiceTime: number;
  customerSatisfaction: number;
  activeTechnicians: number;
  totalBranches: number;
  recentServices: Service[];
  topTechnicians: Array<{
    id: string;
    name: string;
    completedServices: number;
    rating: number;
  }>;
}

// Enhanced service status with better UX
export type ServiceStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "cancelled" 
  | "on_hold" 
  | "awaiting_parts"
  | "ready_for_pickup"
  | "quality_check";

// Service priority levels
export type ServicePriority = "low" | "medium" | "high" | "urgent";

// Payment status for invoices
export type PaymentStatus = "pending" | "paid" | "failed" | "partial" | "refunded";

// Invoice status
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

// User status
export type UserStatus = "active" | "inactive" | "suspended";

// Branch status
export type BranchStatus = "active" | "inactive" | "maintenance";

// Report types
export type ReportType = "sales" | "services" | "technicians" | "customers" | "financial";

// Setting types
export type SettingType = "notification" | "billing" | "security" | "workflow" | "custom";

// Notification types
export type NotificationType = "info" | "success" | "warning" | "error";

// Audit operation types
export type AuditOperation = "create" | "update" | "delete" | "read"; 