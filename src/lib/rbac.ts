import type { Role, Permission, RolePermissions, User } from "@/types";

// Type definitions for permission checking
export interface ResourceAccess {
  resourceType: string;
  resourceId: string;
  shopId?: string;
  branchId?: string;
}

export interface PermissionContext {
  user: User;
  resource?: ResourceAccess;
}

// Enhanced role hierarchy and permissions configuration
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  shop_admin: {
    role: "shop_admin",
    permissions: [
      "dashboard:read",
      "shop:read", "shop:write", "shop:delete",
      "branch:read", "branch:write", "branch:delete",
      "technician:read", "technician:write", "technician:delete",
      "service:read", "service:write", "service:delete",
      "invoice:read", "invoice:write", "invoice:delete",
      "task:read", "task:write", "task:delete",
      "user:read", "user:write", "user:delete",
      "report:read", "report:write",
      "setting:read", "setting:write"
    ]
  },
  branch_admin: {
    role: "branch_admin",
    permissions: [
      "dashboard:read",
      "branch:read", "branch:write",
      "technician:read", "technician:write",
      "service:read", "service:write",
      "invoice:read", "invoice:write",
      "task:read", "task:write",
      "user:read",
      "report:read",
      "setting:read"
    ],
    inheritsFrom: ["shop_admin"]
  },
  technician: {
    role: "technician",
    permissions: [
      "dashboard:read",
      "service:read", "service:write",
      "task:read", "task:write",
      "user:read", // Allow technicians to read their own user data
      "invoice:read", // Allow technicians to read invoices for their services
      // Allow technicians to read their own data
    ]
  }
};

// Role hierarchy levels
export const ROLE_LEVELS: Record<Role, number> = {
  shop_admin: 1,
  branch_admin: 2,
  technician: 3 // Lowest level
};

// Get all permissions for a role (including inherited)
export function getRolePermissions(role: Role): Permission[] {
  const roleConfig = ROLE_PERMISSIONS[role];
  if (!roleConfig) return [];

  const permissions = new Set<Permission>(roleConfig.permissions);

  // Add inherited permissions
  if (roleConfig.inheritsFrom) {
    roleConfig.inheritsFrom.forEach(inheritedRole => {
      const inheritedPermissions = getRolePermissions(inheritedRole);
      inheritedPermissions.forEach(permission => permissions.add(permission));
    });
  }

  return Array.from(permissions);
}

// Get all permissions for a user (role-based)
export function getUserPermissions(user: User): Permission[] {
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions;
}

// Check if user has a specific permission
export function hasPermission(user: User, permission: Permission): boolean {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
}

// Check if user has any of the specified permissions
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }
  const userPermissions = getUserPermissions(user);
  return permissions.some(permission => userPermissions.includes(permission));
}

// Check if user has all of the specified permissions
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }
  const userPermissions = getUserPermissions(user);
  return permissions.every(permission => userPermissions.includes(permission));
}

