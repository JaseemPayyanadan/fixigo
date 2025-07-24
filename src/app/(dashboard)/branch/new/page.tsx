"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BranchForm } from "@/modules/branch/BranchForm";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { AuthGuard, RoleGuard } from "@/components";
import { HiArrowLeft, HiOfficeBuilding } from "react-icons/hi";
import Link from "next/link";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { createBranch } = useBranches(shopId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('NewBranchPage - User:', user);
  console.log('NewBranchPage - ShopId:', shopId);
  console.log('NewBranchPage - User UID:', user?.uid);
  console.log('NewBranchPage - User role:', user?.role);
  console.log('NewBranchPage - Onboarding completed:', user?.onboardingCompleted);

  const handleCreateBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    branchPassword: string;
  }) => {
    console.log('handleCreateBranch called with:', branchData);
    console.log('ShopId:', shopId);
    setLoading(true);
    setError(null);
    try {
      console.log('Calling createBranch...');
      await createBranch(branchData);
      console.log('createBranch completed successfully');
      // Redirect to branches list after successful creation
      router.push("/branch");
    } catch (err: unknown) {
      console.error('Error in handleCreateBranch:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Check if user has a valid shopId
  if (!shopId) {
    return (
      <AuthGuard>
        <RoleGuard allowedRoles={["shop_admin"]}>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiOfficeBuilding className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Shop Not Found</h1>
                <p className="text-gray-600 mb-6">
                  You need to complete your shop setup before creating branches.
                </p>
                <Link
                  href="/shop-onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Complete Shop Setup
                </Link>
              </div>
            </div>
          </div>
        </RoleGuard>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["shop_admin"]}>
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
                  <HiOfficeBuilding className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Add New Branch</h1>
                  <p className="text-gray-600">Create a new branch for your business</p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Branch Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <BranchForm
                onSubmit={handleCreateBranch}
                loading={loading}
                editMode={false}
              />
            </div>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
} 