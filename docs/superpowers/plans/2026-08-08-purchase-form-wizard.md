# Purchase Form Step Wizard Implementation Plan

> **Superseded** by [2026-08-08-purchase-form-inline-table.md](2026-08-08-purchase-form-inline-table.md).
> Not executed — no tasks were dispatched against this plan. Kept for history.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single long-scroll New/Edit Purchase form with a 3-step wizard (Supplier & Details → Items → Payment & Review) and replace the item-entry popup with inline, no-modal item rows.

**Architecture:** `PurchaseForm.tsx` becomes a thin wizard shell that owns all form state (unchanged from today) plus a `step: 1 | 2 | 3` index, and renders one of three new step components per step. `PurchaseFormHost.tsx`, the `/api/purchases` payload shape, and both page-level consumers (`/purchases/new` full page, `/purchases?new=1` desktop slide-over) are untouched — this is a pure UI/flow restructure.

**Tech Stack:** Next.js App Router, React (client components), TypeScript, Tailwind CSS. No new dependencies.

## Global Constraints

- No changes to `PurchasePayload`'s wire shape, `/api/purchases` routes, or `computeTotals`/`purchaseTotals.ts` — verified against the spec's "Out of scope" section.
- Discount / GST / transport charge remain non-editable in the UI for new purchases (carried over unchanged from `initial` on edit) — do not add inputs for these.
- `PurchaseFormHost.tsx` must require zero changes — its props to `PurchaseForm` already match the wizard's `Props` interface.
- This codebase has no React component test harness (no `jsdom`/`@testing-library` in `vitest.config.ts` or `package.json`) — verification for UI tasks is `type-check` + `lint` + a manual click-through of the real app, not unit tests. Do not attempt to add RTL-style tests.

---

### Task 1: Shared purchase-form types

**Files:**
- Create: `src/modules/purchase/purchaseFormTypes.ts`

