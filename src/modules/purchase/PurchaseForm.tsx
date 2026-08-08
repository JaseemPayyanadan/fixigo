// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals, lineTotalOf } from "@/lib/purchaseTotals";
import type { Branch } from "@/types";
import type { Purchase, Supplier } from "@/types/purchase";

import AddSupplierModal from "./AddSupplierModal";
import PurchaseItemModal, { type ItemFormValues } from "./PurchaseItemModal";

export interface Suggestions {
  names: string[];
  brands: string[];
  models: string[];
}

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
  suggestions: Suggestions;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: PurchasePayload) => Promise<void>;
  onSupplierCreated: (supplier: Supplier) => void;
  initial?: Purchase | null;
  submitLabel?: string;
  /** Only shop_admin picks a branch; other roles are pinned to their own and this stays empty. */
  branches?: Branch[];
  showBranchSelector?: boolean;
  branchId?: string;
  setBranchId?: (id: string) => void;
  /** When set, an external footer can submit via `form={formId}`. */
  formId?: string;
  /** Hide the inline submit button (use a slide-over footer instead). */
  hideSubmit?: boolean;
  /** Lets a host footer enable/disable Save based on whether items exist. */
  onCanSubmitChange?: (canSubmit: boolean) => void;
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const PurchaseForm = React.memo(function PurchaseForm({
  suppliers,
  suggestions,
  submitting,
  error,
  onSubmit,
  onSupplierCreated,
  initial,
  submitLabel,
  branches = [],
  showBranchSelector = false,
  branchId = "",
  setBranchId,
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
  const [rows, setRows] = React.useState<ItemFormValues[]>(
    initial
      ? initial.items.map((item) => ({
          key: item.id,
          name: item.name,
          brand: item.brand ?? "",
          model: item.model ?? "",
          quantity: String(item.quantity),
          purchasePrice: String(item.purchasePrice),
          sellingPrice: item.sellingPrice === undefined ? "" : String(item.sellingPrice),
          warrantyMonths:
            item.warrantyMonths === undefined ? "" : String(item.warrantyMonths),
          remarks: item.remarks ?? "",
          serviceId: item.serviceId ?? "",
        }))
      : []
  );
  const [itemModalOpen, setItemModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ItemFormValues | null>(null);
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

  React.useEffect(() => {
    onCanSubmitChange?.(rows.length > 0);
  }, [rows.length, onCanSubmitChange]);

  // The SAME function the server uses, so the figure on screen is the figure
  // that gets persisted.
  const totals = React.useMemo(
    () =>
      computeTotals({
        items: rows.map((row) => ({
          quantity: Number(row.quantity) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
        })),
        discount,
        gstRate,
        transportCharge,
      }),
    [rows, discount, gstRate, transportCharge]
  );

  const isCredit = paymentType === "credit";
  const paid = isCredit ? 0 : Number(amountPaid) || 0;
  const balance = Math.max(totals.grandTotal - paid, 0);
  const openAddItem = React.useCallback(() => {
    setEditingItem(null);
    setItemModalOpen(true);
  }, []);

  const openEditItem = React.useCallback((row: ItemFormValues) => {
    setEditingItem(row);
    setItemModalOpen(true);
  }, []);

  const closeItemModal = React.useCallback(() => setItemModalOpen(false), []);

  const handleSupplierCreated = React.useCallback(
    (supplier: Supplier) => {
      setSupplierId(supplier.id);
      setSupplierModalOpen(false);
      onSupplierCreated(supplier);
    },
    [onSupplierCreated]
  );

  const saveItem = React.useCallback((values: ItemFormValues) => {
    setRows((current) => {
      const exists = current.some((row) => row.key === values.key);
      return exists
        ? current.map((row) => (row.key === values.key ? values : row))
        : [...current, values];
    });
    setItemModalOpen(false);
  }, []);

  const removeRow = React.useCallback((key: string) => {
    setRows((current) => current.filter((r) => r.key !== key));
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      await onSubmit({
        branchId: branchId || undefined,
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        purchaseDate: new Date(purchaseDate).toISOString(),
        items: rows.map((row) => ({
          name: row.name.trim(),
          brand: row.brand.trim() || undefined,
          model: row.model.trim() || undefined,
          quantity: Number(row.quantity),
          purchasePrice: Number(row.purchasePrice),
          sellingPrice: row.sellingPrice ? Number(row.sellingPrice) : undefined,
          warrantyMonths: row.warrantyMonths ? Number(row.warrantyMonths) : undefined,
          remarks: row.remarks.trim() || undefined,
          serviceId: row.serviceId.trim() || undefined,
        })),
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
      branchId,
      supplierId,
      supplierInvoiceNo,
      purchaseDate,
      rows,
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
      <datalist id="purchase-item-names">
        {suggestions.names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="purchase-item-brands">
        {suggestions.brands.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="purchase-item-models">
        {suggestions.models.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier details</h2>
        <div
          className={`grid gap-3 ${showBranchSelector ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
        >
          {showBranchSelector && (
            <div>
              <label className="mb-1 block text-xs text-gray-600">Branch</label>
              <select
                required
                value={branchId}
                onChange={(event) => setBranchId?.(event.target.value)}
                className={inputClass}
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(true)}
                className="h-11 shrink-0 rounded-xl border border-blue-200 px-3 text-sm font-medium text-blue-600"
              >
                + Add supplier
              </button>
            </div>
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Spare items</h2>
          <button
            type="button"
            onClick={openAddItem}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
          >
            + Add item
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No items added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 font-medium">Brand / model</th>
                  <th className="py-2 pr-2 font-medium">Qty</th>
                  <th className="py-2 pr-2 font-medium">Purchase price</th>
                  <th className="py-2 pr-2 font-medium">Total</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-2">{row.name}</td>
                    <td className="py-2 pr-2 text-gray-500">
                      {[row.brand, row.model].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="py-2 pr-2">{row.quantity}</td>
                    <td className="py-2 pr-2">{formatRupees(Number(row.purchasePrice) || 0)}</td>
                    <td className="py-2 pr-2">
                      {formatRupees(
                        lineTotalOf(Number(row.quantity) || 0, Number(row.purchasePrice) || 0)
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => openEditItem(row)}
                        className="mr-3 text-xs font-medium text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-xs font-medium text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
        <Button type="submit" size="lg" fullWidth disabled={submitting || rows.length === 0}>
          {submitting ? "Saving…" : submitLabel ?? "Save purchase"}
        </Button>
      )}

      <PurchaseItemModal
        open={itemModalOpen}
        initial={editingItem}
        onClose={closeItemModal}
        onSave={saveItem}
      />

      <AddSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </form>
  );
});

export default PurchaseForm;
