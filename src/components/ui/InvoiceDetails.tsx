"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { FaDownload, FaEdit, FaEye, FaEyeSlash, FaPrint, FaShare, FaTrash } from "react-icons/fa";

import type { Invoice } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

interface InvoiceDetailsProps {
  invoice: Invoice;
  loading?: boolean;
  onDelete?: (id: string) => Promise<void>;
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onPaymentStatusChange?: (id: string, paymentStatus: string) => Promise<void>;
  showActions?: boolean;
  showSensitiveInfo?: boolean;
}

export function InvoiceDetails({ invoice, loading = false, onDelete, onStatusChange, onPaymentStatusChange, showActions = true, showSensitiveInfo = true }: InvoiceDetailsProps) {
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(invoice.id);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, invoice.id]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!onStatusChange) return;

      setUpdating(true);
      try {
        await onStatusChange(invoice.id, status);
      } finally {
        setUpdating(false);
      }
    },
    [onStatusChange, invoice.id]
  );

  // Handle payment status change
  const handlePaymentStatusChange = useCallback(
    async (paymentStatus: string) => {
      if (!onPaymentStatusChange) return;

      setUpdating(true);
      try {
        await onPaymentStatusChange(invoice.id, paymentStatus);
      } finally {
        setUpdating(false);
      }
    },
    [onPaymentStatusChange, invoice.id]
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format date and time
  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadgeColor = (paymentStatus: string) => {
    switch (paymentStatus.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-orange-100 text-orange-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate payment progress
  const paymentProgress = (invoice.advance || 0) > 0 ? ((invoice.advance || 0) / invoice.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice #{invoice.id.slice(-8)}</h1>
            <p className="text-gray-600 mt-1">Created on {formatDate(invoice.createdAt)}</p>
          </div>

          {showActions && (
            <div className="flex items-center gap-3">
              <Link href={`/invoices/edit/${invoice.id}`} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaEdit className="mr-2 h-4 w-4" />
                Edit
              </Link>

              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
                <FaTrash className="mr-2 h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </button>

              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaDownload className="mr-2 h-4 w-4" />
                Download
              </button>

              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaPrint className="mr-2 h-4 w-4" />
                Print
              </button>
            </div>
          )}
        </div>

        {/* Status and Payment Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updating || !onStatusChange}
              className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${getStatusBadgeColor(invoice.status)} border-0 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={invoice.paymentStatus}
              onChange={(e) => handlePaymentStatusChange(e.target.value)}
              disabled={updating || !onPaymentStatusChange}
              className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${getPaymentStatusBadgeColor(invoice.paymentStatus)} border-0 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <p className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</p>
            {new Date(invoice.dueDate) < new Date() && invoice.status !== "paid" && <p className="text-xs text-red-600 mt-1">Overdue</p>}
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
            <p className="text-sm text-gray-900">{invoice.customerName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
            <p className="text-sm text-gray-900">{invoice.customerEmail}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone</label>
            <p className="text-sm text-gray-900">{invoice.customerPhone}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service ID</label>
            <p className="text-sm text-gray-900">{invoice.serviceId}</p>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.description || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Summary */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Discount:</span>
                <span className="text-sm font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}

            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax:</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.tax)}</span>
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {invoice.advance > 0 && (
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Advance Paid:</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(invoice.advance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Balance Due:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total - invoice.advance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Payment Progress */}
          <div className="space-y-4">
            {invoice.advance > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Progress</label>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(paymentProgress, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentProgress.toFixed(1)}% paid ({formatCurrency(invoice.advance)} of {formatCurrency(invoice.total)})
                </p>
              </div>
            )}

            {invoice.paymentMethod && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <p className="text-sm text-gray-900">{invoice.paymentMethod}</p>
              </div>
            )}

            {invoice.paymentDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <p className="text-sm text-gray-900">{formatDate(invoice.paymentDate)}</p>
              </div>
            )}

            {invoice.paidDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fully Paid Date</label>
                <p className="text-sm text-gray-900">{formatDate(invoice.paidDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
          <button onClick={() => setShowFullDetails(!showFullDetails)} className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
            {showFullDetails ? <FaEyeSlash className="mr-2 h-4 w-4" /> : <FaEye className="mr-2 h-4 w-4" />}
            {showFullDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>

        {showFullDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shop ID</label>
              <p className="text-sm text-gray-900">{invoice.shopId}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch ID</label>
              <p className="text-sm text-gray-900">{invoice.branchId}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created At</label>
              <p className="text-sm text-gray-900">{formatDateTime(invoice.createdAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Updated At</label>
              <p className="text-sm text-gray-900">{formatDateTime(invoice.updatedAt)}</p>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      {showActions && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">Last updated: {formatDateTime(invoice.updatedAt)}</div>

            <div className="flex items-center gap-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaShare className="mr-2 h-4 w-4" />
                Share
              </button>

              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaDownload className="mr-2 h-4 w-4" />
                Download PDF
              </button>

              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <FaPrint className="mr-2 h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
