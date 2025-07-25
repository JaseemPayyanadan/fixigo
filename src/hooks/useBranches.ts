"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
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
      // Verify shop exists
      const shopDocRef = doc(db, "shops", shopId);
      const shopDoc = await getDoc(shopDocRef);
      if (!shopDoc.exists()) {
        throw new Error("Shop not found");
      }

      // Create Firebase Auth user for branch manager
      const managerUid = await createUserWithEmailAndPassword(
        auth,
        branchData.email,
        "tempPassword123!" // This should be changed by the user
      );

      const userEmail = branchData.email;

      // Create branch document
      const branchDocRef = await addDoc(
        collection(db, "shops", shopId, "branches"),
        {
          ...branchData,
          managerId: managerUid.user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Create user document for branch manager
      await addDoc(collection(db, "users"), {
        uid: managerUid.user.uid,
        name: branchData.name,
        email: branchData.email,
        role: "branch_admin",
        shopId: shopId,
        branchId: branchDocRef.id,
        status: "active",
        onboardingCompleted: false,
        createdAt: new Date(),
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
      return branchDocRef.id;
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