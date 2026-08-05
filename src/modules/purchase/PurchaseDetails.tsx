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
  onEdit: () => void;
  onCancel: () => void;
}

const PurchaseDetails = React.memo(function PurchaseDetails({
  purchase,
  onRecordPayment,
  onEdit,
  onCancel,
}: Props) {
  const status = React.useMemo(() => paymentStatusLabel(purchase, new Date()), [purchase]);

  // Absent rather than disabled: once a payment exists the API will 409, so
  // the screen must not offer the action at all.
  const editable = purchase.payments.length === 0 && purchase.status === "active";
  const payable = purchase.status === "active" && purchase.balance > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{purchase.ref}</h2>
            <p className="text-sm text-gray-500">{formatDateTime(purchase.purchaseDate)}</p>
            {purchase.supplierInvoiceNo && (
              <p className="text-xs text-gray-500">Supplier bill {purchase.supplierInvoiceNo}</p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

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
          <div className="flex justify-between">
            <dt className="text-gray-500">Paid amount</dt>
            <dd className="text-gray-900">{formatRupees(purchase.paidAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Balance</dt>
            <dd className="font-semibold text-red-600">{formatRupees(purchase.balance)}</dd>
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
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Payment history</h3>
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
          <span className="text-red-600">{formatRupees(purchase.balance)}</span>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {payable && (
          <Button size="lg" fullWidth onClick={onRecordPayment}>
            + Record Payment
          </Button>
        )}
        {editable && (
          <>
            <Button variant="secondary" size="lg" fullWidth onClick={onEdit}>
              Edit Purchase
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onCancel}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Cancel Purchase
            </Button>
          </>
        )}
      </div>
    </div>
  );
});

export default PurchaseDetails;
