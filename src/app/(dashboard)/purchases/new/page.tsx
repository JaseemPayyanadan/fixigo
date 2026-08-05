// src/app/(dashboard)/purchases/new/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import PurchaseFormHost from "@/modules/purchase/PurchaseFormHost";

function NewPurchaseContent() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {editId ? "Edit Purchase" : "New Purchase"}
        </h1>
        <p className="text-sm text-gray-500">Record a spare purchase and its payment</p>
      </div>

      <PurchaseFormHost
        editId={editId}
        onSuccess={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
        onAddSupplier={() => router.push("/purchases/suppliers?new=1")}
      />
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <NewPurchaseContent />
    </Suspense>
  );
}
