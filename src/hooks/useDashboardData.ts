"use client";
import { useMemo } from "react";

import { calculateDashboardMetrics, getRecentServices } from "@/components/dashboard/shared/DashboardUtils";
import { AuthUser } from "@/lib/auth";
import { Branch, Service, Technician } from "@/types";

import { useBranches } from "./useBranches";
import { useServices } from "./useServices";
import { useTechnicians } from "./useTechnicians";
import { useUser } from "./useUser";

export interface DashboardMetrics {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  activeServices: number;
  totalCustomers: number;
  customerSatisfaction: number;
}

export interface DashboardData {
  // Loading states
  isLoading: boolean;
  servicesLoading: boolean;
  branchesLoading: boolean;
  techniciansLoading: boolean;

  // Error states
  servicesError: string | null;
  branchesError: string | null;
  techniciansError: string | null;

  // Data
  services: Service[];
  branches: Branch[];
  technicians: Technician[];

  // Calculated metrics
  metrics: DashboardMetrics;

  // Recent data
  recentServices: Service[];

  // Revenue
  totalRevenue: number;

  // User info
  user: AuthUser | null;
}

export const useDashboardData = (shopId?: string, branchId?: string): DashboardData => {
  const { user } = useUser();
  const { branches, loading: branchesLoading, error: branchesError } = useBranches(shopId);
  const { technicians, loading: techniciansLoading, error: techniciansError } = useTechnicians(shopId, branchId);
  const { services, loading: servicesLoading, error: servicesError } = useServices(shopId, branchId);

  // Check if any data is still loading
  const isLoading = useMemo(() => branchesLoading || techniciansLoading || servicesLoading, [branchesLoading, techniciansLoading, servicesLoading]);

  // Calculate metrics with memoization
  const metrics = useMemo(() => calculateDashboardMetrics(services || []), [services]);

  // Get recent services with memoization
  const recentServices = useMemo(() => getRecentServices(services || [], 5), [services]);

  // Calculate total revenue with memoization
  const totalRevenue = useMemo(() => (services || []).reduce((sum, service) => sum + (service.price || 0), 0), [services]);

  return {
    // Loading states
    isLoading,
    servicesLoading,
    branchesLoading,
    techniciansLoading,

    // Error states
    servicesError: servicesError || null,
    branchesError: branchesError || null,
    techniciansError: techniciansError || null,

    // Data
    services: services || [],
    branches: branches || [],
    technicians: technicians || [],

    // Calculated metrics
    metrics,

    // Recent data
    recentServices,

    // Revenue
    totalRevenue,

    // User info
    user,
  };
};
