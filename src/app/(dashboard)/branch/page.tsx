"use client";

import { useCallback, useState } from "react";

import Link from "next/link";

import { BranchAdminBranchList, ShopAdminBranchList, TechnicianBranchList } from "@/components/branch";
import { SearchFilter } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ListPageSkeleton } from "@/components/ui/PageSkeleton";
import Toast, { type ToastVariant } from "@/components/ui/Toast";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import type { Branch } from "@/types";

export default function BranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { branches, loading, error, deleteBranch } = useBranches(shopId);

  const [statusFilter, setStatusFilter] = useState("All");
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const handleRequestDelete = useCallback((branch: Branch) => {
    setDeleteError(null);
    setBranchToDelete(branch);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (deleting) return;
    setBranchToDelete(null);
    setDeleteError(null);
  }, [deleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!branchToDelete?.id) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBranch(branchToDelete.id);
      setBranchToDelete(null);
      setToast({
        message: `"${branchToDelete.name}" was deleted`,
        variant: "success",
      });
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete the branch");
    } finally {
      setDeleting(false);
    }
  }, [branchToDelete, deleteBranch]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("All");
  }, []);

  // Filter branches - moved here to avoid recalculating in useEffect
  const filteredBranches = branches.filter((branch) => {
    // For branch admins, only show their own branch
    if (user?.role === "branch_admin" && user?.branchId && branch.id !== user.branchId) {
      return false;
    }

    return statusFilter === "All" || branch.status === statusFilter;
  });

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <ListPageSkeleton cards={0} rows={6} label="Loading branches" />
      </div>
    );
  }

  // Render access denied state
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L13.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Denied</h1>
          <p className="text-gray-600">You need to be logged in to view branches.</p>
        </div>
      </div>
    );
  }

  // Render access restricted state
  if ((user.role !== "shop_admin" && user.role !== "branch_admin" && user.role !== "technician") || !shopId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L13.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Restricted</h1>
          <p className="text-gray-600 mb-4">{user.role !== "shop_admin" && user.role !== "branch_admin" && user.role !== "technician" ? "Only shop administrators, branch administrators, and technicians can access branches." : "Please complete your shop setup to manage branches."}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L13.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Error Loading Branches</h1>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-row flex-wrap items-center justify-end gap-5">
            <SearchFilter
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
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {user?.role === "shop_admin" && (
          <ShopAdminBranchList
            branches={filteredBranches}
            loading={loading}
            error={error}
            shopId={shopId}
            onDeleteBranch={handleRequestDelete}
          />
        )}
        {user?.role === "branch_admin" && (
          <BranchAdminBranchList
            branches={filteredBranches}
            loading={loading}
            error={error}
            shopId={shopId}
          />
        )}
        {user?.role === "technician" && (
          <TechnicianBranchList
            branches={filteredBranches}
            loading={loading}
            error={error}
            shopId={shopId}
          />
        )}
      </div>

      <ConfirmDialog
        open={branchToDelete !== null}
        title="Delete branch"
        description={
          branchToDelete
            ? `Delete "${branchToDelete.name}"? This cannot be undone.`
            : "Delete this branch? This cannot be undone."
        }
        confirmLabel="Delete"
        confirming={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteDialog}
      />

      <Toast
        open={toast !== null}
        message={toast?.message ?? ""}
        variant={toast?.variant}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
