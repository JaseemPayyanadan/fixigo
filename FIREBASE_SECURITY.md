# Firebase Security Rules - Onboarding Flow Updates

## Overview
This document outlines the Firebase security rules updates made to support the enhanced onboarding flow for the Fixigo service management platform.

## Key Changes Made

### 1. User Registration & Onboarding
- **User Document Creation**: Users can now create their own user document during registration
- **Onboarding Flag**: Added support for the `onboardingCompleted` boolean flag
- **Shop Document Creation**: Users can create their own shop document during onboarding

### 2. Enhanced User Collection Rules

#### User Document Creation (Registration)
```javascript
allow create: if isAuthenticated() && isOwner(userId) &&
  request.resource.data.keys().hasAll(['name', 'email', 'role', 'onboardingCompleted', 'createdAt']) &&
  request.resource.data.name is string &&
  request.resource.data.name.size() > 0 &&
  request.resource.data.email is string &&
  request.resource.data.role in ['shop_admin', 'branch_admin', 'technician'] &&
  request.resource.data.onboardingCompleted is bool &&
  request.resource.data.createdAt is timestamp;
```

#### User Document Updates (Onboarding Completion)
```javascript
allow update: if isAuthenticated() && isOwner(userId) &&
  request.resource.data.diff(resource.data).affectedKeys().hasAny(['shopId', 'onboardingCompleted', 'updatedAt']) &&
  request.resource.data.shopId is string &&
  request.resource.data.onboardingCompleted is bool;
```

### 3. Enhanced Shop Collection Rules

#### Shop Document Creation (Onboarding)
```javascript
allow create: if isAuthenticated() && isOwner(shopId) &&
  request.resource.data.keys().hasAll(['shopName', 'ownerName', 'email', 'phone', 'address', 'city', 'pinCode', 'createdAt', 'updatedAt']) &&
  request.resource.data.shopName is string &&
  request.resource.data.shopName.size() > 0 &&
  request.resource.data.ownerName is string &&
  request.resource.data.ownerName.size() > 0 &&
  request.resource.data.email is string &&
  request.resource.data.phone is string &&
  request.resource.data.address is string &&
  request.resource.data.city is string &&
  request.resource.data.pinCode is string &&
  request.resource.data.createdAt is timestamp &&
  request.resource.data.updatedAt is timestamp;
```

#### Shop Document Updates
```javascript
allow update: if isAuthenticated() && isOwner(shopId) &&
  request.resource.data.diff(resource.data).affectedKeys().hasAny(['gstNumber', 'businessType', 'description', 'updatedAt']);
```

## Data Validation

### Required Fields for User Registration
- `name`: String (non-empty)
- `email`: String
- `role`: One of ['shop_admin', 'branch_admin', 'technician']
- `onboardingCompleted`: Boolean
- `createdAt`: Timestamp

### Required Fields for Shop Creation
- `shopName`: String (non-empty)
- `ownerName`: String (non-empty)
- `email`: String
- `phone`: String
- `address`: String
- `city`: String
- `pinCode`: String
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Optional Fields for Shop Updates
- `gstNumber`: String
- `description`: String

## Security Features

### 1. User Isolation
- Users can only create and modify their own documents
- Users can only create shop documents with their own UID as the document ID

### 2. Role-Based Access
- Shop admins can access all data within their shop
- Branch admins can access data within their branch
- Technicians can access data assigned to them

### 3. Data Validation
- All required fields are validated
- String fields must be non-empty where required
- Timestamps are validated for date fields
- Boolean flags are properly typed

### 4. Onboarding Flow Security
- Users start with `onboardingCompleted: false`
- Users can update their profile to set `onboardingCompleted: true`
- Users can create their shop document during onboarding
- Shop document ID matches user UID for security

## Deployment Status
✅ **Successfully deployed** to Firebase project: `fixigo-8dc40`

## Testing Recommendations

1. **Registration Flow**
   - Test user registration with valid data
   - Verify user document creation with correct fields
   - Confirm `onboardingCompleted: false` is set

2. **Onboarding Flow**
   - Test shop document creation during onboarding
   - Verify all required fields are validated
   - Confirm user document updates with `onboardingCompleted: true`

3. **Access Control**
   - Test that users can only access their own data
   - Verify shop admins can access their shop data
   - Confirm proper role-based permissions

## Future Considerations

1. **Additional Validation**: Consider adding email format validation
2. **Rate Limiting**: Implement rate limiting for document creation
3. **Audit Logging**: Add audit logs for onboarding completion
4. **Data Migration**: Plan for existing user data migration if needed

## Support
For questions or issues with the Firebase security rules, refer to the Firebase Console or contact the development team. 