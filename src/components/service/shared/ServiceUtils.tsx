import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  PauseIcon, 
  TruckIcon, 
  XCircleIcon,
  CubeIcon,
  UserIcon
} from "@heroicons/react/24/outline";

import type { Branch, Service, Technician, User } from "@/types";
import type { ServiceActions, ServiceFilters, ServiceSortOptions, ServiceDisplayInfo, ServiceStats, ServiceValidationErrors } from "./types";

// Service Status Configuration
export const SERVICE_STATUS_CONFIG = {
  pending: { 
    label: "To Do", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: ClockIcon,
    description: "Service request created, waiting to be assigned"
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: ExclamationTriangleIcon,
    description: "Work on the service has begun"
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircleIcon,
    description: "Service has been completed successfully"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircleIcon,
    description: "Service has been cancelled"
  },
  awaiting_parts: { 
    label: "Awaiting Parts", 
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: CubeIcon,
    description: "Waiting for required parts to arrive"
  },
  ready_for_pickup: { 
    label: "Ready for Pickup", 
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: TruckIcon,
    description: "Service completed, ready for customer pickup"
  },
  quality_check: { 
    label: "Quality Check", 
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: CheckCircleIcon,
    description: "Service undergoing final quality inspection"
  }
} as const;

// Service Priority Configuration
export const SERVICE_PRIORITY_CONFIG = {
  low: { 
    label: "Low", 
    color: "text-green-600 bg-green-50 border-green-200",
    icon: "🟢",
    description: "Standard priority service"
  },
  medium: { 
    label: "Medium", 
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: "🟡",
    description: "Normal priority service"
  },
  high: { 
    label: "High", 
    color: "text-orange-600 bg-orange-50 border-orange-200",
    icon: "🟠",
    description: "High priority service"
  },
  urgent: { 
    label: "Urgent", 
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "🔴",
    description: "Urgent service requiring immediate attention"
  }
} as const;

// Get service status configuration
export const getServiceStatusConfig = (status: keyof typeof SERVICE_STATUS_CONFIG) => {
  return SERVICE_STATUS_CONFIG[status] || SERVICE_STATUS_CONFIG.pending;
};

// Get service priority configuration
export const getServicePriorityConfig = (priority: keyof typeof SERVICE_PRIORITY_CONFIG) => {
  return SERVICE_PRIORITY_CONFIG[priority] || SERVICE_PRIORITY_CONFIG.medium;
};

// Format service price
export const formatServicePrice = (price: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Format service date
export const formatServiceDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Get service age (time since creation)
export const getServiceAge = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// Get technician display information
export const getTechnicianDisplayInfo = (technicianId: string | undefined, technicians: Technician[]): string => {
  if (!technicianId) return "Unassigned";
  
  const technician = technicians.find(t => t.id === technicianId);
  return technician ? technician.name : "Unknown Technician";
};

// Get branch display information
export const getBranchDisplayInfo = (branchId: string | undefined, branches: Branch[]): string => {
  if (!branchId) return "Unknown Branch";
  
  const branch = branches.find(b => b.id === branchId);
  return branch ? branch.name : "Unknown Branch";
};

// Service permissions and actions


// Get service actions based on user role and service ownership
export const getServiceActions = (service: Service, user: User): ServiceActions => {
  const isAssignedTechnician = service.technician_id === user.id;
  const isShopAdmin = user.role === "shop_admin";
  const isBranchAdmin = user.role === "branch_admin";
  const isTechnician = user.role === "technician";

  return {
    canEdit: isShopAdmin || isBranchAdmin || (isTechnician && isAssignedTechnician),
    canDelete: isShopAdmin || isBranchAdmin,
    canAssign: isShopAdmin || isBranchAdmin,
    canUpdateStatus: isShopAdmin || isBranchAdmin || (isTechnician && isAssignedTechnician),
    canViewDetails: true // All authenticated users can view service details
  };
};

// Check if user can access a specific service
export const canAccessService = (service: Service, user: User): boolean => {
  if (!user) return false;
  
  // Shop admins can access all services
  if (user.role === "shop_admin") return true;
  
  // Branch admins and technicians can only access services from their branch
  if (user.branchId && service.branchId !== user.branchId) return false;
  
  // Technicians can only access assigned services
  if (user.role === "technician") {
    return service.technician_id === user.id;
  }
  
  return true;
};

// Service filtering

// Filter services based on criteria
export const filterServices = (services: Service[], filters: ServiceFilters): Service[] => {
  return services.filter(service => {
    // Status filter
    if (filters.status && filters.status !== "all" && service.status !== filters.status) {
      return false;
    }
    
    // Priority filter
    if (filters.priority && filters.priority !== "all" && service.priority !== filters.priority) {
      return false;
    }
    
    // Technician filter
    if (filters.technician_id && service.technician_id !== filters.technician_id) {
      return false;
    }
    
    // Branch filter
    if (filters.branchId && service.branchId !== filters.branchId) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.customer.name.toLowerCase().includes(searchTerm) ||
        service.customer.phone.includes(searchTerm) ||
        service.device.brand.toLowerCase().includes(searchTerm) ||
        service.device.model.toLowerCase().includes(searchTerm) ||
        service.device.imei.includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const serviceDate = service.createdAt;
      if (serviceDate < filters.dateRange.start || serviceDate > filters.dateRange.end) {
        return false;
      }
    }
    
    return true;
  });
};

