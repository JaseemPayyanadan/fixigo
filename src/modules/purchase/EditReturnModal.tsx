// src/modules/purchase/EditReturnModal.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import { roundMoney } from "@/lib/purchaseTotals";
import type { Purchase, PurchaseReturn } from "@/types/purchase";

interface Props {
  open: boolean;
  purchase: Purchase | null;
  purchaseReturn: PurchaseReturn | null;
  onClose: () => void;
  onSaved: (purchase: Purchase) => void;
}

const EditReturnModal = React.memo(function EditReturnModal({
  open,
  purchase,
  purchaseReturn,
  onClose,
  onSaved,
}: Props) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && purchaseReturn) {
      setAmount(String(purchaseReturn.totalAmount));
      setReason(purchaseReturn.reason ?? "");
      setError(null);
    }
  }, [open, purchaseReturn]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!purchase || !purchaseReturn) return;

      setSaving(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/purchases/${purchase.id}/returns/${purchaseReturn.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Number(amount), reason: reason.trim() }),
          }
        );

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the return");
        }

        const body = (await response.json()) as { purchase: Purchase };
        onSaved(body.purchase);
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [purchase, purchaseReturn, amount, reason, onSaved]
  );

  if (!open || !purchase || !purchaseReturn) return null;

  // Editing a return first "un-returns" its old amount, so the field can go
  // up to that plus whatever's still left on the bill.
  const otherReturned = roundMoney(purchase.returnedAmount - purchaseReturn.totalAmount);
  const maxAmount = roundMoney(purchase.grandTotal - otherReturned);

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">Edit return</h2>
        <p className="mt-1 text-sm text-gray-500">
          {purchase.ref} · {purchase.supplierName}
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Return amount</label>
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
            <p className="mt-1 text-xs text-gray-400">Up to {formatRupees(maxAmount)}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Reason / note (optional)</label>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. damaged part returned to supplier"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" fullWidth disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
});

export default EditReturnModal;
