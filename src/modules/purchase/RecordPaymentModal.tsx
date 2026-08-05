// src/modules/purchase/RecordPaymentModal.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchase: Purchase;
  open: boolean;
  onClose: () => void;
  onRecorded: (purchase: Purchase) => void;
}

const RecordPaymentModal = React.memo(function RecordPaymentModal({
  purchase,
  open,
  onClose,
  onRecorded,
}: Props) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "upi" | "bank">("cash");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // Default to settling the bill in full — the common case.
      setAmount(String(purchase.balance));
      setError(null);
    }
  }, [open, purchase.balance]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/purchases/${purchase.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            method,
            paidAt: new Date().toISOString(),
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not record the payment");
        }

        const body = (await response.json()) as { purchase: Purchase };
        onRecorded(body.purchase);
        onClose();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [amount, method, reference, notes, purchase.id, onRecorded, onClose]
  );

  if (!open) return null;

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">Record payment</h2>
        <p className="mt-1 text-sm text-gray-500">{purchase.ref}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Balance due</p>
            <p className="font-semibold text-red-600">{formatRupees(purchase.balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total amount</p>
            <p className="font-semibold text-gray-900">{formatRupees(purchase.grandTotal)}</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Amount paid</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              max={purchase.balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Payment type</label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as "cash" | "upi" | "bank")}
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Reference (optional)</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Notes (optional)</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </div>
  );
});

export default RecordPaymentModal;
