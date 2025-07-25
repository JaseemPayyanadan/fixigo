# Firebase Security Rules Update - RBAC Alignment

## Overview

The Firebase security rules have been updated to align with the new Role-Based Access Control (RBAC) system. The rules now support both permission-based and role-based access control, ensuring proper security while maintaining backward compatibility.

## Key Changes

### 1. **Permission-Based Access Control**

The rules now include permission checking functions that match the client-side RBAC system:

```javascript
// Permission checking functions
function hasPermission(permission) {
  return permission in getUserPermissions();
}

function hasAnyPermission(permissions) {
  let userPerms = getUserPermissions();
  return permissions.hasAny(userPerms);
}

function hasAllPermissions(permissions) {
  let userPerms = getUserPermissions();
  return permissions.hasAll(userPerms);
}
```

### 2. **Role Permissions Mapping**

The rules include the same role permissions mapping as the client-side system:

```javascript
function getRolePermissions(role) {
  if (role == "shop_admin") {
    return [
      "shop:read", "shop:write", "shop:delete",
      "branch:read", "branch:write", "branch:delete",
      "technician:read", "technician:write", "technician:delete",
      "service:read", "service:write", "service:delete",
      "invoice:read", "invoice:write", "invoice:delete",
      "task:read", "task:write", "task:delete",
      "user:read", "user:write", "user:delete",
      "onboarding:manage"
    ];
  } else if (role == "branch_admin") {
    return [
      "branch:read", "branch:write",
      "technician:read", "technician:write",
      "service:read", "service:write",
      "invoice:read", "invoice:write",
      "task:read", "task:write"
    ];
  } else if (role == "technician") {
    return [
      "service:read", "service:write",
      "task:read", "task:write"
    ];
  }
  return [];
}
```

### 3. **Enhanced Service Access for Technicians**

Improved service access control for technicians:

```javascript
function canAccessService(serviceData) {
  let userData = getUserData();
  if (userData.role == "shop_admin") {
    return belongsToShop(serviceData.shop_id);
  } else if (userData.role == "branch_admin") {
    return belongsToBranch(serviceData.branch_id);
  } else if (userData.role == "technician") {
    // Technicians can access services in their branch
    return serviceData.branch_id == userData.branch_id || 
           serviceData.branch_id == userData.branchId;
  }
  return false;
}

function canManageService(serviceData) {
  let userData = getUserData();
  if (userData.role == "shop_admin") {
    return belongsToShop(serviceData.shop_id);
  } else if (userData.role == "branch_admin") {
    return belongsToBranch(serviceData.branch_id);
  } else if (userData.role == "technician") {
    // Technicians can manage services in their branch
    return serviceData.branch_id == userData.branch_id || 
           serviceData.branch_id == userData.branchId;
  }
  return false;
}
```

## Updated Collections

### 1. **Users Collection**

**Before**: Role-based access only
**After**: Permission-based access with role fallback

```javascript
// Permission-based access for user management
allow read: if isAuthenticated() && (
  hasPermission("user:read") && (
    (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
    (isShopAdmin() && belongsToShop(resource.data.shop_id)) ||
    (isBranchAdmin() && belongsToBranch(resource.data.branch_id)) ||
    (isBranchAdmin() && belongsToBranch(resource.data.branchId))
  )
);

allow update: if isAuthenticated() && hasPermission("user:write") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isShopAdmin() && belongsToShop(resource.data.shop_id)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branch_id)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId))
);

allow delete: if isAuthenticated() && hasPermission("user:delete") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isShopAdmin() && belongsToShop(resource.data.shop_id))
);
```

### 2. **Services Collection**

**Before**: Limited technician access
**After**: Enhanced technician access with proper permissions

```javascript
// Permission-based service access
allow read: if isAuthenticated() && hasPermission("service:read") && canAccessService(resource.data);

allow write: if isAuthenticated() && hasPermission("service:write") && canManageService(resource.data);

allow delete: if isAuthenticated() && hasPermission("service:delete") && (
  isShopAdmin() && belongsToShop(resource.data.shop_id)
);

// Enhanced technician access for service management
allow update: if isTechnician() && hasPermission("service:write") && 
  canManageService(resource.data) &&
  request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'updatedAt', 'notes', 'technician_id', 'estimatedCompletion', 'actualCompletion', 'workNotes', 'partsUsed', 'customerFeedback']);
```

### 3. **Technicians Collection**

**Before**: Role-based access only
**After**: Permission-based access with proper validation

