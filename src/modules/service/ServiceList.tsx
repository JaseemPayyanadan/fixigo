"use client";
import React from "react";
import type { ServiceListProps } from "./types";
import ShopAdminServiceList from "./components/ShopAdminServiceList";
import BaseServiceList from "./components/BaseServiceList";

const ServiceList: React.FC<ServiceListProps> = (props) => {
  const { user } = props;

  // Handle null user case
  if (!user) {
    return <BaseServiceList {...props} />;
  }

  // Render role-specific list based on user role
  switch (user.role) {
    case "shop_admin":
      return <ShopAdminServiceList {...props} />;
    case "branch_admin":
    case "technician":
      // Branch admin and technician use the base list with role-based filtering
      return <BaseServiceList {...props} />;
    default:
      // Fallback to base list for unknown roles
      return <BaseServiceList {...props} />;
  }
};

export default ServiceList; 