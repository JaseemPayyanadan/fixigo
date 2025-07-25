# RBAC System Refactor - Comprehensive Guide

## Overview

The Role-Based Access Control (RBAC) system has been completely refactored to provide a more robust, maintainable, and feature-rich solution. This document outlines the new architecture, components, and usage patterns.

## Key Improvements

### 1. **Enhanced Permission System**
- **Fine-grained permissions**: Support for specific resource permissions (read, write, delete)
- **Permission inheritance**: Roles inherit permissions from parent roles
- **Explicit permissions**: Users can have additional permissions beyond their role
- **Resource-based access control**: Permissions can be checked against specific resources

### 2. **New Components**
- **PermissionGuard**: Component for permission-based access control
- **Enhanced RoleGuard**: Improved with better error handling and options
- **usePermissions hook**: Comprehensive hook for permission checking

### 3. **Better TypeScript Support**
- **Strict typing**: All components and functions are fully typed
- **Type safety**: Compile-time checking for permissions and roles
- **IntelliSense support**: Full autocomplete and type checking

## Architecture

### Role Hierarchy
```
shop_admin (Level 0 - Highest)
├── branch_admin (Level 1)
    └── technician (Level 2 - Lowest)
```

### Permission Structure
Permissions follow the pattern: `{resource}:{action}`
- **Resources**: shop, branch, technician, service, invoice, task, user
- **Actions**: read, write, delete
- **Special**: onboarding:manage

## Components

### 1. RoleGuard

**Purpose**: Control access based on user roles.

**Props**:
- `allowedRoles`: Array of roles that can access the content
- `redirectTo`: Where to redirect unauthorized users (default: "/unauthorized")
- `fallback`: Custom fallback component
- `requireAll`: If true, user must have ALL roles. If false, user must have ANY role.

**Example**:
```tsx
import { RoleGuard } from "@/components";

// Shop admin only
<RoleGuard allowedRoles={["shop_admin"]}>
  <ShopManagementPanel />
</RoleGuard>

// Multiple roles (any)
<RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
  <AdminPanel />
</RoleGuard>

// Multiple roles (all required)
<RoleGuard allowedRoles={["shop_admin", "branch_admin"]} requireAll={true}>
  <SuperAdminPanel />
</RoleGuard>

// With custom fallback
<RoleGuard 
  allowedRoles={["shop_admin"]} 
  fallback={<CustomAccessDenied />}
>
  <ShopManagementPanel />
</RoleGuard>
```

### 2. PermissionGuard

**Purpose**: Control access based on specific permissions.

**Props**:
- `permissions`: Array of permissions required
- `requireAll`: If true, user must have ALL permissions. If false, user must have ANY permission
- `resource`: Optional resource context for resource-based access control
- `redirectTo`: Where to redirect unauthorized users
- `fallback`: Custom fallback component

**Example**:
```tsx
import { PermissionGuard } from "@/components";

// Single permission
<PermissionGuard permissions={["service:write"]}>
  <ServiceManagementPanel />
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard permissions={["service:read", "service:write"]}>
  <ServicePanel />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard 
  permissions={["service:read", "service:write"]} 
  requireAll={true}
>
  <FullServiceAccess />
</PermissionGuard>

// With resource context
<PermissionGuard 
  permissions={["service:read"]} 
  resource={{
    resourceType: "service",
    resourceId: "service-123",
    shopId: "shop-456",
    branchId: "branch-789"
  }}
>
  <ServiceDetails />
</PermissionGuard>
```

### 3. usePermissions Hook

**Purpose**: Comprehensive hook for permission checking and user state.

**Returns**:
- User information and loading state
- Permission checking functions
- Role checking functions
- Resource access checking functions
- CRUD operation functions
- Specific action permission functions

