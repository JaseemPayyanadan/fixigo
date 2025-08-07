"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger, isIndexBuildingError, getIndexBuildingMessage } from "@/lib/logger";
import type { Technician } from "@/types";

export function useTechnicians(shopId?: string, branchId?: string) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchTechnicians = async () => {
      try {
        setLoading(true);
        setError(null);

        let q;
        
        if (shopId && branchId) {
          // Fetch technicians for specific branch
          q = query(
            collection(db, "technicians"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          // Fetch technicians for specific shop
          q = query(
            collection(db, "technicians"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          );
        } else {
          // Fetch all technicians (for shop admin)
          q = query(
            collection(db, "technicians"),
            orderBy("createdAt", "desc")
          );
        }

        const querySnapshot = await getDocs(q);
        const technicianList: Technician[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const technician: Technician = {
            id: docSnapshot.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "technician",
            shopId: data.shopId || "",
            branchId: data.branchId || "",
            userId: data.userId || "",
            skills: data.skills || [],
            status: data.status || "active",
            bio: data.bio || "",
            specializations: data.specializations || [],
            experience: data.experience || 0,
            rating: data.rating || 0,
            totalServices: data.totalServices || 0,
            completedServices: data.completedServices || 0,
            availability: data.availability || {},
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          technicianList.push(technician);
        }

        setTechnicians(technicianList);
        logger.debug('Technicians fetched successfully', { 
          count: technicianList.length,
          shopId,
          branchId 
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch technicians";
        
        // Check if it's an index building error
        if (isIndexBuildingError(errorMessage)) {
          setError(getIndexBuildingMessage(errorMessage));
        } else {
          setError(errorMessage);
        }
        
        logger.error("Error fetching technicians", { error: errorMessage, shopId, branchId });
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [user, shopId, branchId]);

  const createTechnician = async (technicianData: Omit<Technician, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      const technicianDocRef = await addDoc(
        collection(db, "technicians"),
        {
          ...technicianData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "technicians"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const technicianList: Technician[] = [];
      for (const docSnapshot of updatedTechnicians.docs) {
        const data = docSnapshot.data();
        const technician: Technician = {
          id: docSnapshot.id,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          userId: data.userId || "",
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          experience: data.experience || 0,
          rating: data.rating || 0,
          totalServices: data.totalServices || 0,
          completedServices: data.completedServices || 0,
          availability: data.availability || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
      return technicianDocRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create technician";
      logger.error("Error creating technician", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateTechnician = async (technicianId: string, updates: Partial<Technician>) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      const technicianRef = doc(db, "technicians", technicianId);
      await updateDoc(technicianRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "technicians"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const technicianList: Technician[] = [];
      for (const docSnapshot of updatedTechnicians.docs) {
        const data = docSnapshot.data();
        const technician: Technician = {
          id: docSnapshot.id,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          userId: data.userId || "",
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          experience: data.experience || 0,
          rating: data.rating || 0,
          totalServices: data.totalServices || 0,
          completedServices: data.completedServices || 0,
          availability: data.availability || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update technician";
      logger.error("Error updating technician", { error: errorMessage, technicianId });
      throw new Error(errorMessage);
    }
  };

  const deleteTechnician = async (technicianId: string) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      await deleteDoc(doc(db, "technicians", technicianId));
      
      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "technicians"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const technicianList: Technician[] = [];
      for (const docSnapshot of updatedTechnicians.docs) {
        const data = docSnapshot.data();
        const technician: Technician = {
          id: docSnapshot.id,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          userId: data.userId || "",
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          experience: data.experience || 0,
          rating: data.rating || 0,
          totalServices: data.totalServices || 0,
          completedServices: data.completedServices || 0,
          availability: data.availability || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete technician";
      logger.error("Error deleting technician", { error: errorMessage, technicianId });
      throw new Error(errorMessage);
    }
  };

  const getTechnicianStats = () => {
    const total = technicians.length;
    const active = technicians.filter(t => t.status === 'active').length;
    const online = Math.floor(total * 0.7); // Mock online count
    const averageRating = technicians.length > 0 
      ? technicians.reduce((sum, t) => sum + (t.rating || 0), 0) / technicians.length
      : 0;
    const totalCompleted = technicians.reduce((sum, t) => sum + (t.completedServices || 0), 0);
    const totalCurrent = technicians.reduce((sum, t) => sum + (t.totalServices || 0), 0);

    return {
      total,
      active,
      online,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalCompleted,
      totalCurrent
    };
  };

  return {
    technicians,
    loading,
    error,
    createTechnician,
    updateTechnician,
    deleteTechnician,
    getTechnicianStats,
  };
} 