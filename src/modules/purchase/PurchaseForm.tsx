// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Branch } from "@/types";
import type { Purchase, Supplier } from "@/types/purchase";

import AddSupplierModal from "./AddSupplierModal";

export interface PurchasePayload {
  branchId?: string;
  supplierId: string;
  supplierInvoiceNo?: string;
  purchaseDate: string;
  items: Array<Record<string, unknown>>;
  discount: { mode: "amount" | "percent"; value: number };
  gstRate: number;
  transportCharge: number;
  dueDate?: string;
  initialPayment?: { amount: number; method: string; paidAt: string; reference?: string };
  confirmDuplicateInvoice?: boolean;
}

interface Props {
  suppliers: Supplier[];
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: PurchasePayload) => Promise<void>;
  onSupplierCreated: (supplier: Supplier) => void;
  initial?: Purchase | null;
  submitLabel?: string;
  /** For labelling supplier options with their branch, and for the "+ Add supplier" flow. */
  branches?: Branch[];
  /** Only shop_admin picks a branch when adding a brand-new supplier; other roles are pinned to their own. */
  showBranchSelector?: boolean;
  /** branch_admin's fixed branch, used to pin a newly-added supplier; empty for shop_admin. */
  defaultBranchId?: string;
  /** When set, an external footer can submit via `form={formId}`. */
  formId?: string;
  /** Hide the inline submit button (use a slide-over footer instead). */
  hideSubmit?: boolean;
  /** Lets a host footer enable/disable Save based on whether an amount was entered. */
  onCanSubmitChange?: (canSubmit: boolean) => void;
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Suppliers are branch-owned; labelling each option disambiguates same-named suppliers across branches. */
function branchNameFor(branches: Branch[], branchId: string): string {
  return branches.find((branch) => branch.id === branchId)?.name ?? "";
}

const PurchaseForm = React.memo(function PurchaseForm({
  suppliers,
  submitting,
  error,
  onSubmit,
  onSupplierCreated,
  initial,
  submitLabel,
  branches = [],
  showBranchSelector = false,
  defaultBranchId = "",
  formId,
  hideSubmit = false,
  onCanSubmitChange,
}: Props) {
  const [supplierId, setSupplierId] = React.useState(initial?.supplierId ?? "");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = React.useState(
    initial?.supplierInvoiceNo ?? ""
  );
  const [purchaseDate, setPurchaseDate] = React.useState(
    initial ? new Date(initial.purchaseDate).toISOString().slice(0, 10) : todayIso()
  );
  // A purchase is just a total the shop paid a supplier — no per-item breakdown.
  // Editing an older, itemized purchase prefills this with that purchase's subtotal.
  const [amount, setAmount] = React.useState(
    initial ? String(initial.subtotal) : ""
  );
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [paymentType, setPaymentType] = React.useState<"cash" | "upi" | "bank" | "credit">("cash");
  const [amountPaid, setAmountPaid] = React.useState("");

  // This form has no inputs for these, so when editing, keep the purchase's
  // existing values instead of silently zeroing them out on save.
  const discount = React.useMemo<{ mode: "amount" | "percent"; value: number }>(
    () => ({ mode: initial?.discount.mode ?? "amount", value: initial?.discount.value ?? 0 }),
    [initial]
  );
  const gstRate = initial?.gstRate ?? 0;
  const transportCharge = initial?.transportCharge ?? 0;

  const parsedAmount = Number(amount) || 0;

  React.useEffect(() => {
    onCanSubmitChange?.(parsedAmount > 0);
  }, [parsedAmount, onCanSubmitChange]);

  // The SAME function the server uses, so the figure on screen is the figure
  // that gets persisted. The amount stands in for a single line item.
  const totals = React.useMemo(
    () =>
      computeTotals({
        items: [{ quantity: 1, purchasePrice: parsedAmount }],
        discount,
        gstRate,
        transportCharge,
      }),
    [parsedAmount, discount, gstRate, transportCharge]
  );

  const isCredit = paymentType === "credit";
  const paid = isCredit ? 0 : Number(amountPaid) || 0;
  const balance = Math.max(totals.grandTotal - paid, 0);

  const handleSupplierCreated = React.useCallback(
    (supplier: Supplier) => {
      setSupplierId(supplier.id);
      setSupplierModalOpen(false);
      onSupplierCreated(supplier);
    },
    [onSupplierCreated]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      // A purchase's branch follows its supplier's branch — there is no
      // separate branch choice for the purchase itself.
      const branchId = suppliers.find((supplier) => supplier.id === supplierId)?.branchId;

      await onSubmit({
        branchId: branchId || undefined,
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        purchaseDate: new Date(purchaseDate).toISOString(),
        items: [
          {
            name: "Purchase amount",
            quantity: 1,
            purchasePrice: parsedAmount,
          },
        ],
        discount,
        gstRate,
        transportCharge,
        initialPayment:
          isCredit || paid <= 0
            ? undefined
            : {
                amount: paid,
                method: paymentType,
                paidAt: new Date().toISOString(),
              },
      });
    },
    [
      onSubmit,
      suppliers,
      supplierId,
      supplierInvoiceNo,
      purchaseDate,
      parsedAmount,
      discount,
      gstRate,
      transportCharge,
      isCredit,
      paid,
      paymentType,
    ]
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier details</h2>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Supplier</label>
          <div className="flex gap-2">
            <select
              required
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className={inputClass}
            >
              <option value="">Select supplier</option>
              {suppliers
                .filter((supplier) => supplier.status === "active" || supplier.id === supplierId)
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                    {branchNameFor(branches, supplier.branchId)
                      ? ` (${branchNameFor(branches, supplier.branchId)})`
                      : ""}
                  </option>
                ))}
            </select>
            <Button type="button" variant="secondary" onClick={() => setSupplierModalOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Add supplier
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Invoice / bill no. (optional)</label>
            <input
              value={supplierInvoiceNo}
              onChange={(event) => setSupplierInvoiceNo(event.target.value)}
              className={inputClass}
              placeholder="As per bill"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Purchase date</label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Purchase amount</h2>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Amount (₹)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
          <span>Grand total</span>
          <span>{formatRupees(totals.grandTotal)}</span>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment details</h2>
        <div className="space-y-3">
          <div className={`grid gap-3 ${isCredit ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Payment type</label>
              <select
                value={paymentType}
                onChange={(event) =>
                  setPaymentType(event.target.value as "cash" | "upi" | "bank" | "credit")
                }
                className={inputClass}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
                <option value="credit">Credit (pay later)</option>
              </select>
            </div>

            {!isCredit && (
              <div>
                <label className="mb-1 block text-xs text-gray-600">Amount paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={totals.grandTotal}
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
            <span className="text-gray-600">Balance after payment</span>
            <span className="font-semibold text-blue-600">{formatRupees(balance)}</span>
          </div>
        </div>
      </section>

      {!hideSubmit && (
        <Button type="submit" size="lg" fullWidth disabled={submitting || parsedAmount <= 0}>
          {submitting ? "Saving…" : submitLabel ?? "Save purchase"}
        </Button>
      )}

      <AddSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
        branches={branches}
        showBranchSelector={showBranchSelector}
        defaultBranchId={defaultBranchId}
        suggestions={suppliers}
      />
    </form>
  );
});

export default PurchaseForm;
