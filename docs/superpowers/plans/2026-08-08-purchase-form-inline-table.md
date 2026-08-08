# Purchase Form Inline Item Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the New/Edit Purchase form as a single page (per the approved mockup), but replace the item-entry popup (`PurchaseItemModal.tsx`) with an always-visible, inline-editable item table, and add a Subtotal/Discount/GST/Transport/Grand Total breakdown above the existing payment section.

**Architecture:** `PurchaseForm.tsx` keeps its current single-component shape (no wizard, no step state). Its items section becomes a new sibling component, `PurchaseFormItemsTable.tsx`, so the item-entry markup isn't inline in `PurchaseForm.tsx`'s JSX. Everything else — `PurchaseFormHost.tsx`, `AddSupplierModal.tsx`, `/purchases/new`, `/purchases?new=1` — is unchanged.

**Tech Stack:** Next.js App Router, React (client components), TypeScript, Tailwind CSS. No new dependencies.

## Global Constraints

- No changes to `PurchasePayload`'s wire shape, `/api/purchases` routes, or `computeTotals`/`purchaseTotals.ts`.
- Do not add HSN/Code, per-item discount, per-item tax %, or a "Payment Terms" dropdown — explicitly out of scope per the design spec's scope decision.
- Discount / GST / transport charge remain non-editable in the UI for new purchases (carried over unchanged from `initial` on edit) — do not add inputs for these, only display their computed values.
- Keep the existing "pay now" payment section (payment type, amount paid, live balance), positioned after the new Totals block — per the design spec's scope decision, this is NOT dropped even though the reference mockup's New Purchase card omits it.
- `PurchaseFormHost.tsx` must require zero changes.
- This codebase has no React component test harness (no `jsdom`/`@testing-library` in `vitest.config.ts` or `package.json`) — verification for UI tasks is `type-check` + `lint` + a manual click-through of the real app, not unit tests.

---

### Task 1: Inline item table component

**Files:**
- Create: `src/modules/purchase/PurchaseFormItemsTable.tsx`

