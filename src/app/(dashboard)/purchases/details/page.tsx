// src/app/(dashboard)/purchases/details/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import PurchaseDetails from "@/modules/purchase/PurchaseDetails";
import RecordPaymentModal from "@/modules/purchase/RecordPaymentModal";
import type { Purchase } from "@/types/purchase";

function revive(purchase: Purchase): Purchase {
  return {
    ...purchase,
    purchaseDate: new Date(purchase.purchaseDate),
    dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
    payments: purchase.payments.map((payment) => ({
      ...payment,
      paidAt: new Date(payment.paidAt),
      createdAt: new Date(payment.createdAt),
    })),
  };
}

function PurchaseDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [purchase, setPurchase] = React.useState<Purchase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setError("No purchase selected");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchases/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase");
        }
        const body = (await response.json()) as { purchase: Purchase };
        setPurchase(revive(body.purchase));
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  const handleCancel = React.useCallback(async () => {
    if (!purchase || cancelReason.trim() === "") return;

    setCancelError(null);

    const response = await fetch(`/api/purchases/${purchase.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setCancelError(body.error ?? "Could not cancel the purchase");
      return;
    }

    const body = (await response.json()) as { purchase: Purchase };
    setPurchase(revive(body.purchase));
    setCancelling(false);
    setCancelReason("");
    setCancelError(null);
  }, [purchase, cancelReason]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading purchase…</div>;
  }

  if (error || !purchase) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Purchase not found"}
        </div>
        <button onClick={() => router.push("/purchases")} className="mt-3 text-sm text-blue-600">
          Back to purchases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <button onClick={() => router.push("/purchases")} className="text-sm text-blue-600">
        ← Purchases
      </button>

      <PurchaseDetails
        purchase={purchase}
        onRecordPayment={() => setPaymentOpen(true)}
        onEdit={() => router.push(`/purchases/new?edit=${purchase.id}`)}
        onCancel={() => {
          setCancelling(true);
          setCancelError(null);
        }}
      />

      {cancelling && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <label className="mb-1 block text-sm font-medium text-red-800">
            Why are you cancelling this purchase?
          </label>
          <input
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="h-11 w-full rounded-xl border border-red-200 px-3 text-sm"
            placeholder="e.g. wrong supplier"
          />
          {cancelError && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-100 p-3 text-sm text-red-700">
              {cancelError}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setCancelling(false);
                setCancelError(null);
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              Keep purchase
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelReason.trim() === ""}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Confirm cancel
            </button>
          </div>
        </div>
      )}

      <RecordPaymentModal
        purchase={purchase}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onRecorded={(updated) => setPurchase(revive(updated))}
      />
    </div>
  );
}

export default function PurchaseDetailsPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <PurchaseDetailsContent />
    </Suspense>
  );
}
