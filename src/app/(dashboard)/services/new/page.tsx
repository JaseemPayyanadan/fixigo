"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import ServiceForm from "@/modules/service/ServiceForm";

export default function NewServicePage() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const isShopAdmin = user?.role === "shop_admin";
  const isBranchAdmin = user?.role === "branch_admin";
  const { branches } = useBranches(shopId);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (isBranchAdmin && user?.branch_id) {
      setBranchId(user.branch_id);
    }
  }, [isBranchAdmin, user?.branch_id]);

  const handleAdd = async (data: {
    customer: { name: string; phone: string; email: string };
    device: { type: string; brand: string; model: string; serial: string; color: string };
    service: { name: string; description: string; price: string; branch_id: string; technician_id?: string };
  }) => {
    setError(null);
    if (!data.service.name.trim() || !data.service.price || !shopId) {
      setError("Name, price, and shop are required.");
      return;
    }
    if (isShopAdmin && !data.service.branch_id) {
      setError("Branch selection is required for shop admin.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "services"), {
        name: data.service.name,
        description: data.service.description,
        price: Number(data.service.price),
        shop_id: shopId,
        branch_id: data.service.branch_id || "",
        technician_id: data.service.technician_id || "",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">Create New Service</h1>
              <p className="text-gray-600 text-sm">Add a new service request for your customer</p>
            </div>
            <button
              onClick={() => router.push("/services")}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Services
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                <span className="ml-2 text-sm font-medium text-gray-700">Customer Info</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                <span className="ml-2 text-sm font-medium text-gray-500">Device Details</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                <span className="ml-2 text-sm font-medium text-gray-500">Service Details</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <ServiceForm
            onSubmit={handleAdd}
            loading={loading}
            error={error}
            branches={branches}
            branchId={branchId}
            setBranchId={setBranchId}
            isShopAdmin={isShopAdmin}
            isBranchAdmin={isBranchAdmin}
            userBranchId={user?.branch_id}
            shopId={shopId}
          />
        </div>
      </div>
    </div>
  );
} 