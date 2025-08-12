"use client";
import { useState, useEffect } from "react";

import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logger, isIndexBuildingError, getIndexBuildingMessage } from "@/lib/logger";
import type { Branch } from "@/types";

import { useUser } from "./useUser";

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

        // New flat structure: query top-level branches collection with shopId filter
        let q;
        let querySnapshot;
        
        try {
          // Try with ordering first
          q = query(
            collection(db, "branches"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          );
          querySnapshot = await getDocs(q);
        } catch (indexError) {
          // If index is building, try without ordering
          logger.warn("Index building in progress for branches, using fallback query", { error: String(indexError) });
          
          q = query(
            collection(db, "branches"),
            where("shopId", "==", shopId)
          );
          querySnapshot = await getDocs(q);
        }
        
        const branchList: Branch[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          console.log("useBranches - branch document:", { id: docSnapshot.id, data });
          console.log("useBranches - branch data keys:", Object.keys(data));
          console.log("useBranches - branch data values:", Object.values(data));
          console.log("useBranches - branch shopId:", data.shopId);
          
          const branch: Branch = {
            id: docSnapshot.id,
            name: data.name || "",
            location: data.location || "",
            phone: data.phone || "",
            email: data.email || "",
            status: data.status || "active",
            shopId: data.shopId || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          
          // Warn about branches without shopId
          if (!data.shopId) {
            console.warn("useBranches - Branch without shopId:", { id: docSnapshot.id, name: data.name });
          }
          
          branchList.push(branch);
        }

        console.log("useBranches - final branch list:", branchList);

        // Sort manually since we're not using orderBy in the query
        branchList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setBranches(branchList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch branches";
        logger.error("Error fetching branches", { error: errorMessage });
        
        // Check if it's an index building error
        if (isIndexBuildingError(errorMessage)) {
          setError(getIndexBuildingMessage(errorMessage));
        } else if (errorMessage.includes("Missing or insufficient permissions")) {
          setError("You don't have permission to access branches. Please contact your administrator.");
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [user, shopId]);

  const createBranch = async (branchData: Omit<Branch, "id" | "createdAt" | "updatedAt">) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      // Step 1: Verify shop exists
      const shopDocRef = doc(db, "shops", shopId);
      const shopDoc = await getDoc(shopDocRef);
      if (!shopDoc.exists()) {
        throw new Error("Shop not found");
      }

      // Step 2: Create branch document in new flat structure
      const branchDocRef = await addDoc(
        collection(db, "branches"),
        {
          ...branchData,
          shopId, // Ensure shopId is set
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Step 3: Refresh branches list
      let updatedBranches;
      try {
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          )
        );
      } catch (indexError) {
        // If index is building, try without ordering
        logger.warn("Index building in progress for branches refresh, using fallback query", { error: String(indexError) });
        
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId)
          )
        );
      }

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          location: data.location || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",

          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        branchList.push(branch);
      }

      setBranches(branchList);
      
      // Return branch ID for successful creation
      return {
        branchId: branchDocRef.id
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create branch";
      logger.error("Error creating branch", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateBranch = async (branchId: string, updates: Partial<Branch>) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      // Filter out undefined values to prevent Firestore errors
      const cleanUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanUpdates[key] = value;
        }
      });

      // Always add updatedAt
      cleanUpdates.updatedAt = new Date();

      console.log("useBranches - Updating branch with clean data:", { branchId, cleanUpdates });

      // New flat structure: update in top-level branches collection
      const branchRef = doc(db, "branches", branchId);
      await updateDoc(branchRef, cleanUpdates);

      console.log("useBranches - Branch updated successfully");

      // Refresh branches list
      let updatedBranches;
      try {
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          )
        );
      } catch (indexError) {
        // If index is building, try without ordering
        logger.warn("Index building in progress for branches update refresh, using fallback query", { error: String(indexError) });
        
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId)
          )
        );
      }

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        console.log("useBranches - branch document:", { id: docSnapshot.id, data });
        console.log("useBranches - branch data keys:", Object.keys(data));
        console.log("useBranches - branch data values:", Object.values(data));
        console.log("useBranches - branch shopId:", data.shopId);
        
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          location: data.location || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        
        // Warn about branches without shopId
        if (!data.shopId) {
          console.warn("useBranches - Branch without shopId:", { id: docSnapshot.id, name: data.name });
        }
        
        branchList.push(branch);
      }

      console.log("useBranches - final branch list:", branchList);

      // Sort manually if we couldn't use orderBy
      branchList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setBranches(branchList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update branch";
      logger.error("Error updating branch", { error: errorMessage, branchId, updates: JSON.stringify(updates) });
      throw new Error(errorMessage);
    }
  };

  const deleteBranch = async (branchId: string) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      // New flat structure: delete from top-level branches collection
      await deleteDoc(doc(db, "branches", branchId));
      
      // Refresh branches list
      let updatedBranches;
      try {
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          )
        );
      } catch (indexError) {
        // If index is building, try without ordering
        logger.warn("Index building in progress for branches delete refresh, using fallback query", { error: String(indexError) });
        
        updatedBranches = await getDocs(
          query(
            collection(db, "branches"),
            where("shopId", "==", shopId)
          )
        );
      }

      const branchList: Branch[] = [];
      for (const docSnapshot of updatedBranches.docs) {
        const data = docSnapshot.data();
        const branch: Branch = {
          id: docSnapshot.id,
          name: data.name || "",
          location: data.location || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "active",
          shopId: data.shopId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        branchList.push(branch);
      }

      // Sort manually if we couldn't use orderBy
      branchList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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