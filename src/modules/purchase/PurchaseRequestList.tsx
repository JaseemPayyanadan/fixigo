// src/modules/purchase/PurchaseRequestList.tsx
"use client";

import React, { useMemo, useState } from "react";

import Link from "next/link";

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

import { formatRepairLabel } from "@/lib/repairLabel";
import { formatDate } from "@/lib/utils";
import type { Branch } from "@/types";
import type { PurchaseRequest, PurchaseRequestStatus } from "@/types/purchaseRequest";

const PAGE_SIZE = 10;
const HEADER_CLASS = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

const STATUS_LABEL: Record<PurchaseRequestStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
};

interface Props {
  requests: PurchaseRequest[];
  onOpen: (id: string) => void;
  branches?: Branch[];
  showBranchColumn?: boolean;
  /** Off for technicians — every row in their view is either their own or a
   *  colleague's, and who raised it isn't theirs to see. */
  showRequestedByColumn?: boolean;
}

const columnHelper = createColumnHelper<PurchaseRequest>();

const requestedByColumn = columnHelper.accessor((row) => row.requestedBy.name, {
  id: "requestedBy",
  header: "Requested By",
  cell: ({ getValue }) => getValue(),
});

function branchNameFor(branches: Branch[], branchId: string): string {
  return branches.find((branch) => branch.id === branchId)?.name ?? "—";
}

function RequestCard({
  request,
  onOpen,
  branches,
  showBranchColumn,
  showRequestedByColumn,
}: {
  request: PurchaseRequest;
  onOpen: (id: string) => void;
  branches: Branch[];
  showBranchColumn: boolean;
  showRequestedByColumn: boolean;
}) {
  const status = STATUS_LABEL[request.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(request.id);
        }
      }}
      className="w-full cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{request.customerName}</p>
          <p className="text-xs text-gray-500">{request.ref}</p>
          <Link
            href={`/services/details?id=${request.serviceId}`}
            onClick={(event) => event.stopPropagation()}
            className="text-xs text-blue-600 hover:underline"
          >
            {formatRepairLabel(request.serviceId, request.serviceRef)}
          </Link>
          {showBranchColumn ? (
            <p className="text-xs text-gray-500">{branchNameFor(branches, request.branchId)}</p>
          ) : null}
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-sm text-gray-700">
          {request.items.length} item{request.items.length === 1 ? "" : "s"}
          {showRequestedByColumn ? ` · ${request.requestedBy.name}` : ""}
        </div>
        <span className="text-xs text-gray-500">{formatDate(request.requestedAt)}</span>
      </div>
    </div>
  );
}

const PurchaseRequestList = React.memo(function PurchaseRequestList({
  requests,
  onOpen,
  branches = [],
  showBranchColumn = false,
  showRequestedByColumn = true,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "requestedAt", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("ref", {
        id: "ref",
        header: "Ref",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{row.original.ref}</p>
            <Link
              href={`/services/details?id=${row.original.serviceId}`}
              onClick={(event) => event.stopPropagation()}
              className="text-xs text-blue-600 hover:underline"
            >
              {formatRepairLabel(row.original.serviceId, row.original.serviceRef)}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("customerName", {
        id: "customer",
        header: "Customer",
        cell: ({ getValue }) => <span className="text-gray-900">{getValue()}</span>,
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
      columnHelper.accessor((row) => row.items.length, {
        id: "items",
        header: "Items",
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ getValue }) => getValue(),
      }),
      ...(showRequestedByColumn ? [requestedByColumn] : []),
      columnHelper.accessor("requestedAt", {
        id: "requestedAt",
        header: "Date",
        sortingFn: (a, b) => a.original.requestedAt.getTime() - b.original.requestedAt.getTime(),
        cell: ({ getValue }) => <span className="text-gray-500">{formatDate(getValue())}</span>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = STATUS_LABEL[getValue()];
          return (
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          );
        },
      }),
    ],
    [showBranchColumn, branches, showRequestedByColumn]
  );

  const table = useReactTable({
    data: requests,
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

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No purchase requests yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Requests raised from a repair&apos;s details page will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm">
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <RequestCard
            key={row.id}
            request={row.original}
            onOpen={onOpen}
            branches={branches}
            showBranchColumn={showBranchColumn}
            showRequestedByColumn={showRequestedByColumn}
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

export default PurchaseRequestList;
