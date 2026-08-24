"use client";

import React from "react";

import PermissionGuard from "@/components/auth/PermissionGuard";
import { FuturisticReportsView } from "@/components/reports/FuturisticReportsView";
import { useBranches } from "@/hooks/useBranches";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { usePurchases } from "@/hooks/usePurchases";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUser } from "@/hooks/useUser";
import type { Branch } from "@/types";

function ReportsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" role="status" aria-label="Loading reports" />
    </div>
  );
}

function ReportsUpgradeNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FC] p-4">
      <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Reports isn&apos;t included in your plan</h1>
        <p className="mt-2 text-sm text-slate-500">Upgrade your plan to unlock revenue, service, and technician reports for your shop.</p>
      </div>
    </div>
  );
}

function ReportsContent() {
  const { user } = useUser();
  const branchId = user?.role === "branch_admin" ? user.branchId : undefined;

  const { isLoading: servicesLoading, services, servicesError, refresh: refreshServices, refreshing: servicesRefreshing } = useDashboardData(
    user?.shopId,
    branchId
  );
  const { technicians } = useTechnicians(user?.shopId, branchId);
  const { branches } = useBranches(user?.shopId);
  const { purchases, loading: purchasesLoading, refreshPurchases, refreshing: purchasesRefreshing } = usePurchases(user?.shopId, branchId);
  const { features: planFeatures, loading: planLoading } = usePlanFeatures();

  if (!user || planLoading) return <ReportsLoading />;
  if (!planFeatures.reports) return <ReportsUpgradeNotice />;

  // Branch-wise comparison only makes sense shop-wide, across more than one branch.
  const branchesForComparison: Branch[] = user.role === "shop_admin" ? branches : [];

  const handleRefresh = async () => {
    await Promise.all([refreshServices(), refreshPurchases()]);
  };

  return (
    <FuturisticReportsView
      services={services}
      technicians={technicians}
      branches={branchesForComparison}
      purchases={purchases}
      isLoading={servicesLoading || purchasesLoading}
      servicesError={servicesError}
      onRefresh={handleRefresh}
      refreshing={servicesRefreshing || purchasesRefreshing}
      exportEnabled={planFeatures.reportExport}
    />
  );
}

export default function ReportsPage() {
  return (
    <PermissionGuard permissions={["report:read"]}>
      <ReportsContent />
    </PermissionGuard>
  );
}
