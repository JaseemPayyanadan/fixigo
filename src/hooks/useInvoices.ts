"use client";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, Unsubscribe, updateDoc, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { db } from "@/lib/firebase";
import { getIndexBuildingMessage, isIndexBuildingError, logger } from "@/lib/logger";
import { normalizeInvoiceStatus, normalizePaymentStatus, sanitizeInvoiceData, transformFirestoreInvoiceData } from "@/lib/utils";
import { calculateInvoiceTotals, validateInvoice, validatePaymentStatusTransition, validateStatusTransition } from "@/lib/validation";
import type { Invoice } from "@/types";

import { useUser } from "./useUser";

export interface InvoiceFilters {
  status?: string;
  paymentStatus?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface InvoiceSortOptions {
  field: "createdAt" | "dueDate" | "total" | "customerName" | "status";
  direction: "asc" | "desc";
}

export function useInvoices(shopId?: string, branchId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [sortOptions, setSortOptions] = useState<InvoiceSortOptions>({ field: "createdAt", direction: "desc" });
  const { user } = useUser();

  // Memoized query based on shopId and branchId
  const baseQuery = useMemo(() => {
    if (!shopId) return null;

    let q = query(collection(db, "invoices"), where("shopId", "==", shopId));

    if (branchId) {
      q = query(q, where("branchId", "==", branchId));
    }

    return q;
  }, [shopId, branchId]);

  // Fetch invoices with error handling and fallback
  const fetchInvoices = useCallback(
    async (q: any, useOrdering: boolean = true) => {
      try {
        let querySnapshot;

        if (useOrdering) {
          try {
            const orderedQuery = query(q, orderBy(sortOptions.field, sortOptions.direction));
            querySnapshot = await getDocs(orderedQuery);
          } catch (indexError) {
            logger.warn("Index building in progress for invoices, using fallback query", { error: String(indexError) });
            querySnapshot = await getDocs(q);
          }
        } else {
          querySnapshot = await getDocs(q);
        }

        const invoiceList: Invoice[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          try {
            const data = docSnapshot.data();
            const invoice = transformFirestoreInvoiceData(data, docSnapshot.id);
            invoiceList.push(invoice);
          } catch (transformError) {
            logger.error("Error transforming invoice data", {
              error: transformError,
              docId: docSnapshot.id,
            });
            // Skip malformed invoices but continue processing others
            continue;
          }
        }

        // Sort manually if we couldn't use orderBy
        if (!useOrdering) {
          invoiceList.sort((a, b) => {
            const aValue = a[sortOptions.field];
            const bValue = b[sortOptions.field];

            if (aValue instanceof Date && bValue instanceof Date) {
              return sortOptions.direction === "asc" ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
              return sortOptions.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === "number" && typeof bValue === "number") {
              return sortOptions.direction === "asc" ? aValue - bValue : bValue - aValue;
            }

            return 0;
          });
        }

        setInvoices(invoiceList);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch invoices";

        if (isIndexBuildingError(errorMessage)) {
          setError(getIndexBuildingMessage(errorMessage));
        } else {
          setError(errorMessage);
          logger.error("Error fetching invoices", { error: errorMessage });
        }
      }
    },
    [sortOptions]
  );

  // Apply filters and search
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((invoice) => normalizeInvoiceStatus(invoice.status) === normalizeInvoiceStatus(filters.status!));
    }

