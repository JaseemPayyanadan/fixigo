import { addDoc, collection, deleteDoc, doc, DocumentData, getDoc, getDocs, limit, onSnapshot, orderBy, query, QueryDocumentSnapshot, startAfter, Unsubscribe, updateDoc, where, writeBatch } from "firebase/firestore";

import type { Invoice, InvoiceFilters, InvoiceStats } from "@/types";
import { db } from "./firebase";
import { logger } from "./logger";
import { sanitizeInvoiceData, transformFirestoreInvoiceData } from "./utils";
import { validateInvoice } from "./validation";

export class InvoiceService {
  private static readonly COLLECTION_NAME = "invoices";
  private static readonly BATCH_SIZE = 50;

  /**
   * Create a new invoice
   */
  static async createInvoice(invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      // Validate invoice data
      const validationResult = validateInvoice(invoiceData);
      if (!validationResult.isValid) {
        throw new Error(`Invoice validation failed: ${Object.values(validationResult.errors).join(", ")}`);
      }

      // Sanitize and prepare data
      const sanitizedData = sanitizeInvoiceData(invoiceData);

      // Add timestamps
      const now = new Date();
      const invoiceWithTimestamps = {
        ...sanitizedData,
        createdAt: now,
        updatedAt: now,
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), invoiceWithTimestamps);

