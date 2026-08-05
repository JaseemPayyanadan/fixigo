// src/modules/purchase/PurchaseDetails.tsx
"use client";

import React from "react";

import { Button } from "@/components/ui/Button";
import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchase: Purchase;
  onRecordPayment: () => void;
}

const PurchaseDetails = React.memo(function PurchaseDetails({
  purchase,
  onRecordPayment,
}: Props) {
  const status = React.useMemo(() => paymentStatusLabel(purchase, new Date()), [purchase]);

  const isActive = purchase.status === "active";
  const isLocked = isActive && purchase.payments.length > 0;
  const payable = isActive && purchase.balance > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{purchase.ref}</h2>
            <p className="text-sm text-gray-500">{formatDateTime(purchase.purchaseDate)}</p>
            {purchase.supplierInvoiceNo && (
              <p className="text-xs text-gray-500">Supplier bill {purchase.supplierInvoiceNo}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        {isLocked && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Edit and delete are locked because a payment has been recorded on this purchase.
          </p>
        )}

        {purchase.status === "cancelled" && purchase.cancelReason && (
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            Cancelled: {purchase.cancelReason}
          </p>
        )}

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Supplier</dt>
            <dd className="font-medium text-gray-900">{purchase.supplierName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Purchased by</dt>
            <dd className="text-gray-900">{purchase.purchasedBy.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Total amount</dt>
            <dd className="font-medium text-gray-900">{formatRupees(purchase.grandTotal)}</dd>
          </div>
          <div className="flex justify-between sm:col-span-2">
            <div className="grid w-full grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">Paid amount</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatRupees(purchase.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p
                  className={`text-base font-semibold ${
                    purchase.balance > 0 ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {formatRupees(purchase.balance)}
                </p>
              </div>
            </div>
          </div>
          {purchase.dueDate && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Due date</dt>
              <dd className="text-gray-900">{formatDate(purchase.dueDate)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Purchased items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <p className="text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {[item.brand, item.model].filter(Boolean).join(" ")}
                      {item.serviceId ? ` · for service ${item.serviceId}` : ""}
                    </p>
                  </td>
                  <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-700">
                    {formatRupees(item.purchasePrice)}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {formatRupees(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatRupees(purchase.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Discount</dt>
            <dd>− {formatRupees(purchase.discount.amount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST ({purchase.gstRate}%)</dt>
            <dd>{formatRupees(purchase.gstAmount)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Transport</dt>
            <dd>{formatRupees(purchase.transportCharge)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
            <dt>Grand total</dt>
            <dd>{formatRupees(purchase.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Payment history</h3>
          {payable && (
            <Button type="button" size="sm" onClick={onRecordPayment}>
              + Record Payment
            </Button>
          )}
        </div>
        {purchase.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchase.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{formatRupees(payment.amount)}</p>
                  <p className="text-xs uppercase text-gray-500">
                    {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{formatDate(payment.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm font-semibold">
          <span className="text-gray-600">Remaining balance</span>
          <span className={purchase.balance > 0 ? "text-red-600" : "text-emerald-700"}>
            {formatRupees(purchase.balance)}
          </span>
        </div>
      </section>
    </div>
  );
});

export default PurchaseDetails;
