// src/modules/purchase/RecordReturnModal.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import { roundMoney } from "@/lib/purchaseTotals";
import type { Purchase } from "@/types/purchase";

interface Props {
  open: boolean;
  /** Light rows are enough — only ref/supplier/grandTotal/returnedAmount are used. */
  purchases: Purchase[];
  onClose: () => void;
  onRecorded: (purchase: Purchase) => void;
}

function remainingReturnable(purchase: Purchase): number {
  return roundMoney(purchase.grandTotal - purchase.returnedAmount);
}

const RecordReturnModal = React.memo(function RecordReturnModal({
  open,
  purchases,
  onClose,
  onRecorded,
}: Props) {
  const [selected, setSelected] = React.useState<Purchase | null>(null);
  const [search, setSearch] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const eligible = React.useMemo(
    () =>
      purchases.filter(
        (purchase) => purchase.status === "active" && remainingReturnable(purchase) > 0
      ),
    [purchases]
  );

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return eligible;
    return eligible.filter((purchase) =>
      `${purchase.ref} ${purchase.supplierName}`.toLowerCase().includes(term)
    );
  }, [eligible, search]);

  const reset = React.useCallback(() => {
    setSelected(null);
    setSearch("");
    setAmount("");
    setReason("");
    setError(null);
  }, []);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  React.useEffect(() => {
    if (selected) setAmount(String(remainingReturnable(selected)));
  }, [selected]);

  const handleClose = React.useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!selected) return;

      setSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/purchases/${selected.id}/returns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Number(amount), reason: reason.trim() }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not record the return");
        }

        const body = (await response.json()) as { purchase: Purchase };
        onRecorded(body.purchase);
        handleClose();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [selected, amount, reason, onRecorded, handleClose]
  );

  if (!open) return null;

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        {!selected ? (
          <>
            <h2 className="text-base font-semibold text-gray-900">Select a bill to return</h2>
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference or supplier…"
              className={`mt-3 ${inputClass}`}
            />
            <div className="mt-3 max-h-80 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No bills available to return against.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {visible.map((purchase) => (
                    <li key={purchase.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(purchase)}
                        className="flex w-full items-center justify-between gap-2 py-3 text-left text-sm hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{purchase.ref}</p>
                          <p className="truncate text-xs text-gray-500">{purchase.supplierName}</p>
                        </div>
                        <span className="shrink-0 text-xs text-gray-500">
                          {formatRupees(remainingReturnable(purchase))} left
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4">
              <Button type="button" variant="secondary" size="lg" fullWidth onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-base font-semibold text-gray-900">Record return</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selected.ref} · {selected.supplierName}
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
              <p className="text-xs text-gray-500">Available to return</p>
              <p className="font-semibold text-gray-900">
                {formatRupees(remainingReturnable(selected))}
              </p>
            </div>

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
                  max={remainingReturnable(selected)}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={inputClass}
                />
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
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setSelected(null)}
              >
                Back
              </Button>
              <Button type="submit" size="lg" fullWidth disabled={saving}>
                {saving ? "Saving…" : "Save return"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});

export default RecordReturnModal;
