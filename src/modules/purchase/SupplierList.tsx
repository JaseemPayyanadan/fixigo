"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Supplier } from "@/types/purchase";

interface Props {
  suppliers: Supplier[];
  onOpen: (id: string) => void;
}

const SupplierList = React.memo(function SupplierList({ suppliers, onOpen }: Props) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No suppliers yet</p>
        <p className="mt-1 text-sm text-gray-500">Add a supplier before recording a purchase.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((supplier) => (
        <button
          key={supplier.id}
          onClick={() => onOpen(supplier.id)}
          className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <p className="font-medium text-gray-900">{supplier.name}</p>
            {supplier.status === "inactive" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{supplier.phone}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className={`font-semibold ${supplier.outstanding > 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatRupees(supplier.outstanding)}
              </p>
            </div>
            {supplier.lastPurchaseAt && (
              <p className="text-xs text-gray-500">Last {formatDate(supplier.lastPurchaseAt)}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

export default SupplierList;
