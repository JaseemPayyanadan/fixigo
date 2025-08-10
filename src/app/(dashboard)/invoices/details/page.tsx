"use client";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { FaDownload, FaEdit, FaPrint, FaRegPaperPlane, FaSave, FaTimes, FaTimesCircle } from "react-icons/fa";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { db } from "@/lib/firebase";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: { seconds: number; nanoseconds: number };
  customer?: { name: string; phone?: string; email?: string };
  device?: { type: string; brand: string; model: string; imei: string };
  shopId: string;
  branchId: string;
}

interface InvoiceData {
  id: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  tax: number;
  total: number;
  discount: number;
  advance: number;
  status: string;
  paymentStatus: string;
  dueDate: Date;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variation: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export default function InvoiceDetailsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <InvoiceDetailsContent />
    </Suspense>
  );
}

function InvoiceDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = searchParams.get("id");
  const shouldPrint = searchParams.get("print") === "1";

  const [service, setService] = useState<Service | null>(null);
  const [branch, setBranch] = useState<Record<string, unknown> | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editableData, setEditableData] = useState({
    status: "Pending",
    paymentStatus: "Pending",
    discount: 0,
    tax: 0,
    advance: 0,
    items: [] as Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number; variation: string }>,
  });

  // Fetch service, branch, and invoice data
  useEffect(() => {
    if (!serviceId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch service
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (!serviceDoc.exists()) {
          setLoading(false);
          return;
        }

        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service;
        setService(serviceData);

        // Fetch branch info
        if (serviceData.shopId && serviceData.branchId) {
          const branchDoc = await getDoc(doc(db, `shops/${serviceData.shopId}/branches/${serviceData.branchId}`));
          if (branchDoc.exists()) {
            setBranch({ id: branchDoc.id, ...branchDoc.data() });
          }
        }

        // Check for existing invoice
        const invoicesRef = collection(db, "invoices");
        const invoiceQuery = query(invoicesRef, where("serviceId", "==", serviceId));
        const invoiceDocs = await getDocs(invoiceQuery);

        if (!invoiceDocs.empty) {
          const invoiceDoc = invoiceDocs.docs[0];
          const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as InvoiceData;
          setInvoice(invoiceData);

          // Initialize editable data
          setEditableData({
            status: invoiceData.status,
            paymentStatus: invoiceData.paymentStatus,
            discount: invoiceData.discount || 0,
            tax: invoiceData.tax || 0,
            advance: invoiceData.advance || 0,
            items: (invoiceData.items || []).map((item) => ({
              name: item.name || "",
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              total: item.total || 0,
              variation: item.variation || "",
            })),
          });
        } else {
          // Create default invoice data
          const defaultInvoice: InvoiceData = {
            id: serviceData.id,
            serviceId: serviceData.id,
            customerName: serviceData.customer?.name || "Customer",
            customerEmail: serviceData.customer?.email || "",
            customerPhone: serviceData.customer?.phone || "",
            amount: serviceData.price || 0,
            tax: (serviceData.price || 0) * 0.05,
            total: (serviceData.price || 0) * 1.05,
            discount: 0,
            advance: 0,
            status: "Pending",
            paymentStatus: "Pending",
            dueDate: new Date(),
            items: [
              {
                name: serviceData.name,
                description: serviceData.description,
                quantity: 1,
                unitPrice: serviceData.price || 0,
                total: serviceData.price || 0,
                variation: serviceData.device ? `${serviceData.device.brand} ${serviceData.device.model}` : "",
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setInvoice(defaultInvoice);
          setEditableData({
            status: defaultInvoice.status,
            paymentStatus: defaultInvoice.paymentStatus,
            discount: defaultInvoice.discount,
            tax: defaultInvoice.tax,
            advance: defaultInvoice.advance,
            items: defaultInvoice.items,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId]);

  // Handle print functionality
  useEffect(() => {
    if (!loading && shouldPrint) {
      setTimeout(() => {
        window.print();
        const url = new URL(window.location.href);
        url.searchParams.delete("print");
        router.replace(url.pathname + url.search);
      }, 500);
    }
  }, [loading, shouldPrint, router]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = editableData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = subtotal - editableData.discount + editableData.tax - editableData.advance;
    return { subtotal, total };
  }, [editableData]);

  // Handle field updates
  const handleFieldUpdate = useCallback((field: string, value: string | number) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle item updates
  const handleItemUpdate = useCallback((index: number, field: string, value: string | number) => {
    setEditableData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate item total
      if (field === "quantity" || field === "unitPrice") {
        newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
      }

      return { ...prev, items: newItems };
    });
  }, []);

  // Add new item
  const handleAddItem = useCallback(() => {
    setEditableData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", quantity: 1, unitPrice: 0, total: 0, variation: "" }],
    }));
  }, []);

  // Remove item
  const handleRemoveItem = useCallback(
    (index: number) => {
      if (editableData.items.length > 1) {
        setEditableData((prev) => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index),
        }));
      }
    },
    [editableData.items.length]
  );

  // Save invoice changes
  const handleSave = useCallback(async () => {
    if (!invoice || !service) return;

    setSaving(true);
    try {
      const invoicesRef = collection(db, "invoices");
      const invoiceQuery = query(invoicesRef, where("serviceId", "==", serviceId));
      const existing = await getDocs(invoiceQuery);

      if (!existing.empty) {
        const invoiceDoc = existing.docs[0];
        const { total } = calculateTotals();

        const updateData = {
          status: editableData.status,
          paymentStatus: editableData.paymentStatus,
          discount: editableData.discount,
          tax: editableData.tax,
          advance: editableData.advance,
          total,
          items: editableData.items,
          updatedAt: new Date(),
        };

        await updateDoc(doc(db, "invoices", invoiceDoc.id), updateData);

        // Update local state
        setInvoice((prev) => (prev ? { ...prev, ...updateData } : null));
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setSaving(false);
    }
  }, [invoice, service, serviceId, editableData, calculateTotals]);

  // Toggle edit mode
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Reset to original values
      if (invoice) {
        setEditableData({
          status: invoice.status,
          paymentStatus: invoice.paymentStatus,
          discount: invoice.discount || 0,
          tax: invoice.tax || 0,
          advance: invoice.advance || 0,
          items: invoice.items || [],
        });
      }
    }
    setIsEditing(!isEditing);
  }, [isEditing, invoice]);

  // Navigation handlers
  const handleBackToInvoices = useCallback(() => {
    router.push("/invoices");
  }, [router]);

  const handlePrintInvoice = useCallback(() => {
    router.push(`/invoices/details?id=${serviceId}&print=1`);
  }, [router, serviceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!service || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <FaTimesCircle className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Invoice not found</h3>
          <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist.</p>
          <button onClick={handleBackToInvoices} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const { subtotal, total } = calculateTotals();
  const branchName = (branch?.name as string) || service.branchId || "Branch Name";
  const branchLocation = (branch?.location as string) || "-";
  const branchContact = (branch?.contactNumber as string) || "-";
  const invoiceDate = service.createdAt ? new Date(service.createdAt.seconds ? service.createdAt.seconds * 1000 : service.createdAt.nanoseconds).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button onClick={handleBackToInvoices} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors self-start">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </button>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <FaRegPaperPlane className="w-3 h-3" />
              Send Invoice
            </button>
            <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-200 transition-colors">
              <FaDownload className="w-3 h-3" />
              Download PDF
            </button>
            <button onClick={handlePrintInvoice} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-200 transition-colors">
              <FaPrint className="w-3 h-3" />
              Print Invoice
            </button>
            <button onClick={handleEditToggle} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${isEditing ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              <FaEdit className="w-3 h-3" />
              {isEditing ? "Cancel Edit" : "Edit Invoice"}
            </button>
            {isEditing && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                <FaSave className="w-3 h-3" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Invoice Card */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden invoice-print">
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 sm:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-bold">Fixigo</span>
                      <div className="text-xs sm:text-sm opacity-90">Professional Service Management</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold mb-2">INVOICE</div>
                    <div className="text-xs sm:text-sm opacity-90">
                      <div>
                        Invoice ID: <span className="font-semibold">#{invoice.id.slice(-8)}</span>
                      </div>
                      <div>
                        Date: <span className="font-semibold">{invoiceDate}</span>
                      </div>
                      <div>
                        Due: <span className="font-semibold">{invoice.dueDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Content */}
              <div className="p-6 sm:p-8">
                {/* From / Bill For */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <div className="text-gray-500 text-sm mb-2 font-semibold">FROM</div>
                    <div className="font-bold text-gray-900 text-lg">{branchName}</div>
                    <div className="text-gray-700 text-sm mt-1">{branchContact}</div>
                    <div className="text-gray-700 text-sm">{branchLocation}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <div className="text-gray-500 text-sm mb-2 font-semibold">BILL TO</div>
                    <div className="font-bold text-gray-900 text-lg">{invoice.customerName}</div>
                    <div className="text-gray-700 text-sm mt-1">{invoice.customerPhone}</div>
                    <div className="text-gray-700 text-sm">{invoice.customerEmail}</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Details</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Price</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Qty</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableData.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 sm:px-6 py-4">
                            {isEditing ? (
                              <input type="text" value={item.name} onChange={(e) => handleItemUpdate(idx, "name", e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            ) : (
                              <span className="text-gray-900 font-medium">{item.name}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            {isEditing ? (
                              <input type="text" value={item.variation} onChange={(e) => handleItemUpdate(idx, "variation", e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            ) : (
                              <span className="text-gray-700">{item.variation}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemUpdate(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-gray-900">₹{item.unitPrice.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            {isEditing ? (
                              <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemUpdate(idx, "quantity", parseInt(e.target.value) || 1)} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            ) : (
                              <span className="text-gray-900">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <span className="text-gray-900 font-semibold">₹{item.total.toFixed(2)}</span>
                            {isEditing && (
                              <button onClick={() => handleRemoveItem(idx)} className="ml-2 text-red-600 hover:text-red-800 p-1" title="Remove item">
                                <FaTimes className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {isEditing && (
                        <tr>
                          <td colSpan={5} className="px-4 sm:px-6 py-2">
                            <button onClick={handleAddItem} className="w-full text-blue-600 hover:text-blue-800 text-sm py-2 border-2 border-dashed border-blue-300 rounded hover:border-blue-400 transition-colors">
                              + Add Item
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Discount</span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editableData.discount}
                            onChange={(e) => handleFieldUpdate("discount", parseFloat(e.target.value) || 0)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-green-600">-₹{editableData.discount.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Tax</span>
                        {isEditing ? (
                          <input type="number" step="0.01" value={editableData.tax} onChange={(e) => handleFieldUpdate("tax", parseFloat(e.target.value) || 0)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        ) : (
                          <span>₹{editableData.tax.toFixed(2)}</span>
                        )}
                      </div>
                      {editableData.advance > 0 && (
                        <div className="flex justify-between py-2 text-gray-700">
                          <span>Advance</span>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editableData.advance}
                              onChange={(e) => handleFieldUpdate("advance", parseFloat(e.target.value) || 0)}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-blue-600">-₹{editableData.advance.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between py-3 text-lg font-bold text-gray-900 border-t border-gray-300 pt-3">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 pt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="text-sm text-gray-600">
                      <div className="font-semibold text-gray-700 mb-2">Additional Information</div>
                      <div>Thank you for choosing our services! We appreciate your business.</div>
                    </div>
                    <div className="flex flex-col items-center md:items-end">
                      <div className="h-20 w-48 border-b border-gray-400 mb-2 flex items-end justify-center"></div>
                      <div className="text-gray-700 text-sm">Authorized Signature</div>
                      <div className="text-gray-500 text-xs mt-1">{invoiceDate}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4 sidebar-print">
            {/* Invoice Management */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Invoice Management</h3>
              </div>

              {/* Status Management */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Status</label>
                    <select
                      value={editableData.status}
                      onChange={(e) => handleFieldUpdate("status", e.target.value)}
                      disabled={!isEditing}
                      className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                    <select
                      value={editableData.paymentStatus}
                      onChange={(e) => handleFieldUpdate("paymentStatus", e.target.value)}
                      disabled={!isEditing}
                      className={`w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₹{editableData.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>₹{editableData.tax.toFixed(2)}</span>
                  </div>
                  {editableData.advance > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Advance:</span>
                      <span>-₹{editableData.advance.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-sm border-t border-gray-300 pt-1">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white font-medium py-2 px-3 rounded text-xs hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
