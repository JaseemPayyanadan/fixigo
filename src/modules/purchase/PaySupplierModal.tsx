// src/modules/purchase/PaySupplierModal.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import type { Supplier, SupplierPayment } from "@/types/purchase";

interface Props {
  supplier: Supplier;
  /** When set, the modal edits this payment (PATCH) instead of recording a new one (POST). */
  payment?: SupplierPayment | null;
  open: boolean;
  onClose: () => void;
  onRecorded: (supplier: Supplier, payment: SupplierPayment) => void;
}

const PaySupplierModal = React.memo(function PaySupplierModal({
  supplier,
  payment,
  open,
  onClose,
  onRecorded,
}: Props) {
  const isEditing = Boolean(payment);
  // Editing a payment first "returns" its old amount to the outstanding pool,
  // so the field can go up to that plus whatever's still owed.
  const maxAmount = supplier.outstanding + (payment?.amount ?? 0);

  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "upi" | "bank">("cash");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (payment) {
        setAmount(String(payment.amount));
        setMethod(payment.method);
        setReference(payment.reference ?? "");
        setNotes(payment.notes ?? "");
      } else {
        // Default to clearing the whole balance — the common case.
        setAmount(String(supplier.outstanding));
        setMethod("cash");
        setReference("");
        setNotes("");
      }
      setError(null);
    }
  }, [open, payment, supplier.outstanding]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError(null);

      try {
        const url = payment
          ? `/api/suppliers/${supplier.id}/payments/${payment.id}`
          : `/api/suppliers/${supplier.id}/payments`;
        const response = await fetch(url, {
          method: payment ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            method,
            paidAt: payment ? payment.paidAt.toISOString() : new Date().toISOString(),
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the payment");
        }

        const body = (await response.json()) as {
          supplier: Supplier;
          payment: SupplierPayment;
        };
        onRecorded(body.supplier, body.payment);
        onClose();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [amount, method, reference, notes, payment, supplier.id, onRecorded, onClose]
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
        <h2 className="text-base font-semibold text-gray-900">
          {isEditing ? "Edit payment" : "Pay supplier"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{supplier.name}</p>

        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
          <p className="text-xs text-gray-500">Outstanding balance</p>
          <p className="font-semibold text-red-600">{formatRupees(supplier.outstanding)}</p>
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
              max={maxAmount}
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
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" fullWidth disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Save payment"}
          </Button>
        </div>
      </form>
    </div>
  );
});

export default PaySupplierModal;
