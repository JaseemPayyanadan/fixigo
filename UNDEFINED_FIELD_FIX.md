# Undefined Field Error Fix

## Problem
The dashboard is failing with the error:
```
Function where() called with invalid data. Unsupported field value: undefined
```

## Root Cause
The error occurs when Firestore queries are constructed with `undefined` values for required fields like:
- `user.shopId` (undefined)
- `user.branchId` (undefined for branch_admin users)
- `user.id` (undefined for technician users)

## Solution Applied

### 1. Added User Data Validation
The dashboard now validates user data before constructing queries:

```typescript
// Validate required user data
if (!user.shopId) {
  setData(prev => ({
    ...prev,
    loading: false,
    error: "User shop ID is missing. Please contact your administrator."
  }));
  return;
}

// For branch_admin, validate branchId
if (user.role === 'branch_admin' && !user.branchId) {
  setData(prev => ({
    ...prev,
    loading: false,
    error: "User branch ID is missing. Please contact your administrator."
  }));
  return;
}
```

### 2. Role-Specific Validation
Different validation rules for different user roles:

#### Technician Users
- Requires: `user.shopId`, `user.branchId`, `user.id`
- Validates all three before constructing queries

#### Branch Admin Users  
- Requires: `user.shopId`, `user.branchId`
- Validates both before constructing queries

#### Shop Admin Users
- Requires: `user.shopId`
- Validates shopId before constructing queries

### 3. Error Handling
The app now provides clear error messages when user data is missing:
- "User shop ID is missing. Please contact your administrator."
- "User branch ID is missing. Please contact your administrator."
- "Technician data is incomplete. Please contact your administrator."

## Code Changes Made

### Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)
1. **Added validation** before query construction
2. **Role-specific checks** for required fields
3. **Clear error messages** for missing data
4. **Graceful fallbacks** when data is incomplete

### Hooks Already Protected
The following hooks already had proper validation:
- `useServices` - validates `shopId` and `branchId`
- `useInvoices` - validates `shopId` and `branchId`
- `useBranches` - validates `shopId`

## Prevention

To avoid this issue in the future:

1. **Always validate user data** before constructing Firestore queries
2. **Check for undefined values** in where() clauses
3. **Provide clear error messages** when data is missing
4. **Use TypeScript** to catch potential undefined values at compile time

## Testing

After the fix:
1. **Test with incomplete user data** - should show clear error messages
2. **Test with complete user data** - should work normally
3. **Test different user roles** - each should have appropriate validation

## Next Steps

1. **Check user data** in your authentication system
2. **Ensure all users have required fields** (shopId, branchId, etc.)
3. **Update user creation process** to include all required fields
4. **Add data validation** to your user management system
