"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import type { Supplier } from "@/types/purchase";

export interface SupplierPayload {
  name: string;
  contactPerson: string;
  phone: string;
  gstNumber?: string;
  openingBalance?: number;
}

interface Props {
  initial: Supplier | null;
  saving: boolean;
  error: string | null;
  onSubmit: (payload: SupplierPayload) => Promise<void>;
  onCancel: () => void;
  /** Lets a host footer submit via `form={formId}`. */
  formId?: string;
  /** Hide the inline Cancel/Submit row (use a slide-over footer instead). */
  hideSubmit?: boolean;
}

const SupplierForm = React.memo(function SupplierForm({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
  formId,
  hideSubmit = false,
}: Props) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [contactPerson, setContactPerson] = React.useState(initial?.contactPerson ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [gstNumber, setGstNumber] = React.useState(initial?.gstNumber ?? "");
  const [openingBalance, setOpeningBalance] = React.useState("");

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await onSubmit({
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        gstNumber: gstNumber.trim() || undefined,
        openingBalance:
          !initial && openingBalance ? Number(openingBalance) : undefined,
      });
    },
    [onSubmit, name, contactPerson, phone, gstNumber, initial, openingBalance]
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={hideSubmit ? "space-y-4" : "rounded-xl border border-gray-200 bg-white p-4"}
    >
      {!hideSubmit && (
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          {initial ? "Edit supplier" : "New supplier"}
        </h2>
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            Shop name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shop name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            Contact person <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Contact person"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">GST number (optional)</label>
          <input
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
            placeholder="GST number"
            className={inputClass}
          />
        </div>
        {!initial && (
          <div>
            <label className="mb-1 block text-xs text-gray-600">Outstanding balance (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {!hideSubmit && (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="lg" fullWidth disabled={saving}>
            {saving ? "Saving…" : "Save supplier"}
          </Button>
        </div>
      )}
    </form>
  );
});

export default SupplierForm;
