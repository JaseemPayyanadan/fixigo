"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BranchForm } from "@/modules/branch/BranchForm";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { AuthGuard, RoleGuard } from "@/components";
import { HiArrowLeft, HiOfficeBuilding } from "react-icons/hi";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId;
  const { createBranch } = useBranches(shopId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log user data for debugging (only in development)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('New branch page user data', {
        userId: user?.uid,
        userRole: user?.role,
        shopId: shopId,
        onboardingCompleted: user?.onboardingCompleted
      });
    }
  }, [user, shopId]);

  const handleCreateBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    userName: string;
    userPassword: string;
  }) => {
    logger.info('Creating new branch', { 
      shopId, 
      branchName: branchData.name,
      branchEmail: branchData.email
    });
    
    setLoading(true);
    setError(null);
    try {
      logger.debug('Calling createBranch function');
      await createBranch({
        ...branchData,
        status: "active" as const,
        shopId: shopId!,
        managerId: "", // Will be set by the createBranch function
      });
      logger.info('Branch created successfully');
      // Redirect to branches list after successful creation
      router.push("/branch");
    } catch (err: unknown) {
      logger.error('Error creating branch', { shopId, error: err as Error });
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
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <Link
                href="/branch"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
              >
                <HiArrowLeft className="w-4 h-4" />
                Back to Branches
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <HiOfficeBuilding className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Add New Branch</h1>
                  <p className="text-gray-600">Create a new branch location for your business</p>
                </div>
              </div>
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
                    <h3 className="text-sm font-medium text-red-800">Error creating branch</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Branch Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <BranchForm
                onSubmit={handleCreateBranch}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
} 