"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
import { UserManagementService } from "@/lib/userManagement";
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

        const technicianList: Technician[] = [];

        if (shopId && branchId) {
          // Fetch technicians from specific branch (nested collection only)
          const nestedQuery = query(
            collection(db, "shops", shopId, "branches", branchId, "technicians"),
            orderBy("createdAt", "desc")
          );
          const nestedSnapshot = await getDocs(nestedQuery);

          for (const docSnapshot of nestedSnapshot.docs) {
            const data = docSnapshot.data();
            const technician: Technician = {
              id: docSnapshot.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              role: data.role || "technician",
              shopId: data.shopId || "",
              branchId: data.branchId || "",
              skills: data.skills || [],
              status: data.status || "active",
              bio: data.bio || "",
              specializations: data.specializations || [],
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            };
            technicianList.push(technician);
          }
        } else if (shopId) {
          // Fetch technicians from all branches in the shop (nested collections only)
          const branchesQuery = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
          const branchesSnapshot = await getDocs(branchesQuery);

          for (const branchDoc of branchesSnapshot.docs) {
            try {
              const techniciansQuery = query(
                collection(db, "shops", shopId, "branches", branchDoc.id, "technicians"),
                orderBy("createdAt", "desc")
              );
              const techniciansSnapshot = await getDocs(techniciansQuery);

              for (const docSnapshot of techniciansSnapshot.docs) {
                const data = docSnapshot.data();
                const technician: Technician = {
                  id: docSnapshot.id,
                  name: data.name || "",
                  email: data.email || "",
                  phone: data.phone || "",
                  role: data.role || "technician",
                  shopId: data.shopId || "",
                  branchId: data.branchId || "",
                  skills: data.skills || [],
                  status: data.status || "active",
                  bio: data.bio || "",
                  specializations: data.specializations || [],
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                };
                technicianList.push(technician);
              }
            } catch (error) {
              logger.warn(`Error fetching technicians for branch ${branchDoc.id}:`, { error: String(error) });
              // Continue with other branches even if one fails
            }
          }
        } else {
          setTechnicians([]);
          setLoading(false);
          return;
        }

        setTechnicians(technicianList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch technicians";
        setError(errorMessage);
        logger.error("Error fetching technicians", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [user, shopId, branchId]);

  const createTechnician = async (technicianData: Omit<Technician, "id" | "createdAt" | "updatedAt"> & { password?: string }) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    // Validate permissions
    if (!UserManagementService.validateUserCreationPermissions(user, "technician", shopId, branchId)) {
      throw new Error("You don't have permission to create technicians");
    }

    try {
      // Use the centralized user management service
      const userResult = await UserManagementService.createUser({
        name: technicianData.name,
        email: technicianData.email,
        password: technicianData.password,
        role: "technician",
        shopId,
        branchId,
        phone: technicianData.phone,
        skills: technicianData.skills,
        specializations: technicianData.specializations,
        bio: technicianData.bio,
      });

      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "technicians"),
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
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
      return {
        userId: userResult.userId,
        tempPassword: userResult.tempPassword,
        email: userResult.email
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create technician";
      logger.error("Error creating technician", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateTechnician = async (technicianId: string, updates: Partial<Technician>) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      const technicianRef = doc(db, "shops", shopId, "branches", branchId, "technicians", technicianId);
      await updateDoc(technicianRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "technicians"),
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
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update technician";
      logger.error("Error updating technician", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteTechnician = async (technicianId: string) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      await deleteDoc(doc(db, "shops", shopId, "branches", branchId, "technicians", technicianId));
      
      // Refresh technicians list
      const updatedTechnicians = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "technicians"),
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
          skills: data.skills || [],
          status: data.status || "active",
          bio: data.bio || "",
          specializations: data.specializations || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        technicianList.push(technician);
      }

      setTechnicians(technicianList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete technician";
      logger.error("Error deleting technician", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    technicians,
    loading,
    error,
    createTechnician,
    updateTechnician,
    deleteTechnician,
  };
} 