"use client";
import { useState, useEffect } from "react";
import { User } from "@/types";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userWithUid: User = {
              ...userData,
              uid: fbUser.uid,
            } as User;
            setUser(userWithUid);
          } else {
            setUser(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to fetch user data");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, error };
} 