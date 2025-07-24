"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Invoice {
  id: string;
  serviceId: string;
  customer: { name?: string; phone?: string };
  total: number;
  status: string;
  paymentStatus?: string;
  createdAt?: { seconds: number; nanoseconds: number } | Date;
}

export default function InvoicesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [serviceNames, setServiceNames] = useState<{ [serviceId: string]: string }>({});
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || loading) return;
    if (!(user.role === "shop_admin" || user.role === "branch_admin")) {
      router.replace("/unauthorized");
      return;
    }
    const fetchInvoices = async () => {
      setFetching(true);
      let q;
      if (user.role === "shop_admin") {
        q = query(collection(db, "invoices"), where("shopId", "==", user.shopId));
      } else {
        q = query(collection(db, "invoices"), where("branch_id", "==", user.branch_id));
      }
      const snap = await getDocs(q);
      const invoicesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(invoicesData);
      // Fetch service names for all unique serviceIds
      const uniqueServiceIds = Array.from(new Set(invoicesData.map(inv => inv.serviceId)));
      const serviceNameMap: { [serviceId: string]: string } = {};
      await Promise.all(uniqueServiceIds.map(async (serviceId) => {
        if (!serviceId) return;
        try {
          const serviceDoc = await getDocs(query(collection(db, "services"), where("id", "==", serviceId)));
          if (!serviceDoc.empty) {
            const docData = serviceDoc.docs[0].data();
            serviceNameMap[serviceId] = docData.name || serviceId;
          } else {
            serviceNameMap[serviceId] = serviceId;
          }
        } catch {
          serviceNameMap[serviceId] = serviceId;
        }
      }));
      setServiceNames(serviceNameMap);
      setFetching(false);
    };
    fetchInvoices();
  }, [user, loading, router]);

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = search.toLowerCase();
    return (
      invoice.customer?.name?.toLowerCase().includes(searchLower) ||
      invoice.customer?.phone?.includes(search) ||
      serviceNames[invoice.serviceId]?.toLowerCase().includes(searchLower) ||
      invoice.id.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === "Pending").length;
  const paidInvoices = invoices.filter(inv => inv.status === "Paid").length;
  const totalValue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  if (loading || fetching) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading invoices...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">Invoice Management</h1>
              <p className="text-gray-600 text-sm">Track and manage all your invoices</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/services"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Service
              </Link>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingInvoices}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{paidInvoices}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search invoices by customer, service, or invoice ID..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Filter
            </button>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                {search ? "No invoices match your search criteria." : "Get started by creating a service to generate your first invoice."}
              </p>
              {!search && (
                <Link
                  href="/services"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Service
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 text-gray-900">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-lg">Invoice ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={`transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 hover:shadow-md rounded-lg`}
                    >
                      <td className="px-6 py-4 font-mono text-sm text-gray-900 rounded-l-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {inv.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{inv.customer?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{inv.customer?.phone || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {serviceNames[inv.serviceId] || inv.serviceId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-blue-700">
                          ₹{(inv.total || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          inv.status === 'Pending' 
                            ? 'bg-orange-100 text-orange-700' 
                            : inv.status === 'Paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            inv.status === 'Pending' ? 'bg-orange-500' : inv.status === 'Paid' ? 'bg-green-500' : 'bg-gray-500'
                          }`}></div>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          inv.paymentStatus === 'Paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            inv.paymentStatus === 'Paid' ? 'bg-green-500' : 'bg-orange-500'
                          }`}></div>
                          {inv.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 rounded-r-lg">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/invoices/details?id=${inv.serviceId}`)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Invoice"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => router.push(`/invoices/details?id=${inv.serviceId}&print=1`)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Print Invoice"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 