// Service sorting


// Sort services based on field and direction
export const sortServices = (services: Service[], field: string, direction: "asc" | "desc"): Service[] => {
  return [...services].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (field) {
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case 'updatedAt':
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'priority':
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Get service display information for UI


// Get complete service display information
export const getServiceDisplayInfo = (
  service: Service, 
  branches: Branch[], 
  technicians: Technician[]
): ServiceDisplayInfo => {
  const statusConfig = getServiceStatusConfig(service.status as keyof typeof SERVICE_STATUS_CONFIG);
  const priorityConfig = getServicePriorityConfig(service.priority as keyof typeof SERVICE_PRIORITY_CONFIG);
  
  return {
    statusColor: statusConfig.color,
    statusIcon: statusConfig.icon,
    priorityColor: priorityConfig.color,
    priorityIcon: priorityConfig.icon,
    technicianName: getTechnicianDisplayInfo(service.technician_id, technicians),
    branchName: getBranchDisplayInfo(service.branchId, branches),
    formattedPrice: formatServicePrice(service.price),
    formattedDate: formatServiceDate(service.createdAt),
    age: getServiceAge(service.createdAt)
  };
};

// Calculate service statistics


// Get service statistics from a list of services
export const calculateServiceStats = (services: Service[]): ServiceStats => {
  const now = new Date();
  let totalRevenue = 0;
  let totalCompletionTime = 0;
  let completedCount = 0;
  
  const stats = services.reduce((acc, service) => {
    // Count by status
    switch (service.status) {
      case 'completed':
        acc.completed++;
        totalRevenue += service.price;
        if (service.updatedAt) {
          totalCompletionTime += now.getTime() - service.createdAt.getTime();
          completedCount++;
        }
        break;
      case 'in_progress':
        acc.inProgress++;
        break;
      case 'pending':
        acc.pending++;
        break;
      case 'on_hold':
        acc.onHold++;
        break;
      case 'awaiting_parts':
        acc.awaitingParts++;
        break;
    }
    return acc;
  }, {
    total: services.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    onHold: 0,
    awaitingParts: 0,
    totalRevenue: 0,
    averageCompletionTime: 0
  });
  
  stats.totalRevenue = totalRevenue;
  stats.averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;
  
  return stats;
};

// Validate service form data


// Validate service form data
export const validateServiceForm = (data: any): ServiceValidationErrors => {
  const errors: ServiceValidationErrors = {};

  // Customer validation
  if (!data.customer?.name?.trim()) {
    errors.customerName = "Customer name is required";
  }
  if (!data.customer?.phone?.trim()) {
    errors.customerPhone = "Customer phone is required";
  } else if (!/^[0-9+\-\s()]{10,}$/.test(data.customer.phone)) {
    errors.customerPhone = "Please enter a valid phone number";
  }

  // Device validation
  if (!data.device?.brand?.trim()) {
    errors.deviceBrand = "Device brand is required";
  }
  if (!data.device?.model?.trim()) {
    errors.deviceModel = "Device model is required";
  }
  if (!data.device?.imei?.trim()) {
    errors.deviceImei = "Device IMEI is required";
  }

  // Service validation
  if (!data.service?.name?.trim()) {
    errors.serviceName = "Service name is required";
  }
  if (!data.service?.description?.trim()) {
    errors.serviceDescription = "Service description is required";
  }
  if (!data.service?.price?.trim()) {
    errors.servicePrice = "Service price is required";
  } else if (isNaN(Number(data.service.price)) || Number(data.service.price) <= 0) {
    errors.servicePrice = "Please enter a valid price";
  }
  if (!data.service?.branchId?.trim()) {
    errors.branchId = "Branch selection is required";
  }

  return errors;
};
