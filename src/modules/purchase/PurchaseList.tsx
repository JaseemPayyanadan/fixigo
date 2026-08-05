// src/modules/purchase/PurchaseList.tsx
"use client";

import React from "react";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Purchase } from "@/types/purchase";

interface Props {
  purchases: Purchase[];
  onOpen: (id: string) => void;
}

function itemSummary(purchase: Purchase): string {
  const names = purchase.items.map((item) => item.name);
  const head = names.slice(0, 2).join(", ");
  const rest = names.length > 2 ? ` +${names.length - 2} more` : "";
  return `${head}${rest}`;
}

const PurchaseList = React.memo(function PurchaseList({ purchases, onOpen }: Props) {
  const now = React.useMemo(() => new Date(), []);

  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No purchases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Record your first spare purchase to start tracking supplier dues.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const status = paymentStatusLabel(purchase, now);
              return (
                <tr
                  key={purchase.id}
                  onClick={() => onOpen(purchase.id)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{purchase.ref}</p>
                    {purchase.supplierInvoiceNo && (
                      <p className="text-xs text-gray-500">Bill {purchase.supplierInvoiceNo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{purchase.supplierName}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{itemSummary(purchase)}</p>
                    <p className="text-xs text-gray-500">{purchase.items.length} items</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatRupees(purchase.grandTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(purchase.purchaseDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {purchases.map((purchase) => {
          const status = paymentStatusLabel(purchase, now);
          return (
            <button
              key={purchase.id}
              onClick={() => onOpen(purchase.id)}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-gray-900">{purchase.ref}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{purchase.supplierName}</p>
              <p className="text-xs text-gray-500">
                {itemSummary(purchase)} · {purchase.items.length} items
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">
                  {formatRupees(purchase.grandTotal)}
                </span>
                <span className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
});

export default PurchaseList;
