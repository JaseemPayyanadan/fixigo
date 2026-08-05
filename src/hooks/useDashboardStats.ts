"use client";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

import { useUser } from "./useUser";

export interface DashboardStats {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalTechnicians: number;
  totalBranches: number;
  totalRevenue: number;
  customerSatisfaction: number;
  recentServices: Array<{
    id: string;
    name: string;
    status: string;
    customer: string;
    createdAt: Date;
  }>;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function useDashboardStats(shopId?: string, branchId?: string) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!shopId) {
          setStats(null);
          setLoading(false);
          return;
        }

        const servicesUrl = branchId
          ? `/api/services?branchId=${encodeURIComponent(branchId)}`
          : "/api/services";
        const techniciansUrl = branchId
          ? `/api/technicians?branchId=${encodeURIComponent(branchId)}`
          : "/api/technicians";

        const [servicesRes, techniciansRes, branchesRes] = await Promise.all([
          fetch(servicesUrl),
          fetch(techniciansUrl),
          branchId ? Promise.resolve(null) : fetch("/api/branches"),
        ]);

        if (!servicesRes.ok) throw new Error("Failed to fetch services");
        if (!techniciansRes.ok) throw new Error("Failed to fetch technicians");

        const servicesBody = await servicesRes.json();
        const techniciansBody = await techniciansRes.json();
        const services = Array.isArray(servicesBody.services) ? servicesBody.services : [];
        const technicians = Array.isArray(techniciansBody.technicians)
          ? techniciansBody.technicians
          : [];

        let branches: unknown[] = branchId ? [{ id: branchId }] : [];
        if (!branchId) {
          if (!branchesRes || !branchesRes.ok) throw new Error("Failed to fetch branches");
          const branchesBody = await branchesRes.json();
          branches = Array.isArray(branchesBody.branches) ? branchesBody.branches : [];
        }

        const totalServices = services.length;
        const completedServices = services.filter(
          (service: { status?: string }) => service.status === "completed"
        ).length;
        const pendingServices = services.filter(
          (service: { status?: string }) =>
            service.status === "pending" || service.status === "in_progress"
        ).length;
        const totalTechnicians = technicians.length;
        const totalBranches = branches.length;
        const totalRevenue = services
          .filter((service: { status?: string }) => service.status === "completed")
          .reduce(
            (sum: number, service: { totalPrice?: number; price?: number }) =>
              sum + (Number(service.totalPrice) || Number(service.price) || 0),
            0
          );
        const customerSatisfaction =
          completedServices > 0 ? (completedServices / totalServices) * 100 : 0;

        const recentServices = services.slice(0, 5).map(
          (service: {
            id?: string;
            name?: string;
            status?: string;
            customer?: { name?: string };
            createdAt?: unknown;
          }) => ({
            id: String(service.id || ""),
            name: String(service.name || "Unknown Service"),
            status: String(service.status || "pending"),
            customer: String(service.customer?.name || "Unknown Customer"),
            createdAt: toDate(service.createdAt),
          })
        );

        setStats({
          totalServices,
          completedServices,
          pendingServices,
          totalTechnicians,
          totalBranches,
          totalRevenue,
          customerSatisfaction,
          recentServices,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch dashboard stats";
        setError(message);
        logger.error("Error fetching dashboard stats", { error: message });
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user, shopId, branchId]);

  return { stats, loading, error };
}
