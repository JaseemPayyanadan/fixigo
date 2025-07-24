import { useState } from "react";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "../types";

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUser = async (uid: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Omit<User, "uid">, uid: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await setDoc(doc(db, "users", uid), userData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", uid), updates);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    getUser,
    createUser,
    updateUser,
    deleteUser,
    loading,
    error,
  };
} 