"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { BranchAdminBranchList, ShopAdminBranchList, TechnicianBranchList } from "@/components/branch";
import { SearchFilter } from "@/components/ui";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export default function BranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { branches, loading, error, deleteBranch } = useBranches(shopId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Fetch technicians for each branch
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length || !shopId) return;

      try {
        logger.info("Fetching technicians for branches", { branchCount: branches.length });

        const byBranch: Record<string, string[]> = {};

        // Fetch technicians from branch members array for each branch
        for (const branch of branches) {
          try {
            const branchDoc = await getDoc(doc(db, "shops", shopId, "branches", branch.id));
            if (branchDoc.exists()) {
              const branchData = branchDoc.data();
              const members = branchData.members || [];

              const technicianNames: string[] = [];

              // Fetch user names for each technician
              for (const member of members) {
                if (member.role === "technician" && member.userId) {
                  try {
                    // Fetch user name from users collection
                    const userQuery = query(collection(db, "users"), where("uid", "==", member.userId));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                      const userData = userSnapshot.docs[0].data();
                      const userName = userData.name || "Unknown User";
                      technicianNames.push(userName);
                    }
                  } catch (userError) {
                    logger.warn(`Error fetching user for userId ${member.userId}:`, { error: String(userError) });
                  }
                }
              }

              if (technicianNames.length > 0) {
                byBranch[branch.id] = technicianNames;
              }

              logger.debug(`Fetched ${technicianNames.length} technicians for branch ${branch.id}`);
            }
          } catch (error) {
            logger.warn(`Error fetching technicians for branch ${branch.id}:`, { error: String(error) });
            // Continue with other branches even if one fails
          }
        }

        logger.debug("Technicians grouped by branch", { branchCount: Object.keys(byBranch).length });
      } catch (error) {
        logger.error("Error fetching technicians", { error: error as Error });
        // Don't set error state here as it's not critical for the page to function
      }
    };

    fetchTechnicians();
  }, [branches, shopId]);

  const handleDeleteBranch = useCallback(
    (branch: { id: string }) => {
      if (branch.id) {
        deleteBranch(branch.id);
      }
    },
    [deleteBranch]
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("All");
  }, []);

  // Check if user has proper access
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Denied</h1>
          <p className="text-gray-600">You need to be logged in to view branches.</p>
        </div>
      </div>
    );
  }

  // Check if user has proper role and shopId
  if ((user.role !== "shop_admin" && user.role !== "branch_admin" && user.role !== "technician") || !shopId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Restricted</h1>
          <p className="text-gray-600 mb-4">{user.role !== "shop_admin" && user.role !== "branch_admin" && user.role !== "technician" ? "Only shop administrators, branch administrators, and technicians can access branches." : "Please complete your shop setup to manage branches."}</p>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-left">
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <p>
              <strong>Shop ID:</strong> {shopId || "Not set"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredBranches = branches.filter((branch) => {
    // For branch admins, only show their own branch
    if (user.role === "branch_admin" && user.branchId && branch.id !== user.branchId) {
      return false;
    }

    const matchesSearch = branch.name.toLowerCase().includes(search.toLowerCase()) || branch.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Branches</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-left">
            <p>
              <strong>User ID:</strong> {user?.id}
            </p>
            <p>
              <strong>Role:</strong> {user?.role}
            </p>
            <p>
              <strong>Shop ID:</strong> {shopId || "Not set"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{user.role === "shop_admin" ? "Branches" : "Branch"}</h1>
              <p className="text-sm text-gray-600 mt-1">{user.role === "shop_admin" ? "Manage your business locations" : "View your branch information"}</p>
            </div>
            {user.role === "shop_admin" && (
              <Link href="/branch/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Branch
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-6 pb-4">
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
                  { value: "inactive", label: "Inactive" },
                ],
                onChange: setStatusFilter,
              },
            ]}
            onClear={handleClearFilters}
            showClear={true}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {user?.role === "shop_admin" && <ShopAdminBranchList branches={filteredBranches} loading={loading} error={error} shopId={shopId} onDeleteBranch={handleDeleteBranch} />}
        {user?.role === "branch_admin" && <BranchAdminBranchList branches={filteredBranches} loading={loading} error={error} shopId={shopId} />}
        {user?.role === "technician" && <TechnicianBranchList branches={filteredBranches} loading={loading} error={error} shopId={shopId} />}
      </div>
    </div>
  );
}
