"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "./useUser";
import { logger } from "@/lib/logger";
import type { Invoice } from "@/types";

export function useInvoices(shopId?: string, branchId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        let q;
        if (shopId && branchId) {
          q = query(
            collection(db, "shops", shopId, "branches", branchId, "invoices"),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          q = query(
            collection(db, "shops", shopId, "branches"),
            orderBy("createdAt", "desc")
          );
        } else {
          setInvoices([]);
          setLoading(false);
          return;
        }

        const querySnapshot = await getDocs(q);
        const invoiceList: Invoice[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const invoice: Invoice = {
            id: docSnapshot.id,
            serviceId: data.serviceId || "",
            customerName: data.customerName || "",
            customerEmail: data.customerEmail || "",
            customerPhone: data.customerPhone || "",
            amount: data.amount || 0,
            tax: data.tax || 0,
            total: data.total || 0,
            status: data.status || "draft",
            paymentStatus: data.paymentStatus || "pending",
            dueDate: data.dueDate?.toDate() || new Date(),
            shopId: data.shopId || "",
            branchId: data.branchId || "",
            items: data.items || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          invoiceList.push(invoice);
        }

        setInvoices(invoiceList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch invoices";
        setError(errorMessage);
        logger.error("Error fetching invoices", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user, shopId, branchId]);

  const createInvoice = async (invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      const invoiceDocRef = await addDoc(
        collection(db, "shops", shopId, "branches", branchId, "invoices"),
        {
          ...invoiceData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Refresh invoices list
      const updatedInvoices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "invoices"),
          orderBy("createdAt", "desc")
        )
      );

      const invoiceList: Invoice[] = [];
      for (const docSnapshot of updatedInvoices.docs) {
        const data = docSnapshot.data();
        const invoice: Invoice = {
          id: docSnapshot.id,
          serviceId: data.serviceId || "",
          customerName: data.customerName || "",
          customerEmail: data.customerEmail || "",
          customerPhone: data.customerPhone || "",
          amount: data.amount || 0,
          tax: data.tax || 0,
          total: data.total || 0,
          status: data.status || "draft",
          paymentStatus: data.paymentStatus || "pending",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          items: data.items || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        invoiceList.push(invoice);
      }

      setInvoices(invoiceList);
      return invoiceDocRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create invoice";
      logger.error("Error creating invoice", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      const invoiceRef = doc(db, "shops", shopId, "branches", branchId, "invoices", invoiceId);
      await updateDoc(invoiceRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh invoices list
      const updatedInvoices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "invoices"),
          orderBy("createdAt", "desc")
        )
      );

      const invoiceList: Invoice[] = [];
      for (const docSnapshot of updatedInvoices.docs) {
        const data = docSnapshot.data();
        const invoice: Invoice = {
          id: docSnapshot.id,
          serviceId: data.serviceId || "",
          customerName: data.customerName || "",
          customerEmail: data.customerEmail || "",
          customerPhone: data.customerPhone || "",
          amount: data.amount || 0,
          tax: data.tax || 0,
          total: data.total || 0,
          status: data.status || "draft",
          paymentStatus: data.paymentStatus || "pending",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          items: data.items || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        invoiceList.push(invoice);
      }

      setInvoices(invoiceList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update invoice";
      logger.error("Error updating invoice", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      await deleteDoc(doc(db, "shops", shopId, "branches", branchId, "invoices", invoiceId));
      
      // Refresh invoices list
      const updatedInvoices = await getDocs(
        query(
          collection(db, "shops", shopId, "branches", branchId, "invoices"),
          orderBy("createdAt", "desc")
        )
      );

      const invoiceList: Invoice[] = [];
      for (const docSnapshot of updatedInvoices.docs) {
        const data = docSnapshot.data();
        const invoice: Invoice = {
          id: docSnapshot.id,
          serviceId: data.serviceId || "",
          customerName: data.customerName || "",
          customerEmail: data.customerEmail || "",
          customerPhone: data.customerPhone || "",
          amount: data.amount || 0,
          tax: data.tax || 0,
          total: data.total || 0,
          status: data.status || "draft",
          paymentStatus: data.paymentStatus || "pending",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          items: data.items || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        invoiceList.push(invoice);
      }

      setInvoices(invoiceList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete invoice";
      logger.error("Error deleting invoice", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    invoices,
    loading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
} 