```javascript
// Permission-based technician access
allow read: if isAuthenticated() && hasPermission("technician:read") && (
  (isShopAdmin() && belongsToShop(resource.data.shop_id)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branch_id)) ||
  (isTechnician() && resource.data.created_by == request.auth.uid)
);

allow write: if isAuthenticated() && hasPermission("technician:write") && (
  (isShopAdmin() && belongsToShop(resource.data.shop_id)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branch_id))
);

allow delete: if isAuthenticated() && hasPermission("technician:delete") && (
  (isShopAdmin() && belongsToShop(resource.data.shop_id)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branch_id))
);
```

### 4. **Invoices Collection**

**Before**: Complex service-based access
**After**: Clean permission-based access

```javascript
// Permission-based invoice access
allow read: if isAuthenticated() && hasPermission("invoice:read") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId)) ||
  (isTechnician() && 
    exists(/databases/$(database)/documents/services/$(resource.data.serviceId)) &&
    get(/databases/$(database)/documents/services/$(resource.data.serviceId)).data.branch_id == getUserData().branch_id)
);

allow write: if isAuthenticated() && hasPermission("invoice:write") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId))
);

allow delete: if isAuthenticated() && hasPermission("invoice:delete") && (
  isShopAdmin() && belongsToShop(resource.data.shopId)
);
```

### 5. **Tasks Collection (New)**

Added support for task management with permission-based access:

```javascript
// Permission-based task access
allow read: if isAuthenticated() && hasPermission("task:read") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId)) ||
  (isTechnician() && resource.data.assignedTechnicianId == request.auth.uid)
);

allow write: if isAuthenticated() && hasPermission("task:write") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId)) ||
  (isTechnician() && resource.data.assignedTechnicianId == request.auth.uid)
);

allow delete: if isAuthenticated() && hasPermission("task:delete") && (
  (isShopAdmin() && belongsToShop(resource.data.shopId)) ||
  (isBranchAdmin() && belongsToBranch(resource.data.branchId))
);
```

## Security Improvements

### 1. **Defense in Depth**

- **Client-side RBAC**: Controls UI access and user experience
- **Server-side Firebase Rules**: Controls data access and security
- **Permission validation**: Both client and server validate permissions

### 2. **Enhanced Technician Access**

- **Service management**: Technicians can properly manage services in their branch
- **Self-assignment**: Technicians can assign themselves to unassigned services
- **Work tracking**: Technicians can create and update work logs
- **Profile management**: Technicians can update their own profiles

### 3. **Resource-Based Access Control**

- **Shop-level access**: Users can only access resources in their shop
- **Branch-level access**: Users can only access resources in their branch
- **Individual access**: Users can only access their own resources

### 4. **Data Validation**

- **Input validation**: All data is validated before storage
- **Field validation**: Required fields are enforced
- **Type validation**: Data types are checked
- **Status validation**: Status values are restricted to valid options

## Backward Compatibility

The updated rules maintain backward compatibility by:

1. **Keeping role-based functions**: `isShopAdmin()`, `isBranchAdmin()`, `isTechnician()`
2. **Supporting both permission and role checks**: Rules can use either approach
3. **Maintaining existing data structures**: No changes to existing documents required
4. **Preserving existing access patterns**: Current users won't lose access

## Testing the Rules

### 1. **Deploy the Rules**

```bash
firebase deploy --only firestore:rules
```

### 2. **Test Different User Roles**

- **Shop Admin**: Should have full access to all resources in their shop
- **Branch Admin**: Should have access to resources in their branch
- **Technician**: Should have limited access to services and tasks

### 3. **Test Permission Scenarios**

- **Service creation**: Only users with `service:write` permission
- **Technician management**: Only users with `technician:write` permission
- **Invoice access**: Only users with `invoice:read` permission

### 4. **Test Resource Access**

- **Shop-level access**: Users can only access resources in their shop
- **Branch-level access**: Users can only access resources in their branch
- **Individual access**: Users can only access their own resources

## Troubleshooting

### Common Issues

1. **Permission denied errors**: Check if user has the required permission
2. **Resource access denied**: Check if user belongs to the correct shop/branch
3. **Data validation errors**: Check if all required fields are present and valid

### Debug Tips

1. **Check user permissions**: Verify user has the correct role and permissions
2. **Check resource ownership**: Verify user belongs to the correct shop/branch
3. **Check data structure**: Verify all required fields are present
4. **Check Firebase console**: Look for rule evaluation errors

## Conclusion

The updated Firebase security rules provide:

- **Enhanced security**: Permission-based access control
- **Better technician access**: Proper service and task management
- **Improved scalability**: Easy to add new permissions
- **Maintained compatibility**: Backward compatible with existing data
- **Defense in depth**: Multiple layers of security validation

The rules now align perfectly with the client-side RBAC system, ensuring consistent security across the entire application. 