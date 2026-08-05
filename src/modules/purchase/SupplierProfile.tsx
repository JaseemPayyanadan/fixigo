"use client";

import React from "react";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Purchase, Supplier } from "@/types/purchase";

interface Props {
  supplier: Supplier;
  purchases: Purchase[];
  onOpenPurchase: (id: string) => void;
}

const SupplierProfile = React.memo(function SupplierProfile({
  supplier,
  purchases,
  onOpenPurchase,
}: Props) {
  const now = React.useMemo(() => new Date(), []);
  const outstandingBills = React.useMemo(
    () => purchases.filter((purchase) => purchase.balance > 0 && purchase.status === "active"),
    [purchases]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900">{supplier.name}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Contact</dt>
            <dd className="text-gray-900">{supplier.contactPerson}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900">{supplier.phone}</dd>
          </div>
          {supplier.gstNumber && (
            <div className="flex justify-between">
              <dt className="text-gray-500">GST</dt>
              <dd className="text-gray-900">{supplier.gstNumber}</dd>
            </div>
          )}
          {supplier.address && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="text-right text-gray-900">{supplier.address}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Total purchases</dt>
            <dd className="font-medium text-gray-900">{formatRupees(supplier.totalPurchased)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Outstanding</dt>
            <dd className="font-semibold text-red-600">{formatRupees(supplier.outstanding)}</dd>
          </div>
          {supplier.lastPurchaseAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Last purchase</dt>
              <dd className="text-gray-900">{formatDate(supplier.lastPurchaseAt)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Outstanding bills ({outstandingBills.length})
        </h3>
        {outstandingBills.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing outstanding with this supplier.</p>
        ) : (
          <ul className="space-y-2">
            {outstandingBills.map((purchase) => (
              <li key={purchase.id}>
                <button
                  onClick={() => onOpenPurchase(purchase.id)}
                  className="flex w-full items-center justify-between border-b border-gray-100 pb-2 text-left text-sm"
                >
                  <span className="text-gray-900">{purchase.ref}</span>
                  <span className="font-medium text-red-600">{formatRupees(purchase.balance)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Purchase history</h3>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">No purchases from this supplier yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((purchase) => {
              const status = paymentStatusLabel(purchase, now);
              return (
                <li key={purchase.id}>
                  <button
                    onClick={() => onOpenPurchase(purchase.id)}
                    className="flex w-full items-center justify-between border-b border-gray-100 pb-2 text-left text-sm"
                  >
                    <div>
                      <p className="text-gray-900">{purchase.ref}</p>
                      <p className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatRupees(purchase.grandTotal)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
});

export default SupplierProfile;
