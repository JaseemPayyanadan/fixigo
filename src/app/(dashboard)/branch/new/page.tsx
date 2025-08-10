"use client";
import React, { useState } from "react";

import { useRouter } from "next/navigation";

import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { BranchForm } from "@/modules/branch/BranchForm";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const { } = useBranches(shopId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateBranch = async (branchData: {
    name: string;
    location: string;
    phone: string;
    email: string;
    password: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Create branch using the new API endpoint
      const response = await fetch("/api/branches/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...branchData,
          shopId: shopId!,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create branch");
      }

      const result = await response.json();
      console.log("Branch created successfully:", result);
      
      // Redirect to branches list after successful creation
      router.push("/branch");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Branch</h1>
              <p className="text-sm text-gray-600 mt-1">Add a new branch to your shop</p>
            </div>
            <button
              onClick={() => router.push("/branch")}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Branches
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Form */}
      <div className="flex-1">
        <BranchForm
          onSubmit={handleCreateBranch}
          loading={loading}
          editing={false}
          onCancel={() => router.push("/branch")}
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