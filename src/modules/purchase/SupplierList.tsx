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

import { formatRupees } from "@/lib/purchaseFormat";
import { formatDate } from "@/lib/utils";
import type { Supplier } from "@/types/purchase";

const PAGE_SIZE = 10;
const HEADER_CLASS = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Props {
  suppliers: Supplier[];
  onOpen: (id: string) => void;
}

const columnHelper = createColumnHelper<Supplier>();

function SupplierCard({
  supplier,
  onOpen,
}: {
  supplier: Supplier;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(supplier.id)}
      className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
    >
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
  );
}

/** Suppliers list as a TanStack data table: sortable headers, pagination, cards below `md`. */
const SupplierList = React.memo(function SupplierList({ suppliers, onOpen }: Props) {
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
    ],
    []
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

  const pageIndex = table.getState().pagination.pageIndex;
  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const lastRow = Math.min(firstRow + table.getState().pagination.pageSize - 1, totalRows);

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
          <SupplierCard key={row.id} supplier={row.original} onOpen={onOpen} />
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

export default SupplierList;
