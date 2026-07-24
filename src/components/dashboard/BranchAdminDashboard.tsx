"use client";

import React from "react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUser } from "@/hooks/useUser";

import { AdminDashboardView } from "./AdminDashboardView";
import { DashboardUserLoading } from "./shared/DashboardComponents";

/**
 * Same dashboard as the shop admin, scoped to the one branch this admin runs.
 *
 * This previously rendered its own layout with hardcoded trend deltas
 * (`change: 18`, `25`, `12`) — invented percentages presented as measurements.
 * Routing through the shared view means every number here is now derived from
 * `dashboardAnalytics` like everywhere else.
 */
export default function BranchAdminDashboard() {
  const { user } = useUser();
  const { isLoading, services, recentServices, servicesLoading, servicesError } = useDashboardData(
    user?.shopId,
    user?.branchId
  );
  const { technicians } = useTechnicians(user?.shopId, user?.branchId);

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
