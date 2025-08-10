"use client";
import React, { useCallback, useEffect, useState } from "react";
import { FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";

import { calculateInvoiceTotals, validateInvoice } from "@/lib/validation";
import type { Invoice } from "@/types";

interface InvoiceFormProps {
  initialData?: Partial<Invoice>;
  onSubmit: (data: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode: "create" | "edit";
}

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variation?: string;
}

export function InvoiceForm({ initialData, onSubmit, onCancel, loading = false, mode }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    serviceId: initialData?.serviceId || "",
    customerName: initialData?.customerName || "",
    customerEmail: initialData?.customerEmail || "",
    customerPhone: initialData?.customerPhone || "",
    amount: initialData?.amount || 0,
    tax: initialData?.tax || 0,
    total: initialData?.total || 0,
    discount: initialData?.discount || 0,
    advance: initialData?.advance || 0,
    status: initialData?.status || "draft",
    paymentStatus: initialData?.paymentStatus || "pending",
    paymentMethod: initialData?.paymentMethod || "",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
    notes: initialData?.notes || "",
    items: initialData?.items?.map((item) => ({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      variation: item.variation || "",
    })) || [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0, variation: "" }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals when items, discount, tax, or advance change
  useEffect(() => {
    const totals = calculateInvoiceTotals(formData.items, formData.discount, formData.tax, formData.advance);

    setFormData((prev) => ({
      ...prev,
      amount: totals.subtotal,
      total: totals.finalTotal,
    }));
  }, [formData.items, formData.discount, formData.tax, formData.advance]);

  // Update item total when quantity or unit price changes
  const updateItemTotal = useCallback((index: number) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = newItems[index];
      item.total = item.quantity * item.unitPrice;
      return { ...prev, items: newItems };
    });
  }, []);

  // Add new item
  const addItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", quantity: 1, unitPrice: 0, total: 0, variation: "" }],
    }));
  }, []);

  // Remove item
  const removeItem = useCallback(
    (index: number) => {
      if (formData.items.length > 1) {
        setFormData((prev) => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index),
        }));
      }
    },
    [formData.items.length]
  );

  // Update item field
  const updateItemField = useCallback(
    (index: number, field: keyof InvoiceItem, value: string | number) => {
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, items: newItems };
      });

      if (field === "quantity" || field === "unitPrice") {
        updateItemTotal(index);
      }
    },
    [updateItemTotal]
  );

  // Handle form field changes
  const handleFieldChange = useCallback(
    (field: string, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  // Validate form data
  const validateForm = useCallback(() => {
    const validationData = {
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      amount: formData.amount.toString(),
      tax: formData.tax.toString(),
      total: formData.total.toString(),
      discount: formData.discount.toString(),
      advance: formData.advance.toString(),
      dueDate: formData.dueDate,
      items: formData.items,
    };

    const validationResult = validateInvoice(validationData);

    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const invoiceData = {
          serviceId: formData.serviceId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          amount: formData.amount,
          tax: formData.tax,
          total: formData.total,
          discount: formData.discount,
          advance: formData.advance,
          status: formData.status,
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod,
          dueDate: new Date(formData.dueDate),
          notes: formData.notes,
          items: formData.items.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        };

        await onSubmit(invoiceData);
      } catch (error) {
        console.error("Error submitting invoice:", error);
        // Error handling is done by the parent component
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit]
  );

  const isFormValid = formData.customerName && formData.customerEmail && formData.customerPhone && formData.items.every((item) => item.name && item.quantity > 0 && item.unitPrice > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleFieldChange("customerName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerName ? "border-red-500" : "border-gray-300"}`}
              placeholder="Enter customer name"
            />
            {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email *</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleFieldChange("customerEmail", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerEmail ? "border-red-500" : "border-gray-300"}`}
              placeholder="Enter customer email"
            />
            {errors.customerEmail && <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone *</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => handleFieldChange("customerPhone", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerPhone ? "border-red-500" : "border-gray-300"}`}
              placeholder="Enter customer phone"
            />
            {errors.customerPhone && <p className="mt-1 text-sm text-red-600">{errors.customerPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
            <input type="date" value={formData.dueDate} onChange={(e) => handleFieldChange("dueDate", e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dueDate ? "border-red-500" : "border-gray-300"}`} />
            {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
          <button type="button" onClick={addItem} className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <FaPlus className="mr-2 h-4 w-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-4">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input type="text" value={item.name} onChange={(e) => updateItemField(index, "name", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter item name" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price *</label>
                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItemField(index, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                <input type="number" value={item.total} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
              </div>

              <div className="col-span-2 flex gap-2">
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <FaTrash className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select value={formData.status} onChange={(e) => handleFieldChange("status", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select value={formData.paymentStatus} onChange={(e) => handleFieldChange("paymentStatus", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="partial">Partial</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <input type="text" value={formData.paymentMethod} onChange={(e) => handleFieldChange("paymentMethod", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Cash, Card, Bank Transfer" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">₹{formData.amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Discount:</span>
              <input type="number" min="0" step="0.01" value={formData.discount} onChange={(e) => handleFieldChange("discount", parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right" />
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tax:</span>
              <input type="number" min="0" step="0.01" value={formData.tax} onChange={(e) => handleFieldChange("tax", parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right" />
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Advance:</span>
              <input type="number" min="0" step="0.01" value={formData.advance} onChange={(e) => handleFieldChange("advance", parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right" />
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-blue-600">₹{formData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea value={formData.notes} onChange={(e) => handleFieldChange("notes", e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes or instructions..." />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <FaTimes className="mr-2 h-4 w-4" />
          Cancel
        </button>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaSave className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Invoice" : "Update Invoice"}
        </button>
      </div>
    </form>
  );
}
