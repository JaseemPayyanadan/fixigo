"use client";
import { useEffect, useState } from "react";

import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
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

        let services: any[] = [];
        let technicians: any[] = [];
        let branches: any[] = [];

        if (branchId) {
          // Fetch data for specific branch using new flat structure
          const servicesQuery = query(collection(db, "services"), where("shopId", "==", shopId), where("branchId", "==", branchId), orderBy("createdAt", "desc"));
          const servicesSnapshot = await getDocs(servicesQuery);
          services = servicesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const techniciansQuery = query(collection(db, "technicians"), where("shopId", "==", shopId), where("branchId", "==", branchId), orderBy("createdAt", "desc"));
          const techniciansSnapshot = await getDocs(techniciansQuery);
          technicians = techniciansSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // For branch-specific view, we only have 1 branch
          branches = [{ id: branchId }];
        } else {
          // Fetch data across all branches in the shop using new flat structure
          const branchesQuery = query(collection(db, "branches"), where("shopId", "==", shopId), orderBy("createdAt", "desc"));
          const branchesSnapshot = await getDocs(branchesQuery);
          branches = branchesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Aggregate services from all branches using new flat structure
          const servicesQuery = query(collection(db, "services"), where("shopId", "==", shopId), orderBy("createdAt", "desc"));
          const servicesSnapshot = await getDocs(servicesQuery);
          services = servicesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Aggregate technicians from all branches using new flat structure
          const techniciansQuery = query(collection(db, "technicians"), where("shopId", "==", shopId), orderBy("createdAt", "desc"));
          const techniciansSnapshot = await getDocs(techniciansQuery);
          technicians = techniciansSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        // Calculate stats
        const totalServices = services.length;
        const completedServices = services.filter((service: Record<string, unknown>) => service.status === "completed").length;
        const pendingServices = services.filter((service: Record<string, unknown>) => service.status === "pending" || service.status === "in_progress").length;
        const totalTechnicians = technicians.length;
        const totalBranches = branches.length;
        const totalRevenue = services.reduce((sum: number, service: Record<string, unknown>) => sum + (Number(service.totalPrice) || 0), 0);
        const customerSatisfaction = completedServices > 0 ? (completedServices / totalServices) * 100 : 0;

        const recentServices = services.slice(0, 5).map((service: Record<string, unknown>) => ({
          id: String(service.id || ""),
          name: String(service.name || "Unknown Service"),
          status: String(service.status || "pending"),
          customer: String((service.customer as Record<string, unknown>)?.name || "Unknown Customer"),
          createdAt: (service.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
        }));

        const calculatedStats: DashboardStats = {
          totalServices,
          completedServices,
          pendingServices,
          totalTechnicians,
          totalBranches,
          totalRevenue,
          customerSatisfaction,
          recentServices,
        };

        setStats(calculatedStats);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard stats";
        setError(errorMessage);
        logger.error("Error fetching dashboard data", {
          error: errorMessage,
          userId: user.id,
          role: user.role,
          shopId: user.shopId,
          ...(user.branchId && { branchId: user.branchId }),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, shopId, branchId]);

  return { stats, loading, error };
}
