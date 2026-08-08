"use client";

import React, { useMemo, useState } from "react";

import { TrashIcon } from "@heroicons/react/24/outline";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import { SortableTableHeader, TablePaginationFooter } from "@/components/ui/DataTable";
import { formatRupees } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Supplier } from "@/types/purchase";

const PAGE_SIZE = 10;
const HEADER_CLASS = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Props {
  suppliers: Supplier[];
  onOpen: (id: string) => void;
  onDelete?: (supplier: Supplier) => void;
}

const columnHelper = createColumnHelper<Supplier>();

function SupplierCard({
  supplier,
  onOpen,
  onDelete,
}: {
  supplier: Supplier;
  onOpen: (id: string) => void;
  onDelete?: (supplier: Supplier) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <button type="button" onClick={() => onOpen(supplier.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{supplier.name}</p>
            <p className="text-xs text-gray-500">{supplier.phone}</p>
            {supplier.contactPerson ? (
              <p className="text-xs text-gray-500">{supplier.contactPerson}</p>
            ) : null}
          </div>
          {supplier.status === "inactive" ? (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              Inactive
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="space-y-0.5 text-sm">
            <p className={`font-semibold ${supplier.outstanding > 0 ? "text-red-600" : "text-gray-900"}`}>
              Outstanding {formatRupees(supplier.outstanding)}
            </p>
            <p className="text-xs text-gray-500">
              Purchased {formatRupees(supplier.totalPurchased)}
            </p>
          </div>
          {supplier.lastPurchaseAt ? (
            <span className="text-xs text-gray-500">Last {formatDate(supplier.lastPurchaseAt)}</span>
          ) : null}
        </div>
      </button>
      {onDelete && supplier.status !== "inactive" && (
        <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => onDelete(supplier)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete supplier"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Suppliers list as a TanStack data table: sortable headers, pagination, cards below `md`. */
const SupplierList = React.memo(function SupplierList({ suppliers, onOpen, onDelete }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "outstanding", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "name",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.contactPerson ? (
              <p className="text-xs text-gray-500">{row.original.contactPerson}</p>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor("phone", {
        id: "phone",
        header: "Phone",
        cell: ({ getValue }) => <span className="text-gray-700">{getValue()}</span>,
      }),
      columnHelper.accessor("totalPurchased", {
        id: "purchased",
        header: "Purchased",
        meta: { headerClass: "text-right", cellClass: "text-right font-medium text-gray-900" },
        cell: ({ getValue }) => formatRupees(getValue()),
      }),
      columnHelper.accessor("outstanding", {
        id: "outstanding",
        header: "Outstanding",
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ getValue }) => {
          const outstanding = getValue();
          return (
            <span className={outstanding > 0 ? "font-medium text-red-600" : "text-gray-700"}>
              {formatRupees(outstanding)}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return status === "inactive" ? (
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              Inactive
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          );
        },
      }),
      columnHelper.accessor("lastPurchaseAt", {
        id: "lastPurchase",
        header: "Last purchase",
        sortingFn: (a, b) => {
          const aTime = a.original.lastPurchaseAt?.getTime() ?? 0;
          const bTime = b.original.lastPurchaseAt?.getTime() ?? 0;
          return aTime - bTime;
        },
        cell: ({ getValue }) => {
          const value = getValue();
          return <span className="text-gray-500">{value ? formatDate(value) : "—"}</span>;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { headerClass: "text-right", cellClass: "text-right" },
        enableSorting: false,
        cell: ({ row }) => {
          const supplier = row.original;
          if (!onDelete || supplier.status === "inactive") return null;
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(supplier);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Delete"
              aria-label="Delete supplier"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          );
        },
      }),
    ],
    [onDelete]
  );

  const table = useReactTable({
    data: suppliers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const rows = table.getRowModel().rows;

  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No suppliers yet</p>
        <p className="mt-1 text-sm text-gray-500">Add a supplier before recording a purchase.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm">
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <SupplierCard key={row.id} supplier={row.original} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
          <SortableTableHeader table={table} headerClass={HEADER_CLASS} />
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onOpen(row.original.id)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { headerClass?: string; cellClass?: string }
                    | undefined;
                  return (
                    <td key={cell.id} className={`px-4 py-3 ${meta?.cellClass ?? ""}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePaginationFooter table={table} />
    </div>
  );
});

export default SupplierList;