// Check if user has a specific role
export function hasRole(user: User, role: Role): boolean {
  return user.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(user: User, roles: Role[]): boolean {
  return roles.includes(user.role);
}

// Check if user has a higher or equal role level
export function hasRoleLevel(user: User, requiredRole: Role): boolean {
  const userLevel = ROLE_LEVELS[user.role];
  const requiredLevel = ROLE_LEVELS[requiredRole];
  return userLevel <= requiredLevel; // Lower number = higher level
}

// Check if user can access a specific shop
export function canAccessShop(user: User, shopId: string): boolean {
  return user.shopId === shopId;
}

// Check if user can access a specific branch
export function canAccessBranch(user: User, branchId: string): boolean {
  if (user.role === "shop_admin") return true; // Shop admins can access all branches in their shop
  return user.branchId === branchId;
}

// Resource data interface for type safety
interface ResourceData {
  shopId?: string;
  branchId?: string;
  id?: string;
  [key: string]: unknown;
}

// Check if user can manage a specific resource
export function canManageResource(user: User, resourceType: string, resourceData?: ResourceData): boolean {
  switch (resourceType) {
    case "shop":
      return hasPermission(user, "shop:write") && canAccessShop(user, resourceData?.shopId || resourceData?.id || "");
    case "branch":
      return hasPermission(user, "branch:write") && canAccessBranch(user, resourceData?.branchId || resourceData?.id || "");
    case "technician":
      return hasPermission(user, "technician:write") && canAccessBranch(user, resourceData?.branchId || "");
    case "service":
      return hasPermission(user, "service:write") && canAccessBranch(user, resourceData?.branchId || "");
    case "invoice":
      return hasPermission(user, "invoice:write") && canAccessBranch(user, resourceData?.branchId || "");
    case "task":
      return hasPermission(user, "task:write") && canAccessBranch(user, resourceData?.branchId || "");
    case "user":
      return hasPermission(user, "user:write") && canAccessShop(user, resourceData?.shopId || "");
    default:
      return false;
  }
}

// Check if user can view a specific resource
export function canViewResource(user: User, resourceType: string, resourceData?: ResourceData): boolean {
  switch (resourceType) {
    case "shop":
      return hasPermission(user, "shop:read") && canAccessShop(user, resourceData?.shopId || resourceData?.id || "");
    case "branch":
      return hasPermission(user, "branch:read") && canAccessBranch(user, resourceData?.branchId || resourceData?.id || "");
    case "technician":
      return hasPermission(user, "technician:read") && canAccessBranch(user, resourceData?.branchId || "");
    case "service":
      return hasPermission(user, "service:read") && canAccessBranch(user, resourceData?.branchId || "");
    case "invoice":
      return hasPermission(user, "invoice:read") && canAccessBranch(user, resourceData?.branchId || "");
    case "task":
      return hasPermission(user, "task:read") && canAccessBranch(user, resourceData?.branchId || "");
    case "user":
      return hasPermission(user, "user:read") && canAccessShop(user, resourceData?.shopId || "");
    default:
      return false;
  }
}

// Check if user can delete a specific resource
export function canDeleteResource(user: User, resourceType: string, resourceData?: ResourceData): boolean {
  switch (resourceType) {
    case "shop":
      return hasPermission(user, "shop:delete") && canAccessShop(user, resourceData?.shopId || resourceData?.id || "");
    case "branch":
      return hasPermission(user, "branch:delete") && canAccessBranch(user, resourceData?.branchId || resourceData?.id || "");
    case "technician":
      return hasPermission(user, "technician:delete") && canAccessBranch(user, resourceData?.branchId || "");
    case "service":
      return hasPermission(user, "service:delete") && canAccessBranch(user, resourceData?.branchId || "");
    case "invoice":
      return hasPermission(user, "invoice:delete") && canAccessBranch(user, resourceData?.branchId || "");
    case "task":
      return hasPermission(user, "task:delete") && canAccessBranch(user, resourceData?.branchId || "");
    case "user":
      return hasPermission(user, "user:delete") && canAccessShop(user, resourceData?.shopId || "");
    default:
      return false;
  }
}

// Check if user can access a specific resource
export function canAccessResource(context: PermissionContext): boolean {
  const { user, resource } = context;
  
  if (!resource) return true; // No resource context, allow access
  
  // Shop admin can access any resource in their shop
  
  // Shop admin can access resources in their shop
  if (user.role === "shop_admin") {
    if (resource.shopId && resource.shopId !== user.shopId) {
      return false;
    }
    return true;
  }
  
  // Branch admin can access resources in their branch
  if (user.role === "branch_admin") {
    if (resource.branchId && resource.branchId !== user.branchId) {
      return false;
    }
    if (resource.shopId && resource.shopId !== user.shopId) {
      return false;
    }
    return true;
  }
  
  // Technicians can access their own resources
  if (user.role === "technician") {
    if (resource.resourceType === "worklog") {
      return resource.resourceId === user.uid;
    }
    // Technicians can read services and tasks assigned to them
    if (resource.resourceType === "service" || resource.resourceType === "task") {
      return true; // Simplified - in real app, check if assigned to technician
    }
    return false;
  }
  
  return false;
}

// Permission-based access control for common actions
export const PERMISSION_ACTIONS = {
  // Shop management
  canManageShop: (user: User) => hasPermission(user, "shop:write"),
  canViewShop: (user: User) => hasPermission(user, "shop:read"),
  canDeleteShop: (user: User) => hasPermission(user, "shop:delete"),
  
  // Branch management
  canManageBranch: (user: User) => hasPermission(user, "branch:write"),
  canViewBranch: (user: User) => hasPermission(user, "branch:read"),
  canDeleteBranch: (user: User) => hasPermission(user, "branch:delete"),
  
  // Technician management
  canManageTechnician: (user: User) => hasPermission(user, "technician:write"),
  canViewTechnician: (user: User) => hasPermission(user, "technician:read"),
  canDeleteTechnician: (user: User) => hasPermission(user, "technician:delete"),
  
  // Service management
  canManageService: (user: User) => hasPermission(user, "service:write"),
  canViewService: (user: User) => hasPermission(user, "service:read"),
  canDeleteService: (user: User) => hasPermission(user, "service:delete"),
  
  // Invoice management
  canManageInvoice: (user: User) => hasPermission(user, "invoice:write"),
  canViewInvoice: (user: User) => hasPermission(user, "invoice:read"),
  canDeleteInvoice: (user: User) => hasPermission(user, "invoice:delete"),
  
  // Task management
  canManageTask: (user: User) => hasPermission(user, "task:write"),
  canViewTask: (user: User) => hasPermission(user, "task:read"),
  canDeleteTask: (user: User) => hasPermission(user, "task:delete"),
  
  // User management
  canManageUser: (user: User) => hasPermission(user, "user:write"),
  canViewUser: (user: User) => hasPermission(user, "user:read"),
  canDeleteUser: (user: User) => hasPermission(user, "user:delete"),
  
  // Report management
  canManageReport: (user: User) => hasPermission(user, "report:write"),
  canViewReport: (user: User) => hasPermission(user, "report:read"),
  
  // Setting management
  canManageSetting: (user: User) => hasPermission(user, "setting:write"),
  canViewSetting: (user: User) => hasPermission(user, "setting:read"),
} as const;

// CRUD permission helpers
export const CRUD_PERMISSIONS = {
  // Create permissions
  canCreate: (user: User, resourceType: string): boolean => {
    const permission = `${resourceType}:write` as Permission;
    return hasPermission(user, permission);
  },
  
  // Read permissions
  canRead: (user: User, resourceType: string): boolean => {
    const permission = `${resourceType}:read` as Permission;
    return hasPermission(user, permission);
  },
  
  // Update permissions
  canUpdate: (user: User, resourceType: string): boolean => {
    const permission = `${resourceType}:write` as Permission;
    return hasPermission(user, permission);
  },
  
  // Delete permissions
  canDelete: (user: User, resourceType: string): boolean => {
    const permission = `${resourceType}:delete` as Permission;
    return hasPermission(user, permission);
  },
} as const;

// Resource access utilities
export const PermissionUtils = {
  // Get accessible resources for a user
  getAccessibleResources: (user: User): string[] => {
    const resources: string[] = [];
    
    if (hasPermission(user, "shop:read")) resources.push("shop");
    if (hasPermission(user, "branch:read")) resources.push("branch");
    if (hasPermission(user, "technician:read")) resources.push("technician");
    if (hasPermission(user, "service:read")) resources.push("service");
    if (hasPermission(user, "invoice:read")) resources.push("invoice");
    if (hasPermission(user, "task:read")) resources.push("task");
    if (hasPermission(user, "user:read")) resources.push("user");
    if (hasPermission(user, "report:read")) resources.push("report");
    if (hasPermission(user, "setting:read")) resources.push("setting");
    
    return resources;
  },
  
  // Check if user has elevated permissions (admin-like)
  hasElevatedPermissions: (user: User): boolean => {
    return user.role === "shop_admin" || hasPermission(user, "user:delete");
  },
  
  // Check if user can manage other users
  canManageUsers: (user: User): boolean => {
    return hasPermission(user, "user:write") || hasPermission(user, "user:delete");
  },
  
  // Check if user is shop admin or higher
  isShopAdminOrHigher: (user: User): boolean => {
    return user.role === "shop_admin";
  },
  
  // Check if user is branch admin or higher
  isBranchAdminOrHigher: (user: User): boolean => {
    return user.role === "shop_admin" || user.role === "branch_admin";
  },
  
  // Get user's scope (shop, branch, or global)
  getUserScope: (user: User): "global" | "shop" | "branch" => {
    if (user.role === "shop_admin") return "shop";
    return "branch";
  },
} as const; 