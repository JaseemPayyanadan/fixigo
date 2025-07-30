"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { useTechnicians } from "@/hooks/useTechnicians";
import { RoleGuard, PermissionGuard } from "@/components";
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
  const isShopAdmin = user?.role === "shop_admin";
  // const isBranchAdmin = user?.role === "branch_admin";
  const { branches } = useBranches(shopId);
  const { createTechnician } = useTechnicians(shopId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAdd = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
    branch_id: string;
    password?: string;
  }) => {
    setError(null);
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.password?.trim()) {
      setError("Name, email, phone, and password are required.");
      return;
    }
    if (isShopAdmin && !data.branch_id) {
      setError("Branch selection is required for shop admin.");
      return;
    }
    setLoading(true);
    try {
      
      await createTechnician({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        shopId: user?.shopId || "",
        branchId: data.branch_id,
        role: "technician",
        skills: [],
        status: "active",
        bio: "",
        specializations: []
      });
      
      router.push("/technicians");
    } catch (err: unknown) {
      
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">Add New Technician</h1>
              <p className="text-gray-600 text-sm">Add a new technician to your team</p>
            </div>
            <button
              onClick={() => router.push("/technicians")}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Technicians
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                <span className="ml-2 text-sm font-medium text-gray-700">Personal Info</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                <span className="ml-2 text-sm font-medium text-gray-500">Branch Assignment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
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
    </div>
  );
} 