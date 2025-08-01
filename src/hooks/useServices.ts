"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger, isIndexBuildingError, getIndexBuildingMessage } from "@/lib/logger";
import type { Service } from "@/types";

export function useServices(shopId?: string, branchId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);

        let q;
        if (shopId && branchId) {
          // New flat structure: query top-level services collection with filters
          q = query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          // Query all services for the shop
          q = query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          );
        } else {
          setServices([]);
          setLoading(false);
          return;
        }

        const querySnapshot = await getDocs(q);
        const serviceList: Service[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const service: Service = {
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
            assignedTechnicianId: data.assignedTechnicianId || "",
            estimatedCompletion: data.estimatedCompletion?.toDate() || new Date(),
            actualCompletion: data.actualCompletion?.toDate() || new Date(),
            workNotes: data.workNotes || "",
            partsUsed: data.partsUsed || [],
            customerFeedback: data.customerFeedback || {},
            qualityScore: data.qualityScore || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          serviceList.push(service);
        }

        setServices(serviceList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch services";
        
        // Check if it's an index building error
        if (isIndexBuildingError(errorMessage)) {
          setError(getIndexBuildingMessage(errorMessage));
        } else {
          setError(errorMessage);
        }
        
        logger.error("Error fetching services", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user, shopId, branchId]);

  const createService = async (serviceData: Omit<Service, "id" | "createdAt" | "updatedAt">) => {
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
      const updatedServices = await getDocs(
        query(
          collection(db, "services"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const serviceList: Service[] = [];
      for (const docSnapshot of updatedServices.docs) {
        const data = docSnapshot.data();
        const service: Service = {
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
          assignedTechnicianId: data.assignedTechnicianId || "",
          estimatedCompletion: data.estimatedCompletion?.toDate() || new Date(),
          actualCompletion: data.actualCompletion?.toDate() || new Date(),
          workNotes: data.workNotes || "",
          partsUsed: data.partsUsed || [],
          customerFeedback: data.customerFeedback || {},
          qualityScore: data.qualityScore || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        serviceList.push(service);
      }

      setServices(serviceList);
      return serviceDocRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create service";
      logger.error("Error creating service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
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
      const updatedServices = await getDocs(
        query(
          collection(db, "services"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const serviceList: Service[] = [];
      for (const docSnapshot of updatedServices.docs) {
        const data = docSnapshot.data();
        const service: Service = {
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
          assignedTechnicianId: data.assignedTechnicianId || "",
          estimatedCompletion: data.estimatedCompletion?.toDate() || new Date(),
          actualCompletion: data.actualCompletion?.toDate() || new Date(),
          workNotes: data.workNotes || "",
          partsUsed: data.partsUsed || [],
          customerFeedback: data.customerFeedback || {},
          qualityScore: data.qualityScore || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        serviceList.push(service);
      }

      setServices(serviceList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update service";
      logger.error("Error updating service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: delete from top-level services collection
      await deleteDoc(doc(db, "services", serviceId));
      
      // Refresh services list
      const updatedServices = await getDocs(
        query(
          collection(db, "services"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const serviceList: Service[] = [];
      for (const docSnapshot of updatedServices.docs) {
        const data = docSnapshot.data();
        const service: Service = {
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
          assignedTechnicianId: data.assignedTechnicianId || "",
          estimatedCompletion: data.estimatedCompletion?.toDate() || new Date(),
          actualCompletion: data.actualCompletion?.toDate() || new Date(),
          workNotes: data.workNotes || "",
          partsUsed: data.partsUsed || [],
          customerFeedback: data.customerFeedback || {},
          qualityScore: data.qualityScore || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        serviceList.push(service);
      }

      setServices(serviceList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete service";
      logger.error("Error deleting service", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
  };
} 