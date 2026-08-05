// src/modules/purchase/PurchaseItemModal.tsx
"use client";

import React from "react";
import { createPortal } from "react-dom";

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

interface Props {
  open: boolean;
  initial: ItemFormValues | null;
  onClose: () => void;
  onSave: (values: ItemFormValues) => void;
}

function emptyValues(): ItemFormValues {
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

const PurchaseItemModal = React.memo(function PurchaseItemModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [values, setValues] = React.useState<ItemFormValues>(initial ?? emptyValues());
  const [showMore, setShowMore] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValues(initial ?? emptyValues());
      setShowMore(false);
    }
  }, [open, initial]);

  const set = React.useCallback(
    (field: keyof ItemFormValues, value: string) =>
      setValues((current) => ({ ...current, [field]: value })),
    []
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSave(values);
    },
    [values, onSave]
  );

  if (!open) return null;

  // Portalled out of PurchaseForm's <form> — a <form> nested inside another
  // <form> is invalid HTML, and the browser collapses it into the outer one,
  // so this modal's submit button would submit the purchase form instead of
  // saving the item.
  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-base font-semibold text-gray-900">
          {initial ? "Edit item" : "Add item"}
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Item</label>
            <input
              required
              autoFocus
              list="purchase-item-names"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Item name"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Brand</label>
              <input
                list="purchase-item-brands"
                value={values.brand}
                onChange={(event) => set("brand", event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Model</label>
              <input
                list="purchase-item-models"
                value={values.model}
                onChange={(event) => set("model", event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Quantity</label>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={values.quantity}
                onChange={(event) => set("quantity", event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Purchase price (₹)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={values.purchasePrice}
                onChange={(event) => set("purchasePrice", event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {showMore ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Selling price (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.sellingPrice}
                    onChange={(event) => set("sellingPrice", event.target.value)}
                    className={inputClass}
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
                    value={values.warrantyMonths}
                    onChange={(event) => set("warrantyMonths", event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  For service ID (optional)
                </label>
                <input
                  value={values.serviceId}
                  onChange={(event) => set("serviceId", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Remarks (optional)</label>
                <input
                  value={values.remarks}
                  onChange={(event) => set("remarks", event.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-sm font-medium text-blue-600"
            >
              + More details (selling price, warranty, remarks)
            </button>
          )}
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
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            {initial ? "Save item" : "Add item"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
});

export default PurchaseItemModal;
