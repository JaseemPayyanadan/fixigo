"use client";
import { addDoc, collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { FaArrowLeft, FaPlus, FaSave } from "react-icons/fa";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { db } from "@/lib/firebase";
import { calculateInvoiceTotals, validateInvoice } from "@/lib/validation";
import type { Service } from "@/types";

interface InvoiceFormData {
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  tax: number;
  total: number;
  discount: number;
  advance: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "partial" | "refunded";
  dueDate: string;
  notes: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variation: string;
  }>;
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <NewInvoiceContent />
    </Suspense>
  );
}

function NewInvoiceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const shopId = user?.shopId || "";
  const { branches } = useBranches(shopId);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<InvoiceFormData>({
    serviceId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    amount: 0,
    tax: 0,
    total: 0,
    discount: 0,
    advance: 0,
    status: "draft",
    paymentStatus: "pending",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
    notes: "",
    items: [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0, variation: "" }],
  });

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      if (!shopId) return;

      try {
        const servicesRef = collection(db, "services");
        const servicesQuery = query(servicesRef, where("shopId", "==", shopId), orderBy("createdAt", "desc"));
        const servicesSnapshot = await getDocs(servicesQuery);

        const servicesData = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Service[];

        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
        setError("Failed to fetch services");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [shopId]);

  // Handle service selection
  const handleServiceSelect = useCallback(
    (serviceId: string) => {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        setFormData((prev) => ({
          ...prev,
          serviceId: service.id,
          customerName: service.customer?.name || "",
          customerEmail: service.customer?.email || "",
          customerPhone: service.customer?.phone || "",
          amount: service.price || 0,
          tax: (service.price || 0) * 0.05, // 5% tax
          items: [
            {
              name: service.name,
              description: service.description || "",
              quantity: 1,
              unitPrice: service.price || 0,
              total: service.price || 0,
              variation: service.device ? `${service.device.brand} ${service.device.model}` : "",
            },
          ],
        }));
      }
    },
    [services]
  );

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
    (index: number, field: string, value: string | number) => {
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "quantity" || field === "unitPrice") {
          updateItemTotal(index);
        }

        return { ...prev, items: newItems };
      });
    },
    [updateItemTotal]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form
      const validation = validateInvoice(formData);
      if (!validation.isValid) {
        setError(Object.values(validation.errors).join(", "));
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const invoiceData = {
          ...formData,
          shopId,
          branchId: selectedService?.branchId || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add to Firestore
        const invoicesRef = collection(db, "invoices");
        await addDoc(invoicesRef, invoiceData);

        router.push("/invoices");
      } catch (error) {
        console.error("Error creating invoice:", error);
        setError("Failed to create invoice");
      } finally {
        setSaving(false);
      }
    },
    [formData, shopId, selectedService, router]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/invoices");
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
            <p className="text-gray-600 mt-2">Generate a new invoice for your customer</p>
          </div>
          <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            <FaArrowLeft className="w-4 h-4" />
            Back to Invoices
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Selection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Service (Optional)</label>
                <select value={formData.serviceId} onChange={(e) => handleServiceSelect(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Create from scratch</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.customer?.name} ({service.device?.brand} {service.device?.model})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Status</label>
                <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as "draft" | "sent" | "paid" | "overdue" | "cancelled" }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                <input type="text" value={formData.customerName} onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.customerEmail} onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" value={formData.customerPhone} onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
              <button type="button" onClick={addItem} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                <FaPlus className="w-3 h-3" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                    <input type="text" value={item.name} onChange={(e) => updateItemField(index, "name", e.target.value)} required className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItemField(index, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="px-2 py-1 text-sm font-medium text-gray-900">₹{item.total.toFixed(2)}</div>
                  </div>
                  <div className="flex items-end">
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="px-2 py-1 text-red-600 hover:text-red-800 text-sm">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes for the customer..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-medium">₹{formData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Discount:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Tax:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Advance:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.advance}
                    onChange={(e) => setFormData((prev) => ({ ...prev, advance: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between py-3 text-lg font-bold text-gray-900 border-t border-gray-300 pt-3">
                  <span>Total:</span>
                  <span>₹{formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              <FaSave className="w-4 h-4" />
              {saving ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