    // Apply payment status filter
    if (filters.paymentStatus) {
      filtered = filtered.filter((invoice) => normalizePaymentStatus(invoice.paymentStatus) === normalizePaymentStatus(filters.paymentStatus!));
    }

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = invoice.createdAt;
        return invoiceDate >= filters.dateRange!.start && invoiceDate <= filters.dateRange!.end;
      });
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.customerName.toLowerCase().includes(searchLower) ||
          invoice.customerEmail.toLowerCase().includes(searchLower) ||
          invoice.customerPhone.includes(filters.search!) ||
          invoice.id.toLowerCase().includes(searchLower) ||
          invoice.items.some((item) => item.name.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [invoices, filters]);

  // Set up real-time listener
  useEffect(() => {
    if (!user || !baseQuery) return;

    let unsubscribe: Unsubscribe;

    try {
      unsubscribe = onSnapshot(
        baseQuery,
        (snapshot) => {
          const invoiceList: Invoice[] = [];

          snapshot.docs.forEach((docSnapshot) => {
            try {
              const data = docSnapshot.data();
              const invoice = transformFirestoreInvoiceData(data, docSnapshot.id);
              invoiceList.push(invoice);
            } catch (transformError) {
              logger.error("Error transforming invoice data in snapshot", {
                error: transformError,
                docId: docSnapshot.id,
              });
            }
          });

          // Sort manually since onSnapshot doesn't support orderBy with complex queries
          invoiceList.sort((a, b) => {
            const aValue = a[sortOptions.field];
            const bValue = b[sortOptions.field];

            if (aValue instanceof Date && bValue instanceof Date) {
              return sortOptions.direction === "asc" ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
              return sortOptions.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === "number" && typeof bValue === "number") {
              return sortOptions.direction === "asc" ? aValue - bValue : bValue - aValue;
            }

            return 0;
          });

          setInvoices(invoiceList);
          setLoading(false);
          setError(null);
        },
        (error) => {
          logger.error("Error in invoices snapshot listener", { error });
          setError("Failed to listen for invoice updates");
          setLoading(false);
        }
      );
    } catch (error) {
      logger.error("Error setting up invoices snapshot listener", { error });
      setError("Failed to set up real-time updates");
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, baseQuery, sortOptions]);

  // Create invoice with validation
  const createInvoice = useCallback(
    async (invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
      if (!user || !shopId || !branchId) {
        throw new Error("User not authenticated or missing shop/branch ID");
      }

      try {
        // Validate invoice data
        const validationResult = validateInvoice(invoiceData);
        if (!validationResult.isValid) {
          const errorMessage = Object.values(validationResult.errors).join(", ");
          throw new Error(`Invalid invoice data: ${errorMessage}`);
        }

        // Sanitize and prepare data
        const sanitizedData = sanitizeInvoiceData({
          ...invoiceData,
          shopId,
          branchId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Calculate totals if not provided
        if (!sanitizedData.total || sanitizedData.total === 0) {
          const totals = calculateInvoiceTotals(sanitizedData.items, sanitizedData.discount || 0, sanitizedData.tax || 0, sanitizedData.advance || 0);
          sanitizedData.total = totals.finalTotal;
          sanitizedData.amount = totals.subtotal;
        }

        // Create invoice in Firestore
        const invoiceDocRef = await addDoc(collection(db, "invoices"), sanitizedData);

        logger.info("Invoice created successfully", { invoiceId: invoiceDocRef.id });
        return invoiceDocRef.id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create invoice";
        logger.error("Error creating invoice", { error: errorMessage });
        throw new Error(errorMessage);
      }
    },
    [user, shopId, branchId]
  );

  // Update invoice with validation
  const updateInvoice = useCallback(
    async (invoiceId: string, updates: Partial<Invoice>) => {
      if (!user || !shopId || !branchId) {
        throw new Error("User not authenticated or missing shop/branch ID");
      }

      try {
        // Find the current invoice to validate status transitions
        const currentInvoice = invoices.find((inv) => inv.id === invoiceId);
        if (!currentInvoice) {
          throw new Error("Invoice not found");
        }

        // Validate status transitions if status is being updated
        if (updates.status && updates.status !== currentInvoice.status) {
          if (!validateStatusTransition(currentInvoice.status, updates.status)) {
            throw new Error(`Invalid status transition from ${currentInvoice.status} to ${updates.status}`);
          }
        }

        if (updates.paymentStatus && updates.paymentStatus !== currentInvoice.paymentStatus) {
          if (!validatePaymentStatusTransition(currentInvoice.paymentStatus, updates.paymentStatus)) {
            throw new Error(`Invalid payment status transition from ${currentInvoice.paymentStatus} to ${updates.paymentStatus}`);
          }
        }

        // Sanitize update data
        const sanitizedUpdates = sanitizeInvoiceData({
          ...updates,
          updatedAt: new Date(),
        });

        // Recalculate totals if items, discount, tax, or advance changed
        if (updates.items || updates.discount !== undefined || updates.tax !== undefined || updates.advance !== undefined) {
          const totals = calculateInvoiceTotals(updates.items || currentInvoice.items, updates.discount ?? currentInvoice.discount ?? 0, updates.tax ?? currentInvoice.tax ?? 0, updates.advance ?? currentInvoice.advance ?? 0);
          sanitizedUpdates.total = totals.finalTotal;
          sanitizedUpdates.amount = totals.subtotal;
        }

        // Update invoice in Firestore
        const invoiceRef = doc(db, "invoices", invoiceId);
        await updateDoc(invoiceRef, sanitizedUpdates);

        logger.info("Invoice updated successfully", { invoiceId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update invoice";
        logger.error("Error updating invoice", { error: errorMessage, invoiceId });
        throw new Error(errorMessage);
      }
    },
    [user, shopId, branchId, invoices]
  );

  // Delete invoice
  const deleteInvoice = useCallback(
    async (invoiceId: string) => {
      if (!user || !shopId || !branchId) {
        throw new Error("User not authenticated or missing shop/branch ID");
      }

      try {
        // Check if invoice exists and user has permission
        const invoice = invoices.find((inv) => inv.id === invoiceId);
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        // Prevent deletion of paid invoices (optional business rule)
        if (invoice.paymentStatus === "paid") {
          throw new Error("Cannot delete paid invoices");
        }

        await deleteDoc(doc(db, "invoices", invoiceId));

        logger.info("Invoice deleted successfully", { invoiceId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete invoice";
        logger.error("Error deleting invoice", { error: errorMessage, invoiceId });
        throw new Error(errorMessage);
      }
    },
    [user, shopId, branchId, invoices]
  );

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Update sort options
  const updateSortOptions = useCallback((newSortOptions: Partial<InvoiceSortOptions>) => {
    setSortOptions((prev) => ({ ...prev, ...newSortOptions }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Refresh invoices manually
  const refreshInvoices = useCallback(async () => {
    if (!baseQuery) return;
    setLoading(true);
    await fetchInvoices(baseQuery, false);
  }, [baseQuery, fetchInvoices]);

  return {
    invoices: filteredInvoices,
    loading,
    error,
    filters,
    sortOptions,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    updateFilters,
    updateSortOptions,
    clearFilters,
    refreshInvoices,
  };
}
