import { useEffect, useState, useCallback } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { Branch, User } from "../types";

export function useBranches(shopId: string | undefined) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching branches for shopId:', shopId);
      const querySnapshot = await getDocs(collection(db, `shops/${shopId}/branches`));
      console.log('Branches fetched:', querySnapshot.docs.length);
      
      const branchList: Branch[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          location: data.location || "",
          address: data.address || data.location || "",
          contactNumber: data.contactNumber || "",
          phone: data.phone || data.contactNumber || "",
          branchEmail: data.branchEmail || "",
          email: data.email || data.branchEmail || "",
          status: data.status || "active",
          shopId: shopId || "",
          managerId: data.managerId || "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        };
      });
      console.log('Processed branches:', branchList);
      setBranches(branchList);
    } catch (err: unknown) {
      console.error('Error fetching branches:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (shopId) fetchBranches();
  }, [fetchBranches, shopId]);

  const createBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    branchPassword: string;
  }) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    try {
      // 1. Create Firebase Auth user for branch admin
      const userCredential = await createUserWithEmailAndPassword(auth, branchData.email, branchData.branchPassword);
      const branchAdminUid = userCredential.user.uid;
      
      // 2. Add user document for branch admin
      const branchAdminUser: User = {
        id: branchAdminUid,
        uid: branchAdminUid,
        name: branchData.name,
        email: branchData.email,
        role: "branch_admin",
        shopId,
        branch_id: "", // Will be set after branch is created
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, "users", branchAdminUid), branchAdminUser);
      
      // 3. Add branch to Firestore
      const branchDocRef = await addDoc(collection(db, `shops/${shopId}/branches`), {
        name: branchData.name,
        address: branchData.address,
        phone: branchData.phone,
        email: branchData.email,
        status: "active",
        shopId,
        managerId: branchAdminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // 4. Update branchId in user document
      await updateDoc(doc(db, "users", branchAdminUid), { branch_id: branchDocRef.id });
      await fetchBranches();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, `shops/${shopId}/branches`, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await fetchBranches();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (id: string) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, `shops/${shopId}/branches`, id));
      await fetchBranches();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    branches,
    loading,
    error,
    createBranch,
    updateBranch,
    deleteBranch,
    fetchBranches,
  };
} 