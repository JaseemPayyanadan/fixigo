"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
import type { User, Role } from "@/types";
import { addUserToBranchMembers } from "@/lib/userManagement";

export interface UserFilters {
  role?: Role;
  status?: "active" | "inactive" | "suspended";
  branchId?: string;
  search?: string;
}

export function useUsers(shopId?: string, filters?: UserFilters) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!shopId) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Verify shop exists
        const shopDocRef = doc(db, "shops", shopId);
        const shopDoc = await getDoc(shopDocRef);
        if (!shopDoc.exists()) {
          throw new Error("Shop not found");
        }

        // Build query with filters
        let q = query(
          collection(db, "users"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const userList: User[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          let phone = "";
          
          // For technicians and branch admins, fetch phone from branch members array
          if ((data.role === "technician" || data.role === "branch_admin") && data.branchId) {
            try {
              const branchDoc = await getDoc(doc(db, "shops", shopId, "branches", data.branchId));
              if (branchDoc.exists()) {
                const branchData = branchDoc.data();
                const members = branchData.members || [];
                
                // Find the user in the members array
                const userMember = members.find((member: any) => member.userId === data.uid);
                if (userMember) {
                  phone = userMember.phone || "";
                }
              }
            } catch (error) {
              console.warn(`Error fetching phone for ${data.uid}:`, error);
            }
          }
          
          const user: User = {
            id: docSnapshot.id,
            uid: data.uid || "",
            name: data.name || "",
            email: data.email || "",
            role: data.role || "technician",
            shopId: data.shopId || "",
            branchId: data.branchId || null,
            status: data.status || "active",
            onboardingCompleted: data.onboardingCompleted || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            phone: phone, // Add phone to user object
          };

          // Apply filters
          if (filters?.role && user.role !== filters.role) continue;
          if (filters?.status && user.status !== filters.status) continue;
          if (filters?.branchId && user.branchId !== filters.branchId) continue;
          if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            if (!user.name.toLowerCase().includes(searchLower) && 
                !user.email.toLowerCase().includes(searchLower)) continue;
          }

          userList.push(user);
        }

        setUsers(userList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
        setError(errorMessage);
        logger.error("Error fetching users", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, shopId, filters]);

  const createUser = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      // Verify shop exists
      const shopDocRef = doc(db, "shops", shopId);
      const shopDoc = await getDoc(shopDocRef);
      if (!shopDoc.exists()) {
        throw new Error("Shop not found");
      }

      // Create user document
      const userDocRef = await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Refresh users list
      const updatedUsers = await getDocs(
        query(
          collection(db, "users"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const userList: User[] = [];
      for (const docSnapshot of updatedUsers.docs) {
        const data = docSnapshot.data();
        const user: User = {
          id: docSnapshot.id,
          uid: data.uid || "",
          name: data.name || "",
          email: data.email || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || null,
          status: data.status || "active",
          onboardingCompleted: data.onboardingCompleted || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        userList.push(user);
      }

      setUsers(userList);
      
      return {
        userId: userDocRef.id
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create user";
      logger.error("Error creating user", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // If role or branchId is being updated, also update the branch's members array
      if ((updates.role || updates.branchId) && updates.role && updates.branchId) {
        await addUserToBranchMembers(shopId, updates.branchId, userId, updates.role);
      }

      // Refresh users list
      const updatedUsers = await getDocs(
        query(
          collection(db, "users"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const userList: User[] = [];
      for (const docSnapshot of updatedUsers.docs) {
        const data = docSnapshot.data();
        const user: User = {
          id: docSnapshot.id,
          uid: data.uid || "",
          name: data.name || "",
          email: data.email || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || null,
          status: data.status || "active",
          onboardingCompleted: data.onboardingCompleted || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        userList.push(user);
      }

      setUsers(userList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update user";
      logger.error("Error updating user", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!shopId) {
      throw new Error("Missing shop ID");
    }

    try {
      await deleteDoc(doc(db, "users", userId));
      
      // Refresh users list
      const updatedUsers = await getDocs(
        query(
          collection(db, "users"),
          where("shopId", "==", shopId),
          orderBy("createdAt", "desc")
        )
      );

      const userList: User[] = [];
      for (const docSnapshot of updatedUsers.docs) {
        const data = docSnapshot.data();
        const user: User = {
          id: docSnapshot.id,
          uid: data.uid || "",
          name: data.name || "",
          email: data.email || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || null,
          status: data.status || "active",
          onboardingCompleted: data.onboardingCompleted || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        userList.push(user);
      }

      setUsers(userList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete user";
      logger.error("Error deleting user", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const getUserById = async (userId: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          uid: data.uid || "",
          name: data.name || "",
          email: data.email || "",
          role: data.role || "technician",
          shopId: data.shopId || "",
          branchId: data.branchId || null,
          status: data.status || "active",
          onboardingCompleted: data.onboardingCompleted || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user";
      logger.error("Error fetching user", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
  };
} 