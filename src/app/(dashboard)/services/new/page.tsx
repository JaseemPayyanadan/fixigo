"use client";

import React, { useState } from "react";

import { useRouter } from "next/navigation";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { useTechnicians, useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { authUserToUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import ServiceForm from "@/components/service/ServiceForm";

export default function NewServicePage() {
  const { user, loading: userLoading } = useUser();
  const convertedUser = user ? authUserToUser(user) : null;
  const shopId = user?.shopId || "";
  const isShopAdmin = user?.role === "shop_admin";
  const isBranchAdmin = user?.role === "branch_admin";
  const { branches, loading: branchesLoading } = useBranches(shopId);
  const { technicians, loading: techniciansLoading } = useTechnicians(shopId);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (isBranchAdmin && user?.branchId) {
      setBranchId(user.branchId);
    }
  }, [isBranchAdmin, user?.branchId]);

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication Required</h2>
          <p className="text-sm text-gray-600">Please log in to create a new service.</p>
        </div>
      </div>
    );
  }

  const handleAdd = async (data: { service: { name: string; description: string; price: string; branchId: string; technician_id?: string; priority?: string }; customer: { name: string; phone?: string; place?: string }; device: { brand: string; model: string; imei: string; color: string } }) => {
    setError(null);
    if (!data.service.name.trim() || !data.service.price || !shopId) {
      setError("Name, price, and shop are required.");
      return;
    }
    if (isShopAdmin && !data.service.branchId) {
      setError("Branch selection is required for shop admin.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "services"), {
        name: data.service.name,
        description: data.service.description,
        price: Number(data.service.price),
        shopId,
        branchId: data.service.branchId || "",
        technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
        priority: data.service.priority || "medium",
        customer: data.customer,
        device: data.device, // color included
        created_by: { role: user?.role || "", name: user?.name || "" },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "To Do",
      });
      router.push("/services");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => router.push("/services")} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Services
              </button>
        </div>

        {/* Form Container */}
        <ServiceForm onSubmit={handleAdd} loading={loading || branchesLoading || techniciansLoading} error={error} branches={branches} branchId={branchId} setBranchId={setBranchId} user={convertedUser} shopId={shopId} technicians={technicians} />
      </div>
    </div>
  );
}
