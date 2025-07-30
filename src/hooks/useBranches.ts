"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
import { UserManagementService } from "@/lib/userManagement";
import type { Branch } from "@/types";

export function useBranches(shopId?: string) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchBranches = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!shopId) {
          setBranches([]);
          setLoading(false);
          return;
        }

        // Verify shop exists
        const shopDocRef = doc(db, "shops", shopId);
        const shopDoc = await getDoc(shopDocRef);
        if (!shopDoc.exists()) {
          throw new Error("Shop not found");
        }

        const q = query(
          collection(db, "shops", shopId, "branches"),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const branchList: Branch[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const branch: Branch = {
            id: docSnapshot.id,
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            status: data.status || "active",
            shopId: data.shopId || "",
            managerId: data.managerId || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          branchList.push(branch);
        }

        setBranches(branchList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch branches";
        setError(errorMessage);
        logger.error("Error fetching branches", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [user, shopId]);

  const createBranch = async (branchData: Omit<Branch, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      // Step 1: Verify shop exists
      const shopDocRef = doc(db, "shops", shopId);
      const shopDoc = await getDoc(shopDocRef);
      if (!shopDoc.exists()) {
        throw new Error("Shop not found");
      }

      // Step 2: Create branch document first
      const branchDocRef = await addDoc(
        collection(db, "shops", shopId, "branches"),
        {
          ...branchData,
          managerId: "", // Will be updated after user creation
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Step 3: Create branch admin user using the service
      const userResult = await UserManagementService.createUser({
        name: branchData.name,
        email: branchData.email,
        role: "branch_admin",
        shopId,
        branchId: branchDocRef.id,
        phone: branchData.phone,
      });

      // Step 4: Update branch document with manager ID
      await updateDoc(doc(db, "shops", shopId, "branches", branchDocRef.id), {
        managerId: userResult.uid,
        updatedAt: new Date(),
      });

      // Step 5: Refresh branches list
      const updatedBranches = await getDocs(
        query(
          collection(db, "shops", shopId, "branches"),
          orderBy("createdAt", "desc")
        )
      );

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",
          managerId: data.managerId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        branchList.push(branch);
      }

      setBranches(branchList);
      
      // Return both branch ID and temporary password for admin notification
      return {
        branchId: branchDocRef.id,
        tempPassword: userResult.tempPassword,
        managerEmail: branchData.email
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create branch";
      logger.error("Error creating branch", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateBranch = async (branchId: string, updates: Partial<Branch>) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      const branchRef = doc(db, "shops", shopId, "branches", branchId);
      await updateDoc(branchRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh branches list
      const updatedBranches = await getDocs(
        query(
          collection(db, "shops", shopId, "branches"),
          orderBy("createdAt", "desc")
        )
      );

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",
          managerId: data.managerId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        branchList.push(branch);
      }

      setBranches(branchList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update branch";
      logger.error("Error updating branch", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteBranch = async (branchId: string) => {
    if (!user || !shopId) {
      throw new Error("User not authenticated or missing shop ID");
    }

    try {
      await deleteDoc(doc(db, "shops", shopId, "branches", branchId));
      
      // Refresh branches list
      const updatedBranches = await getDocs(
        query(
          collection(db, "shops", shopId, "branches"),
          orderBy("createdAt", "desc")
        )
      );

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",
          managerId: data.managerId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        branchList.push(branch);
      }

      setBranches(branchList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete branch";
      logger.error("Error deleting branch", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    branches,
    loading,
    error,
    createBranch,
    updateBranch,
    deleteBranch,
  };
} 

// Helper function to generate secure passwords
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
} 