**Example**:
```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const {
    user,
    loading,
    permissions,
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
    // ... many more
  } = usePermissions();

  if (loading) return <Loading />;
  if (!user) return <LoginRequired />;

  return (
    <div>
      {/* Conditional rendering based on permissions */}
      {canManageShop() && <ShopManagementButton />}
      {canCreate("service") && <CreateServiceButton />}
      {checkPermission("invoice:read") && <InvoiceList />}
      
      {/* Conditional rendering based on roles */}
      {checkRole("shop_admin") && <AdminPanel />}
      {checkAnyRole(["shop_admin", "branch_admin"]) && <ManagementPanel />}
      
      {/* Show user permissions */}
      <div>
        <h3>Your Permissions:</h3>
        {permissions.map(permission => (
          <span key={permission}>{permission}</span>
        ))}
      </div>
    </div>
  );
}
```

## Permission Functions

### Basic Permission Checking
```tsx
const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermissions();

// Check single permission
if (checkPermission("service:write")) {
  // User can write services
}

// Check any of multiple permissions
if (checkAnyPermission(["service:read", "service:write"])) {
  // User has at least one service permission
}

// Check all permissions
if (checkAllPermissions(["service:read", "service:write"])) {
  // User has all service permissions
}
```

### Role Checking
```tsx
const { checkRole, checkAnyRole } = usePermissions();

// Check single role
if (checkRole("shop_admin")) {
  // User is shop admin
}

// Check any of multiple roles
if (checkAnyRole(["shop_admin", "branch_admin"])) {
  // User is admin or branch admin
}
```

### CRUD Operations
```tsx
const { canCreate, canRead, canUpdate, canDelete } = usePermissions();

// Check CRUD permissions for any resource
if (canCreate("service")) {
  // User can create services
}

if (canRead("branch")) {
  // User can read branches
}

if (canUpdate("technician")) {
  // User can update technicians
}

if (canDelete("invoice")) {
  // User can delete invoices
}
```

### Specific Action Permissions
```tsx
const {
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

// Use specific action permissions
if (canManageShop()) {
  // User can manage shop settings
}

if (canViewService()) {
  // User can view services
}

if (canDeleteInvoice()) {
  // User can delete invoices
}
```

### Resource Access Checking
```tsx
const { checkShopAccess, checkBranchAccess } = usePermissions();

// Check shop access
if (checkShopAccess("shop-123")) {
  // User can access this shop
}

// Check branch access
if (checkBranchAccess("branch-456")) {
  // User can access this branch
}
```

## Resource-Based Access Control

The system supports resource-based access control, allowing you to check permissions against specific resources.

### Resource Context
```tsx
import type { ResourceAccess } from "@/lib/rbac";

const resourceContext: ResourceAccess = {
  resourceType: "service",
  resourceId: "service-123",
  shopId: "shop-456",
  branchId: "branch-789"
};
```

### Using Resource Context
```tsx
import { PermissionUtils } from "@/lib/rbac";

const context = {
  user,
  resource: resourceContext
};

// Check if user can manage this specific resource
if (PermissionUtils.canManageResource(context)) {
  // User can manage this specific service
}

// Check if user can view this specific resource
if (PermissionUtils.canViewResource(context)) {
  // User can view this specific service
}
```

## Best Practices

### 1. **Use PermissionGuard for Fine-Grained Control**
```tsx
// Good: Use PermissionGuard for specific permissions
<PermissionGuard permissions={["service:write"]}>
  <ServiceForm />
</PermissionGuard>

// Avoid: Using RoleGuard for permission-based access
<RoleGuard allowedRoles={["shop_admin"]}>
  <ServiceForm />
</RoleGuard>
```

### 2. **Use RoleGuard for Role-Based Access**
```tsx
// Good: Use RoleGuard for role-based access
<RoleGuard allowedRoles={["shop_admin"]}>
  <ShopManagementPanel />
</RoleGuard>

// Avoid: Using PermissionGuard for role-based access
<PermissionGuard permissions={["shop:read", "shop:write", "shop:delete"]}>
  <ShopManagementPanel />
</PermissionGuard>
```

