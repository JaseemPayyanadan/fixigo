// src/modules/purchase/ReturnList.tsx
"use client";

import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { PurchaseReturnRow } from "@/types/purchase";

interface Props {
  returns: PurchaseReturnRow[];
  onOpenPurchase: (id: string) => void;
  onEditReturn?: (entry: PurchaseReturnRow) => void;
  onDeleteReturn?: (entry: PurchaseReturnRow) => void;
}

const ReturnList = React.memo(function ReturnList({
  returns,
  onOpenPurchase,
  onEditReturn,
  onDeleteReturn,
}: Props) {
  if (returns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No returns yet</p>
        <p className="mt-1 text-sm text-gray-500">Returns recorded against bills will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col rounded-2xl md:h-full md:flex-1 md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm">
      <div className="space-y-3 md:hidden">
        {returns.map((entry) => (
          <div key={entry.id} className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => onOpenPurchase(entry.purchaseId)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{entry.purchaseRef}</p>
                  <p className="truncate text-xs text-gray-500">{entry.supplierName}</p>
                </div>
                <span className="shrink-0 font-semibold text-gray-900">
                  {formatRupees(entry.totalAmount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{entry.reason || "No reason given"}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(entry.returnedAt)}</p>
            </button>
            {(onEditReturn || onDeleteReturn) && (
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
                {onEditReturn && (
                  <button
                    type="button"
                    onClick={() => onEditReturn(entry)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    aria-label="Edit return"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                {onDeleteReturn && (
                  <button
                    type="button"
                    onClick={() => onDeleteReturn(entry)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete return"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Bill
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Supplier
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Amount
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reason
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
            {returns.map((entry) => (
              <tr
                key={entry.id}
                onClick={() => onOpenPurchase(entry.purchaseId)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className="px-3 py-2 text-gray-900">{entry.purchaseRef}</td>
                <td className="px-3 py-2 text-gray-700">{entry.supplierName}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">
                  {formatRupees(entry.totalAmount)}
                </td>
                <td className="px-3 py-2 text-gray-500">{entry.reason || "—"}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(entry.returnedAt)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEditReturn && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditReturn(entry);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Edit return"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    {onDeleteReturn && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteReturn(entry);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete return"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ReturnList;
