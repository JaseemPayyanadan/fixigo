"use client";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { FaDownload, FaEdit, FaEye, FaPlus, FaPrint, FaTrash } from "react-icons/fa";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SearchFilter from "@/components/ui/SearchFilter";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";

interface Invoice {
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
  createdAt: Date;
  updatedAt: Date;
  branchId?: string;
  shopId?: string;
}

interface Service {
  id: string;
  name: string;
  customer?: { name: string; phone?: string; email?: string };
  device?: { type: string; brand: string; model: string; imei: string };
  price: number;
  status: string;
  createdAt: { seconds: number; nanoseconds: number };
  branchId: string;
  shopId: string;
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch invoices and services
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch services first
        const servicesRef = collection(db, "services");
        const servicesQuery = query(servicesRef, orderBy("createdAt", "desc"));
        const servicesSnapshot = await getDocs(servicesQuery);

        const servicesData = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Service[];

        setServices(servicesData);

        // Fetch existing invoices
        const invoicesRef = collection(db, "invoices");
        const invoicesQuery = query(invoicesRef, orderBy("createdAt", "desc"));
        const invoicesSnapshot = await getDocs(invoicesQuery);

        const invoicesData = invoicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invoice[];

        setInvoices(invoicesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort invoices
  const filteredInvoices = useCallback(() => {
    let filtered = [...invoices];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((invoice) => invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.customerPhone.includes(searchTerm));
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    // Apply payment filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.paymentStatus === paymentFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date | undefined = a[sortBy as keyof Invoice];
      let bValue: string | number | Date | undefined = b[sortBy as keyof Invoice];

      if (sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "dueDate") {
        aValue = aValue instanceof Date ? aValue.getTime() : 0;
        bValue = bValue instanceof Date ? bValue.getTime() : 0;
      }

      // Handle undefined values
      if (aValue === undefined) aValue = "";
      if (bValue === undefined) bValue = "";

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter, paymentFilter, sortBy, sortOrder]);

  // Handle invoice actions
  const handleViewInvoice = useCallback(
    (invoice: Invoice) => {
      router.push(`/invoices/details?id=${invoice.serviceId}`);
    },
    [router]
  );

  const handleEditInvoice = useCallback(
    (invoice: Invoice) => {
      router.push(`/invoices/details?id=${invoice.serviceId}&edit=1`);
    },
    [router]
  );

  const handleCreateInvoice = useCallback(() => {
    router.push("/invoices/new");
  }, [router]);

  const handleDeleteInvoice = useCallback(async (invoiceId: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      // Implement delete logic here
      console.log("Deleting invoice:", invoiceId);
    }
  }, []);

  // Get status badge styling
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get payment status badge styling
  const getPaymentBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayInvoices = filteredInvoices();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Manage and track all your service invoices</p>
          </div>
          <button onClick={handleCreateInvoice} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <FaPlus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.filter((inv) => inv.paymentStatus === "Pending").length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.filter((inv) => inv.dueDate < new Date() && inv.paymentStatus === "Pending").length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <SearchFilter placeholder="Search by customer name, email, or phone..." search={searchTerm} onSearchChange={setSearchTerm} />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Payments</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="createdAt">Sort by Date</option>
                <option value="dueDate">Sort by Due Date</option>
                <option value="total">Sort by Amount</option>
                <option value="customerName">Sort by Customer</option>
              </select>

              <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No invoices found</p>
                        <p className="text-sm">Get started by creating your first invoice</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayInvoices.map((invoice) => {
                    const service = services.find((s) => s.id === invoice.serviceId);
                    const isOverdue = invoice.dueDate < new Date() && invoice.paymentStatus === "Pending";

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.customerName}</div>
                            <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                            <div className="text-sm text-gray-500">{invoice.customerPhone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service?.name || "Service"}</div>
                            {service?.device && (
                              <div className="text-sm text-gray-500">
                                {service.device.brand} {service.device.model}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">₹{invoice.total.toFixed(2)}</div>
                          {invoice.discount > 0 && <div className="text-xs text-green-600">-₹{invoice.discount.toFixed(2)} discount</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(invoice.status)}`}>{invoice.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentBadgeStyle(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-900"}`}>
                            {invoice.dueDate.toLocaleDateString()}
                            {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleViewInvoice(invoice)} className="text-blue-600 hover:text-blue-900 p-1" title="View Invoice">
                              <FaEye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditInvoice(invoice)} className="text-green-600 hover:text-green-900 p-1" title="Edit Invoice">
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600 hover:text-red-900 p-1" title="Delete Invoice">
                              <FaTrash className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900 p-1" title="Download PDF">
                              <FaDownload className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900 p-1" title="Print Invoice">
                              <FaPrint className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Info */}
        {displayInvoices.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {displayInvoices.length} of {invoices.length} invoices
          </div>
        )}
      </div>
    </div>
  );
}
