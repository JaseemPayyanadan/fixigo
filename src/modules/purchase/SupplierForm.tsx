"use client";

import React from "react";

import type { Supplier } from "@/types/purchase";

export interface SupplierPayload {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  openingBalance?: number;
}

interface Props {
  initial: Supplier | null;
  saving: boolean;
  error: string | null;
  onSubmit: (payload: SupplierPayload) => Promise<void>;
  onCancel: () => void;
}

const SupplierForm = React.memo(function SupplierForm({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [contactPerson, setContactPerson] = React.useState(initial?.contactPerson ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [gstNumber, setGstNumber] = React.useState(initial?.gstNumber ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  const [openingBalance, setOpeningBalance] = React.useState("");

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await onSubmit({
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        address: address.trim() || undefined,
        openingBalance:
          !initial && openingBalance ? Number(openingBalance) : undefined,
      });
    },
    [onSubmit, name, contactPerson, phone, email, gstNumber, address, initial, openingBalance]
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">
        {initial ? "Edit supplier" : "New supplier"}
      </h2>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name" className={inputClass} />
        <input required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person" className={inputClass} />
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={inputClass} />
        <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST number (optional)" className={inputClass} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className={inputClass} />
        {!initial && (
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="Outstanding balance (optional)"
            className={inputClass}
          />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save supplier"}
        </button>
      </div>
    </form>
  );
});

export default SupplierForm;
