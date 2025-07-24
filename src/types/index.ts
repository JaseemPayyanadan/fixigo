// Place your shared TypeScript types and interfaces here

export type Role = "shop_admin" | "branch_admin" | "technician";

export interface User {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: Role;
  shopId?: string;
  shop_id?: string; // Legacy field name
  branchId?: string;
  branch_id?: string; // Legacy field name
  onboardingCompleted?: boolean;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  location: string; // Legacy field name
  address: string;
  contactNumber: string; // Legacy field name
  phone: string;
  branchEmail: string; // Legacy field name
  email: string;
  status: "active" | "inactive";
  shopId: string;
  managerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "technician";
  branchId: string;
  shopId: string;
  skills: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  assignedTechnicianId?: string;
  branchId: string;
  shopId: string;
  scheduledDate: Date;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  notes?: string;
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
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  branchId: string;
  shopId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  assignedTechnicianId: string;
  serviceId?: string;
  dueDate: Date;
  completedDate?: Date;
  notes?: string;
  branchId: string;
  shopId: string;
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
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
} 