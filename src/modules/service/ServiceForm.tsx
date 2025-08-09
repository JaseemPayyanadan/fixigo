"use client";
import React from "react";
import type { ServiceFormProps } from "./types";
import ShopAdminServiceForm from "./components/ShopAdminServiceForm";
import BranchAdminServiceForm from "./components/BranchAdminServiceForm";
import TechnicianServiceForm from "./components/TechnicianServiceForm";

const ServiceForm: React.FC<ServiceFormProps> = (props) => {
  const { user } = props;

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