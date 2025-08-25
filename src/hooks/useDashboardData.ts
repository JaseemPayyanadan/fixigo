"use client";
import { useMemo } from "react";

import { calculateDashboardMetrics, getRecentServices } from "@/components/dashboard/shared/DashboardUtils";
import { AuthUser } from "@/lib/auth";
import { Service } from "@/types";

import { useServices } from "./useServices";
import { useUser } from "./useUser";

export interface DashboardMetrics {
  totalServices: number;
  pendingServices: number;
  completedServices: number;
  activeServices: number;
  totalCustomers: number;
}

export interface DashboardData {
  // Loading states
  isLoading: boolean;
  servicesLoading: boolean;

  // Error states
  servicesError: string | null;

  // Data
  services: Service[];

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
  const { services, loading: servicesLoading, error: servicesError } = useServices(shopId, branchId);

  // Check if any data is still loading
  const isLoading = useMemo(() => servicesLoading, [servicesLoading]);

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

    // Error states
    servicesError: servicesError || null,

    // Data
    services: services || [],

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
