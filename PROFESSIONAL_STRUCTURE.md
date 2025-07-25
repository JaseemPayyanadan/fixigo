# Professional Service Management System Structure

## Overview
This document outlines the professional structure for the service management system with proper role-based access control (RBAC).

## Collection Structure

### Hierarchical Data Model
```
/users/{userId} - User profiles and authentication
/shops/{shopId} - Shop information
/shops/{shopId}/branches/{branchId} - Branches under shops
/shops/{shopId}/branches/{branchId}/technicians/{technicianId} - Technicians under branches
/shops/{shopId}/branches/{branchId}/services/{serviceId} - Services under branches
/shops/{shopId}/branches/{branchId}/invoices/{invoiceId} - Invoices under branches
/shops/{shopId}/branches/{branchId}/tasks/{taskId} - Tasks under branches
```

## User Roles & Permissions

### 1. Shop Admin
- **Access Level**: Full access to their shop and all branches
- **Permissions**:
  - Create, read, update, delete branches
  - Create, read, update, delete technicians
  - Create, read, update, delete services
  - Create, read, update, delete invoices
  - Create, read, update, delete tasks
  - Manage shop settings
  - View all reports and analytics

### 2. Branch Admin
- **Access Level**: Access only to their assigned branch
- **Permissions**:
  - Read, update their own branch
  - Create, read, update, delete technicians in their branch
  - Create, read, update, delete services in their branch
  - Create, read, update, delete invoices in their branch
  - Create, read, update, delete tasks in their branch
  - View branch-specific reports

### 3. Technician
- **Access Level**: Access only to their assigned branch
- **Permissions**:
  - Read their own profile
  - Update their own profile
  - Read services in their branch
  - Update services they can access
  - Read invoices for services they work on
  - Read, update tasks assigned to them

## Data Flow

### 1. User Creation Flow
```
1. User registers with email/password
2. User document created in /users/{userId}
3. User assigned role (shop_admin, branch_admin, technician)
4. User assigned to shop (shopId)
5. If branch_admin or technician, assigned to branch (branchId)
```

### 2. Shop Creation Flow
```
1. Shop admin creates shop during onboarding
2. Shop document created in /shops/{shopId}
3. Shop admin's user document updated with shopId
4. Shop admin can now create branches
```

### 3. Branch Creation Flow
```
1. Shop admin creates branch
2. Branch document created in /shops/{shopId}/branches/{branchId}
3. Branch manager user created with branch_admin role
4. Branch manager assigned to branch (branchId)
5. Branch manager can now manage technicians and services
```

### 4. Technician Creation Flow
```
1. Shop admin or branch admin creates technician
2. Technician user created with technician role
3. Technician document created in /shops/{shopId}/branches/{branchId}/technicians/{technicianId}
4. Technician assigned to branch (branchId)
5. Technician can now access branch-specific data
```

## Security Rules

### Key Security Principles
1. **Hierarchical Access**: Users can only access data within their scope
2. **Role-Based Permissions**: Different roles have different access levels
3. **Data Validation**: All data is validated before creation/update
4. **Rate Limiting**: Prevents abuse of the system

### Firestore Rules Structure
```javascript
// Helper functions for authentication and authorization
function isAuthenticated() { ... }
function getCurrentUser() { ... }
function getUserRole() { ... }
function isShopAdmin() { ... }
function isBranchAdmin() { ... }
function isTechnician() { ... }
function belongsToShop(shopId) { ... }
function belongsToBranch(branchId) { ... }
```

## API Structure

### Hooks
- `useUser()` - User authentication and profile management
- `useBranches(shopId)` - Branch management for shop admins
- `useTechnicians(shopId, branchId)` - Technician management
- `useServices(shopId, branchId)` - Service management
- `useInvoices(shopId, branchId)` - Invoice management
- `useTasks(shopId, branchId)` - Task management

### Key Features
1. **Automatic User Creation**: When creating branches/technicians, users are automatically created
2. **Email Generation**: Unique emails are generated for new users
3. **Role Assignment**: Proper roles are assigned based on context
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Logging**: Detailed logging for debugging and monitoring

## Benefits of This Structure

### 1. Scalability
- Hierarchical structure allows for easy scaling
- Each shop is isolated from others
- Subcollections provide natural data organization

### 2. Security
- Role-based access control ensures data security
- Users can only access data they're authorized to see
- Firestore rules enforce security at the database level

### 3. Maintainability
- Clear separation of concerns
- Modular structure makes it easy to add new features
- Consistent patterns across all modules

### 4. Performance
- Efficient queries using subcollections
- Reduced data transfer with proper filtering
- Optimized for common use cases

## Migration Notes

### From Old Structure
1. **User Documents**: Updated to include proper role and shopId fields
2. **Branch Documents**: Moved to subcollections under shops
3. **Technician Documents**: Moved to subcollections under branches
4. **Service Documents**: Moved to subcollections under branches
5. **Invoice Documents**: Moved to subcollections under branches

### Data Migration
- Existing data needs to be migrated to new structure
- User roles need to be updated
- Shop and branch relationships need to be established

## Best Practices

### 1. Data Consistency
- Always validate data before saving
- Use consistent field names across collections
- Maintain referential integrity

### 2. Error Handling
- Provide meaningful error messages
- Log errors for debugging
- Handle edge cases gracefully

### 3. Performance
- Use pagination for large datasets
- Implement proper indexing
- Optimize queries for common use cases

### 4. Security
- Validate all user inputs
- Implement proper authentication
- Use Firestore rules for authorization

## Future Enhancements

### 1. Advanced Features
- Multi-tenant support
- Advanced reporting and analytics
- Real-time notifications
- Mobile app support

### 2. Integration
- Payment gateway integration
- SMS/Email notifications
- Third-party service integrations
- API for external systems

### 3. Monitoring
- Performance monitoring
- Error tracking
- Usage analytics
- Security monitoring 