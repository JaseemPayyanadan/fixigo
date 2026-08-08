"use client";

import React from "react";

import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { flexRender, type Table as ReactTable } from "@tanstack/react-table";

interface ColumnMeta {
  headerClass?: string;
  cellClass?: string;
}

/** Sortable `<thead>` for a TanStack `useReactTable` instance: chevron icons, aria-sort, click-to-sort. */
export function SortableTableHeader<TData>({
  table,
  headerClass = "px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500",
}: {
  table: ReactTable<TData>;
  headerClass?: string;
}) {
  return (
    <thead className="bg-gray-50">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta as ColumnMeta | undefined;
            const sorted = header.column.getIsSorted();
            const canSort = header.column.getCanSort();
            return (
              <th
                key={header.id}
                scope="col"
                aria-sort={
                  sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                }
                className={`${headerClass} ${meta?.headerClass ?? ""}`}
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
  );
}

/** "Showing X-Y of Z" + Previous/Next footer for a TanStack `useReactTable` instance. */
export function TablePaginationFooter<TData>({ table }: { table: ReactTable<TData> }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min(firstRow + pageSize - 1, totalRows);

  if (totalRows === 0) return null;

  return (
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
  );
}
