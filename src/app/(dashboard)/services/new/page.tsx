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
    if (isBranchAdmin && user?.branchId) {
      setBranchId(user.branchId);
    }
      }, [isBranchAdmin, user?.branchId]);

  const handleAdd = async (data: {
    service: { name: string; description: string; price: string; branchId: string; technician_id?: string };
    customer: { name: string; phone?: string; place?: string };
    device: { brand: string; model: string; imei: string; color: string };
  }) => {
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
        shopId: shopId,
        branchId: data.service.branchId || "",
        technician_id: data.service.technician_id || (user?.role === "technician" ? user.id : ""),
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
            userBranchId={user?.branchId}
            shopId={shopId}
            user={user}
          />
        </div>
      </div>
    </div>
  );
} 