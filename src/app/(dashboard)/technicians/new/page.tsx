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
  const branchId = user?.branchId || "";
  const userRole = user?.role as "shop_admin" | "branch_admin";
  const { branches } = useBranches(shopId);
  const { } = useTechnicians(shopId, branchId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAdd = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
    password: string;
    branchId: string;
    role: "technician";
  }) => {
    setError(null);
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.password) {
      setError("Name, email, phone, and password are required.");
      return;
    }

    // For branch_admin, use their branch ID
    const targetBranchId = userRole === "branch_admin" ? branchId : data.branchId;
    
    setLoading(true);
    try {
      // Create technician using the new API endpoint
      const response = await fetch("/api/technicians/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
          shopId: user?.shopId || "",
          branchId: targetBranchId,
          skills: [],
          bio: "",
          specializations: []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create technician");
      }

      const result = await response.json();
      console.log("Technician created successfully:", result);
      
      // Redirect to technicians list after successful creation
      router.push("/technicians");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-200">
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
            onCancel={() => router.push("/technicians")}
            branches={branches}
            userRole={userRole}
            currentUserBranchId={branchId}
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