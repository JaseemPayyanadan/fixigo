"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
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
          q = query(
            collection(db, "shops", shopId, "branches", branchId, "services"),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          q = query(
            collection(db, "shops", shopId, "branches"),
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
        setError(errorMessage);
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
      const serviceDocRef = await addDoc(
        collection(db, "shops", shopId, "branches", branchId, "services"),
        {
          ...serviceData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Refresh services list
      const updatedServices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "services"),
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
      const serviceRef = doc(db, "shops", shopId, "branches", branchId, "services", serviceId);
      await updateDoc(serviceRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh services list
      const updatedServices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "services"),
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
      await deleteDoc(doc(db, "shops", shopId, "branches", branchId, "services", serviceId));
      
      // Refresh services list
      const updatedServices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "services"),
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