"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { useTechnicians } from "@/hooks/useTechnicians";
import { RoleGuard, PermissionGuard } from "@/components";
import CredentialsNotification from "@/components/CredentialsNotification";
import TechnicianForm from "@/modules/technician/TechnicianForm";

export default function NewTechnicianPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:write"]}>
        <NewTechnicianContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function NewTechnicianContent() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const branchId = user?.branchId || "";
  const isShopAdmin = user?.role === "shop_admin";
  const { branches } = useBranches(shopId);
  const { createTechnician } = useTechnicians(shopId, branchId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
    role: 'branch_admin' | 'technician';
  } | null>(null);
  const router = useRouter();

  const handleAdd = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
    branch_id: string;
    password?: string;
  }) => {
    setError(null);
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (isShopAdmin && !data.branch_id) {
      setError("Branch selection is required for shop admin.");
      return;
    }
    
    const targetBranchId = isShopAdmin ? data.branch_id : branchId;
    
    setLoading(true);
    try {
      const result = await createTechnician({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        shopId: user?.shopId || "",
        branchId: targetBranchId,
        role: "technician",
        skills: [],
        status: "active",
        bio: "",
        specializations: []
      });
      
      // Show credentials notification if password was auto-generated
      if (!data.password) {
        setCredentials({
          email: data.email,
          tempPassword: result.tempPassword || "Auto-generated password",
          role: 'technician'
        });
      } else {
        router.push("/technicians");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCredentials = () => {
    setCredentials(null);
    router.push("/technicians");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Technician</h1>
              <p className="text-gray-600 mt-1">Add a new technician to your team</p>
            </div>
            <button
              onClick={() => router.push("/technicians")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Technicians</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <TechnicianForm
            onSubmit={handleAdd}
            loading={loading}
            editing={false}
            branch_id={user?.branchId || ""}
            onCancel={() => router.push("/technicians")}
            branches={branches}
            userRole={user?.role || ""}
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

      {/* Credentials Notification */}
      {credentials && (
        <CredentialsNotification
          email={credentials.email}
          tempPassword={credentials.tempPassword}
          role={credentials.role}
          onClose={handleCloseCredentials}
        />
      )}
    </div>
  );
} 