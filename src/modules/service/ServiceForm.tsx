"use client";
import React from "react";

import BranchAdminServiceForm from "./components/BranchAdminServiceForm";
import ShopAdminServiceForm from "./components/ShopAdminServiceForm";
import TechnicianServiceForm from "./components/TechnicianServiceForm";
import type { ServiceFormProps } from "./types";

const ServiceForm: React.FC<ServiceFormProps> = (props) => {
  const { user } = props;

  // Handle null user case
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

  // Render role-specific form based on user role
  switch (user.role) {
    case "shop_admin":
      return <ShopAdminServiceForm {...props} />;
    case "branch_admin":
      return <BranchAdminServiceForm {...props} />;
    case "technician":
      return <TechnicianServiceForm {...props} />;
    default:
      // Fallback to base form for unknown roles
      return <ShopAdminServiceForm {...props} />;
  }
};

export default ServiceForm; 