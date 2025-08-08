"use client";

import React from 'react';
import { useUser } from '@/hooks/useUser';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { 
  ShopAdminDashboard, 
  BranchAdminDashboard, 
  TechnicianDashboard 
} from '@/components/dashboard';

// Main Dashboard Component
const DashboardContent: React.FC = () => {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (user.role) {
    case 'shop_admin':
      return (
        <div>
          <ShopAdminDashboard />
        </div>
      );
    case 'branch_admin':
      return (
        <div>
          <BranchAdminDashboard />
        </div>
      );
    case 'technician':
      return (
        <div>
          <TechnicianDashboard />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Invalid User Role</h2>
            <p className="mt-2 text-gray-600">Please contact your administrator.</p>
          </div>
        </div>
      );
  }
};

// Main Export
export default function DashboardPage() {
  return (
    <PermissionGuard permissions={['dashboard:read']}>
      <DashboardContent />
    </PermissionGuard>
  );
}
