# Service Module

A professional, well-structured service management module for the Fixigo application.

## Overview

The service module provides a comprehensive solution for managing service requests, including creation, editing, listing, and analytics. It follows React best practices and provides role-based access control.

## Structure

```
src/components/service/
├── README.md                 # This documentation
├── index.ts                  # Main exports
├── ServiceForm.tsx          # Main service form component
├── ShopAdminServiceList.tsx # Shop admin specific service list
├── BranchAdminServiceList.tsx # Branch admin specific service list
├── TechnicianServiceList.tsx # Technician specific service list
└── shared/                  # Shared components and utilities
    ├── index.ts             # Shared exports
    ├── types.ts             # TypeScript interfaces and types
    ├── constants.ts         # Service constants and configurations
    ├── hooks.ts             # Custom React hooks
    ├── ServiceUtils.tsx     # Utility functions
    ├── ServiceCard.tsx      # Individual service card component
    ├── ServiceList.tsx      # Reusable service list component
    └── ServiceDashboard.tsx # Service analytics dashboard
```

## Components

### ServiceForm

The main service form component that handles service creation and editing with role-based field visibility.

**Features:**
- Role-based form fields (shop admin, branch admin, technician)
- Form validation
- Auto-assignment for technicians
- Responsive design
- Error handling

**Usage:**
```tsx
import { ServiceForm } from '@/components/service';

<ServiceForm
  onSubmit={handleSubmit}
  loading={loading}
  editing={editing}
  branches={branches}
  branchId={branchId}
  setBranchId={setBranchId}
  user={user}
  shopId={shopId}
  initialData={initialData}
/>
```

### ServiceCard

A professional card component for displaying individual services.

**Features:**
- Clean, organized layout
- Status and priority indicators
- Customer and device information
- Action buttons (view, edit, delete)
- Role-based permissions

**Usage:**
```tsx
import { ServiceCard } from '@/components/service/shared';

<ServiceCard
  service={service}
  branches={branches}
  technicians={technicians}
  user={user}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onViewDetails={handleViewDetails}
/>
```

### ServiceList

A reusable list component for displaying services with loading, error, and empty states.

**Features:**
- Grid layout
- Loading states
- Error handling
- Empty state messaging
- Service count display

**Usage:**
```tsx
import { ServiceList } from '@/components/service/shared';

<ServiceList
  services={services}
  branches={branches}
  technicians={technicians}
  loading={loading}
  error={error}
  user={user}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onRetry={handleRetry}
  onViewDetails={handleViewDetails}
/>
```

### ServiceDashboard

A comprehensive dashboard component for service analytics and metrics.

**Features:**
- Key performance indicators
- Status distribution charts
- Priority distribution
- Revenue metrics
- Performance analytics

**Usage:**
```tsx
import { ServiceDashboard } from '@/components/service/shared';

<ServiceDashboard
  services={services}
  branches={branches}
  technicians={technicians}
  loading={loading}
/>
```

## Utilities

### ServiceUtils

Core utility functions for service management:

- **Status Management**: Status configuration, colors, and icons
- **Priority Management**: Priority levels and visual indicators
- **Formatting**: Price, date, and age formatting
- **Validation**: Form validation rules
- **Filtering & Sorting**: Service filtering and sorting logic
- **Permissions**: Role-based access control
- **Statistics**: Service metrics calculation

### Constants

Centralized constants for the service module:

- Service statuses and priorities
- Color schemes and styling
- Validation rules
- Pagination settings
- Export formats
- Notification types

### Hooks

Custom React hooks for service management:

- **useServiceFilters**: Filter management
- **useServiceSorting**: Sorting functionality
- **useServicePagination**: Pagination logic
- **useServiceSearch**: Search functionality
- **useServiceSelection**: Multi-selection
- **useServiceActions**: Permission-based actions
- **useServiceStats**: Statistics calculation
- **useServiceData**: Data processing with filters, sorting, and pagination

## Types

Comprehensive TypeScript interfaces:

- **ServiceFormData**: Form data structure
- **ServiceFormProps**: Form component props
- **ServiceListProps**: List component props
- **ServiceFilters**: Filter options
- **ServiceSortOptions**: Sorting configuration
- **ServiceActions**: Permission-based actions
- **ServiceDisplayInfo**: UI display information
- **ServiceStats**: Statistics data

## Role-Based Access Control

The module implements role-based access control:

### Shop Admin
- Full access to all services
- Can create, edit, delete services
- Can assign technicians
- Can view all branches

### Branch Admin
- Access to services in their branch
- Can create, edit, delete services
- Can assign technicians
- Limited to their branch

### Technician
- Access to assigned services
- Can update service status
- Limited editing capabilities
- Auto-assigned to new services

## Styling

The module uses Tailwind CSS with:
- Consistent color schemes
- Responsive design
- Professional appearance
- Accessibility features
- Hover and focus states

## Performance

- Memoized components and callbacks
- Efficient filtering and sorting
- Optimized re-renders
- Lazy loading support
- Virtual scrolling ready

## Usage Examples

### Basic Service List
```tsx
import { ServiceList } from '@/components/service/shared';

function ServicesPage() {
  return (
    <ServiceList
      services={services}
      branches={branches}
      technicians={technicians}
      loading={loading}
      user={user}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

### Service Form with Role-Based Fields
```tsx
import { ServiceForm } from '@/components/service';

function NewServicePage() {
  return (
    <ServiceForm
      onSubmit={handleSubmit}
      loading={loading}
      branches={branches}
      branchId={branchId}
      setBranchId={setBranchId}
      user={user}
      shopId={shopId}
    />
  );
}
```

### Service Dashboard
```tsx
import { ServiceDashboard } from '@/components/service/shared';

function DashboardPage() {
  return (
    <ServiceDashboard
      services={services}
      branches={branches}
      technicians={technicians}
    />
  );
}
```

## Best Practices

1. **Type Safety**: Always use TypeScript interfaces
2. **Role-Based Access**: Check permissions before rendering actions
3. **Error Handling**: Provide meaningful error messages
4. **Loading States**: Show loading indicators for better UX
5. **Validation**: Validate data on both client and server
6. **Performance**: Use React.memo and useCallback where appropriate
7. **Accessibility**: Include proper ARIA labels and keyboard navigation

## Migration from Old Module

The old service module in `src/modules/service/` has been removed. To migrate:

1. Update imports to use `@/components/service`
2. Use the new `ServiceForm` component
3. Replace old list components with `ServiceList`
4. Update utility function imports
5. Use new hooks for state management

## Contributing

When adding new features:

1. Follow the existing code structure
2. Add proper TypeScript types
3. Include role-based permissions
4. Add comprehensive tests
5. Update documentation
6. Follow the established naming conventions
