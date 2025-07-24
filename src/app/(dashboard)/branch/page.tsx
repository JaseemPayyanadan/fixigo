"use client";
import React, { useState, useEffect } from "react";
import { BranchList } from "@/modules/branch/BranchList";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { SearchFilter } from "@/components/ui";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";

export default function BranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { branches, loading, error, deleteBranch } = useBranches(shopId);
  const [techniciansByBranch, setTechniciansByBranch] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Debug user data
  useEffect(() => {
    console.log('BranchPage - Current user:', user);
    console.log('BranchPage - ShopId:', shopId);
    console.log('BranchPage - User role:', user?.role);
    console.log('BranchPage - User UID:', user?.uid);
    console.log('BranchPage - User email:', user?.email);
  }, [user, shopId]);

  // Fetch technicians for each branch
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length) return;
      
      try {
        console.log('Fetching technicians for branches:', branches.length);
        
        // First, let's test if we can access the technicians collection at all
        const testQuery = query(collection(db, "technicians"));
        const testSnap = await getDocs(testQuery);
        console.log('Total technicians in collection:', testSnap.docs.length);
        
        if (testSnap.docs.length > 0) {
          console.log('Sample technician data:', testSnap.docs[0].data());
        }
        
        // Fetch all technicians and filter client-side to avoid 'in' query limitations
        const q = query(collection(db, "technicians"));
        const snap = await getDocs(q);
        
        const byBranch: Record<string, string[]> = {};
        const branchIds = branches.map(b => b.id);
        
        snap.docs.forEach(doc => {
          const data = doc.data();
          console.log('Technician data:', data);
          // Only include technicians that belong to our branches
          if (branchIds.includes(data.branch_id)) {
            if (!byBranch[data.branch_id]) byBranch[data.branch_id] = [];
            byBranch[data.branch_id].push(data.name);
          }
        });
        
        console.log('Technicians by branch:', byBranch);
        setTechniciansByBranch(byBranch);
      } catch (error) {
        console.error('Error fetching technicians:', error);
        // Don't set error state here as it's not critical for the page to function
        setTechniciansByBranch({});
      }
    };
    
    fetchTechnicians();
  }, [branches]);



  // Filter branches
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = !search || 
      branch.name?.toLowerCase().includes(search.toLowerCase()) ||
      branch.address?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || branch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">Branch Management</h1>
              <p className="text-gray-600 text-sm">Organize and manage your business locations</p>
            </div>
            <Link
              href="/branch/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Branch
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Search branches by name or address..."
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
          onClear={clearFilters}
          showClear={true}
          className="mb-6"
        />

        {/* Branch List */}
        <BranchList
          branches={filteredBranches}
          loading={loading}
          error={error}
          onDeleteBranch={(branch) => deleteBranch(branch.id)}
        />


      </div>
    </div>
  );
} 