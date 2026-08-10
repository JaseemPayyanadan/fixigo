// src/modules/purchase/RequestSparePartForm.tsx
"use client";

import React from "react";

import { MdAdd, MdDeleteOutline } from "react-icons/md";

interface Row {
  key: string;
  name: string;
  brand: string;
  model: string;
  quantity: string;
  remarks: string;
}

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    name: "",
    brand: "",
    model: "",
    quantity: "1",
    remarks: "",
  };
}

export interface RequestSparePartItem {
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  remarks?: string;
}

interface Props {
  formId: string;
  saving: boolean;
  error: string | null;
  onSubmit: (items: RequestSparePartItem[]) => void;
}

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-gray-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Free-text add/remove-row item table — no spares catalog exists to pick from. */
export default function RequestSparePartForm({ formId, saving, error, onSubmit }: Props) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);

  const updateRow = (key: string, field: keyof Row, value: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);

  const removeRow = (key: string) =>
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const items: RequestSparePartItem[] = rows
      .filter((row) => row.name.trim() !== "")
      .map((row) => ({
        name: row.name.trim(),
        brand: row.brand.trim() || undefined,
        model: row.model.trim() || undefined,
        quantity: Math.max(1, Number(row.quantity) || 1),
        remarks: row.remarks.trim() || undefined,
      }));

    onSubmit(items);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-xl border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Item {index + 1}
            </span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label={`Remove item ${index + 1}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MdDeleteOutline className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">
                Part name <span className="text-red-600">*</span>
              </label>
              <input
                value={row.name}
                onChange={(event) => updateRow(row.key, "name", event.target.value)}
                className={INPUT_CLASS}
                placeholder="e.g. Display"
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Brand</label>
              <input
                value={row.brand}
                onChange={(event) => updateRow(row.key, "brand", event.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Model</label>
              <input
                value={row.model}
                onChange={(event) => updateRow(row.key, "model", event.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Quantity</label>
              <input
                type="number"
                min={1}
                step={1}
                value={row.quantity}
                onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Remarks</label>
              <input
                value={row.remarks}
                onChange={(event) => updateRow(row.key, "remarks", event.target.value)}
                className={INPUT_CLASS}
                placeholder="Optional note"
                disabled={saving}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={saving}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <MdAdd className="h-4 w-4" />
        Add another item
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
