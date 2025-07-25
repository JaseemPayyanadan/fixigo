"use client";
import React, { useState, useEffect } from "react";
import { BranchList } from "@/modules/branch/BranchList";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { SearchFilter } from "@/components/ui";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";
import logger from "@/lib/logger";

export default function BranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { branches, loading, error, deleteBranch } = useBranches(shopId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Log user data for debugging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Branch page user data', {
        userId: user?.uid,
        userRole: user?.role,
        userEmail: user?.email,
        shopId: shopId,
        userShopId: user?.shopId,
        onboardingCompleted: user?.onboardingCompleted,
        fullUserData: user
      });
    }
  }, [user, shopId]);

  // Fetch technicians for each branch
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length) return;
      
      try {
        logger.info('Fetching technicians for branches', { branchCount: branches.length });
        
        // First, let's test if we can access the technicians collection at all
        const testQuery = query(collection(db, "technicians"));
        const testSnap = await getDocs(testQuery);
        logger.debug('Total technicians in collection', { count: testSnap.docs.length });
        
        if (testSnap.docs.length > 0) {
          logger.debug('Sample technician data', { data: testSnap.docs[0].data() });
        }
        
        // Fetch all technicians and filter client-side to avoid 'in' query limitations
        const q = query(collection(db, "technicians"));
        const snap = await getDocs(q);
        
        const byBranch: Record<string, string[]> = {};
        const branchIds = branches.map(b => b.id);
        
        snap.docs.forEach(doc => {
          const data = doc.data();
          logger.debug('Processing technician data', { data });
          // Only include technicians that belong to our branches
          if (branchIds.includes(data.branch_id)) {
            if (!byBranch[data.branch_id]) byBranch[data.branch_id] = [];
            byBranch[data.branch_id].push(data.name);
          }
        });
        
        logger.debug('Technicians grouped by branch', { byBranch });
      } catch (error) {
        logger.error('Error fetching technicians', error as Error);
        // Don't set error state here as it's not critical for the page to function
      }
    };
    
    fetchTechnicians();
  }, [branches]);

  // Check if user has proper access
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You need to be logged in to view branches.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has proper role and shopId
  if (user.role !== "shop_admin" || !shopId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
            <p className="text-gray-600 mb-6">
              {user.role !== "shop_admin" 
                ? "Only shop administrators can manage branches." 
                : "Please complete your shop setup to manage branches."
              }
            </p>
            {user.role !== "shop_admin" && (
              <p className="text-sm text-gray-500">
                Your current role: {user.role}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredBranches = branches.filter(branch => {
    // Log branch data for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Filtering branch', { 
        branchId: branch.id, 
        branchName: branch.name,
        hasId: !!branch.id,
        idLength: branch.id?.length 
      });
    }
    
    const matchesSearch = branch.name.toLowerCase().includes(search.toLowerCase()) ||
                         branch.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Branches</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="text-sm text-gray-500">
              <p>User ID: {user?.uid}</p>
              <p>Role: {user?.role}</p>
              <p>Shop ID: {shopId || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Branches</h1>
            <p className="text-gray-600">
              Manage your business locations and their operations
            </p>
          </div>
          <Link
            href="/branch/new"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Branch
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <SearchFilter
            search={search}
            onSearchChange={setSearch}
            placeholder="Search branches..."
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter,
                options: [
                  { value: "All", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ],
                onChange: setStatusFilter
              }
            ]}
            onClear={() => {
              setSearch("");
              setStatusFilter("All");
            }}
            showClear={true}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading branches</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Branches List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <BranchList
            branches={filteredBranches}
            loading={loading}
            error={error}
            onDeleteBranch={(branch) => branch.id && deleteBranch(branch.id)}
          />
        </div>

        {/* Empty State */}
        {!loading && filteredBranches.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No branches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter !== "All" 
                ? "Try adjusting your search or filter criteria."
                : "Get started by creating your first branch."
              }
            </p>
            {!search && statusFilter === "All" && (
              <div className="mt-6">
                <Link
                  href="/branch/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Branch
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 