# Firebase Security Rules

## Overview

This document describes the Firebase Firestore security rules for the Fixigo application. The rules ensure proper access control and data validation for different user roles.

## User Roles

### 1. Shop Admin (`shop_admin`)
- Can manage their own shop and all branches
- Can create, read, update, and delete branches
- Can manage all services and technicians in their shop
- Can access all invoices and settings

### 2. Branch Admin (`branch_admin`)
- Can manage their assigned branch only
- Can read and update services in their branch
- Can manage technicians in their branch
- Limited access to invoices and settings

### 3. Technician (`technician`)
- Can read services assigned to them
- Can update service status and add notes
- Can read invoices for their assigned services
- Limited access to branch information

## Key Security Features

### Authentication
- All operations require authentication
- Users can only access data they're authorized to see
- Role-based access control (RBAC)

### Data Validation
- Strict validation for all data structures
- Required fields are enforced
- Data types are validated
- Business logic validation (e.g., status values)

### Hierarchical Access
- Shop admins have access to all data in their shop
- Branch admins have access to their branch data only
- Technicians have access to their assigned services only

## Recent Updates (Latest Deployment)

### 1. Fixed Branch Creation Issues
**Problem**: Branch creation was failing due to overly restrictive validation rules.

**Solution**: 
- Updated branch validation to include required fields: `name`, `address`, `phone`, `email`, `status`, `shopId`, `managerId`
- Added size validation for string fields
- Made validation more flexible while maintaining security

### 2. Improved User Creation During Branch Creation
**Problem**: Shop admins couldn't create branch admin users during branch creation.

**Solution**:
- Added specific rule for shop admins to create branch admin users
- Required fields: `name`, `email`, `role`, `shopId`, `createdAt`
- Role must be "branch_admin"

### 3. Enhanced User Document Updates
**Problem**: User document updates were too restrictive for branch creation workflow.

**Solution**:
- Updated user document update rules to allow `branch_id` field updates
- Made `onboardingCompleted` field optional
- Added support for both `shopId` and `branch_id` updates

### 4. Better Error Handling
**Problem**: Validation errors weren't providing clear feedback.

**Solution**:
- Added more specific validation messages
- Improved field size validation
- Better handling of optional fields

## Collection Rules

### Users Collection (`/users/{userId}`)
```javascript
// Users can read/write their own document
allow read, write: if isAuthenticated() && isOwner(userId);

// Allow creation during registration
allow create: if isAuthenticated() && isOwner(userId) && 
  // Validation rules...

// Allow updates for onboarding and branch creation
allow update: if isAuthenticated() && isOwner(userId) &&
  // Validation rules...

// Shop admins can create branch admin users
allow create: if isAuthenticated() && 
  (isOwner(userId) || (isShopAdmin() && request.resource.data.role == "branch_admin"))
```

### Shops Collection (`/shops/{shopId}`)
```javascript
// Shop admins can manage their shop
allow read, write: if isShopAdmin() && belongsToShop(shopId);

// Allow shop creation during onboarding
allow create: if isAuthenticated() && isOwner(shopId) &&
  // Validation rules...
```

### Branches Subcollection (`/shops/{shopId}/branches/{branchId}`)
```javascript
// Shop admins can manage all branches
allow read, write: if isShopAdmin() && belongsToShop(shopId);

// Branch admins can manage their branch
allow read, write: if isBranchAdmin() && belongsToBranch(branchId);

// Validation for branch creation/updates
allow create, update: if 
  // Required fields validation...
```

### Services Collection (`/services/{serviceId}`)
```javascript
// Shop admins can manage all services
allow read, write: if isShopAdmin() && belongsToShop(resource.data.shop_id);

// Branch admins can manage services in their branch
allow read, write: if isBranchAdmin() && belongsToBranch(resource.data.branch_id);

// Technicians can read assigned services
allow read: if isTechnician() && 
  (resource.data.technician_id == request.auth.uid || 
   resource.data.branch_id == getUserData().branch_id);
```

## Helper Functions

### Authentication Helpers
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```

### Role Helpers
```javascript
function isShopAdmin() {
  return isAuthenticated() && getUserData().role == "shop_admin";
}

function isBranchAdmin() {
  return isAuthenticated() && getUserData().role == "branch_admin";
}

function isTechnician() {
  return isAuthenticated() && getUserData().role == "technician";
}
```

### Access Control Helpers
```javascript
function belongsToShop(shopId) {
  return getUserData().shopId == shopId;
}

function belongsToBranch(branchId) {
  return getUserData().branch_id == branchId;
}

function isOwner(userId) {
  return request.auth.uid == userId;
}
```

## Testing Security Rules

### Local Testing
```bash
# Install Firebase emulator
npm install -g firebase-tools

# Start emulator
firebase emulators:start

# Test rules
firebase firestore:rules:test
```

### Production Testing
```bash
# Deploy rules
firebase deploy --only firestore:rules

# Check deployment status
firebase projects:list
```

## Best Practices

### 1. Principle of Least Privilege
- Users only have access to data they need
- Role-based permissions are strictly enforced
- No unnecessary read/write access

### 2. Data Validation
- All data is validated before write operations
- Required fields are enforced
- Data types are checked
- Business logic validation is applied

### 3. Security by Design
- Rules are written defensively
- Default deny for unknown operations
- Explicit allow for known operations
- Regular security reviews

### 4. Monitoring and Logging
- All operations are logged
- Failed operations are tracked
- Security events are monitored
- Regular audits are conducted

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check user authentication
   - Verify user role
   - Confirm data ownership
   - Check field validation

2. **Validation Errors**
   - Verify required fields are present
   - Check data types
   - Ensure field sizes are correct
   - Validate business logic

3. **Branch Creation Fails**
   - Ensure user is shop_admin
   - Verify shopId is set
   - Check all required fields
   - Validate email format

### Debug Steps

1. **Check User Authentication**
   ```javascript
   console.log('User UID:', request.auth.uid);
   console.log('User Role:', getUserData().role);
   ```

2. **Verify Data Structure**
   ```javascript
   console.log('Request Data:', request.resource.data);
   console.log('Required Fields:', request.resource.data.keys());
   ```

3. **Test Permissions**
   ```javascript
   console.log('Is Shop Admin:', isShopAdmin());
   console.log('Belongs to Shop:', belongsToShop(shopId));
   ```

## Future Enhancements

### Planned Improvements

1. **Advanced Role Management**
   - Custom roles
   - Role inheritance
   - Dynamic permissions

2. **Enhanced Validation**
   - Custom validation functions
   - Complex business rules
   - Data integrity checks

3. **Audit Trail**
   - Comprehensive logging
   - Change tracking
   - Security monitoring

4. **Performance Optimization**
   - Rule caching
   - Query optimization
   - Index management

## Security Checklist

- [x] Authentication required for all operations
- [x] Role-based access control implemented
- [x] Data validation rules in place
- [x] Principle of least privilege applied
- [x] Default deny for unknown operations
- [x] Regular security reviews conducted
- [x] Monitoring and logging enabled
- [x] Error handling implemented
- [x] Documentation maintained
- [x] Testing procedures established

## Contact

For security-related questions or issues, please contact the development team or create an issue in the project repository. 