**Interfaces:**
- Consumes: `Suggestions` type-imported from `./PurchaseForm` (already exported there); `formatRupees` from `@/lib/purchaseFormat`; `lineTotalOf` from `@/lib/purchaseTotals`.
- Produces: named export `ItemFormValues` (`{ key, name, brand, model, quantity, purchasePrice, sellingPrice, warrantyMonths, remarks, serviceId }`, all `string` except `key`) — this is the same shape `PurchaseItemModal.tsx` exported today, moved to its new home. Default export `PurchaseFormItemsTable(props: Props)` where `Props` is:
  ```typescript
  interface Props {
    rows: ItemFormValues[];
    suggestions: Suggestions;
    onAddRow: () => void;
    onUpdateRow: (key: string, patch: Partial<ItemFormValues>) => void;
    onRemoveRow: (key: string) => void;
  }
  ```
  Task 2 (the `PurchaseForm.tsx` rewrite) renders this with these exact prop names: `onAddRow` takes no arguments (it appends one blank row; `PurchaseForm.tsx` owns generating the blank row's fields), `onUpdateRow` patches one row by key, `onRemoveRow` removes one row by key.

Replaces `PurchaseItemModal.tsx` (deleted in Task 2). Instead of a popup per item: an "+ Add Item" button appends a blank row directly into an always-visible table; each row's Name/Qty/Purchase price are always-editable inline inputs; a per-row "More" toggle reveals Brand/Model/Selling price/Warranty/Remarks/Service ID. No quick-add bar, no popup — matches the reference mockup's "+ Add Item" pattern of appending directly to the table.

- [ ] **Step 1: Create the component**

```tsx
// src/modules/purchase/PurchaseFormItemsTable.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { lineTotalOf } from "@/lib/purchaseTotals";

import type { Suggestions } from "./PurchaseForm";

export interface ItemFormValues {
  key: string;
  name: string;
  brand: string;
  model: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  warrantyMonths: string;
  remarks: string;
  serviceId: string;
}

const smallInputClass =
  "h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  rows: ItemFormValues[];
  suggestions: Suggestions;
  onAddRow: () => void;
  onUpdateRow: (key: string, patch: Partial<ItemFormValues>) => void;
  onRemoveRow: (key: string) => void;
}

/** Inline, always-editable item table. "+ Add Item" appends a blank row — no modal. */
export default function PurchaseFormItemsTable({
  rows,
  suggestions,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: Props) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpanded = React.useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
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

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Items</h2>
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
        >
          + Add Item
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          No items added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isExpanded = expanded.has(row.key);
            return (
              <div key={row.key} className="rounded-xl border border-gray-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    list="purchase-item-names"
                    value={row.name}
                    onChange={(event) => onUpdateRow(row.key, { name: event.target.value })}
                    className={`${smallInputClass} min-w-[8rem] flex-1`}
                    placeholder="Item name"
                    autoFocus={row.name === ""}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(event) => onUpdateRow(row.key, { quantity: event.target.value })}
                    className={`${smallInputClass} w-16`}
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.purchasePrice}
                    onChange={(event) =>
                      onUpdateRow(row.key, { purchasePrice: event.target.value })
                    }
                    className={`${smallInputClass} w-24`}
                    placeholder="Price"
                  />
                  <span className="w-24 text-right text-sm font-medium text-gray-900">
                    {formatRupees(
                      lineTotalOf(Number(row.quantity) || 0, Number(row.purchasePrice) || 0)
                    )}
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(row.key)}
                      className="text-xs font-medium text-blue-600"
                    >
                      {isExpanded ? "Less" : "More"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.key)}
                      className="text-xs font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Brand</label>
                      <input
                        list="purchase-item-brands"
                        value={row.brand}
                        onChange={(event) => onUpdateRow(row.key, { brand: event.target.value })}
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Model</label>
                      <input
                        list="purchase-item-models"
                        value={row.model}
                        onChange={(event) => onUpdateRow(row.key, { model: event.target.value })}
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">
                        Selling price (optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.sellingPrice}
                        onChange={(event) =>
                          onUpdateRow(row.key, { sellingPrice: event.target.value })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">
                        Warranty (months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.warrantyMonths}
                        onChange={(event) =>
                          onUpdateRow(row.key, { warrantyMonths: event.target.value })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">
                        For service ID (optional)
                      </label>
                      <input
                        value={row.serviceId}
                        onChange={(event) =>
                          onUpdateRow(row.key, { serviceId: event.target.value })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">
                        Remarks (optional)
                      </label>
                      <input
                        value={row.remarks}
                        onChange={(event) => onUpdateRow(row.key, { remarks: event.target.value })}
                        className={smallInputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npx eslint src/modules/purchase/PurchaseFormItemsTable.tsx`
Expected: both pass. (`import type { Suggestions } from "./PurchaseForm"` is a type-only import — it does not create a runtime circular dependency, and `PurchaseForm.tsx` isn't modified until Task 2, so this file can only fail on its own syntax/types right now.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/PurchaseFormItemsTable.tsx
git commit -m "feat: add inline item table for purchase form"
```

---

### Task 2: Rewire PurchaseForm.tsx, add totals breakdown, retire the item modal

**Files:**
- Modify: `src/modules/purchase/PurchaseForm.tsx` (full rewrite of the component body)
- Delete: `src/modules/purchase/PurchaseItemModal.tsx`

**Interfaces:**
- Consumes: `PurchaseFormItemsTable` + `ItemFormValues` (Task 1); `AddSupplierModal` (existing, unchanged); `computeTotals` from `@/lib/purchaseTotals`.
- Produces: `PurchaseForm`'s default export, `Props` interface, `Suggestions`, and `PurchasePayload` are unchanged in shape from before this plan — `PurchaseFormHost.tsx`'s existing `import PurchaseForm, { type PurchasePayload, type Suggestions } from "@/modules/purchase/PurchaseForm";` keeps working unmodified, and every prop it already passes (`suppliers`, `suggestions`, `submitting`, `error`, `onSubmit`, `onSupplierCreated`, `branches`, `showBranchSelector`, `branchId`, `setBranchId`, `formId`, `hideSubmit`, `onCanSubmitChange`) still matches.

This is the task where behavior actually changes: the items section switches from a modal-triggering table to `PurchaseFormItemsTable`, a new Totals breakdown section appears (Subtotal / Discount / GST / Transport / Grand Total, all from the existing `computeTotals` result — no new computation), and `PurchaseItemModal.tsx` is fully retired (nothing else in the repo imports it — confirm with `grep -rn "PurchaseItemModal" src`, which should only return `PurchaseForm.tsx` and the modal file itself before this task starts).

- [ ] **Step 1: Replace the entire contents of `PurchaseForm.tsx`**

```tsx
// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Branch } from "@/types";
import type { Purchase, Supplier } from "@/types/purchase";

import AddSupplierModal from "./AddSupplierModal";
import PurchaseFormItemsTable, { type ItemFormValues } from "./PurchaseFormItemsTable";

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

function emptyItemRow(): ItemFormValues {
  return {
    key: `${Date.now()}-${Math.random()}`,
    name: "",
    brand: "",
    model: "",
    quantity: "1",
    purchasePrice: "",
    sellingPrice: "",
    warrantyMonths: "",
    remarks: "",
    serviceId: "",
  };
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

  const handleSupplierCreated = React.useCallback(
    (supplier: Supplier) => {
      setSupplierId(supplier.id);
      setSupplierModalOpen(false);
      onSupplierCreated(supplier);
    },
    [onSupplierCreated]
  );

  const addRow = React.useCallback(() => {
    setRows((current) => [...current, emptyItemRow()]);
  }, []);

  const updateRow = React.useCallback((key: string, patch: Partial<ItemFormValues>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = React.useCallback((key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
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

      <PurchaseFormItemsTable
        rows={rows}
        suggestions={suggestions}
        onAddRow={addRow}
        onUpdateRow={updateRow}
        onRemoveRow={removeRow}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Totals</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatRupees(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd>− {formatRupees(totals.discountAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST ({gstRate}%)</dt>
            <dd>{formatRupees(totals.gstAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Transport</dt>
            <dd>{formatRupees(totals.transportCharge)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <dt>Grand total</dt>
            <dd>{formatRupees(totals.grandTotal)}</dd>
          </div>
        </dl>
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

      <AddSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </form>
  );
});

export default PurchaseForm;
```

- [ ] **Step 2: Delete the retired item modal**

```bash
git rm src/modules/purchase/PurchaseItemModal.tsx
```

- [ ] **Step 3: Confirm nothing else references the deleted modal**

Run: `grep -rn "PurchaseItemModal" src`
Expected: no output (empty).

- [ ] **Step 4: Type-check and lint the whole purchase module**

Run: `npm run type-check && npx eslint src/modules/purchase`
Expected: both pass with no errors. Confirm `PurchaseFormHost.tsx` needed no edits:

Run: `git diff --stat src/modules/purchase/PurchaseFormHost.tsx`
Expected: no output (file untouched).

- [ ] **Step 5: Manual click-through**

Start the dev server if it isn't already running (`npm run dev`), then verify in a real browser (use browser automation tools if connected; otherwise ask the user to check manually before treating this task as done):

1. **New Purchase, mobile width** (`/purchases/new`): fill in supplier and date. Click "+ Add Item" — a blank row appears with the Name field auto-focused. Type a name, qty, price. Click "+ Add Item" again for a second row, expand "More" on it, set a brand and selling price, then remove the first row. Confirm the Totals section (Subtotal/Discount/GST/Transport/Grand total) updates live as prices/quantities change. Set a cash payment and an amount, confirm the balance updates, and save — confirm it redirects to the new purchase's details page.
2. **New Purchase, desktop width** (`/purchases?new=1`, slide-over): repeat the same flow, confirming the slide-over's external Save button stays disabled until at least one item row exists.
3. **Add supplier mid-form**: click "+ Add supplier", create a new supplier in the popup, confirm it closes and the new supplier is selected without losing anything else already entered (invoice number, date, items).
4. **Edit an existing purchase** (with no payments yet, so Edit isn't locked): confirm supplier, date, and all items pre-fill correctly, and the Totals section shows the right numbers.

- [ ] **Step 6: Commit**

```bash
git add src/modules/purchase/PurchaseForm.tsx
git commit -m "feat: rebuild purchase form items as an inline table, add totals breakdown, retire item modal"
```

---

### Task 3: Full repo verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full validation script**

Run: `npm run validate`
Expected: `type-check`, `lint`, and `build` all pass. (If `npm test` is also run, the pre-existing `purchaseSummary.test.ts` failures about `returnedQuantity` are unrelated to this change — confirm they're the only failures.)

- [ ] **Step 2: Confirm no stray references remain**

Run: `grep -rn "PurchaseItemModal" src`
Expected: no output.

- [ ] **Step 3: Report status to the user**

Summarize what changed (single-page form retained, inline item table replacing the popup, new Totals breakdown) and which manual checks from Task 2 Step 5 were actually run vs. need the user's own confirmation (e.g., if browser automation wasn't available in this session).
