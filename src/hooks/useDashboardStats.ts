"use client";
import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
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

        let services: any[] = [];
        let technicians: any[] = [];
        let invoices: any[] = [];
        let branches: any[] = [];

        if (branchId) {
          // Fetch data for specific branch
          const servicesQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "services"),
            orderBy("createdAt", "desc")
          );
          const servicesSnapshot = await getDocs(servicesQuery);
          services = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const techniciansQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "technicians"),
            orderBy("createdAt", "desc")
          );
          const techniciansSnapshot = await getDocs(techniciansQuery);
          technicians = techniciansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const invoicesQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "invoices"),
            orderBy("createdAt", "desc")
          );
          const invoicesSnapshot = await getDocs(invoicesQuery);
          invoices = invoicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // For branch-specific view, we only have 1 branch
          branches = [{ id: branchId }];
        } else {
          // Fetch data across all branches in the shop
          const branchesQuery = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
          const branchesSnapshot = await getDocs(branchesQuery);
          branches = branchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Aggregate services from all branches
          for (const branch of branches) {
            try {
              const servicesQuery = query(
                collection(db, "shops", shopId, "branches", branch.id, "services"),
                orderBy("createdAt", "desc")
              );
              const servicesSnapshot = await getDocs(servicesQuery);
              const branchServices = servicesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              services.push(...branchServices);

              // Aggregate technicians from all branches
              const techniciansQuery = query(
                collection(db, "shops", shopId, "branches", branch.id, "technicians"),
                orderBy("createdAt", "desc")
              );
              const techniciansSnapshot = await getDocs(techniciansQuery);
              const branchTechnicians = techniciansSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              technicians.push(...branchTechnicians);

              // Aggregate invoices from all branches
              const invoicesQuery = query(
                collection(db, "shops", shopId, "branches", branch.id, "invoices"),
                orderBy("createdAt", "desc")
              );
              const invoicesSnapshot = await getDocs(invoicesQuery);
              const branchInvoices = invoicesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              invoices.push(...branchInvoices);
            } catch (error) {
              logger.warn(`Error fetching data for branch ${branch.id}:`, { error: String(error) });
              // Continue with other branches even if one fails
            }
          }
        }

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
        logger.error("Error fetching dashboard data", {
          error: errorMessage,
          userId: user.uid,
          role: user.role,
          shopId: user.shopId,
          ...(user.branchId && { branchId: user.branchId })
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, shopId, branchId]);

  return { stats, loading, error };
} 