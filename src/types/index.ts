// Professional Role-Based Access Control Types

export type Role = "shop_admin" | "branch_admin" | "technician";

// Permission-based access control
export type Permission = 
  | "shop:read" | "shop:write" | "shop:delete"
  | "branch:read" | "branch:write" | "branch:delete"
  | "technician:read" | "technician:write" | "technician:delete"
  | "service:read" | "service:write" | "service:delete"
  | "invoice:read" | "invoice:write" | "invoice:delete"
  | "task:read" | "task:write" | "task:delete"
  | "user:read" | "user:write" | "user:delete"
  | "report:read" | "report:write"
  | "setting:read" | "setting:write"
  | "dashboard:read";

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
  shopId: string; // Shop the user belongs to
  branchId?: string; // Branch the user belongs to (for branch_admin and technician)
  status: "active" | "inactive" | "suspended";
  onboardingCompleted: boolean;
  phone?: string; // Phone number (for technicians and branch admins)
  createdAt: Date;
  updatedAt: Date;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownerId: string; // Shop admin's user ID
  gstNumber?: string;
  businessType?: string;
  description?: string;
  status: "active" | "inactive";
  settings?: {
    notifications?: boolean;
    billing?: Record<string, unknown>;
    security?: Record<string, unknown>;
    workflow?: Record<string, unknown>;
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
  location: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "maintenance";
  shopId: string; // Parent shop ID
  createdAt: Date;
  updatedAt: Date;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "technician";
  shopId: string; // Parent shop ID
  branchId: string; // Parent branch ID
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
  name: string;
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
  assignedTechnicianId?: string;
  shopId: string; // Parent shop ID
  branchId: string; // Parent branch ID
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  scheduledDate?: Date;
  completedDate?: Date;
  price: number;
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
  qualityScore?: number;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  serviceId: string;
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
  shopId: string; // Parent shop ID
  branchId: string; // Parent branch ID
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
  assignedTechnicianId: string;
  serviceId?: string;
  dueDate: Date;
  completedDate?: Date;
  notes?: string;
  shopId: string; // Parent shop ID
  branchId: string; // Parent branch ID
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
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
  businessType?: string;
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

// Service status with better UX
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