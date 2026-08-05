"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import SupplierProfile from "@/modules/purchase/SupplierProfile";
import type { Purchase, Supplier } from "@/types/purchase";

function SupplierDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) {
      setError("No supplier selected");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/suppliers/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the supplier");
        }
        const body = (await response.json()) as { supplier: Supplier; purchases: Purchase[] };
        setSupplier({
          ...body.supplier,
          lastPurchaseAt: body.supplier.lastPurchaseAt
            ? new Date(body.supplier.lastPurchaseAt)
            : undefined,
        });
        setPurchases(
          body.purchases.map((purchase) => ({
            ...purchase,
            purchaseDate: new Date(purchase.purchaseDate),
            dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
          }))
        );
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading supplier…</div>;

  if (error || !supplier) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Supplier not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <button onClick={() => router.push("/purchases/suppliers")} className="text-sm text-blue-600">
        ← Suppliers
      </button>
      <SupplierProfile
        supplier={supplier}
        purchases={purchases}
        onOpenPurchase={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
      />
    </div>
  );
}

export default function SupplierDetailsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <SupplierDetailsContent />
    </Suspense>
  );
}
