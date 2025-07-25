import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import type { Technician, User } from "../types";

export function useTechnicians(shopId: string | undefined, branchId?: string) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicians = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      let q = query(collection(db, "technicians"), where("shop_id", "==", shopId));
      
      // If branchId is provided, filter by branch
      if (branchId) {
        q = query(q, where("branch_id", "==", branchId));
      }
      
      const querySnapshot = await getDocs(q);
      const technicianList: Technician[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          uid: data.uid || "", // Add UID field
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: "technician",
          branchId: data.branch_id || "",
          shopId: data.shop_id || "",
          skills: data.skills || [],
          status: data.status || "active",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        };
      });
      setTechnicians(technicianList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [shopId, branchId]);

  useEffect(() => {
    if (shopId) fetchTechnicians();
  }, [fetchTechnicians, shopId]);

  const createTechnician = async (technicianData: {
    name: string;
    email: string;
    phone: string;
    branch_id: string;
    password: string;
  }, createdBy: string) => {
    if (!shopId) throw new Error("No shopId provided");
    setLoading(true);
    setError(null);
    
    try {
      console.log('Creating technician with data:', technicianData);
      
      // 1. Create Firebase Auth user for technician
      const userCredential = await createUserWithEmailAndPassword(auth, technicianData.email, technicianData.password);
      const technicianUid = userCredential.user.uid;
      console.log('Firebase Auth user created with UID:', technicianUid);
      
      // 2. Add user document for technician
      const technicianUser: User = {
        id: technicianUid,
        uid: technicianUid,
        name: technicianData.name,
        email: technicianData.email,
        role: "technician",
        shopId,
        branchId: technicianData.branch_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, "users", technicianUid), technicianUser);
      console.log('User document created for technician');
      
      // 3. Add technician to technicians collection
      const technicianDocRef = await addDoc(collection(db, "technicians"), {
        name: technicianData.name,
        email: technicianData.email,
        phone: technicianData.phone,
        branchId: technicianData.branch_id,
        shop_id: shopId,
        role: "technician",
        status: "active",
        skills: [],
        created_by: createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('Technician document created with ID:', technicianDocRef.id);
      
      // 4. Refresh the technicians list
      await fetchTechnicians();
      console.log('Technicians list refreshed');
      
      return technicianDocRef.id;
    } catch (err: unknown) {
      console.error('Error creating technician:', err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    technicians,
    loading,
    error,
    fetchTechnicians,
    createTechnician,
  };
} 