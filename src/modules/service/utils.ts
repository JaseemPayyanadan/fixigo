import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, CubeIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PauseIcon, TruckIcon, XCircleIcon } from "@heroicons/react/24/outline";

import type { Branch, Service, Technician, User } from "@/types";


import type { ServiceActions, ServiceDisplayInfo, ServiceFilters, ServiceValidationErrors } from "./types";

// Validation Functions
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

// Formatting Functions
export const formatServicePrice = (price: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatServiceDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

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

// Status and Priority Functions
export const getServiceStatusConfig = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ClockIcon,
    },
    in_progress: {
      label: "In Progress",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: ExclamationTriangleIcon,
    },
    completed: {
      label: "Completed",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircleIcon,
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircleIcon,
    },
    on_hold: {
      label: "On Hold",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: PauseIcon,
    },
    awaiting_parts: {
      label: "Awaiting Parts",
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: CubeIcon,
    },
    ready_for_pickup: {
      label: "Ready for Pickup",
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: TruckIcon,
    },
    quality_check: {
      label: "Quality Check",
      color: "bg-pink-100 text-pink-800 border-pink-200",
      icon: MagnifyingGlassIcon,
    },
  };

  return statusMap[status.toLowerCase()] || statusMap["pending"];
};

export const getServicePriorityConfig = (priority: string) => {
  const priorityMap: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    low: {
      label: "Low",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: ChevronDownIcon,
    },
    medium: {
      label: "Medium",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ExclamationTriangleIcon,
    },
    high: {
      label: "High",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: ChevronUpIcon,
    },
    urgent: {
      label: "Urgent",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: ExclamationTriangleIcon,
    },
  };

  return priorityMap[priority.toLowerCase()] || priorityMap["medium"];
};

// Role-based Permission Functions
export const getServiceActions = (service: Service, user: User): ServiceActions => {
  const isShopAdmin = user.role === "shop_admin";
  const isBranchAdmin = user.role === "branch_admin";
  const isTechnician = user.role === "technician";

  // Check if user owns the service (for technicians)
  const isServiceOwner = isTechnician && (service.assignedTechnicianId === user.id || (service as any).technician_id === user.id);

  return {
    canEdit: isShopAdmin || isBranchAdmin || isServiceOwner,
    canDelete: isShopAdmin || isBranchAdmin,
    canAssign: isShopAdmin || isBranchAdmin,
    canUpdateStatus: isShopAdmin || isBranchAdmin || isServiceOwner,
    canViewDetails: true, // Everyone can view details
  };
};

export const canAccessService = (service: Service, user: User): boolean => {
  const isShopAdmin = user.role === "shop_admin";
  const isBranchAdmin = user.role === "branch_admin";
  const isTechnician = user.role === "technician";

  // Shop admin can access all services
  if (isShopAdmin) return true;

  // Branch admin can access services in their branch
  if (isBranchAdmin && service.branchId === user.branchId) return true;

  // Technician can access assigned services or services they created
  if (isTechnician) {
    const isAssigned = service.assignedTechnicianId === user.id || (service as any).technician_id === user.id;
    const isCreated = (service as any).created_by === user.id;
    return isAssigned || isCreated;
  }

  return false;
};

// Filtering Functions
export const filterServices = (services: Service[], filters: ServiceFilters): Service[] => {
  return services.filter((service) => {
    // Status filter
    if (filters.status && filters.status !== "All" && service.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority && filters.priority !== "All" && service.priority !== filters.priority) {
      return false;
    }

    // Technician filter
    if (filters.assignedTechnicianId && service.assignedTechnicianId !== filters.assignedTechnicianId && (service as any).technician_id !== filters.assignedTechnicianId) {
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

    return true;
  });
};

export const sortServices = (services: Service[], field: string, direction: "asc" | "desc"): Service[] => {
  return [...services].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (field) {
      case "createdAt":
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case "updatedAt":
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "price":
        aValue = a.price;
        bValue = b.price;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "priority":
        aValue = a.priority;
        bValue = b.priority;
        break;
      default:
        return 0;
    }

    if (direction === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

// Display Info Functions
export const getServiceDisplayInfo = (service: Service, branches: Branch[], technicians: Technician[]): ServiceDisplayInfo => {
  const statusConfig = getServiceStatusConfig(service.status);
  const priorityConfig = getServicePriorityConfig(service.priority);

  const branch = branches.find((b) => b.id === service.branchId);
  const technician = technicians.find((t) => t.id === service.assignedTechnicianId || t.id === (service as any).technician_id);

  return {
    statusColor: statusConfig.color,
    statusIcon: statusConfig.icon,
    priorityColor: priorityConfig.color,
    priorityIcon: priorityConfig.icon,
    technicianName: technician?.name || "Not assigned",
    branchName: branch?.name || "Unknown Branch",
    formattedPrice: formatServicePrice(service.price),
    formattedDate: formatServiceDate(service.createdAt),
    age: getServiceAge(service.createdAt),
  };
};

// Form Field Configuration
export const getFormFieldConfig = (user: User) => {
  const isShopAdmin = user.role === "shop_admin";
  const isBranchAdmin = user.role === "branch_admin";
  const isTechnician = user.role === "technician";

  return {
    showBranchSelection: isShopAdmin,
    showTechnicianSelection: isShopAdmin || isBranchAdmin,
    showPrioritySelection: isShopAdmin || isBranchAdmin,
    showEstimatedDuration: isShopAdmin || isBranchAdmin,
    autoAssignTechnician: isTechnician,
    readOnlyFields: isTechnician ? ["branchId", "technician_id"] : [],
  };
};
