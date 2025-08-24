import type { Branch, Technician, User } from "@/types";

// Service Form Types
export interface ServiceFormData {
  customer: {
    name: string;
    phone: string;
    place?: string;
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
    customer?: { name: string; phone: string; place?: string };
    device?: { brand: string; model: string; imei: string; color: string; type?: string };
    service?: { name: string; description: string; price: string; technician_id?: string; branchId?: string; priority?: string };
  };
  onCancelEdit?: () => void;
}

// Service List Types
export interface ServiceListProps {
  services: any[]; // Using any for now to maintain compatibility
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  error?: string | null;
  search?: string;
  user: User | null;
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  onRetry?: () => void;
}

// Service Filter Types
export interface ServiceFilters {
  status?: string;
  priority?: string;
  technician_id?: string;
  branchId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
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
  priorityIcon: string;
  technicianName: string;
  branchName: string;
  formattedPrice: string;
  formattedDate: string;
  age: string;
}

// Service Statistics Types
export interface ServiceStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  onHold: number;
  awaitingParts: number;
  totalRevenue: number;
  averageCompletionTime: number;
}

// Service Card Props
export interface ServiceCardProps {
  service: any; // Using any for now to maintain compatibility
  branches: Branch[];
  technicians: Technician[];
  user: User;
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

// Service Status Update Types
export interface ServiceStatusUpdate {
  serviceId: string;
  newStatus: ServiceStatus;
  notes?: string;
  completedDate?: Date;
}

// Service Assignment Types
export interface ServiceAssignment {
  serviceId: string;
  technicianId: string;
  assignedBy: string;
  assignedAt: Date;
  notes?: string;
}

// Service Note Types
export interface ServiceNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  type: 'work' | 'customer' | 'internal';
}

// Service Part Types
export interface ServicePart {
  id: string;
  name: string;
  quantity: number;
  cost: number;
  usedAt: Date;
  technicianId: string;
}

// Service Timeline Types
export interface ServiceTimelineEvent {
  id: string;
  type: 'created' | 'assigned' | 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled';
  timestamp: Date;
  userId: string;
  userName: string;
  description: string;
  metadata?: Record<string, any>;
}
