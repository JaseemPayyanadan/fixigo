"use client";
import React, { useEffect, useState, Suspense } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { doc, getDoc } from "firebase/firestore";

import { LoadingSpinner } from "@/components/ui";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { db } from "@/lib/firebase";
import { BranchForm } from "@/modules/branch/BranchForm";
import { Branch } from "@/types";

export default function EditBranchPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading branch..." />}>
      <EditBranchContent />
    </Suspense>
  );
}

function EditBranchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();
  const shopId = user?.shopId;
  const { updateBranch } = useBranches(shopId);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      if (!shopId || !id) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const docRef = doc(db, `shops/${shopId}/branches`, id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const branchData = { id: docSnap.id, ...docSnap.data() } as Branch;
          setBranch(branchData);
        } else {
          setError("Branch not found. It may have been deleted or you don't have permission to access it.");
        }
      } catch (err) {
        console.error('Error fetching branch:', err);
        setError((err as Error).message || "Failed to fetch branch. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchBranch();
  }, [shopId, id]);

  const handleEditBranch = async (branchData: {
    name: string;
    location: string;
    phone: string;
    email: string;
  }) => {
    if (!branch) {
      setError("No branch data available");
      return;
    }
    
    setFormLoading(true);
    setError(null);
    
    try {
      await updateBranch(branch.id, branchData);
      router.push("/branch");
    } catch (err) {
      console.error('Error updating branch:', err);
      setError((err as Error).message || "Failed to update branch. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner text="Loading branch details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Unable to Load Branch</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/branch"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Branches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Branch Not Found</h2>
          <p className="text-gray-600 mb-6">The branch you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link
            href="/branch"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Branches
          </Link>
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
              <h1 className="text-2xl font-semibold text-gray-900">Edit Branch</h1>
              <p className="text-sm text-gray-600 mt-1">Update branch information and contact details</p>
            </div>
            <Link
              href="/branch"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Branches
            </Link>
          </div>
        </div>
      </div>

      {/* Full Screen Form */}
      <div className="flex-1">
        <BranchForm
          onSubmit={handleEditBranch}
          loading={formLoading}
          initialData={{
            name: branch.name,
            location: branch.location || "",
            phone: branch.phone || "",
            email: branch.email || "",
          }}
          editing={true}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-6 right-6 max-w-sm">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 