"use client";

import React from "react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUser } from "@/hooks/useUser";

import { AdminDashboardView } from "./AdminDashboardView";
import { DashboardUserLoading } from "./shared/DashboardComponents";

/** Shop-wide view: every branch the shop owns. */
export default function ShopAdminDashboard() {
  const { user } = useUser();
  const { isLoading, services, recentServices, servicesLoading, servicesError } = useDashboardData(user?.shopId);
  const { technicians } = useTechnicians(user?.shopId);

  if (!user) return <DashboardUserLoading />;

  return (
    <AdminDashboardView
      services={services}
      recentServices={recentServices}
      technicians={technicians}
      isLoading={isLoading}
      servicesLoading={servicesLoading}
      servicesError={servicesError}
    />
  );
}
