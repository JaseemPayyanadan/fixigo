"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { BranchForm } from "@/modules/branch/BranchForm";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const { createBranch } = useBranches(shopId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateBranch = async (branchData: {
    name: string;
    location: string;
    phone: string;
    email: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await createBranch({
        ...branchData,
        status: "active" as const,
        shopId: shopId!,
      });

      // Redirect to branches list after successful creation
      router.push("/branch");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Branch</h1>
              <p className="text-gray-600 mt-1">Add a new branch to your shop</p>
            </div>
            <button
              onClick={() => router.push("/branch")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Branches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <BranchForm
            onSubmit={handleCreateBranch}
            loading={loading}
            editing={false}
            onCancel={() => router.push("/branch")}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
    </div>
  );
} 