// src/modules/purchase/PurchaseList.tsx
"use client";

import React, { useMemo, useState } from "react";

import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import { formatRupees, paymentStatusLabel } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Branch } from "@/types";
import type { Purchase } from "@/types/purchase";

const PAGE_SIZE = 10;
const HEADER_CLASS = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Props {
  purchases: Purchase[];
  onOpen: (id: string) => void;
  /** Only a shop_admin sees purchases from more than one branch, so only they need this column. */
  branches?: Branch[];
  showBranchColumn?: boolean;
}

const columnHelper = createColumnHelper<Purchase>();

function branchNameFor(branches: Branch[], branchId: string): string {
  return branches.find((branch) => branch.id === branchId)?.name ?? "—";
}

/** The bill's total net of returns — what's actually owed, before payments. */
function netTotal(purchase: Purchase): number {
  return purchase.grandTotal - purchase.returnedAmount;
}

function PurchaseCard({
  purchase,
  now,
  onOpen,
  branches,
  showBranchColumn,
}: {
  purchase: Purchase;
  now: Date;
  onOpen: (id: string) => void;
  branches: Branch[];
  showBranchColumn: boolean;
}) {
  const status = paymentStatusLabel(purchase, now);
  const showMoney = purchase.status !== "cancelled";
  const hasReturn = purchase.returnedAmount > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(purchase.id)}
      className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{purchase.supplierName}</p>
          <p className="text-xs text-gray-500">{purchase.ref}</p>
          {purchase.supplierInvoiceNo ? (
            <p className="text-xs text-gray-500">Bill {purchase.supplierInvoiceNo}</p>
          ) : null}
          {showBranchColumn ? (
            <p className="text-xs text-gray-500">{branchNameFor(branches, purchase.branchId)}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
          {hasReturn && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
              Returned
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="space-y-0.5 text-sm">
          <p className="font-semibold text-gray-900">
            Total {formatRupees(netTotal(purchase))}
          </p>
          {showMoney && (
            <>
              <p className="text-xs text-emerald-600">Paid {formatRupees(purchase.paidAmount)}</p>
              <p className={`text-xs ${purchase.balance > 0 ? "text-red-600" : "text-gray-600"}`}>
                Balance {formatRupees(purchase.balance)}
              </p>
              {hasReturn && (
                <p className="text-xs text-amber-700">
                  Returned {formatRupees(purchase.returnedAmount)}
                </p>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</span>
      </div>
    </button>
  );
}

/** Purchases list as a TanStack data table: sortable headers, pagination, cards below `md`. */
const PurchaseList = React.memo(function PurchaseList({
  purchases,
  onOpen,
  branches = [],
  showBranchColumn = false,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "purchaseDate", desc: true }]);
  const now = useMemo(() => new Date(), []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("supplierName", {
        id: "supplier",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{row.original.supplierName}</p>
              {row.original.returnedAmount > 0 && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Returned
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{row.original.ref}</p>
            {row.original.supplierInvoiceNo ? (
              <p className="text-xs text-gray-500">Bill {row.original.supplierInvoiceNo}</p>
            ) : null}
          </div>
        ),
      }),
      ...(showBranchColumn
        ? [
            columnHelper.accessor("branchId", {
              id: "branch",
              header: "Branch",
              cell: ({ getValue }) => (
                <span className="text-gray-700">{branchNameFor(branches, getValue())}</span>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("grandTotal", {
        id: "total",
        header: "Total",
        meta: { headerClass: "text-right", cellClass: "text-right font-medium text-gray-900" },
        cell: ({ row }) => formatRupees(netTotal(row.original)),
      }),
      columnHelper.accessor("paidAmount", {
        id: "paid",
        header: "Paid",
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ row, getValue }) =>
          row.original.status === "cancelled" ? (
            "—"
          ) : (
            <span className="font-medium text-emerald-600">{formatRupees(getValue())}</span>
          ),
      }),
      columnHelper.accessor("balance", {
        id: "balance",
        header: "Balance",
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ row, getValue }) => {
          if (row.original.status === "cancelled") return "—";
          const balance = getValue();
          return (
            <div>
              <span className={balance > 0 ? "font-medium text-red-600" : "text-gray-700"}>
                {formatRupees(balance)}
              </span>
              {row.original.returnedAmount > 0 && (
                <p className="text-xs text-amber-700">
                  Returned {formatRupees(row.original.returnedAmount)}
                </p>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("paymentStatus", {
        id: "payment",
        header: "Status",
        cell: ({ row }) => {
          const status = paymentStatusLabel(row.original, now);
          return (
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          );
        },
      }),
      columnHelper.accessor("purchaseDate", {
        id: "purchaseDate",
        header: "Date",
        sortingFn: (a, b) =>
          a.original.purchaseDate.getTime() - b.original.purchaseDate.getTime(),
        cell: ({ getValue }) => (
          <span className="text-gray-500">{formatDate(getValue())}</span>
        ),
      }),
    ],
    [now, showBranchColumn, branches]
  );

  const table = useReactTable({
    data: purchases,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const lastRow = Math.min(firstRow + table.getState().pagination.pageSize - 1, totalRows);

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
    <div className="rounded-2xl md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm">
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <PurchaseCard
            key={row.id}
            purchase={row.original}
            now={now}
            onOpen={onOpen}
            branches={branches}
            showBranchColumn={showBranchColumn}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { headerClass?: string; cellClass?: string }
                    | undefined;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                      className={`${HEADER_CLASS} ${meta?.headerClass ?? ""}`}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex cursor-pointer items-center gap-1 rounded uppercase transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ChevronUpIcon className="h-3 w-3" />
                          ) : sorted === "desc" ? (
                            <ChevronDownIcon className="h-3 w-3" />
                          ) : (
                            <ChevronUpDownIcon className="h-3 w-3 text-gray-300" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
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

      {totalRows > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:mt-0 md:rounded-none md:border-x-0 md:border-b-0 md:shadow-none">
          <p className="text-xs text-gray-500">
            Showing <span className="font-medium text-gray-700">{firstRow}</span>–
            <span className="font-medium text-gray-700">{lastRow}</span> of{" "}
            <span className="font-medium text-gray-700">{totalRows}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PurchaseList;
