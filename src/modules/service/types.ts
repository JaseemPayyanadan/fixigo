import type { Service, Branch, Technician, User } from "@/types";

// Service Form Types
export interface ServiceFormData {
  customer: {
    name: string;
    phone: string;
    place?: string;
    email?: string;
  };
  device: {
    brand: string;
    model: string;
    imei: string;
    color: string;
    type?: string;
  };
  service: {
    name: string;
    description: string;
    price: string;
    branchId: string;
    technician_id?: string;
    priority?: string;
    estimatedDuration?: number;
  };
}

export interface ServiceFormProps {
  onSubmit: (data: ServiceFormData) => void;
  loading: boolean;
  editing?: boolean;
  error?: string | null;
  branches: Branch[];
  branchId: string;
  setBranchId: (id: string) => void;
  user: User | null;
  shopId?: string;
  initialData?: {
    customer?: { name: string; phone: string; place?: string; email?: string };
    device?: { brand: string; model: string; imei: string; color: string; type?: string };
    service?: { name: string; description: string; price: string; technician_id?: string; branchId?: string; priority?: string; estimatedDuration?: number };
  };
  onCancelEdit?: () => void;
}

// Service List Types
export interface ServiceListProps {
  services: Service[];
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  error?: string | null;
  search?: string;
  user: User | null;
  onEdit?: (service: Service) => void;
  onDelete?: (id: string) => void;
  onRetry?: () => void;
}

// Service Filter Types
export interface ServiceFilters {
  status?: string;
  priority?: string;
  assignedTechnicianId?: string;
  search?: string;
  branchId?: string;
}

export interface ServiceSortOptions {
  field: 'createdAt' | 'updatedAt' | 'name' | 'price' | 'status' | 'priority';
  direction: 'asc' | 'desc';
}

// Service Status Types
export type ServiceStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "cancelled" 
  | "on_hold" 
  | "awaiting_parts"
  | "ready_for_pickup"
  | "quality_check";

export type ServicePriority = "low" | "medium" | "high" | "urgent";

// Service Validation Types
export interface ServiceValidationErrors {
  customerName?: string;
  customerPhone?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceImei?: string;
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: string;
  branchId?: string;
  technician_id?: string;
}

// Service Actions Types
export interface ServiceActions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canUpdateStatus: boolean;
  canViewDetails: boolean;
}

// Service Display Types
export interface ServiceDisplayInfo {
  statusColor: string;
  statusIcon: React.ComponentType<{ className?: string }>;
  priorityColor: string;
  priorityIcon: React.ComponentType<{ className?: string }>;
  technicianName: string;
  branchName: string;
  formattedPrice: string;
  formattedDate: string;
  age: string;
}
