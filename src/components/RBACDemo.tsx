"use client"
import { usePermissions } from "@/hooks/usePermissions";
import { RoleGuard, PermissionGuard } from "@/components";


export default function RBACDemo() {
  const {
    user,
    loading,
    permissions,
    rolePermissions,
    accessibleResources,
    hasElevatedPermissions,
    canManageUsers,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    checkRole,
    checkAnyRole,

    canCreate,
    canRead,
    canUpdate,
    canDelete,
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
    canManageInvoice,
    canViewInvoice,
    canDeleteInvoice,
    canManageTask,
    canViewTask,
    canDeleteTask,
    canManageUser,
    canViewUser,
    canDeleteUser,
    canManageOnboarding,
  } = usePermissions();

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">RBAC System Demo</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">RBAC System Demo</h2>
        <p className="text-gray-600">Please log in to see the RBAC demo.</p>
      </div>
    );
  }



  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">RBAC System Demo</h2>
      
      {/* User Information */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">User Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
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
            <span className="font-medium">Shop ID:</span> {user.shopId || "N/A"}
          </div>
          <div>
            <span className="font-medium">Branch ID:</span> {user.branchId || "N/A"}
          </div>
          <div>
            <span className="font-medium">Elevated Permissions:</span> {hasElevatedPermissions ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Permissions Display */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Permissions</h3>
        <div className="space-y-2">
          <div>
            <span className="font-medium">All Permissions ({permissions.length}):</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {permissions.map((permission) => (
                <span key={permission} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {permission}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Role Permissions ({rolePermissions.length}):</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {rolePermissions.map((permission) => (
                <span key={permission} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  {permission}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Accessible Resources:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {accessibleResources.map((resource) => (
                <span key={resource} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  {resource}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Permission Checking Examples */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Permission Checking Examples</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Can manage shop:</span> {canManageShop() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view shop:</span> {canViewShop() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage branch:</span> {canManageBranch() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view branch:</span> {canViewBranch() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage technician:</span> {canManageTechnician() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view technician:</span> {canViewTechnician() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage service:</span> {canManageService() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view service:</span> {canViewService() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage invoice:</span> {canManageInvoice() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view invoice:</span> {canViewInvoice() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage task:</span> {canManageTask() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view task:</span> {canViewTask() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage user:</span> {canManageUser() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can view user:</span> {canViewUser() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage onboarding:</span> {canManageOnboarding() ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can manage users:</span> {canManageUsers ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* CRUD Permission Examples */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">CRUD Permission Examples</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Can create service:</span> {canCreate("service") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can read service:</span> {canRead("service") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can update service:</span> {canUpdate("service") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can delete service:</span> {canDelete("service") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can create branch:</span> {canCreate("branch") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can read branch:</span> {canRead("branch") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can update branch:</span> {canUpdate("branch") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Can delete branch:</span> {canDelete("branch") ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Role and Permission Checking Examples */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Role and Permission Checking Examples</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Is shop admin:</span> {checkRole("shop_admin") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Is branch admin:</span> {checkRole("branch_admin") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Is technician:</span> {checkRole("technician") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Is admin or shop admin:</span> {checkAnyRole(["shop_admin", "branch_admin"]) ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Has shop:read:</span> {checkPermission("shop:read") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Has shop:write:</span> {checkPermission("shop:write") ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Has any shop permission:</span> {checkAnyPermission(["shop:read", "shop:write", "shop:delete"]) ? "Yes" : "No"}
          </div>
          <div>
            <span className="font-medium">Has all shop permissions:</span> {checkAllPermissions(["shop:read", "shop:write"]) ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Component Examples */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Component Examples</h3>
        
        {/* RoleGuard Example */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">RoleGuard Example (Shop Admin Only):</h4>
          <RoleGuard allowedRoles={["shop_admin"]} fallback={<p className="text-red-600">Access denied: Shop admin required</p>}>
            <p className="text-green-600">✅ You have shop admin access!</p>
          </RoleGuard>
        </div>

        {/* PermissionGuard Example */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">PermissionGuard Example (Service Management):</h4>
          <PermissionGuard 
            permissions={["service:write"]} 
            fallback={<p className="text-red-600">Access denied: Service write permission required</p>}
          >
            <p className="text-green-600">✅ You can manage services!</p>
          </PermissionGuard>
        </div>



        {/* Multiple Permissions Example */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">Multiple Permissions (Any):</h4>
          <PermissionGuard 
            permissions={["shop:read", "branch:read", "service:read"]} 
            requireAll={false}
            fallback={<p className="text-red-600">Access denied: Need at least one read permission</p>}
          >
            <p className="text-green-600">✅ You have at least one read permission!</p>
          </PermissionGuard>
        </div>

        {/* Multiple Permissions Example (All Required) */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">Multiple Permissions (All Required):</h4>
          <PermissionGuard 
            permissions={["service:read", "service:write"]} 
            requireAll={true}
            fallback={<p className="text-red-600">Access denied: Need both read and write permissions</p>}
          >
            <p className="text-green-600">✅ You have both read and write permissions!</p>
          </PermissionGuard>
        </div>
      </div>
    </div>
  );
} 