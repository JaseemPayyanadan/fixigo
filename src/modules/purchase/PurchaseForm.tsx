// src/modules/purchase/PurchaseForm.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { computeTotals } from "@/lib/purchaseTotals";
import type { Supplier } from "@/types/purchase";

export interface Suggestions {
  names: string[];
  brands: string[];
  models: string[];
}

interface ItemRow {
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
  onAddSupplier: () => void;
}

function emptyRow(): ItemRow {
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
  onAddSupplier,
}: Props) {
  const [supplierId, setSupplierId] = React.useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(todayIso());
  const [rows, setRows] = React.useState<ItemRow[]>([emptyRow()]);
  const [discountMode, setDiscountMode] = React.useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = React.useState("0");
  const [gstRate, setGstRate] = React.useState("0");
  const [transportCharge, setTransportCharge] = React.useState("0");
  const [paymentType, setPaymentType] = React.useState<"cash" | "upi" | "bank" | "credit">("cash");
  const [amountPaid, setAmountPaid] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  // The SAME function the server uses, so the figure on screen is the figure
  // that gets persisted.
  const totals = React.useMemo(
    () =>
      computeTotals({
        items: rows.map((row) => ({
          quantity: Number(row.quantity) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
        })),
        discount: { mode: discountMode, value: Number(discountValue) || 0 },
        gstRate: Number(gstRate) || 0,
        transportCharge: Number(transportCharge) || 0,
      }),
    [rows, discountMode, discountValue, gstRate, transportCharge]
  );

  const isCredit = paymentType === "credit";
  const paid = isCredit ? 0 : Number(amountPaid) || 0;
  const balance = Math.max(totals.grandTotal - paid, 0);

  const updateRow = React.useCallback((key: string, field: keyof ItemRow, value: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }, []);

  const addRow = React.useCallback(() => setRows((current) => [...current, emptyRow()]), []);

  const removeRow = React.useCallback((key: string) => {
    // Never leave the form with zero rows — a purchase needs at least one item.
    setRows((current) => (current.length === 1 ? current : current.filter((r) => r.key !== key)));
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      await onSubmit({
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
        discount: { mode: discountMode, value: Number(discountValue) || 0 },
        gstRate: Number(gstRate) || 0,
        transportCharge: Number(transportCharge) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        initialPayment:
          isCredit || paid <= 0
            ? undefined
            : {
                amount: paid,
                method: paymentType,
                paidAt: new Date().toISOString(),
                reference: reference.trim() || undefined,
              },
      });
    },
    [
      onSubmit,
      supplierId,
      supplierInvoiceNo,
      purchaseDate,
      rows,
      discountMode,
      discountValue,
      gstRate,
      transportCharge,
      dueDate,
      isCredit,
      paid,
      paymentType,
      reference,
    ]
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Supplier</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Supplier</label>
            <div className="flex gap-2">
              <select
                required
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
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
                + Add
              </button>
            </div>
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
          <div>
            <label className="mb-1 block text-xs text-gray-600">Supplier bill no. (optional)</label>
            <input
              value={supplierInvoiceNo}
              onChange={(event) => setSupplierInvoiceNo(event.target.value)}
              className={inputClass}
              placeholder="As printed on the bill"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Purchase items</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Item {index + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs font-medium text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  list="purchase-item-names"
                  value={row.name}
                  onChange={(event) => updateRow(row.key, "name", event.target.value)}
                  placeholder="Item"
                  className={inputClass}
                />
                <input
                  list="purchase-item-brands"
                  value={row.brand}
                  onChange={(event) => updateRow(row.key, "brand", event.target.value)}
                  placeholder="Brand"
                  className={inputClass}
                />
                <input
                  list="purchase-item-models"
                  value={row.model}
                  onChange={(event) => updateRow(row.key, "model", event.target.value)}
                  placeholder="Model"
                  className={inputClass}
                />
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                  placeholder="Quantity"
                  className={inputClass}
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.purchasePrice}
                  onChange={(event) => updateRow(row.key, "purchasePrice", event.target.value)}
                  placeholder="Purchase price"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.sellingPrice}
                  onChange={(event) => updateRow(row.key, "sellingPrice", event.target.value)}
                  placeholder="Selling price (optional)"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.warrantyMonths}
                  onChange={(event) => updateRow(row.key, "warrantyMonths", event.target.value)}
                  placeholder="Warranty (months)"
                  className={inputClass}
                />
                <input
                  value={row.serviceId}
                  onChange={(event) => updateRow(row.key, "serviceId", event.target.value)}
                  placeholder="For service ID (optional)"
                  className={inputClass}
                />
                <input
                  value={row.remarks}
                  onChange={(event) => updateRow(row.key, "remarks", event.target.value)}
                  placeholder="Remarks (optional)"
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Totals</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Discount</label>
            <div className="flex gap-2">
              <select
                value={discountMode}
                onChange={(event) => setDiscountMode(event.target.value as "amount" | "percent")}
                className="h-11 w-24 rounded-xl border border-gray-200 px-2 text-sm"
              >
                <option value="amount">₹</option>
                <option value="percent">%</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">GST rate (%)</label>
            <input
              type="number"
              min="0"
              max="28"
              step="0.01"
              value={gstRate}
              onChange={(event) => setGstRate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Transport charge</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={transportCharge}
              onChange={(event) => setTransportCharge(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <dl className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatRupees(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd>− {formatRupees(totals.discountAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST</dt>
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
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment</h2>
        <div className="grid gap-3 sm:grid-cols-3">
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
            <>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Amount paid</label>
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
              <div>
                <label className="mb-1 block text-xs text-gray-600">Reference (optional)</label>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs text-gray-600">
              Due date {isCredit ? "(required)" : "(optional)"}
            </label>
            <input
              type="date"
              required={isCredit}
              min={purchaseDate}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Balance after this payment:{" "}
          <span className="font-semibold text-gray-900">{formatRupees(balance)}</span>
        </p>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save purchase"}
      </button>
    </form>
  );
});

export default PurchaseForm;
