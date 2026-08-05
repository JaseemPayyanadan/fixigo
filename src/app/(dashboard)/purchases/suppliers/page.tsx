"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import SupplierForm, { type SupplierPayload } from "@/modules/purchase/SupplierForm";
import SupplierList from "@/modules/purchase/SupplierList";
import type { Supplier } from "@/types/purchase";

function SuppliersContent() {
  const router = useRouter();
  // The Add Purchase form's "+ Add" button links here with ?new=1.
  const openNew = useSearchParams().get("new") === "1";

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [creating, setCreating] = React.useState(openNew);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const response = await fetch("/api/suppliers");
    if (response.ok) {
      const body = (await response.json()) as { suppliers: Supplier[] };
      setSuppliers(
        body.suppliers.map((supplier) => ({
          ...supplier,
          lastPurchaseAt: supplier.lastPurchaseAt ? new Date(supplier.lastPurchaseAt) : undefined,
        }))
      );
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = React.useCallback(
    async (payload: SupplierPayload) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the supplier");
        }
        setCreating(false);
        await load();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/purchases")} className="text-sm text-blue-600">
            ← Purchases
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add Supplier
          </button>
        )}
      </div>

      {creating && (
        <SupplierForm
          initial={null}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading suppliers…</p>
      ) : (
        <SupplierList
          suppliers={suppliers}
          onOpen={(id) => router.push(`/purchases/suppliers/details?id=${id}`)}
        />
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <SuppliersContent />
    </Suspense>
  );
}
