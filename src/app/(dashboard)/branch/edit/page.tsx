"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { BranchForm } from "@/modules/branch/BranchForm";
import { Branch } from "@/types";
import { LoadingSpinner } from "@/components/ui";
import { HiArrowLeft } from "react-icons/hi";
import Link from "next/link";

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
    address: string;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <LoadingSpinner text="Loading branch details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Branch</h2>
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
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Branch Not Found</h2>
              <p className="text-gray-600 mb-6">The branch you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Link
                href="/branch"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Branches
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/branch"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <HiArrowLeft className="w-5 h-5" />
              <span>Back to Branches</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Branch</h1>
              <p className="text-gray-600">Update branch information and contact details</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        )}

        {/* Branch Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <BranchForm
            onSubmit={handleEditBranch}
            loading={formLoading}
            initialData={{
              name: branch.name,
              address: branch.address || "",
              phone: branch.phone || "",
              email: branch.email || "",
            }}
            editing={true}
          />
        </div>
      </div>
    </div>
  );
} 