### 3. **Use usePermissions for Conditional Rendering**
```tsx
// Good: Use usePermissions for conditional rendering
const { canManageShop, checkPermission } = usePermissions();

return (
  <div>
    {canManageShop() && <ShopSettings />}
    {checkPermission("service:write") && <CreateServiceButton />}
  </div>
);

// Avoid: Using components for conditional rendering
{canManageShop && (
  <PermissionGuard permissions={["shop:write"]}>
    <ShopSettings />
  </PermissionGuard>
)}
```

### 4. **Combine Components for Complex Access Control**
```tsx
// Good: Combine components for complex access control
<RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
  <PermissionGuard permissions={["service:write"]}>
    <ServiceManagementPanel />
  </PermissionGuard>
</RoleGuard>
```

### 5. **Use Resource Context for Specific Resources**
```tsx
// Good: Use resource context for specific resources
<PermissionGuard 
  permissions={["service:read"]} 
  resource={{
    resourceType: "service",
    resourceId: serviceId,
    shopId: user.shopId,
    branchId: user.branchId
  }}
>
  <ServiceDetails service={service} />
</PermissionGuard>
```

## Migration Guide

### From Old RoleGuard to New System

**Before**:
```tsx
<RoleGuard allowedRoles={["shop_admin"]}>
  <Component />
</RoleGuard>
```

**After** (same functionality):
```tsx
<RoleGuard allowedRoles={["shop_admin"]}>
  <Component />
</RoleGuard>
```

**After** (with permission-based access):
```tsx
<PermissionGuard permissions={["shop:write"]}>
  <Component />
</PermissionGuard>
```

### Adding Permission-Based Access

**Before** (role-based only):
```tsx
{user?.role === "shop_admin" && <AdminPanel />}
```

**After** (permission-based):
```tsx
const { canManageShop } = usePermissions();
{canManageShop() && <AdminPanel />}
```

## Testing

### Testing Permission Guards
```tsx
// Test with different user roles
<PermissionGuard permissions={["service:write"]}>
  <ServiceForm />
</PermissionGuard>

// Test with resource context
<PermissionGuard 
  permissions={["service:read"]} 
  resource={testResource}
>
  <ServiceDetails />
</PermissionGuard>
```

### Testing usePermissions Hook
```tsx
const { checkPermission, canManageShop } = usePermissions();

// Test permission checking
expect(checkPermission("service:write")).toBe(true);
expect(canManageShop()).toBe(true);
```

## Security Considerations

1. **Client-Side Only**: This RBAC system is for client-side UI control only
2. **Server-Side Validation**: Always validate permissions on the server side
3. **Firebase Rules**: Use Firebase security rules for server-side access control
4. **Defense in Depth**: Combine multiple layers of security

## Performance Considerations

1. **Memoization**: The usePermissions hook uses useMemo for performance
2. **Lazy Loading**: Components are only rendered when permissions are checked
3. **Minimal Re-renders**: Permission checking is optimized to minimize re-renders

## Troubleshooting

### Common Issues

1. **Permission not working**: Check if the permission exists in the role configuration
2. **Role not working**: Verify the role is correctly assigned to the user
3. **Resource access denied**: Check if the resource context is correctly set
4. **Component not rendering**: Ensure the user has the required permissions/roles

### Debug Tips

1. **Use the RBACDemo component** to see all permissions and roles
2. **Check user permissions** in the browser console
3. **Verify role hierarchy** in the RBAC configuration
4. **Test with different users** to ensure proper access control

## Conclusion

The refactored RBAC system provides a comprehensive, type-safe, and flexible solution for access control in your application. It supports both role-based and permission-based access control, with resource-based access control for fine-grained security.

The system is designed to be easy to use while providing powerful features for complex access control scenarios. Use the components and hooks according to your specific needs, and always remember to validate permissions on the server side as well. 