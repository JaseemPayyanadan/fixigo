"use client";
import { useState, useEffect } from "react";

import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logger, isIndexBuildingError, getIndexBuildingMessage } from "@/lib/logger";
import type { Branch } from "@/types";

import { useUser } from "./useUser";

/** Firestore Timestamp, JS Date, or an ISO string — branch docs carry all three. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

/**
 * Branch documents predate the current schema in a few shops, so the display
 * name lives under one of several keys. Reading only `name` left the Branch
 * column blank for those rows.
 */
function toBranch(id: string, data: Record<string, unknown>): Branch {
  const name =
    (data.name as string) ||
    (data.branchName as string) ||
    (data.branch_name as string) ||
    (data.title as string) ||
    "";

  return {
    id,
    name,
    location: (data.location as string) || (data.address as string) || "",
    phone: (data.phone as string) || "",
    email: (data.email as string) || "",
    status: (data.status as Branch["status"]) || "active",
    shopId: (data.shopId as string) || "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * Every branch of a shop, newest first.
 *
 * No `orderBy` on purpose: Firestore omits documents that lack the ordered
 * field, so ordering by `createdAt` silently hid every branch written without
 * one — silently, because an empty result set is not an error, so the old
 * try/catch index fallback never ran. Sorting happens in memory instead.
 */
async function fetchBranchList(shopId: string): Promise<Branch[]> {
  const flatSnapshot = await getDocs(
    query(collection(db, "branches"), where("shopId", "==", shopId))
  );

  const branchList = flatSnapshot.docs.map((docSnapshot) =>
    toBranch(docSnapshot.id, docSnapshot.data())
  );

  // Older shops keep their branches nested under the shop. Merge in any the
  // flat collection does not cover, so a repair pointing at a nested branch id
  // still resolves to a name.
  try {
    const nestedSnapshot = await getDocs(collection(db, "shops", shopId, "branches"));
    const seen = new Set(branchList.map((branch) => branch.id));
    nestedSnapshot.docs.forEach((docSnapshot) => {
      if (seen.has(docSnapshot.id)) return;
      branchList.push(toBranch(docSnapshot.id, { ...docSnapshot.data(), shopId }));
    });
  } catch (nestedError) {
    logger.warn("Could not read nested branches", { error: String(nestedError) });
  }

  branchList.forEach((branch) => {
    if (!branch.name) logger.warn("Branch document has no name field", { id: branch.id });
  });

  return branchList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

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

        setBranches(await fetchBranchList(shopId));
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
      setBranches(await fetchBranchList(shopId));

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
      setBranches(await fetchBranchList(shopId));
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
      setBranches(await fetchBranchList(shopId));
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