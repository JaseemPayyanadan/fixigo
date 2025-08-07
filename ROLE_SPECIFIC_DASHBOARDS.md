# Role-Specific Dashboard Components

## Overview

The dashboard has been refactored into separate components for each user role, providing better organization and role-specific functionality.

## Components

### 1. ShopAdminDashboard (`/src/components/dashboard/ShopAdminDashboard.tsx`)

**Purpose**: Dashboard for shop administrators who manage multiple branches.

**Features**:
- **Metrics**: 8 key performance indicators
  - Branches count
  - Total services across all branches
  - Total technicians
  - Total revenue
  - Pending services
  - Completed services
  - Active services
  - Customer satisfaction percentage

- **Data Scope**: Shop-wide data (all branches)
- **Recent Services**: Shows services from all branches
- **Navigation**: Links to services management

### 2. BranchAdminDashboard (`/src/components/dashboard/BranchAdminDashboard.tsx`)

**Purpose**: Dashboard for branch administrators who manage a specific branch.

**Features**:
- **Metrics**: 8 branch-specific indicators
  - Technicians in the branch
  - Total services for the branch
  - Branch revenue
  - Pending services
  - Completed services
  - Active services
  - Customer count
  - Customer satisfaction percentage

- **Data Scope**: Branch-specific data only
- **Recent Services**: Shows services from the specific branch
- **Technician Info**: Displays assigned technician information
- **Navigation**: Links to services management

### 3. TechnicianDashboard (`/src/components/dashboard/TechnicianDashboard.tsx`)

**Purpose**: Dashboard for technicians who handle assigned services.

**Features**:
- **Metrics**: 8 personal performance indicators
  - Total assigned services
  - Pending services
  - In-progress services
  - Completed services
  - Urgent services (pending + in-progress)
  - Personal revenue
  - Customer satisfaction
  - Efficiency percentage

- **Data Scope**: Only services assigned to the technician
- **My Services**: Shows assigned services with urgency indicators
- **Due Dates**: Displays estimated completion dates
- **Urgent Alerts**: Highlights pending and in-progress services

## Key Differences

| Feature | Shop Admin | Branch Admin | Technician |
|---------|------------|--------------|------------|
| **Data Scope** | All branches | Single branch | Assigned services only |
| **Revenue** | Total shop revenue | Branch revenue | Personal revenue |
| **Services** | All services | Branch services | Assigned services |
| **Technicians** | All technicians | Branch technicians | N/A |
| **Branches** | All branches | N/A | N/A |
| **Urgency** | Standard view | Standard view | Highlighted urgent items |

## Technical Implementation

### File Structure
```
src/components/dashboard/
├── index.ts                    # Export barrel
├── ShopAdminDashboard.tsx      # Shop admin dashboard
├── BranchAdminDashboard.tsx    # Branch admin dashboard
└── TechnicianDashboard.tsx     # Technician dashboard
```

### Main Dashboard Page
The main dashboard page (`/src/app/(dashboard)/dashboard/page.tsx`) now:
- Uses role-based routing
- Imports role-specific components
- Provides clean separation of concerns
- Handles invalid roles gracefully

### Data Filtering
Each dashboard component uses appropriate data filtering:
- **Shop Admin**: No filtering (sees all data)
- **Branch Admin**: Filters by `branchId`
- **Technician**: Filters by `assignedTechnicianId`

### Error Handling
Each component includes:
- Loading states
- Error handling for missing data
- Graceful fallbacks
- User-friendly error messages

## Benefits

1. **Better Organization**: Each role has its own dedicated component
2. **Role-Specific Features**: Tailored metrics and functionality
3. **Maintainability**: Easier to update role-specific features
4. **Performance**: Only loads relevant data for each role
5. **Security**: Proper data isolation between roles
6. **User Experience**: Relevant information for each user type

## Usage

The dashboard automatically renders the appropriate component based on the user's role:

```typescript
switch (user.role) {
  case 'shop_admin':
    return <ShopAdminDashboard />;
  case 'branch_admin':
    return <BranchAdminDashboard />;
  case 'technician':
    return <TechnicianDashboard />;
  default:
    return <InvalidRoleMessage />;
}
```

## Future Enhancements

- Add role-specific quick actions
- Implement role-specific notifications
- Add role-specific analytics charts
- Create role-specific settings panels
