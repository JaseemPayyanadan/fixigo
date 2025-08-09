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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (user.role) {
    case 'shop_admin':
      return <ShopAdminDashboard />;
    case 'branch_admin':
      return <BranchAdminDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    default:
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Invalid User Role</h2>
            <p className="text-sm text-gray-600">Please contact your administrator.</p>
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
