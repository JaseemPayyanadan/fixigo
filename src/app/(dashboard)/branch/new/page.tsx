"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { RoleGuard, PermissionGuard } from "@/components";
import CredentialsNotification from "@/components/CredentialsNotification";
import { BranchForm } from "@/modules/branch/BranchForm";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const { createBranch } = useBranches(shopId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
    role: 'branch_admin' | 'technician';
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      router.push("/shop-onboarding");
    }
  }, [user, router]);

  const handleCreateBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    email: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createBranch({
        ...branchData,
        status: "active" as const,
        shopId: shopId!,
        managerId: "", // Will be set by the createBranch function
      });

      // Show credentials notification
      if (result.tempPassword) {
        setCredentials({
          email: result.managerEmail,
          tempPassword: result.tempPassword,
          role: 'branch_admin'
        });
      } else {
        // Redirect to branches list after successful creation
        router.push("/branch");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCredentials = () => {
    setCredentials(null);
    router.push("/branch");
  };

  // Check if user has a valid shopId
  if (!shopId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shop Found</h3>
            <p className="text-gray-600 mb-6">
              You need to complete shop onboarding before creating branches.
            </p>
            <button
              onClick={() => router.push("/shop-onboarding")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Complete Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["shop_admin"]}>
      <PermissionGuard permissions={["branch:write"]}>
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

        {/* Credentials Notification */}
        {credentials && (
          <CredentialsNotification
            email={credentials.email}
            tempPassword={credentials.tempPassword}
            role={credentials.role}
            onClose={handleCloseCredentials}
          />
        )}
      </PermissionGuard>
    </RoleGuard>
  );
} 