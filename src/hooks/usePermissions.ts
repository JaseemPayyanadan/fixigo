import { useMemo } from "react";
import { useUser } from "./useUser";
import { 
  getUserPermissions, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  hasRole, 
  hasAnyRole,
  hasRoleLevel,
  canAccessShop,
  canAccessBranch,
  canManageResource,
  canViewResource,
  canDeleteResource,
  PERMISSION_ACTIONS,
  CRUD_PERMISSIONS,
  PermissionUtils
} from "@/lib/rbac";
import type { Permission, Role } from "@/types";

// Resource data interface for type safety
interface ResourceData {
  shopId?: string;
  branchId?: string;
  id?: string;
  [key: string]: unknown;
}

export function usePermissions() {
  const { user, loading } = useUser();

  // Memoized permission calculations
  const permissions = useMemo(() => {
    if (!user) return [];
    return getUserPermissions(user);
  }, [user]);

  const rolePermissions = useMemo(() => {
    if (!user?.role) return [];
    return getUserPermissions(user);
  }, [user?.role]);

  const accessibleResources = useMemo(() => {
    if (!user) return [];
    return PermissionUtils.getAccessibleResources(user);
  }, [user]);

  const hasElevatedPermissions = useMemo(() => {
    if (!user) return false;
    return PermissionUtils.hasElevatedPermissions(user);
  }, [user]);

  const canManageUsers = useMemo(() => {
    if (!user) return false;
    return PermissionUtils.canManageUsers(user);
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return PermissionUtils.isSuperAdmin(user);
  }, [user]);

  const isShopAdminOrHigher = useMemo(() => {
    if (!user) return false;
    return PermissionUtils.isShopAdminOrHigher(user);
  }, [user]);

  const isBranchAdminOrHigher = useMemo(() => {
    if (!user) return false;
    return PermissionUtils.isBranchAdminOrHigher(user);
  }, [user]);

  const userScope = useMemo(() => {
    if (!user) return "branch";
    return PermissionUtils.getUserScope(user);
  }, [user]);

  // Permission checking functions
  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user, permission);
  };

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user, permissions);
  };

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user, permissions);
  };

  // Role checking functions
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    return hasRole(user, role);
  };

  const checkAnyRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return hasAnyRole(user, roles);
  };

  const checkRoleLevel = (requiredRole: Role): boolean => {
    if (!user) return false;
    return hasRoleLevel(user, requiredRole);
  };

  // Resource access checking functions
  const checkShopAccess = (shopId: string): boolean => {
    if (!user) return false;
    return canAccessShop(user, shopId);
  };

  const checkBranchAccess = (branchId: string): boolean => {
    if (!user) return false;
    return canAccessBranch(user, branchId);
  };

  const checkResourceAccess = (resourceType: string, resourceData?: ResourceData): boolean => {
    if (!user) return false;
    return canViewResource(user, resourceType, resourceData);
  };

  const checkResourceManagement = (resourceType: string, resourceData?: ResourceData): boolean => {
    if (!user) return false;
    return canManageResource(user, resourceType, resourceData);
  };

  const checkResourceDeletion = (resourceType: string, resourceData?: ResourceData): boolean => {
    if (!user) return false;
    return canDeleteResource(user, resourceType, resourceData);
  };

  // CRUD permission helpers
  const canCreate = (resourceType: string): boolean => {
    if (!user) return false;
    return CRUD_PERMISSIONS.canCreate(user, resourceType);
  };

  const canRead = (resourceType: string): boolean => {
    if (!user) return false;
    return CRUD_PERMISSIONS.canRead(user, resourceType);
  };

  const canUpdate = (resourceType: string): boolean => {
    if (!user) return false;
    return CRUD_PERMISSIONS.canUpdate(user, resourceType);
  };

  const canDelete = (resourceType: string): boolean => {
    if (!user) return false;
    return CRUD_PERMISSIONS.canDelete(user, resourceType);
  };

  // Specific permission actions
  const canManageShop = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageShop(user);
  };

  const canViewShop = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewShop(user);
  };

  const canDeleteShop = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteShop(user);
  };

  const canManageBranch = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageBranch(user);
  };

  const canViewBranch = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewBranch(user);
  };

  const canDeleteBranch = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteBranch(user);
  };

  const canManageTechnician = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageTechnician(user);
  };

  const canViewTechnician = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewTechnician(user);
  };

  const canDeleteTechnician = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteTechnician(user);
  };

  const canManageService = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageService(user);
  };

  const canViewService = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewService(user);
  };

  const canDeleteService = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteService(user);
  };

  const canManageInvoice = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageInvoice(user);
  };

  const canViewInvoice = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewInvoice(user);
  };

  const canDeleteInvoice = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteInvoice(user);
  };

  const canManageTask = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageTask(user);
  };

  const canViewTask = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewTask(user);
  };

  const canDeleteTask = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteTask(user);
  };

  const canManageUser = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageUser(user);
  };

  const canViewUser = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewUser(user);
  };

  const canDeleteUser = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteUser(user);
  };

  // New collection permissions
  const canManageReport = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageReport(user);
  };

  const canViewReport = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewReport(user);
  };

  const canDeleteReport = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteReport(user);
  };

  const canManageFeedback = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageFeedback(user);
  };

  const canViewFeedback = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewFeedback(user);
  };

  const canDeleteFeedback = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteFeedback(user);
  };

  const canManageWorkLog = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageWorkLog(user);
  };

  const canViewWorkLog = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewWorkLog(user);
  };

  const canDeleteWorkLog = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteWorkLog(user);
  };

  const canManageNotification = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageNotification(user);
  };

  const canViewNotification = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewNotification(user);
  };

  const canDeleteNotification = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteNotification(user);
  };

  const canViewAudit = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewAudit(user);
  };

  const canWriteAudit = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canWriteAudit(user);
  };

  const canManageSetting = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageSetting(user);
  };

  const canViewSetting = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canViewSetting(user);
  };

  const canDeleteSetting = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canDeleteSetting(user);
  };

  const canManageOnboarding = (): boolean => {
    if (!user) return false;
    return PERMISSION_ACTIONS.canManageOnboarding(user);
  };

  return {
    // User state
    user,
    loading,
    
    // Permission arrays
    permissions,
    rolePermissions,
    accessibleResources,
    
    // Permission checks
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    
    // Role checks
    checkRole,
    checkAnyRole,
    checkRoleLevel,
    
    // Resource access checks
    checkShopAccess,
    checkBranchAccess,
    checkResourceAccess,
    checkResourceManagement,
    checkResourceDeletion,
    
    // CRUD operations
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    
    // Shop permissions
    canManageShop,
    canViewShop,
    canDeleteShop,
    
    // Branch permissions
    canManageBranch,
    canViewBranch,
    canDeleteBranch,
    
    // Technician permissions
    canManageTechnician,
    canViewTechnician,
    canDeleteTechnician,
    
    // Service permissions
    canManageService,
    canViewService,
    canDeleteService,
    
    // Invoice permissions
    canManageInvoice,
    canViewInvoice,
    canDeleteInvoice,
    
    // Task permissions
    canManageTask,
    canViewTask,
    canDeleteTask,
    
    // User permissions
    canManageUser,
    canViewUser,
    canDeleteUser,
    
    // Report permissions
    canManageReport,
    canViewReport,
    canDeleteReport,
    
    // Feedback permissions
    canManageFeedback,
    canViewFeedback,
    canDeleteFeedback,
    
    // Work log permissions
    canManageWorkLog,
    canViewWorkLog,
    canDeleteWorkLog,
    
    // Notification permissions
    canManageNotification,
    canViewNotification,
    canDeleteNotification,
    
    // Audit permissions
    canViewAudit,
    canWriteAudit,
    
    // Setting permissions
    canManageSetting,
    canViewSetting,
    canDeleteSetting,
    
    // Onboarding permissions
    canManageOnboarding,
    
    // User level checks
    hasElevatedPermissions,
    canManageUsers,
    isSuperAdmin,
    isShopAdminOrHigher,
    isBranchAdminOrHigher,
    userScope,
  };
} 