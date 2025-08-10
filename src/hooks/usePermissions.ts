"use client";
import { authUserToUser } from "@/lib/auth";
import { canAccessBranch, canAccessShop, canDeleteResource, canManageResource, canViewResource, CRUD_PERMISSIONS, getUserPermissions, hasAllPermissions, hasAnyPermission, hasAnyRole, hasPermission, hasRole, hasRoleLevel, PERMISSION_ACTIONS, PermissionUtils } from "@/lib/rbac";
import type { Permission, Role } from "@/types";

import { useUser } from "./useUser";

export function usePermissions() {
  const { user } = useUser();

  if (!user) {
    return {
      permissions: [],
      accessibleResources: [],
      hasElevatedPermissions: false,
      canManageUsers: false,
      isShopAdminOrHigher: false,
      isBranchAdminOrHigher: false,
      userScope: null,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasRoleLevel: () => false,
      canAccessShop: () => false,
      canAccessBranch: () => false,
      canViewResource: () => false,
      canManageResource: () => false,
      canDeleteResource: () => false,
      canCreate: () => false,
      canRead: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      canManageShop: () => false,
      canViewShop: () => false,
      canDeleteShop: () => false,
      canManageBranch: () => false,
      canViewBranch: () => false,
      canDeleteBranch: () => false,
      canManageTechnician: () => false,
      canViewTechnician: () => false,
      canDeleteTechnician: () => false,
      canManageService: () => false,
      canViewService: () => false,
      canDeleteService: () => false,

      canManageUser: () => false,
      canViewUser: () => false,
      canDeleteUser: () => false,
      canManageReport: () => false,
      canViewReport: () => false,
      canManageSetting: () => false,
      canViewSetting: () => false,
    };
  }

  // Convert AuthUser to User type for compatibility
  const userForPermissions = authUserToUser(user);

  return {
    permissions: getUserPermissions(userForPermissions),
    accessibleResources: PermissionUtils.getAccessibleResources(userForPermissions),
    hasElevatedPermissions: PermissionUtils.hasElevatedPermissions(userForPermissions),
    canManageUsers: PermissionUtils.canManageUsers(userForPermissions),
    isShopAdminOrHigher: PermissionUtils.isShopAdminOrHigher(userForPermissions),
    isBranchAdminOrHigher: PermissionUtils.isBranchAdminOrHigher(userForPermissions),
    userScope: PermissionUtils.getUserScope(userForPermissions),
    hasPermission: (permission: Permission) => hasPermission(userForPermissions, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userForPermissions, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userForPermissions, permissions),
    hasRole: (role: Role) => hasRole(userForPermissions, role),
    hasAnyRole: (roles: Role[]) => hasAnyRole(userForPermissions, roles),
    hasRoleLevel: (requiredRole: Role) => hasRoleLevel(userForPermissions, requiredRole),
    canAccessShop: (shopId: string) => canAccessShop(userForPermissions, shopId),
    canAccessBranch: (branchId: string) => canAccessBranch(userForPermissions, branchId),
    canViewResource: (resourceType: string, resourceData: any) => canViewResource(userForPermissions, resourceType, resourceData),
    canManageResource: (resourceType: string, resourceData: any) => canManageResource(userForPermissions, resourceType, resourceData),
    canDeleteResource: (resourceType: string, resourceData: any) => canDeleteResource(userForPermissions, resourceType, resourceData),
    canCreate: (resourceType: string) => CRUD_PERMISSIONS.canCreate(userForPermissions, resourceType),
    canRead: (resourceType: string) => CRUD_PERMISSIONS.canRead(userForPermissions, resourceType),
    canUpdate: (resourceType: string) => CRUD_PERMISSIONS.canUpdate(userForPermissions, resourceType),
    canDelete: (resourceType: string) => CRUD_PERMISSIONS.canDelete(userForPermissions, resourceType),
    canManageShop: () => PERMISSION_ACTIONS.canManageShop(userForPermissions),
    canViewShop: () => PERMISSION_ACTIONS.canViewShop(userForPermissions),
    canDeleteShop: () => PERMISSION_ACTIONS.canDeleteShop(userForPermissions),
    canManageBranch: () => PERMISSION_ACTIONS.canManageBranch(userForPermissions),
    canViewBranch: () => PERMISSION_ACTIONS.canViewBranch(userForPermissions),
    canDeleteBranch: () => PERMISSION_ACTIONS.canDeleteBranch(userForPermissions),
    canManageTechnician: () => PERMISSION_ACTIONS.canManageTechnician(userForPermissions),
    canViewTechnician: () => PERMISSION_ACTIONS.canViewTechnician(userForPermissions),
    canDeleteTechnician: () => PERMISSION_ACTIONS.canDeleteTechnician(userForPermissions),
    canManageService: () => PERMISSION_ACTIONS.canManageService(userForPermissions),
    canViewService: () => PERMISSION_ACTIONS.canViewService(userForPermissions),
    canDeleteService: () => PERMISSION_ACTIONS.canDeleteService(userForPermissions),

    canManageUser: () => PERMISSION_ACTIONS.canManageUser(userForPermissions),
    canViewUser: () => PERMISSION_ACTIONS.canViewUser(userForPermissions),
    canDeleteUser: () => PERMISSION_ACTIONS.canDeleteUser(userForPermissions),
    canManageReport: () => PERMISSION_ACTIONS.canManageReport(userForPermissions),
    canViewReport: () => PERMISSION_ACTIONS.canViewReport(userForPermissions),
    canManageSetting: () => PERMISSION_ACTIONS.canManageSetting(userForPermissions),
    canViewSetting: () => PERMISSION_ACTIONS.canViewSetting(userForPermissions),
  };
}
