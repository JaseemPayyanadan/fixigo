"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
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

        let technicianList: Technician[] = [];

        if (shopId && branchId) {
          // Fetch technicians from specific branch
          const q = query(
            collection(db, "shops", shopId, "branches", branchId, "technicians"),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);

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
          // Fetch technicians from all branches in the shop
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

  const createTechnician = async (technicianData: Omit<Technician, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // Create Firebase Auth user for technician
      const technicianUid = await createUserWithEmailAndPassword(
        auth,
        technicianData.email,
        "tempPassword123!" // This should be changed by the user
      );

      const userEmail = technicianData.email;

      // Create technician document
      const technicianDocRef = await addDoc(
        collection(db, "shops", shopId, "branches", branchId, "technicians"),
        {
          ...technicianData,
          uid: technicianUid.user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Create user document for technician
      await addDoc(collection(db, "users"), {
        uid: technicianUid.user.uid,
        name: technicianData.name,
        email: technicianData.email,
        role: "technician",
        shopId: shopId,
        branchId: branchId,
        status: "active",
        onboardingCompleted: false,
        createdAt: new Date(),
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
      return technicianDocRef.id;
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