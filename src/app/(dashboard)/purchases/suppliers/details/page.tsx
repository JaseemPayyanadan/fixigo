"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import SupplierForm, { type SupplierPayload } from "@/modules/purchase/SupplierForm";
import SupplierProfile from "@/modules/purchase/SupplierProfile";
import type { Purchase, Supplier } from "@/types/purchase";

function SupplierDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleUpdate = React.useCallback(
    async (payload: SupplierPayload) => {
      setSaving(true);
      setSaveError(null);
      try {
        const response = await fetch(`/api/suppliers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the supplier");
        }
        const body = (await response.json()) as { supplier: Supplier };
        setSupplier({
          ...body.supplier,
          lastPurchaseAt: body.supplier.lastPurchaseAt
            ? new Date(body.supplier.lastPurchaseAt)
            : undefined,
        });
        setEditing(false);
      } catch (caught) {
        setSaveError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  React.useEffect(() => {
    if (!id) {
      setError("No supplier selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSupplier(null);
    setPurchases([]);

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
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/purchases/suppliers")} className="text-sm text-blue-600">
          ← Suppliers
        </button>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <SupplierForm
          initial={supplier}
          saving={saving}
          error={saveError}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditing(false);
            setSaveError(null);
          }}
        />
      ) : (
        <SupplierProfile
          supplier={supplier}
          purchases={purchases}
          onOpenPurchase={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
        />
      )}
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
