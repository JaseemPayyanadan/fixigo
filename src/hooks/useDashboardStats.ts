"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";

export interface DashboardStats {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalTechnicians: number;
  totalBranches: number;
  totalInvoices: number;
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

        // Fetch services
        let servicesQuery;
        if (branchId) {
          servicesQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "services"),
            orderBy("createdAt", "desc")
          );
        } else {
          servicesQuery = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
        }

        const servicesSnapshot = await getDocs(servicesQuery);
        const services = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch technicians
        let techniciansQuery;
        if (branchId) {
          techniciansQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "technicians"),
            orderBy("createdAt", "desc")
          );
        } else {
          techniciansQuery = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
        }

        const techniciansSnapshot = await getDocs(techniciansQuery);
        const technicians = techniciansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch branches
        const branchesQuery = query(
          collection(db, "shops", shopId, "branches"),
          orderBy("createdAt", "desc")
        );
        const branchesSnapshot = await getDocs(branchesQuery);
        const branches = branchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch invoices
        let invoicesQuery;
        if (branchId) {
          invoicesQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "invoices"),
            orderBy("createdAt", "desc")
          );
        } else {
          invoicesQuery = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
        }

        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoices = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate stats
        const totalServices = services.length;
        const completedServices = services.filter((service: Record<string, unknown>) => service.status === "completed").length;
        const pendingServices = services.filter((service: Record<string, unknown>) => service.status === "pending" || service.status === "in_progress").length;
        const totalTechnicians = technicians.length;
        const totalBranches = branches.length;
        const totalInvoices = invoices.length;
        const totalRevenue = invoices.reduce((sum: number, invoice: Record<string, unknown>) => sum + (Number(invoice.total) || 0), 0);
        const customerSatisfaction = completedServices > 0 ? (completedServices / totalServices) * 100 : 0;

        const recentServices = services.slice(0, 5).map((service: Record<string, unknown>) => ({
          id: String(service.id || ''),
          name: String(service.name || "Unknown Service"),
          status: String(service.status || "pending"),
          customer: String((service.customer as Record<string, unknown>)?.name || "Unknown Customer"),
          createdAt: (service.createdAt as { toDate?: () => Date })?.toDate?.() || new Date()
        }));

        const calculatedStats: DashboardStats = {
          totalServices,
          completedServices,
          pendingServices,
          totalTechnicians,
          totalBranches,
          totalInvoices,
          totalRevenue,
          customerSatisfaction,
          recentServices
        };

        setStats(calculatedStats);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard stats";
        setError(errorMessage);
        logger.error("Error fetching dashboard stats", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, shopId, branchId]);

  return { stats, loading, error };
} 