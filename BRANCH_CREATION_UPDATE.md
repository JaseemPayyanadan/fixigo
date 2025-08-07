# Branch Creation Process Update

## Overview
The branch creation process has been revamped to store data in both `users` and `branches` collections without automatically logging in the created branch manager.

## Changes Made

### 1. New API Endpoint
- **File**: `src/app/api/branches/create/route.ts`
- **Purpose**: Dedicated endpoint for creating branches that stores data in both collections
- **Features**:
  - Creates user account in `users` collection for branch manager
  - Creates branch profile in `branches` collection
  - Links both records via `managerId` field
  - No automatic login/session creation
  - Proper validation and error handling

### 2. Updated Branch Creation Page
- **File**: `src/app/(dashboard)/branch/new/page.tsx`
- **Changes**:
  - Removed dependency on `useBranches` hook for creation
  - Now uses the new `/api/branches/create` endpoint
  - Simplified creation process (single API call)
  - No automatic login after branch creation

### 3. Enhanced BranchForm Component
- **File**: `src/modules/branch/BranchForm.tsx`
- **Changes**:
  - Added manager information fields (name, email, phone)
  - Added password field for branch manager account
  - Added manager information and account setup sections
  - Updated validation to include password requirements

### 4. Updated Type Definitions
- **File**: `src/types/index.ts`
- **Changes**:
  - Added manager fields to Branch interface:
    - `managerId?: string` - Link to user account
    - `managerName?: string` - Name of branch manager
    - `managerEmail?: string` - Email of branch manager
    - `managerPhone?: string` - Phone of branch manager

### 5. Data Flow
```
Form Submission → /api/branches/create → 
├── Create user in users collection (branch_admin role)
├── Create branch in branches collection
└── Return success response (no login)
```

## Benefits

1. **No Unwanted Login**: Branch managers are created without automatically logging them in
2. **Cleaner Process**: Single API call instead of multiple operations
3. **Better Error Handling**: Centralized error handling in the API
4. **Data Consistency**: Ensures both user and branch records are created atomically
5. **Proper Linking**: Branch records are properly linked to user accounts
6. **Manager Account Setup**: Automatically creates branch manager accounts with proper permissions

## API Endpoint Details

### POST `/api/branches/create`

**Request Body:**
```typescript
{
  name: string;
  location: string;
  phone: string;
  email: string;
  password: string;
  shopId: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: "branch_admin";
      shopId: string;
      phone: string;
    };
    branch: {
      id: string;
      // ... all branch fields
    };
  };
  message: string;
}
```

## Database Schema

### Users Collection (Branch Manager)
```typescript
{
  id: string;
  name: string;
  email: string;
  password: string; // hashed
  role: "branch_admin";
  shopId: string;
  phone: string;
  status: "active";
  onboardingCompleted: true;
  createdAt: Date;
  updatedAt: Date;
}
```

### Branches Collection
```typescript
{
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "maintenance";
  shopId: string;
  managerId: string; // links to users collection
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Form Structure

### Branch Information Section
- Branch Name
- Location
- Phone Number
- Email Address

### Manager Information Section (New branches only)
- Manager Name (Optional)
- Manager Email (Optional)
- Manager Phone (Optional)

### Account Setup Section (New branches only)
- Password (Required for branch manager account)

## Migration Notes

- Existing branch creation functionality remains unchanged for users
- New branches will be created using the updated process
- No breaking changes to existing data or functionality
- Backward compatible with existing branch management features
- Branch managers get "branch_admin" role automatically 