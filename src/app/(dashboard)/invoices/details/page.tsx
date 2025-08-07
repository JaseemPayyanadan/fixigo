"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc } from "firebase/firestore";
import { FaRegPaperPlane, FaDownload, FaPrint, FaEdit, FaTimesCircle } from "react-icons/fa";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: { seconds: number; nanoseconds: number };
  customer?: { name: string; phone?: string; email?: string };
  device?: { type: string; brand: string; model: string; serial: string };
  shop_id: string;
  branch_id: string;
}

export default function InvoiceDetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
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
  const [loading, setLoading] = useState(true);
  const [invoiceStatus, setInvoiceStatus] = useState("Pending");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [isEditing, setIsEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<Array<{name: string; variation: string; price: number; qty: number}>>([]);
  const [editableDiscount, setEditableDiscount] = useState(0);
  const [editableTax, setEditableTax] = useState(0);
  const [editableAdvance, setEditableAdvance] = useState(0);

  useEffect(() => {
    if (!serviceId) return;
    const fetchServiceAndBranch = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "services", serviceId));
        if (docSnap.exists()) {
          const serviceData = { id: docSnap.id, ...docSnap.data() } as Service;
          setService(serviceData);
          // Fetch branch info
                if (serviceData.shop_id && serviceData.branch_id) {
        const branchSnap = await getDoc(doc(db, `shops/${serviceData.shop_id}/branches/${serviceData.branch_id}`));
            if (branchSnap.exists()) {
              setBranch({ id: branchSnap.id, ...branchSnap.data() });
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchServiceAndBranch();
  }, [serviceId]);

  // Create invoice document in Firestore if not exists
  useEffect(() => {
    if (!service || !branch) return;
    const createInvoiceIfNotExists = async () => {
      // Check if invoice already exists for this service
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, where("serviceId", "==", service.id));
      const existing = await getDocs(q);
      if (!existing.empty) return; // Already exists
      // Prepare invoice data
      const invoiceData = {
        serviceId: service.id,
        branchId: service.branch_id,
        shopId: service.shop_id,
        customer: service.customer || {},
        device: service.device || {},
        items: [
          {
            name: service.name,
            variation: service.device ? `${service.device.brand} ${service.device.model}` : "-",
            price: service.price || 0,
            qty: 1,
          },
        ],
        subtotal: service.price || 0,
        discount: 0,
        tax: (service.price || 0) * 0.05,
        total: (service.price || 0) * 1.05,
        status: "Pending",
        paymentStatus: "Pending",
        createdAt: service.createdAt || new Date(),
        branch: {
          name: branch.name || service.branch_id,
          location: branch.location || "-",
          contactNumber: branch.contactNumber || "-",
          branchEmail: branch.branchEmail || "-",
        },
      };
      await addDoc(invoicesRef, invoiceData);
    };
    createInvoiceIfNotExists();
  }, [service, branch]);

  useEffect(() => {
    if (!loading && shouldPrint) {
      setTimeout(() => {
        window.print();
        // Remove print=1 from URL after printing
        const url = new URL(window.location.href);
        url.searchParams.delete("print");
        router.replace(url.pathname + url.search);
      }, 500);
    }
  }, [loading, shouldPrint, router]);

  const handleStatusUpdate = async (newStatus: string, type: "status" | "payment") => {
    if (!service) return;

    try {
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, where("serviceId", "==", service.id));
      const existing = await getDocs(q);

      if (!existing.empty) {
        const invoiceDoc = existing.docs[0];
        const updateData = type === "status" ? { status: newStatus } : { paymentStatus: newStatus };
        await updateDoc(doc(db, "invoices", invoiceDoc.id), updateData);

        if (type === "status") {
          setInvoiceStatus(newStatus);
        } else {
          setPaymentStatus(newStatus);
        }
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
    }
  };

  const handleEditToggle = () => {
    // Always initialize editable data when toggling
    setEditableItems([...items]);
    setEditableDiscount(discount);
    setEditableTax(tax);
    setEditableAdvance(0);
    setIsEditing(!isEditing);
  };

  const handleItemUpdate = (index: number, field: string, value: string | number) => {
    const updatedItems = [...editableItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditableItems(updatedItems);
  };

  const handleAddItem = () => {
    setEditableItems([...editableItems, { name: "", variation: "", price: 0, qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (editableItems.length > 1) {
      const updatedItems = editableItems.filter((_, i) => i !== index);
      setEditableItems(updatedItems);
    }
  };

  const handleSaveInvoice = async () => {
    if (!service) return;

    try {
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, where("serviceId", "==", service.id));
      const existing = await getDocs(q);

      if (!existing.empty) {
        const invoiceDoc = existing.docs[0];
        const total = subtotal - editableDiscount + editableTax - editableAdvance;
        
        const updateData = {
          status: invoiceStatus,
          paymentStatus: paymentStatus,
          discount: editableDiscount,
          tax: editableTax,
          advance: editableAdvance,
          total,
          updatedAt: new Date(),
        };
        
        await updateDoc(doc(db, "invoices", invoiceDoc.id), updateData);
        // Don't exit edit mode - keep the form visible
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );

  if (!service)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <FaTimesCircle className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Service not found</h3>
          <p className="text-gray-600 mb-6">The service you&apos;re looking for doesn&apos;t exist.</p>
          <button onClick={() => router.push("/invoices")} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Back to Invoices
          </button>
        </div>
      </div>
    );

  const { id, name, price, createdAt, customer, device } = service;
  const branchName = branch?.name || service.branch_id;
  const branchLocation = branch?.location || "-";
  const branchContact = branch?.contactNumber || "-";
  // const branchEmail = branch?.branchEmail || "-";

  const invoiceId = id;
  const invoiceDate = createdAt ? new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt.nanoseconds).toLocaleDateString() : "-";
  const dueDate = "-";
  const from = {
    name: branchName,
    phone: branchContact,
    address: branchLocation,
  };
  const billFor = {
    name: customer?.name || "-",
    phone: customer?.phone || "-",
    address: customer?.email || "-",
  };
  const defaultItems = [
    {
      name: name,
      variation: device ? `${device.brand} ${device.model}` : "-",
      price: price || 0,
      qty: 1,
    },
  ];
  const defaultSubtotal = price || 0;
  const defaultDiscount = 0;
  const defaultTax = defaultSubtotal * 0.05;
  const defaultTotal = defaultSubtotal - defaultDiscount + defaultTax;

  // Use editable values when editing, otherwise use default values
  const items = isEditing ? editableItems : defaultItems;
  const subtotal = isEditing ? editableItems.reduce((sum, item) => sum + (item.price * item.qty), 0) : defaultSubtotal;
  const discount = isEditing ? editableDiscount : defaultDiscount;
  const tax = isEditing ? editableTax : defaultTax;
  const advance = isEditing ? editableAdvance : 0;
  const total = isEditing ? (subtotal - discount + tax - advance) : defaultTotal;
  const otherInfo = "Thank you for choosing our services! We appreciate your business.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push("/invoices")} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </button>

          {/* Action Buttons */}
          <div className="flex flex-row gap-2">
            <button className="flex items-center gap-3 bg-blue-600 text-white font-normal px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <FaRegPaperPlane className="w-3 h-3" />
              Send Invoice
            </button>
            <button className="flex items-center gap-3 bg-gray-100 text-gray-700 font-normal px-4 py-2 text-sm rounded-lg hover:bg-gray-200 transition-colors">
              <FaDownload className="w-3 h-3" />
              Download PDF
            </button>
            <button onClick={() => router.push(`/invoices/details?id=${serviceId}&print=1`)} className="flex items-center gap-3 bg-gray-100 text-gray-700 font-normal px-4 py-2 text-sm rounded-lg hover:bg-gray-200 transition-colors">
              <FaPrint className="w-3 h-3" />
              Print Invoice
            </button>
            <button 
              onClick={handleEditToggle}
              className={`flex items-center gap-3 font-normal px-4 py-2 text-sm rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaEdit className="w-3 h-3" />
              {isEditing ? 'Cancel Edit' : 'Edit Invoice'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Invoice Card */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden invoice-print">
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-2xl font-bold">Fixigo</span>
                      <div className="text-sm opacity-90">Professional Service Management</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold mb-2">INVOICE</div>
                    <div className="text-sm opacity-90">
                      <div>
                        Invoice ID: <span className="font-semibold">{invoiceId}</span>
                      </div>
                      <div>
                        Date: <span className="font-semibold">{invoiceDate}</span>
                      </div>
                      <div>
                        Due: <span className="font-semibold">{dueDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Content */}
              <div className="p-8">
                {/* From / Bill For */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="text-gray-500 text-sm mb-2 font-semibold">FROM</div>
                    <div className="font-bold text-gray-900 text-lg">{typeof from.name === "string" ? from.name : ""}</div>
                    <div className="text-gray-700 text-sm mt-1">{typeof from.phone === "string" ? from.phone : ""}</div>
                    <div className="text-gray-700 text-sm">{typeof from.address === "string" ? from.address : ""}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="text-gray-500 text-sm mb-2 font-semibold">BILL TO</div>
                    <div className="font-bold text-gray-900 text-lg">{billFor.name}</div>
                    <div className="text-gray-700 text-sm mt-1">{billFor.phone}</div>
                    <div className="text-gray-700 text-sm">{billFor.address}</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-gray-600 font-semibold text-sm">Description</th>
                        <th className="px-6 py-4 text-left text-gray-600 font-semibold text-sm">Details</th>
                        <th className="px-6 py-4 text-right text-gray-600 font-semibold text-sm">Price</th>
                        <th className="px-6 py-4 text-right text-gray-600 font-semibold text-sm">Qty</th>
                        <th className="px-6 py-4 text-right text-gray-600 font-semibold text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 text-gray-900 font-medium">{item.name}</td>
                          <td className="px-6 py-4 text-gray-700">{item.variation}</td>
                          <td className="px-6 py-4 text-right text-gray-900">₹{item.price.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-gray-900">{item.qty}</td>
                          <td className="px-6 py-4 text-right text-gray-900 font-semibold">₹{(item.qty * item.price).toFixed(2)}</td>
                        </tr>
                      ))}
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
                        <span className="text-green-600">-₹{discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Tax</span>
                        <span>₹{tax.toFixed(2)}</span>
                      </div>
                      {advance > 0 && (
                        <div className="flex justify-between py-2 text-gray-700">
                          <span>Advance</span>
                          <span className="text-blue-600">-₹{advance.toFixed(2)}</span>
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
                      <div>{otherInfo}</div>
                    </div>
                    <div className="flex flex-col items-center md:items-end">
                      <div className="h-20 w-48 border-b- border-gray-400 mb-2 flex items-end justify-center">
                      </div>
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
                    <select value={invoiceStatus} onChange={(e) => handleStatusUpdate(e.target.value, "status")} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                    <select value={paymentStatus} onChange={(e) => handleStatusUpdate(e.target.value, "payment")} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Adjustments */}
              <div className="mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editableDiscount}
                      onChange={(e) => setEditableDiscount(parseFloat(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Discount"
                    />
                    <span className="text-green-600 font-medium text-xs">₹</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editableTax}
                      onChange={(e) => setEditableTax(parseFloat(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Tax"
                    />
                    <span className="text-blue-600 font-medium text-xs">₹</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editableAdvance}
                      onChange={(e) => setEditableAdvance(parseFloat(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Advance"
                    />
                    <span className="text-purple-600 font-medium text-xs">₹</span>
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
                    <span>-₹{editableDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>₹{editableTax.toFixed(2)}</span>
                  </div>
                  {editableAdvance > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Advance:</span>
                      <span>-₹{editableAdvance.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-sm border-t border-gray-300 pt-1">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveInvoice}
                className="w-full bg-blue-600 text-white font-medium py-2 px-3 rounded text-xs hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
