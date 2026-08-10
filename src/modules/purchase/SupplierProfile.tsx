"use client";

import React from "react";

import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Purchase, Supplier, SupplierPayment } from "@/types/purchase";

interface Props {
  supplier: Supplier;
  purchases: Purchase[];
  payments: SupplierPayment[];
  onOpenPurchase: (id: string) => void;
  onPaySupplier: () => void;
  onEditPayment: (payment: SupplierPayment) => void;
  onDeletePayment: (payment: SupplierPayment) => void;
}

const SupplierProfile = React.memo(function SupplierProfile({
  supplier,
  purchases,
  payments,
  onOpenPurchase,
  onPaySupplier,
  onEditPayment,
  onDeletePayment,
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
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Outstanding</dt>
            <dd className="flex items-center gap-2">
              <span className="font-semibold text-red-600">
                {formatRupees(supplier.outstanding)}
              </span>
              {supplier.outstanding > 0 && (
                <Button type="button" size="sm" onClick={onPaySupplier}>
                  Pay supplier
                </Button>
              )}
            </dd>
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
          <>
            <ul className="space-y-2 md:hidden">
              {outstandingBills.map((purchase) => (
                <li key={purchase.id}>
                  <button
                    onClick={() => onOpenPurchase(purchase.id)}
                    className="flex w-full items-center justify-between border-b border-gray-100 pb-2 text-left text-sm"
                  >
                    <span className="text-gray-900">{purchase.ref}</span>
                    <span className="font-medium text-red-600">
                      {formatRupees(purchase.balance)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Bill
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Balance due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outstandingBills.map((purchase) => (
                    <tr
                      key={purchase.id}
                      onClick={() => onOpenPurchase(purchase.id)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 text-gray-900">{purchase.ref}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-600">
                        {formatRupees(purchase.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Payments to supplier</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">{formatRupees(payment.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {payment.method}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(payment.paidAt)}</span>
                    <button
                      type="button"
                      onClick={() => onEditPayment(payment)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      aria-label="Edit payment"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePayment(payment)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete payment"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Method
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {formatRupees(payment.amount)}
                      </td>
                      <td className="px-3 py-2 capitalize text-gray-700">{payment.method}</td>
                      <td className="px-3 py-2 text-gray-500">{payment.reference || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(payment.paidAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEditPayment(payment)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            aria-label="Edit payment"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePayment(payment)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete payment"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Purchase history</h3>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">No purchases from this supplier yet.</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
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
                        <p className="text-xs text-gray-500">
                          {formatDate(purchase.purchaseDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatRupees(purchase.grandTotal - purchase.returnedAmount)}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Bill
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map((purchase) => {
                    const status = paymentStatusLabel(purchase, now);
                    return (
                      <tr
                        key={purchase.id}
                        onClick={() => onOpenPurchase(purchase.id)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 text-gray-900">{purchase.ref}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {formatDate(purchase.purchaseDate)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatRupees(purchase.grandTotal - purchase.returnedAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
});

export default SupplierProfile;