**Interfaces:**
- Produces: `Suggestions` (`{ names: string[]; brands: string[]; models: string[] }`), `ItemFormValues` (`{ key, name, brand, model, quantity, purchasePrice, sellingPrice, warrantyMonths, remarks, serviceId }`, all `string`), `PurchasePayload` (same shape as today's `PurchaseForm.tsx` export) — every later task imports these from this file.

Today these three types are split between `PurchaseForm.tsx` (`Suggestions`, `PurchasePayload`) and `PurchaseItemModal.tsx` (`ItemFormValues`, defined there as `export interface ItemFormValues`). Centralizing them lets the new step components and the wizard shell share one definition without importing from each other.

- [ ] **Step 1: Create the shared types file**

```typescript
// src/modules/purchase/purchaseFormTypes.ts

export interface Suggestions {
  names: string[];
  brands: string[];
  models: string[];
}

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
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes with no new errors (this file isn't imported by anything yet, so it can only add errors if it doesn't compile on its own).

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/purchaseFormTypes.ts
git commit -m "refactor: extract shared purchase-form types"
```

---

### Task 2: Supplier & Details step component

**Files:**
- Create: `src/modules/purchase/PurchaseFormSupplierStep.tsx`

**Interfaces:**
- Consumes: `Supplier` from `@/types/purchase`, `Branch` from `@/types` (existing types, unchanged).
- Produces: default export `PurchaseFormSupplierStep(props: Props)` where `Props` is:
  ```typescript
  interface Props {
    suppliers: Supplier[];
    branches: Branch[];
    showBranchSelector: boolean;
    branchId: string;
    setBranchId: (id: string) => void;
    supplierId: string;
    setSupplierId: (id: string) => void;
    onAddSupplier: () => void;
    supplierInvoiceNo: string;
    setSupplierInvoiceNo: (value: string) => void;
    purchaseDate: string;
    setPurchaseDate: (value: string) => void;
  }
  ```
  Task 5 (the wizard shell) renders this component with these exact prop names.

This is a direct extraction of the "Supplier details" `<section>` currently in `PurchaseForm.tsx` (today's lines 252–324) into its own presentational component — same markup, same behavior, now driven entirely by props instead of local state.

- [ ] **Step 1: Create the component**

```tsx
// src/modules/purchase/PurchaseFormSupplierStep.tsx
"use client";

import React from "react";

import type { Branch } from "@/types";
import type { Supplier } from "@/types/purchase";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  suppliers: Supplier[];
  branches: Branch[];
  showBranchSelector: boolean;
  branchId: string;
  setBranchId: (id: string) => void;
  supplierId: string;
  setSupplierId: (id: string) => void;
  onAddSupplier: () => void;
  supplierInvoiceNo: string;
  setSupplierInvoiceNo: (value: string) => void;
  purchaseDate: string;
  setPurchaseDate: (value: string) => void;
}

/** Wizard step 1: who the purchase is from and when it happened. */
export default function PurchaseFormSupplierStep({
  suppliers,
  branches,
  showBranchSelector,
  branchId,
  setBranchId,
  supplierId,
  setSupplierId,
  onAddSupplier,
  supplierInvoiceNo,
  setSupplierInvoiceNo,
  purchaseDate,
  setPurchaseDate,
}: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier details</h2>
      <div className={`grid gap-3 ${showBranchSelector ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        {showBranchSelector && (
          <div>
            <label className="mb-1 block text-xs text-gray-600">Branch</label>
            <select
              required
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
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
              onClick={onAddSupplier}
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
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npx eslint src/modules/purchase/PurchaseFormSupplierStep.tsx`
Expected: both pass. This file has no importers yet, so it can only fail on its own syntax/types.

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/PurchaseFormSupplierStep.tsx
git commit -m "refactor: extract purchase form supplier step component"
```

---

### Task 3: Items step component (inline, no modal)

**Files:**
- Create: `src/modules/purchase/PurchaseFormItemsStep.tsx`

**Interfaces:**
- Consumes: `ItemFormValues`, `Suggestions` from `./purchaseFormTypes` (Task 1); `formatRupees` from `@/lib/purchaseFormat`; `lineTotalOf` from `@/lib/purchaseTotals`.
- Produces: default export `PurchaseFormItemsStep(props: Props)` where `Props` is:
  ```typescript
  interface Props {
    rows: ItemFormValues[];
    suggestions: Suggestions;
    grandTotal: number;
    onAddRow: (row: ItemFormValues) => void;
    onUpdateRow: (key: string, patch: Partial<ItemFormValues>) => void;
    onRemoveRow: (key: string) => void;
  }
  ```
  Task 5 renders this with these exact prop names and supplies `onAddRow`/`onUpdateRow`/`onRemoveRow` as callbacks that mutate its own `rows` state.

This replaces `PurchaseItemModal.tsx` (deleted in Task 5). Instead of a popup per item: a quick-add bar (Item / Qty / Price / Add button, Enter-to-add) appends directly to a list; each row's Name/Qty/Price are always-editable inline inputs; a per-row "More" toggle reveals Brand/Model/Selling price/Warranty/Remarks/Service ID.

- [ ] **Step 1: Create the component**

```tsx
// src/modules/purchase/PurchaseFormItemsStep.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { lineTotalOf } from "@/lib/purchaseTotals";

import type { ItemFormValues, Suggestions } from "./purchaseFormTypes";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const smallInputClass =
  "h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  rows: ItemFormValues[];
  suggestions: Suggestions;
  grandTotal: number;
  onAddRow: (row: ItemFormValues) => void;
  onUpdateRow: (key: string, patch: Partial<ItemFormValues>) => void;
  onRemoveRow: (key: string) => void;
}

function emptyKey(): string {
  return `${Date.now()}-${Math.random()}`;
}

/** Wizard step 2: a quick-add bar plus an always-editable item list — no modal. */
export default function PurchaseFormItemsStep({
  rows,
  suggestions,
  grandTotal,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: Props) {
  const [quickName, setQuickName] = React.useState("");
  const [quickQuantity, setQuickQuantity] = React.useState("1");
  const [quickPrice, setQuickPrice] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const canAdd = quickName.trim() !== "" && Number(quickQuantity) > 0 && quickPrice !== "";

  const handleAdd = React.useCallback(() => {
    if (!canAdd) return;
    onAddRow({
      key: emptyKey(),
      name: quickName.trim(),
      brand: "",
      model: "",
      quantity: quickQuantity,
      purchasePrice: quickPrice,
      sellingPrice: "",
      warrantyMonths: "",
      remarks: "",
      serviceId: "",
    });
    setQuickName("");
    setQuickQuantity("1");
    setQuickPrice("");
  }, [canAdd, onAddRow, quickName, quickQuantity, quickPrice]);

  const handleQuickKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

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

      <h2 className="mb-3 text-sm font-semibold text-gray-900">Spare items</h2>

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-xs text-gray-600">Item</label>
          <input
            list="purchase-item-names"
            value={quickName}
            onChange={(event) => setQuickName(event.target.value)}
            onKeyDown={handleQuickKeyDown}
            placeholder="Item name"
            className={inputClass}
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs text-gray-600">Qty</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quickQuantity}
            onChange={(event) => setQuickQuantity(event.target.value)}
            onKeyDown={handleQuickKeyDown}
            className={inputClass}
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs text-gray-600">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={quickPrice}
            onChange={(event) => setQuickPrice(event.target.value)}
            onKeyDown={handleQuickKeyDown}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          No items added yet.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => {
            const isExpanded = expanded.has(row.key);
            return (
              <div key={row.key} className="rounded-xl border border-gray-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    list="purchase-item-names"
                    value={row.name}
                    onChange={(event) => onUpdateRow(row.key, { name: event.target.value })}
                    className={`${smallInputClass} min-w-[120px] flex-1`}
                    placeholder="Item name"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(event) => onUpdateRow(row.key, { quantity: event.target.value })}
                    className={`${smallInputClass} w-16`}
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

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
        <span>Grand total</span>
        <span>{formatRupees(grandTotal)}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npx eslint src/modules/purchase/PurchaseFormItemsStep.tsx`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/PurchaseFormItemsStep.tsx
git commit -m "feat: add inline item-entry step for purchase wizard"
```

---

### Task 4: Payment & Review step component

**Files:**
- Create: `src/modules/purchase/PurchaseFormPaymentStep.tsx`

**Interfaces:**
- Consumes: `ItemFormValues` from `./purchaseFormTypes`; `PurchaseTotals` from `@/lib/purchaseTotals`; `formatRupees` from `@/lib/purchaseFormat`; `lineTotalOf` from `@/lib/purchaseTotals`.
- Produces: default export `PurchaseFormPaymentStep(props: Props)` and named export `PaymentType = "cash" | "upi" | "bank" | "credit"`, where `Props` is:
  ```typescript
  interface Props {
    supplierName: string;
    rows: ItemFormValues[];
    totals: PurchaseTotals;
    paymentType: PaymentType;
    setPaymentType: (value: PaymentType) => void;
    amountPaid: string;
    setAmountPaid: (value: string) => void;
    isCredit: boolean;
    balance: number;
  }
  ```
  Task 5 imports `PaymentType` from this file (replacing the inline union type it used to declare itself) and renders this component with these exact prop names.

- [ ] **Step 1: Create the component**

```tsx
// src/modules/purchase/PurchaseFormPaymentStep.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { lineTotalOf, type PurchaseTotals } from "@/lib/purchaseTotals";

import type { ItemFormValues } from "./purchaseFormTypes";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export type PaymentType = "cash" | "upi" | "bank" | "credit";

interface Props {
  supplierName: string;
  rows: ItemFormValues[];
  totals: PurchaseTotals;
  paymentType: PaymentType;
  setPaymentType: (value: PaymentType) => void;
  amountPaid: string;
  setAmountPaid: (value: string) => void;
  isCredit: boolean;
  balance: number;
}

/** Wizard step 3: read-only recap of the purchase, then payment. */
export default function PurchaseFormPaymentStep({
  supplierName,
  rows,
  totals,
  paymentType,
  setPaymentType,
  amountPaid,
  setAmountPaid,
  isCredit,
  balance,
}: Props) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Review</h2>
        <p className="text-sm text-gray-600">
          Supplier: <span className="font-medium text-gray-900">{supplierName || "—"}</span>
        </p>
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between py-2">
              <span className="text-gray-700">
                {row.name} × {row.quantity}
              </span>
              <span className="font-medium text-gray-900">
                {formatRupees(
                  lineTotalOf(Number(row.quantity) || 0, Number(row.purchasePrice) || 0)
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
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
                onChange={(event) => setPaymentType(event.target.value as PaymentType)}
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
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npx eslint src/modules/purchase/PurchaseFormPaymentStep.tsx`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/PurchaseFormPaymentStep.tsx
git commit -m "feat: add payment/review step for purchase wizard"
```

---

### Task 5: Wizard shell — rewire PurchaseForm.tsx, retire the item modal

**Files:**
- Modify: `src/modules/purchase/PurchaseForm.tsx` (full rewrite of the component body)
- Create: `src/modules/purchase/PurchaseFormStepper.tsx` (step indicator, small enough to fold into this task)
- Delete: `src/modules/purchase/PurchaseItemModal.tsx`

**Interfaces:**
- Consumes: `PurchaseFormSupplierStep` (Task 2), `PurchaseFormItemsStep` (Task 3), `PurchaseFormPaymentStep` + `PaymentType` (Task 4), `Suggestions`/`ItemFormValues`/`PurchasePayload` (Task 1), `AddSupplierModal` (existing, unchanged).
- Produces: `PurchaseForm`'s default export and `Props` interface are unchanged in shape from before this plan (same prop names/types `PurchaseFormHost.tsx` already passes), plus re-exports `Suggestions`, `PurchasePayload`, `ItemFormValues` from `./purchaseFormTypes` so `PurchaseFormHost.tsx`'s existing `import PurchaseForm, { type PurchasePayload, type Suggestions } from "@/modules/purchase/PurchaseForm";` keeps working unmodified.

This is the task where the actual behavior changes: `PurchaseForm` stops rendering one long scroll and starts rendering the wizard, with `PurchaseItemModal.tsx` fully retired (nothing else in the repo imports it — confirmed by `grep -rn "PurchaseItemModal" src` returning only `PurchaseForm.tsx` and the modal file itself).

- [ ] **Step 1: Create the step indicator**

```tsx
// src/modules/purchase/PurchaseFormStepper.tsx
"use client";

import React from "react";

const STEPS: Array<{ step: 1 | 2 | 3; label: string }> = [
  { step: 1, label: "Supplier" },
  { step: 2, label: "Items" },
  { step: 3, label: "Payment" },
];

interface Props {
  step: 1 | 2 | 3;
}

/** Progress indicator for the purchase wizard: "1 Supplier · 2 Items · 3 Payment". */
export default function PurchaseFormStepper({ step }: Props) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map(({ step: stepNumber, label }, index) => (
        <React.Fragment key={stepNumber}>
          {index > 0 && <span className="text-gray-300">·</span>}
          <li
            className={
              stepNumber === step
                ? "font-semibold text-blue-600"
                : stepNumber < step
                  ? "text-gray-500"
                  : "text-gray-300"
            }
          >
            {stepNumber} {label}
          </li>
        </React.Fragment>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Replace the entire contents of `PurchaseForm.tsx`**

```tsx
// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Branch } from "@/types";
import type { Purchase, Supplier } from "@/types/purchase";

import AddSupplierModal from "./AddSupplierModal";
import PurchaseFormItemsStep from "./PurchaseFormItemsStep";
import PurchaseFormPaymentStep, { type PaymentType } from "./PurchaseFormPaymentStep";
import PurchaseFormStepper from "./PurchaseFormStepper";
import PurchaseFormSupplierStep from "./PurchaseFormSupplierStep";
import type { ItemFormValues, PurchasePayload, Suggestions } from "./purchaseFormTypes";

export type { ItemFormValues, PurchasePayload, Suggestions };

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
  /** Hide the inline Save button (an external footer submits instead); Back/Next stay inline either way. */
  hideSubmit?: boolean;
  /** Lets a host footer enable/disable Save: true only on the review step once items exist. */
  onCanSubmitChange?: (canSubmit: boolean) => void;
}

type WizardStep = 1 | 2 | 3;

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

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
  const [step, setStep] = React.useState<WizardStep>(1);
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
  const [paymentType, setPaymentType] = React.useState<PaymentType>("cash");
  const [amountPaid, setAmountPaid] = React.useState("");

  // This form has no inputs for these, so when editing, keep the purchase's
  // existing values instead of silently zeroing them out on save.
  const discount = React.useMemo<{ mode: "amount" | "percent"; value: number }>(
    () => ({ mode: initial?.discount.mode ?? "amount", value: initial?.discount.value ?? 0 }),
    [initial]
  );
  const gstRate = initial?.gstRate ?? 0;
  const transportCharge = initial?.transportCharge ?? 0;

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

  const canGoToItems = supplierId !== "" && purchaseDate !== "";
  const canGoToPayment = rows.length > 0;
  const canSubmit = step === 3 && rows.length > 0;

  React.useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  const handleSupplierCreated = React.useCallback(
    (supplier: Supplier) => {
      setSupplierId(supplier.id);
      setSupplierModalOpen(false);
      onSupplierCreated(supplier);
    },
    [onSupplierCreated]
  );

  const addRow = React.useCallback((row: ItemFormValues) => {
    setRows((current) => [...current, row]);
  }, []);

  const updateRow = React.useCallback((key: string, patch: Partial<ItemFormValues>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = React.useCallback((key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  }, []);

  const supplierName = React.useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "",
    [suppliers, supplierId]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      // Enter inside a text input on step 1/2 can implicitly submit the form
      // even with no visible Save button — guard so that's a no-op there.
      if (!canSubmit) return;

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
      canSubmit,
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
      <PurchaseFormStepper step={step} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <PurchaseFormSupplierStep
          suppliers={suppliers}
          branches={branches}
          showBranchSelector={showBranchSelector}
          branchId={branchId}
          setBranchId={(id) => setBranchId?.(id)}
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          onAddSupplier={() => setSupplierModalOpen(true)}
          supplierInvoiceNo={supplierInvoiceNo}
          setSupplierInvoiceNo={setSupplierInvoiceNo}
          purchaseDate={purchaseDate}
          setPurchaseDate={setPurchaseDate}
        />
      )}

      {step === 2 && (
        <PurchaseFormItemsStep
          rows={rows}
          suggestions={suggestions}
          grandTotal={totals.grandTotal}
          onAddRow={addRow}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
        />
      )}

      {step === 3 && (
        <PurchaseFormPaymentStep
          supplierName={supplierName}
          rows={rows}
          totals={totals}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          isCredit={isCredit}
          balance={balance}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((current) => (current - 1) as WizardStep)}
          >
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < 3 && (
          <Button
            type="button"
            onClick={() => setStep((current) => (current + 1) as WizardStep)}
            disabled={step === 1 ? !canGoToItems : !canGoToPayment}
          >
            Next
          </Button>
        )}

        {step === 3 && !hideSubmit && (
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? "Saving…" : submitLabel ?? "Save purchase"}
          </Button>
        )}
      </div>

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

- [ ] **Step 3: Delete the retired item modal**

```bash
git rm src/modules/purchase/PurchaseItemModal.tsx
```

- [ ] **Step 4: Confirm nothing else references the deleted modal**

Run: `grep -rn "PurchaseItemModal" src`
Expected: no output (empty).

- [ ] **Step 5: Type-check and lint the whole purchase module**

Run: `npm run type-check && npx eslint src/modules/purchase`
Expected: both pass with no errors. `PurchaseFormHost.tsx` should need no edits — confirm with:

Run: `git diff --stat src/modules/purchase/PurchaseFormHost.tsx`
Expected: no output (file untouched).

- [ ] **Step 6: Manual click-through**

Start the dev server if it isn't already running (`npm run dev`), then verify in a real browser (use browser automation tools if connected; otherwise ask the user to check manually before treating this task as done):

1. **New Purchase, mobile width** (`/purchases/new`): step through Supplier → Items → Payment. Confirm Next is disabled on step 1 until a supplier and date are set. Add two items via the quick-add bar (one with Enter, one with the Add button), expand "More" on one row and set a brand, edit a quantity inline, remove one item. Confirm Next on step 2 is disabled with zero items. On step 3, confirm the review list and grand total match what was entered, set a cash payment, and save — confirm it redirects to the new purchase's details page.
2. **New Purchase, desktop width** (`/purchases?new=1`, slide-over): repeat the same flow. Confirm the slide-over's external Cancel/Save footer buttons behave correctly — Save is disabled until step 3 with items present, and Back/Next appear inline inside the slide-over body.
3. **Add supplier mid-wizard**: on step 1, click "+ Add supplier", create a new supplier in the popup, confirm it closes and the new supplier is selected without losing anything else on the page.
4. **Edit an existing purchase** (with no payments yet, so Edit isn't locked): confirm all 3 steps pre-fill correctly from the existing purchase's data.

- [ ] **Step 7: Commit**

```bash
git add src/modules/purchase/PurchaseForm.tsx src/modules/purchase/PurchaseFormStepper.tsx
git commit -m "feat: rebuild purchase form as a 3-step wizard, retire item modal"
```

---

### Task 6: Full repo verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full validation script**

Run: `npm run validate`
Expected: `type-check`, `lint`, and `build` all pass. (The pre-existing `purchaseSummary.test.ts` failures about `returnedQuantity` are unrelated to this change — confirm they're the only failures, if `npm test` is also run, by checking the failure messages mention `returnedQuantity`.)

- [ ] **Step 2: Confirm no stray references remain**

Run: `grep -rn "PurchaseItemModal\|onAddSupplier" src`
Expected: no output — `PurchaseItemModal` is fully removed, and the old `onAddSupplier` prop (already replaced by `onSupplierCreated` in an earlier change) doesn't reappear.

- [ ] **Step 3: Report status to the user**

Summarize what changed (3-step wizard, inline item entry, no modal) and which manual checks from Task 5 Step 6 were actually run vs. need the user's own confirmation (e.g., if browser automation wasn't available in this session).
