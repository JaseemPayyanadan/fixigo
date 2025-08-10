"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useUser } from "@/hooks/useUser";

import PermissionGuard from "./auth/PermissionGuard";

export default function RBACDemo() {
  const { user, loading } = useUser();
  const {
    permissions,
    accessibleResources,
    hasElevatedPermissions,
    canManageUsers,
    isShopAdminOrHigher,
    isBranchAdminOrHigher,
    canManageShop,
    canViewShop,
    canDeleteShop,
    canManageBranch,
    canViewBranch,
    canDeleteBranch,
    canManageTechnician,
    canViewTechnician,
    canDeleteTechnician,
    canManageService,
    canViewService,
    canDeleteService,
    canManageTask,
    canViewTask,
    canDeleteTask,
    canManageUser,
    canViewUser,
    canDeleteUser,
  } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view RBAC demo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Role-Based Access Control Demo</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">This page demonstrates the role-based access control system. You can see your current permissions and test different access levels.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Name:</span> {user.name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Role:</span> {user.role}
              </div>
              <div>
                <span className="font-medium">Shop ID:</span> {user.shopId || "Not assigned"}
              </div>
              <div>
                <span className="font-medium">Branch ID:</span> {user.branchId || "Not assigned"}
              </div>
              <div>
                <span className="font-medium">Onboarding Completed:</span> {user.onboardingCompleted ? "Yes" : "No"}
              </div>
            </div>
          </div>

          {/* Permissions Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Permissions Overview</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Total Permissions:</span> {permissions.length}
              </div>
              <div>
                <span className="font-medium">Has Elevated Permissions:</span> {hasElevatedPermissions ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-medium">Can Manage Users:</span> {canManageUsers ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-medium">Is Shop Admin or Higher:</span> {isShopAdminOrHigher ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-medium">Is Branch Admin or Higher:</span> {isBranchAdminOrHigher ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-medium">User Scope:</span> {userScope || "None"}
              </div>
            </div>
          </div>

          {/* Permission Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Shop Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage shop:</span> {canManageShop() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view shop:</span> {canViewShop() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete shop:</span> {canDeleteShop() ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Branch Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage branch:</span> {canManageBranch() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view branch:</span> {canViewBranch() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete branch:</span> {canDeleteBranch() ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Technician Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage technician:</span> {canManageTechnician() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view technician:</span> {canViewTechnician() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete technician:</span> {canDeleteTechnician() ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Service Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage service:</span> {canManageService() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view service:</span> {canViewService() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete service:</span> {canDeleteService() ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Task Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage task:</span> {canManageTask() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view task:</span> {canViewTask() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete task:</span> {canDeleteTask() ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">User Permissions</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can manage user:</span> {canManageUser() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can view user:</span> {canViewUser() ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete user:</span> {canDeleteUser() ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Testing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Testing</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Role Checks</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Has shop_admin role:</span> {hasRole("shop_admin") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Has branch_admin role:</span> {hasRole("branch_admin") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Has technician role:</span> {hasRole("technician") ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Permission Checks</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can read shop:</span> {hasPermission("shop:read") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can write shop:</span> {hasPermission("shop:write") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete shop:</span> {hasPermission("shop:delete") ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">CRUD Operations</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Can create services:</span> {canCreate("service") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can read services:</span> {canRead("service") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can update services:</span> {canUpdate("service") ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium">Can delete services:</span> {canDelete("service") ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Rendering Demo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Conditional Rendering Demo</h2>
            <div className="space-y-4">
              <PermissionGuard permissions={["shop:read"]} fallback={<div className="text-red-500">You don&apos;t have permission to view this content</div>}>
                <div className="text-green-600">✅ You can view shop information</div>
              </PermissionGuard>

              <PermissionGuard permissions={["shop:write", "shop:delete"]} requireAll={false} fallback={<div className="text-red-500">You don&apos;t have permission to manage shops</div>}>
                <div className="text-green-600">✅ You can manage shops (write or delete)</div>
              </PermissionGuard>

              <PermissionGuard permissions={["shop:write", "shop:delete"]} requireAll={true} fallback={<div className="text-red-500">You don&apos;t have ALL shop management permissions</div>}>
                <div className="text-green-600">✅ You have ALL shop management permissions</div>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
