import { useEffect, useState, useCallback } from "react";
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { Branch, User } from "../types";
import logger from "@/lib/logger";

export function useBranches(shopId: string | undefined) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      logger.info('Fetching branches', { shopId });
      const querySnapshot = await getDocs(collection(db, `shops/${shopId}/branches`));
      logger.debug('Branches fetched successfully', { count: querySnapshot.docs.length });
      
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
      logger.debug('Processed branches data', { branches: branchList });
      setBranches(branchList);
    } catch (err: unknown) {
      logger.error('Error fetching branches', err as Error, { shopId });
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
    logger.info('Creating branch', { shopId, branchData: { ...branchData, branchPassword: '[REDACTED]' } });
    
    if (!shopId) throw new Error("No shopId provided");
    
    // Check if shop document exists
    try {
      const shopDoc = await getDoc(doc(db, "shops", shopId));
      if (!shopDoc.exists()) {
        throw new Error("Shop document not found. Please complete your shop setup first.");
      }
      logger.debug('Shop document verified', { shopData: shopDoc.data() });
    } catch (err) {
      logger.error('Error checking shop document', err as Error, { shopId });
      throw new Error("Unable to verify shop setup. Please try again.");
    }
    
    setLoading(true);
    setError(null);
    try {
      logger.debug('Step 1: Creating Firebase Auth user for branch admin');
      const branchAdminUid = `branch_${Date.now()}`;
      const branchAdminEmail = `${branchData.email}`;
      const branchAdminPassword = branchData.branchPassword;
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        branchAdminEmail,
        branchAdminPassword
      );
      const branchAdminUid2 = userCredential.user.uid;
      logger.debug('Step 1 completed: Branch admin user created', { branchAdminUid: branchAdminUid2 });
      
      logger.debug('Step 2: Adding user document for branch admin');
      const userData: User = {
        id: branchAdminUid2,
        uid: branchAdminUid2,
        name: branchData.name,
        email: branchData.email,
        role: "branch_admin",
        shopId: shopId,
        branchId: "", // Will be updated after branch creation
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(doc(db, "users", branchAdminUid2), userData);
      logger.debug('Step 2 completed: User document created');
      
      logger.debug('Step 3: Adding branch to Firestore');
      const branchDocRef = await addDoc(collection(db, `shops/${shopId}/branches`), {
        name: branchData.name.trim(),
        address: branchData.address.trim(),
        phone: branchData.phone.trim(),
        email: branchData.email.trim(),
        status: "active",
        managerId: branchAdminUid2,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      logger.debug('Step 3 completed: Branch document created', { branchId: branchDocRef.id });
      
      logger.debug('Step 4: Updating branchId in user document');
      await updateDoc(doc(db, "users", branchAdminUid2), {
        branch_id: branchDocRef.id,
        updatedAt: serverTimestamp(),
      });
      logger.debug('Step 4 completed: User document updated with branch_id');
      
      logger.debug('Step 5: Fetching updated branches');
      await fetchBranches();
      logger.debug('Step 5 completed: Branches refreshed');
      
      logger.info('Branch created successfully', { branchId: branchDocRef.id, branchAdminUid: branchAdminUid2 });
    } catch (err: unknown) {
      logger.error('Error in createBranch', err as Error);
      
      // Handle specific Firebase Auth errors
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('This email is already registered. Please use a different email address.');
        } else if (err.message.includes('weak-password')) {
          setError('Password is too weak. Please use a stronger password.');
        } else if (err.message.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else {
          setError(err.message);
        }
      } else {
        setError(String(err));
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBranch = async (id: string, updates: {
    name: string;
    address: string;
    phone: string;
    email: string;
  }) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Updating branch', { branchId: id, updates });
      
      await updateDoc(doc(db, `shops/${shopId}/branches`, id), {
        name: updates.name.trim(),
        address: updates.address.trim(),
        phone: updates.phone.trim(),
        email: updates.email.trim(),
        updatedAt: serverTimestamp(),
      });
      
      logger.info('Branch updated successfully', { branchId: id });
      await fetchBranches();
    } catch (err: unknown) {
      logger.error('Error updating branch', err as Error, { branchId: id });
      
      // Handle specific Firebase errors
      if (err instanceof Error) {
        if (err.message.includes('permission-denied')) {
          setError('You do not have permission to update this branch');
        } else if (err.message.includes('not-found')) {
          setError('Branch not found. It may have been deleted.');
        } else if (err.message.includes('unavailable')) {
          setError('Service temporarily unavailable. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (id: string) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    try {
      logger.info('Deleting branch', { branchId: id, shopId });
      await deleteDoc(doc(db, `shops/${shopId}/branches`, id));
      logger.info('Branch deleted successfully', { branchId: id });
      await fetchBranches();
    } catch (err: unknown) {
      logger.error('Error deleting branch', err as Error, { branchId: id, shopId });
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