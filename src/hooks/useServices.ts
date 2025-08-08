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

        console.log('useServices Debug:', {
          shopId,
          branchId,
          userShopId: user.shopId,
          userRole: user.role,
          userId: user.id
        });

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
                where("shop_id", "==", shopId),
                where("branch_id", "==", branchId),
                orderBy("createdAt", "desc")
              );
            } else if (shopId) {
              q = query(
                collection(db, "services"),
                where("shop_id", "==", shopId),
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
        } catch (indexError) {
          // If index is building, try without ordering
          console.log('Index building error, using fallback query:', indexError);
          logger.warn("Index building in progress for services, using fallback query", { error: String(indexError) });
          
          if (shopId && branchId) {
            q = query(
              collection(db, "services"),
              where("shopId", "==", shopId),
              where("branchId", "==", branchId)
            );
          } else if (shopId) {
            q = query(
              collection(db, "services"),
              where("shopId", "==", shopId)
            );
          } else {
            setServices([]);
            setLoading(false);
            return;
          }
          
          querySnapshot = await getDocs(q);
          console.log('Fallback services query result:', {
            totalDocs: querySnapshot.docs.length
          });

          // If no results, try with legacy field names
          if (querySnapshot.docs.length === 0) {
            console.log('No services found with new field names in fallback, trying legacy field names');
            
            if (shopId && branchId) {
              q = query(
                collection(db, "services"),
                where("shop_id", "==", shopId),
                where("branch_id", "==", branchId)
              );
            } else if (shopId) {
              q = query(
                collection(db, "services"),
                where("shop_id", "==", shopId)
              );
            }
            
            try {
              querySnapshot = await getDocs(q);
              console.log('Legacy field fallback query result:', {
                totalDocs: querySnapshot.docs.length
              });
            } catch (legacyError) {
              console.log('Legacy field fallback query failed:', legacyError);
            }
          }
        }
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
            shopId: data.shopId || data.shop_id || "", // Handle both field names
            branchId: data.branchId || data.branch_id || "", // Handle both field names
            price: data.price || 0,
            estimatedDuration: data.estimatedDuration || 0,
            actualDuration: data.actualDuration || 0,
            assignedTechnicianId: data.assignedTechnicianId || data.technician_id || "", // Handle both field names
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

        // Sort manually since we're not using orderBy in the query
        serviceList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        console.log('Final services list:', {
          count: serviceList.length,
          services: serviceList.slice(0, 3) // First 3 for debugging
        });

        setServices(serviceList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch services";
        console.error('Error fetching services:', err);
        
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
      let updatedServices;
      try {
        updatedServices = await getDocs(
          query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId),
            orderBy("createdAt", "desc")
          )
        );
      } catch (indexError) {
        // If index is building, try without ordering
        logger.warn("Index building in progress for services refresh, using fallback query", { error: String(indexError) });
        
        updatedServices = await getDocs(
          query(
            collection(db, "services"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId)
          )
        );
      }

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

      // Sort manually if we couldn't use orderBy
      serviceList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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