      logger.info("Invoice created successfully", { invoiceId: docRef.id });
      return docRef.id;
    } catch (error) {
      logger.error("Failed to create invoice", { error, invoiceData });
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get an invoice by ID
   */
  static async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        logger.warn("Invoice not found", { invoiceId: id });
        return null;
      }

      const invoice = transformFirestoreInvoiceData(docSnap.data(), docSnap.id);
      logger.info("Invoice retrieved successfully", { invoiceId: id });
      return invoice;
    } catch (error) {
      logger.error("Failed to get invoice", { error, invoiceId: id });
      throw new Error(`Failed to get invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get invoices with filtering and pagination
   */
  static async getInvoices(filters: InvoiceFilters = {}, pageSize: number = this.BATCH_SIZE, lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<{ invoices: Invoice[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    try {
      // Build query
      let q = collection(db, this.COLLECTION_NAME);
      const constraints: any[] = [];

      // Apply filters
      if (filters.shopId) {
        constraints.push(where("shopId", "==", filters.shopId));
      }
      if (filters.branchId) {
        constraints.push(where("branchId", "==", filters.branchId));
      }
      if (filters.status) {
        constraints.push(where("status", "==", filters.status));
      }
      if (filters.paymentStatus) {
        constraints.push(where("paymentStatus", "==", filters.paymentStatus));
      }
      if (filters.customerEmail) {
        constraints.push(where("customerEmail", "==", filters.customerEmail));
      }
      if (filters.minAmount !== undefined) {
        constraints.push(where("total", ">=", filters.minAmount));
      }
      if (filters.maxAmount !== undefined) {
        constraints.push(where("total", "<=", filters.maxAmount));
      }
      if (filters.startDate) {
        constraints.push(where("createdAt", ">=", filters.startDate));
      }
      if (filters.endDate) {
        constraints.push(where("createdAt", "<=", filters.endDate));
      }

      // Add ordering
      constraints.push(orderBy("createdAt", "desc"));

      // Add pagination
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(pageSize + 1)); // +1 to check if there are more

      // Execute query
      const querySnapshot = await getDocs(query(q, ...constraints));

      // Transform results
      const invoices = querySnapshot.docs.slice(0, pageSize).map((doc) => transformFirestoreInvoiceData(doc.data(), doc.id));

      const hasMore = querySnapshot.docs.length > pageSize;
      const newLastDoc = hasMore ? querySnapshot.docs[pageSize - 1] : null;

      logger.info("Invoices retrieved successfully", {
        count: invoices.length,
        hasMore,
        filters,
      });

      return {
        invoices,
        lastDoc: newLastDoc,
        hasMore,
      };
    } catch (error) {
      logger.error("Failed to get invoices", { error, filters });
      throw new Error(`Failed to get invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update an invoice
   */
  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
    try {
      // Validate updates if they include invoice data
      if (updates.customerName || updates.customerEmail || updates.customerPhone || updates.amount || updates.total) {
        const currentInvoice = await this.getInvoiceById(id);
        if (!currentInvoice) {
          throw new Error("Invoice not found");
        }

        const updatedData = { ...currentInvoice, ...updates };
        const validationResult = validateInvoice(updatedData);
        if (!validationResult.isValid) {
          throw new Error(`Invoice validation failed: ${Object.values(validationResult.errors).join(", ")}`);
        }
      }

      // Sanitize updates
      const sanitizedUpdates = sanitizeInvoiceData(updates);

      // Add updated timestamp
      const updatesWithTimestamp = {
        ...sanitizedUpdates,
        updatedAt: new Date(),
      };

      // Update in Firestore
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, updatesWithTimestamp);

      logger.info("Invoice updated successfully", { invoiceId: id, updates });
    } catch (error) {
      logger.error("Failed to update invoice", { error, invoiceId: id, updates });
      throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Delete an invoice
   */
  static async deleteInvoice(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);

      logger.info("Invoice deleted successfully", { invoiceId: id });
    } catch (error) {
      logger.error("Failed to delete invoice", { error, invoiceId: id });
      throw new Error(`Failed to delete invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(id: string, status: string): Promise<void> {
    try {
      // Validate status transition
      const currentInvoice = await this.getInvoiceById(id);
      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      // Add business logic for status transitions
      if (status === "paid" && currentInvoice.paymentStatus !== "paid") {
        await this.updateInvoice(id, {
          status,
          paymentStatus: "paid",
          paidDate: new Date(),
        });
      } else if (status === "cancelled" && currentInvoice.status !== "cancelled") {
        await this.updateInvoice(id, { status });
      } else {
        await this.updateInvoice(id, { status });
      }

      logger.info("Invoice status updated successfully", { invoiceId: id, status });
    } catch (error) {
      logger.error("Failed to update invoice status", { error, invoiceId: id, status });
      throw new Error(`Failed to update invoice status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(id: string, paymentStatus: string): Promise<void> {
    try {
      const currentInvoice = await this.getInvoiceById(id);
      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      const updates: Partial<Invoice> = { paymentStatus };

      // Add payment date when fully paid
      if (paymentStatus === "paid") {
        updates.paidDate = new Date();
        updates.status = "paid";
      }

      await this.updateInvoice(id, updates);

      logger.info("Invoice payment status updated successfully", { invoiceId: id, paymentStatus });
    } catch (error) {
      logger.error("Failed to update payment status", { error, invoiceId: id, paymentStatus });
      throw new Error(`Failed to update payment status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Record payment
   */
  static async recordPayment(id: string, amount: number, method?: string): Promise<void> {
    try {
      const currentInvoice = await this.getInvoiceById(id);
      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      if (amount <= 0) {
        throw new Error("Payment amount must be positive");
      }

      const newAdvance = (currentInvoice.advance || 0) + amount;
      const updates: Partial<Invoice> = {
        advance: newAdvance,
        paymentDate: new Date(),
      };

      if (method) {
        updates.paymentMethod = method;
      }

      // Update payment status based on amount
      if (newAdvance >= currentInvoice.total) {
        updates.paymentStatus = "paid";
        updates.status = "paid";
        updates.paidDate = new Date();
      } else if (newAdvance > 0) {
        updates.paymentStatus = "partial";
      }

      await this.updateInvoice(id, updates);

      logger.info("Payment recorded successfully", { invoiceId: id, amount, newAdvance });
    } catch (error) {
      logger.error("Failed to record payment", { error, invoiceId: id, amount });
      throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStats(filters: InvoiceFilters = {}): Promise<InvoiceStats> {
    try {
      const { invoices } = await this.getInvoices(filters, 1000); // Get all for stats

      const stats: InvoiceStats = {
        total: invoices.length,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        byStatus: {
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
          cancelled: 0,
        },
        byPaymentStatus: {
          pending: 0,
          paid: 0,
          failed: 0,
          partial: 0,
          refunded: 0,
        },
        averageAmount: 0,
        monthlyTrend: [],
      };

      // Calculate basic stats
      invoices.forEach((invoice) => {
        stats.totalAmount += invoice.total;
        stats.byStatus[invoice.status as keyof typeof stats.byStatus]++;
        stats.byPaymentStatus[invoice.paymentStatus as keyof typeof stats.byPaymentStatus]++;

        if (invoice.paymentStatus === "paid") {
          stats.paidAmount += invoice.total;
        } else if (invoice.paymentStatus === "pending") {
          stats.pendingAmount += invoice.total;
        }

        // Check if overdue
        if (new Date(invoice.dueDate) < new Date() && invoice.status !== "paid") {
          stats.overdueAmount += invoice.total;
        }
      });

      // Calculate averages
      if (stats.total > 0) {
        stats.averageAmount = stats.totalAmount / stats.total;
      }

      // Calculate monthly trend (last 12 months)
      const now = new Date();
      const monthlyData = new Map<string, { count: number; amount: number }>();

      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyData.set(monthKey, { count: 0, amount: 0 });
      }

      invoices.forEach((invoice) => {
        const monthKey = new Date(invoice.createdAt).toISOString().slice(0, 7);
        const monthData = monthlyData.get(monthKey);
        if (monthData) {
          monthData.count++;
          monthData.amount += invoice.total;
        }
      });

      stats.monthlyTrend = Array.from(monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          count: data.count,
          amount: data.amount,
        }));

      logger.info("Invoice statistics calculated successfully", { stats });
      return stats;
    } catch (error) {
      logger.error("Failed to calculate invoice statistics", { error, filters });
      throw new Error(`Failed to calculate invoice statistics: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Bulk update invoices
   */
  static async bulkUpdateInvoices(updates: Array<{ id: string; updates: Partial<Invoice> }>): Promise<void> {
    try {
      if (updates.length === 0) return;

      const batch = writeBatch(db);

      updates.forEach(({ id, updates: invoiceUpdates }) => {
        const docRef = doc(db, this.COLLECTION_NAME, id);
        const updatesWithTimestamp = {
          ...sanitizeInvoiceData(invoiceUpdates),
          updatedAt: new Date(),
        };
        batch.update(docRef, updatesWithTimestamp);
      });

      await batch.commit();

      logger.info("Bulk invoice update completed successfully", { count: updates.length });
    } catch (error) {
      logger.error("Failed to bulk update invoices", { error, count: updates.length });
      throw new Error(`Failed to bulk update invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Listen to invoice changes
   */
  static subscribeToInvoices(filters: InvoiceFilters = {}, callback: (invoices: Invoice[]) => void): Unsubscribe {
    try {
      let q = collection(db, this.COLLECTION_NAME);
      const constraints: any[] = [];

      // Apply filters
      if (filters.shopId) {
        constraints.push(where("shopId", "==", filters.shopId));
      }
      if (filters.branchId) {
        constraints.push(where("branchId", "==", filters.branchId));
      }
      if (filters.status) {
        constraints.push(where("status", "==", filters.status));
      }
      if (filters.paymentStatus) {
        constraints.push(where("paymentStatus", "==", filters.paymentStatus));
      }

      // Add ordering
      constraints.push(orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        query(q, ...constraints),
        (querySnapshot) => {
          const invoices = querySnapshot.docs.map((doc) => transformFirestoreInvoiceData(doc.data(), doc.id));
          callback(invoices);
        },
        (error) => {
          logger.error("Error listening to invoices", { error, filters });
        }
      );

      return unsubscribe;
    } catch (error) {
      logger.error("Failed to subscribe to invoices", { error, filters });
      throw new Error(`Failed to subscribe to invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Search invoices by text
   */
  static async searchInvoices(searchTerm: string, filters: InvoiceFilters = {}): Promise<Invoice[]> {
    try {
      if (!searchTerm.trim()) {
        return this.getInvoices(filters).then((result) => result.invoices);
      }

      // Get all invoices and filter by search term
      const { invoices } = await this.getInvoices(filters, 1000);

      const searchLower = searchTerm.toLowerCase();
      const searchableFields = ["customerName", "customerEmail", "customerPhone", "id", "serviceId", "notes"];

      const filteredInvoices = invoices.filter((invoice) => {
        return searchableFields.some((field) => {
          const value = invoice[field as keyof Invoice];
          if (typeof value === "string") {
            return value.toLowerCase().includes(searchLower);
          }
          return false;
        });
      });

      logger.info("Invoice search completed", { searchTerm, results: filteredInvoices.length });
      return filteredInvoices;
    } catch (error) {
      logger.error("Failed to search invoices", { error, searchTerm, filters });
      throw new Error(`Failed to search invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Export invoices to CSV
   */
  static async exportInvoicesToCSV(filters: InvoiceFilters = {}): Promise<string> {
    try {
      const { invoices } = await this.getInvoices(filters, 10000); // Get all for export

      const headers = ["Invoice ID", "Customer Name", "Customer Email", "Customer Phone", "Amount", "Tax", "Discount", "Total", "Status", "Payment Status", "Due Date", "Created Date", "Notes"];

      const csvRows = [headers.join(",")];

      invoices.forEach((invoice) => {
        const row = [
          invoice.id,
          `"${invoice.customerName}"`,
          invoice.customerEmail,
          invoice.customerPhone,
          invoice.amount,
          invoice.tax,
          invoice.discount,
          invoice.total,
          invoice.status,
          invoice.paymentStatus,
          new Date(invoice.dueDate).toISOString().split("T")[0],
          new Date(invoice.createdAt).toISOString().split("T")[0],
          `"${invoice.notes || ""}"`,
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");

      logger.info("Invoices exported to CSV successfully", { count: invoices.length });
      return csvContent;
    } catch (error) {
      logger.error("Failed to export invoices to CSV", { error, filters });
      throw new Error(`Failed to export invoices to CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
