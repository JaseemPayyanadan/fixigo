// src/app/(dashboard)/purchases/new/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import PurchaseForm, {
  type PurchasePayload,
  type Suggestions,
} from "@/modules/purchase/PurchaseForm";
import type { Purchase, Supplier } from "@/types/purchase";

function NewPurchaseContent() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const [initial, setInitial] = React.useState<Purchase | null>(null);
  const [loadingEdit, setLoadingEdit] = React.useState(Boolean(editId));
  const [editLoadError, setEditLoadError] = React.useState<string | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestions>({
    names: [],
    brands: [],
    models: [],
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editId) {
      setLoadingEdit(false);
      return;
    }

    setLoadingEdit(true);
    setEditLoadError(null);
    setInitial(null);

    const controller = new AbortController();

    async function loadExisting() {
      try {
        const response = await fetch(`/api/purchases/${editId}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase");
        }
        const body = (await response.json()) as { purchase: Purchase };
        setInitial({ ...body.purchase, purchaseDate: new Date(body.purchase.purchaseDate) });
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setEditLoadError((caught as Error).message);
        }
      } finally {
        setLoadingEdit(false);
      }
    }

    loadExisting();
    return () => controller.abort();
  }, [editId]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const [suppliersResponse, suggestionsResponse] = await Promise.allSettled([
        fetch("/api/suppliers", { signal: controller.signal }),
        fetch("/api/purchases/item-suggestions", { signal: controller.signal }),
      ]);

      if (suppliersResponse.status === "fulfilled" && suppliersResponse.value.ok) {
        const body = (await suppliersResponse.value.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }

      // Suggestions are a convenience, never a gate: a failure here leaves the
      // fields as plain free text.
      if (suggestionsResponse.status === "fulfilled" && suggestionsResponse.value.ok) {
        setSuggestions((await suggestionsResponse.value.json()) as Suggestions);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const handleSubmit = React.useCallback(
    async (payload: PurchasePayload) => {
      if (editId && !initial) return;

      setSubmitting(true);
      setError(null);

      try {
        let response = await fetch(editId ? `/api/purchases/${editId}` : "/api/purchases", {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // 409 on a duplicate supplier bill number is a warning the admin may
        // override, not a rejection.
        if (!editId && response.status === 409) {
          const body = (await response.json()) as { error: string };
          if (!window.confirm(`${body.error}\n\nRecord it anyway?`)) {
            setSubmitting(false);
            return;
          }
          response = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, confirmDuplicateInvoice: true }),
          });
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the purchase");
        }

        const body = (await response.json()) as { purchase: { id: string } };
        router.push(`/purchases/details?id=${body.purchase.id}`);
      } catch (caught) {
        setError((caught as Error).message);
        setSubmitting(false);
      }
    },
    [router, editId, initial]
  );

  if (loadingEdit) {
    return <div className="p-6 text-sm text-gray-500">Loading purchase…</div>;
  }

  if (editLoadError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {editLoadError}
        </div>
        <button
          onClick={() => router.push("/purchases")}
          className="mt-3 text-sm text-blue-600"
        >
          Back to purchases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New Purchase</h1>
        <p className="text-sm text-gray-500">Record a spare purchase and its payment</p>
      </div>

      <PurchaseForm
        key={initial?.id ?? "new"}
        initial={initial}
        submitLabel={editId ? "Update purchase" : "Save purchase"}
        suppliers={suppliers}
        suggestions={suggestions}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
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
