"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
import type { Service } from "@/types";

export interface ServiceFilters {
  status?: string;
  priority?: string;
  assignedTechnicianId?: string;
  search?: string;
}

export interface ServiceSortOptions {
  field: 'createdAt' | 'updatedAt' | 'name' | 'price' | 'status';
  direction: 'asc' | 'desc';
}

export function useServices(shopId?: string, branchId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useUser();

  // Memoized query parameters
  const queryParams = useMemo(() => ({
    shopId,
    branchId,
    userShopId: user?.shopId,
    userRole: user?.role,
    userId: user?.id
  }), [shopId, branchId, user?.shopId, user?.role, user?.id]);

  // Memoized service transformation function
  const transformServiceData = useCallback((docSnapshot: any, data: any): Service => {
    return {
      id: docSnapshot.id,
      name: data.name || "",
      description: data.description || "",
      customer: data.customer || {},
      device: data.device || {},
      status: data.status || "pending",
      priority: data.priority || "medium",
            shopId: data.shopId || "",
      branchId: data.branchId || "",
      price: data.price || 0,
      estimatedDuration: data.estimatedDuration || 0,
      actualDuration: data.actualDuration || 0,
      assignedTechnicianId: data.assignedTechnicianId || data.technician_id || "",
      estimatedCompletion: data.estimatedCompletion?.toDate() || new Date(),
      actualCompletion: data.actualCompletion?.toDate() || new Date(),
      workNotes: data.workNotes || [],
      partsUsed: data.partsUsed || [],
      customerFeedback: data.customerFeedback || {},
      qualityScore: data.qualityScore || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }, []);

  // Memoized fetch function
  const fetchServices = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('useServices Debug:', queryParams);

      let q;
      let querySnapshot;
      
      try {
        if (shopId && branchId) {
          // Query services for specific branch
          console.log('Querying services for branch:', { shopId, branchId });
          q = query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          // Query all services for the shop (shop admin only)
          console.log('Querying services for shop:', { shopId });
          q = query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          );
        } else {
          console.log('No shopId provided, returning empty services');
          setServices([]);
          setLoading(false);
          return;
        }

        querySnapshot = await getDocs(q);
        console.log('Services query result:', {
          totalDocs: querySnapshot.docs.length,
          firstDoc: querySnapshot.docs[0]?.data()
        });

        // If no results, try with legacy field names
        if (querySnapshot.docs.length === 0) {
          console.log('No services found with new field names, trying legacy field names');
          
          if (shopId && branchId) {
            q = query(
              collection(db, "services"),
              where("shopId", "==", shopId),
              where("branchId", "==", branchId),
              orderBy("createdAt", "desc")
            );
          } else if (shopId) {
            q = query(
              collection(db, "services"),
              where("shopId", "==", shopId),
              orderBy("createdAt", "desc")
            );
          }
          
          try {
            querySnapshot = await getDocs(q);
            console.log('Legacy field query result:', {
              totalDocs: querySnapshot.docs.length,
              firstDoc: querySnapshot.docs[0]?.data()
            });
          } catch (legacyError) {
            console.log('Legacy field query failed:', legacyError);
          }
        }
      } catch (error: any) {
        console.error('Services query failed:', error);
        setError(String(error));
        setLoading(false);
        return;
      }

      const serviceList: Service[] = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return transformServiceData(docSnapshot, data);
      });

      setServices(serviceList);
      setLoading(false);
    } catch (error: any) {
      console.error('Unexpected error in fetchServices:', error);
      setError(String(error));
      setLoading(false);
    }
  }, [user, shopId, branchId, transformServiceData]);

  // Memoized refresh function
  const refreshServices = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }, [fetchServices]);

  // Memoized create service function
  const createService = useCallback(async (serviceData: Omit<Service, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: add to top-level services collection
      const serviceDocRef = await addDoc(
        collection(db, "services"),
        {
          ...serviceData,
          shopId, // Ensure shopId is set
          branchId, // Ensure branchId is set
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Refresh services list
      await refreshServices();
      return serviceDocRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create service";
      logger.error("Error creating service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }, [user, shopId, branchId, refreshServices]);

  // Memoized update service function
  const updateService = useCallback(async (serviceId: string, updates: Partial<Service>) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: update in top-level services collection
      const serviceRef = doc(db, "services", serviceId);
      await updateDoc(serviceRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh services list
      await refreshServices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update service";
      logger.error("Error updating service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }, [user, shopId, branchId, refreshServices]);

  // Memoized delete service function
  const deleteService = useCallback(async (serviceId: string) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: delete from top-level services collection
      await deleteDoc(doc(db, "services", serviceId));
      
      // Refresh services list
      await refreshServices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete service";
      logger.error("Error deleting service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }, [user, shopId, branchId, refreshServices]);

  // Memoized filtered and sorted services
  const filteredServices = useMemo(() => {
    return services;
  }, [services]);

  // Effect to fetch services when dependencies change
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services: filteredServices,
    loading,
    refreshing,
    error,
    createService,
    updateService,
    deleteService,
    refreshServices,
  };
} 