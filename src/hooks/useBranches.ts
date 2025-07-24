import { useEffect, useState, useCallback } from "react";
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
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
    console.log('createBranch called with shopId:', shopId);
    console.log('createBranch called with branchData:', branchData);
    
    if (!shopId) throw new Error("No shopId provided");
    
    // Check if shop document exists
    try {
      const shopDoc = await getDoc(doc(db, "shops", shopId));
      if (!shopDoc.exists()) {
        throw new Error("Shop document not found. Please complete your shop setup first.");
      }
      console.log('Shop document exists:', shopDoc.data());
    } catch (err) {
      console.error('Error checking shop document:', err);
      throw new Error("Unable to verify shop setup. Please try again.");
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('Step 1: Creating Firebase Auth user...');
      // 1. Create Firebase Auth user for branch admin
      const userCredential = await createUserWithEmailAndPassword(auth, branchData.email, branchData.branchPassword);
      const branchAdminUid = userCredential.user.uid;
      console.log('Step 1 completed: Branch admin UID:', branchAdminUid);
      
      console.log('Step 2: Adding user document for branch admin...');
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
      console.log('Step 2 completed: User document created');
      
      console.log('Step 3: Adding branch to Firestore...');
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
      console.log('Step 3 completed: Branch document created with ID:', branchDocRef.id);
      
      console.log('Step 4: Updating branchId in user document...');
      // 4. Update branchId in user document
      await updateDoc(doc(db, "users", branchAdminUid), { branch_id: branchDocRef.id });
      console.log('Step 4 completed: User document updated with branch_id');
      
      console.log('Step 5: Fetching updated branches...');
      await fetchBranches();
      console.log('Step 5 completed: Branches refreshed');
      
      console.log('createBranch completed successfully');
    } catch (err: unknown) {
      console.error('Error in createBranch:', err);
      
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

  const updateBranch = async (id: string, updates: Partial<Branch>) => {
    if (!shopId) throw new Error("No shopId provided");
    
    // Validate required fields
    if (!updates.name?.trim()) {
      throw new Error("Branch name is required");
    }
    if (!updates.address?.trim()) {
      throw new Error("Branch address is required");
    }
    if (!updates.phone?.trim()) {
      throw new Error("Phone number is required");
    }
    if (!updates.email?.trim()) {
      throw new Error("Email is required");
    }
    
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(updates.email)) {
      throw new Error("Please enter a valid email address");
    }
    
    // Validate phone format
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(updates.phone.replace(/\s/g, ""))) {
      throw new Error("Please enter a valid phone number");
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Updating branch:', id, 'with data:', updates);
      
      await updateDoc(doc(db, `shops/${shopId}/branches`, id), {
        name: updates.name.trim(),
        address: updates.address.trim(),
        phone: updates.phone.trim(),
        email: updates.email.trim(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('Branch updated successfully');
      await fetchBranches();
    } catch (err: unknown) {
      console.error('Error updating branch:', err);
      
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