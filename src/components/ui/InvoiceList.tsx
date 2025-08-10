"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FaDownload, FaEdit, FaEye, FaSearch, FaSort, FaTrash } from "react-icons/fa";

import type { Invoice } from "@/types";
import { LoadingSpinner } from "./LoadingSpinner";

interface InvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (id: string) => Promise<void>;
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onPaymentStatusChange?: (id: string, paymentStatus: string) => Promise<void>;
  showActions?: boolean;
  showFilters?: boolean;
  maxHeight?: string;
}

interface FilterState {
  search: string;
  status: string;
  paymentStatus: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

interface SortState {
  field: keyof Invoice;
  direction: "asc" | "desc";
}

export function InvoiceList({ invoices, loading = false, error = null, onDelete, onStatusChange, onPaymentStatusChange, showActions = true, showFilters = true, maxHeight = "max-h-96" }: InvoiceListProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    paymentStatus: "",
    dateRange: "",
    minAmount: "",
    maxAmount: "",
  });

  const [sort, setSort] = useState<SortState>({
    field: "createdAt",
    direction: "desc",
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter and sort invoices
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [invoice.customerName, invoice.customerEmail, invoice.customerPhone, invoice.id, invoice.serviceId].join(" ").toLowerCase();

        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && invoice.status !== filters.status) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus && invoice.paymentStatus !== filters.paymentStatus) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const invoiceDate = new Date(invoice.createdAt);
        const now = new Date();

        switch (filters.dateRange) {
          case "today":
            if (!isSameDay(invoiceDate, now)) return false;
            break;
          case "week":
            if (!isWithinDays(invoiceDate, now, 7)) return false;
            break;
          case "month":
            if (!isWithinDays(invoiceDate, now, 30)) return false;
            break;
          case "quarter":
            if (!isWithinDays(invoiceDate, now, 90)) return false;
            break;
        }
      }

      // Amount range filter
      if (filters.minAmount && invoice.total < parseFloat(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && invoice.total > parseFloat(filters.maxAmount)) {
        return false;
      }

      return true;
    });

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];

      // Handle date fields
      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      // Handle string fields
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sort.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [invoices, filters, sort]);

  // Handle filter changes
  const handleFilterChange = useCallback((field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle sort changes
  const handleSort = useCallback((field: keyof Invoice) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      if (!onDelete) return;

      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      if (!onStatusChange) return;

      setUpdatingId(id);
      try {
        await onStatusChange(id, status);
      } finally {
        setUpdatingId(null);
      }
    },
    [onStatusChange]
  );

  // Handle payment status change
  const handlePaymentStatusChange = useCallback(
    async (id: string, paymentStatus: string) => {
      if (!onPaymentStatusChange) return;

      setUpdatingId(id);
      try {
        await onPaymentStatusChange(id, paymentStatus);
      } finally {
        setUpdatingId(null);
      }
    },
    [onPaymentStatusChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "",
      paymentStatus: "",
      dateRange: "",
      minAmount: "",
      maxAmount: "",
    });
  }, []);

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
      month: "short",
      day: "numeric",
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading invoices</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <p className="text-lg font-medium">No invoices found</p>
          <p className="text-sm">Create your first invoice to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search invoices..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Status Filter */}
            <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Status Filter */}
            <select value={filters.paymentStatus} onChange={(e) => handleFilterChange("paymentStatus", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Date Range Filter */}
            <select value={filters.dateRange} onChange={(e) => handleFilterChange("dateRange", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>

            {/* Clear Filters */}
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50">
              Clear
            </button>
          </div>

          {/* Advanced Filters */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Amount Range:</span>
              <input type="number" placeholder="Min" value={filters.minAmount} onChange={(e) => handleFilterChange("minAmount", e.target.value)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md" />
              <span className="text-sm text-gray-600">to</span>
              <input type="number" placeholder="Max" value={filters.maxAmount} onChange={(e) => handleFilterChange("maxAmount", e.target.value)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${maxHeight}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-2">
                    Invoice ID
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("customerName")}>
                  <div className="flex items-center gap-2">
                    Customer
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("total")}>
                  <div className="flex items-center gap-2">
                    Amount
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("paymentStatus")}>
                  <div className="flex items-center gap-2">
                    Payment
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("dueDate")}>
                  <div className="flex items-center gap-2">
                    Due Date
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center gap-2">
                    Created
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                {showActions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link href={`/invoices/details/${invoice.id}`} className="text-blue-600 hover:text-blue-800">
                      #{invoice.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.customerName}</div>
                      <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                      <div className="text-sm text-gray-500">{invoice.customerPhone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(invoice.total)}</div>
                      {invoice.discount > 0 && <div className="text-xs text-gray-500">-{formatCurrency(invoice.discount)} discount</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                      disabled={updatingId === invoice.id}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(invoice.status)} border-0 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={invoice.paymentStatus}
                      onChange={(e) => handlePaymentStatusChange(invoice.id, e.target.value)}
                      disabled={updatingId === invoice.id}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadgeColor(invoice.paymentStatus)} border-0 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="partial">Partial</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.dueDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/invoices/details/${invoice.id}`} className="text-blue-600 hover:text-blue-900 p-1" title="View Details">
                          <FaEye className="h-4 w-4" />
                        </Link>

                        <Link href={`/invoices/edit/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900 p-1" title="Edit Invoice">
                          <FaEdit className="h-4 w-4" />
                        </Link>

                        <button onClick={() => handleDelete(invoice.id)} disabled={deletingId === invoice.id} className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50" title="Delete Invoice">
                          <FaTrash className="h-4 w-4" />
                        </button>

                        <button className="text-green-600 hover:text-green-900 p-1" title="Download PDF">
                          <FaDownload className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
          </div>
          <div className="text-sm font-medium text-gray-900">Total: {formatCurrency(filteredAndSortedInvoices.reduce((sum, invoice) => sum + invoice.total, 0))}</div>
        </div>
      </div>
    </div>
  );
}

// Utility functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
}

function isWithinDays(date1: Date, date2: Date, days: number): boolean {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}
