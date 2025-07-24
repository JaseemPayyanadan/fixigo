import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Technician } from "../types";

export function useTechnicians(shopId: string | undefined, branchId?: string) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicians = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      let q = query(collection(db, "technicians"), where("shop_id", "==", shopId));
      
      // If branchId is provided, filter by branch
      if (branchId) {
        q = query(q, where("branch_id", "==", branchId));
      }
      
      const querySnapshot = await getDocs(q);
      const technicianList: Technician[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: "technician",
          branchId: data.branch_id || "",
          shopId: data.shop_id || "",
          skills: data.skills || [],
          status: data.status || "active",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        };
      });
      setTechnicians(technicianList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [shopId, branchId]);

  useEffect(() => {
    if (shopId) fetchTechnicians();
  }, [fetchTechnicians, shopId]);

  return {
    technicians,
    loading,
    error,
    fetchTechnicians,
  };
} 