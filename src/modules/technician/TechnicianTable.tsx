"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
  UserIcon,
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

import { PermissionGuard } from "@/components";
import { TABLE_MIN_PAGE_SIZE, useViewportPageSize } from "@/components/ui/DataTable";
import type { Branch, Technician } from "@/types";

const HEADER_CLASS = "px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500";

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-700 bg-emerald-50",
  inactive: "text-gray-600 bg-gray-100",
};

function branchNameFor(branchId: string, branches: Branch[]): string {
  if (!branchId) return "No branch";
  return branches.find((branch) => branch.id === branchId)?.name ?? "Unknown branch";
}

interface TechnicianRow extends Technician {
  branchName: string;
}

interface TechnicianTableProps {
  technicians: Technician[];
  branches: Branch[];
  onView: (technician: Technician) => void;
  onEdit: (technician: Technician) => void;
  onDelete: (technician: Technician) => void;
}

const columnHelper = createColumnHelper<TechnicianRow>();

/** Phone-sized rendering of one technician. Same fields as a table row,
 * stacked so nothing has to scroll sideways. */
function TechnicianCard({
  technician,
  onView,
  onEdit,
  onDelete,
}: {
  technician: TechnicianRow;
  onView: (technician: Technician) => void;
  onEdit: (technician: Technician) => void;
  onDelete: (technician: Technician) => void;
}) {
  const statusClass = STATUS_STYLE[technician.status] ?? STATUS_STYLE.inactive;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{technician.name || "Unknown"}</p>
          <p className="truncate text-xs text-gray-500">{technician.email}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 capitalize ${statusClass}`}>
          {technician.status}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p className="flex items-center gap-1.5">
          <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
          {technician.phone || "—"}
        </p>
        <p className="flex items-center gap-1.5">
          <BuildingOfficeIcon className="h-3.5 w-3.5 shrink-0" />
          {technician.branchName}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-500">{technician.experience ?? 0} yrs experience</span>
        <div className="flex items-center gap-1">
          <PermissionGuard permissions={["technician:read"]} fallback={null}>
            <button
              type="button"
              onClick={() => onView(technician)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
              aria-label="View technician"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </PermissionGuard>
          <PermissionGuard permissions={["technician:write"]} fallback={null}>
            <button
              type="button"
              onClick={() => onEdit(technician)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
              aria-label="Edit technician"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </PermissionGuard>
          <PermissionGuard permissions={["technician:delete"]} fallback={null}>
            <button
              type="button"
              onClick={() => onDelete(technician)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Deactivate technician"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </PermissionGuard>
        </div>
      </div>
    </div>
  );
}

/** Technicians list as a TanStack data table, mirroring the repairs table:
 * sortable headers, client-side pagination, cards below `md`. */
export function TechnicianTable({ technicians, branches, onView, onEdit, onDelete }: TechnicianTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPageSize = useViewportPageSize(containerRef);

  const data = useMemo<TechnicianRow[]>(
    () => technicians.map((technician) => ({ ...technician, branchName: branchNameFor(technician.branchId, branches) })),
    [technicians, branches]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "name",
        header: "Technician",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-900">{row.original.name || "Unknown"}</p>
            <p className="flex items-center gap-1 truncate text-xs text-gray-400">
              <EnvelopeIcon className="h-3 w-3 shrink-0" />
              {row.original.email}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("phone", {
        id: "phone",
        header: "Contact",
        meta: { headerClass: "hidden lg:table-cell", cellClass: "hidden lg:table-cell" },
        cell: ({ getValue }) => <span className="text-xs text-gray-700">{getValue() || "—"}</span>,
      }),
      columnHelper.accessor("branchName", {
        id: "branch",
        header: "Branch",
        meta: { cellClass: "text-xs text-gray-700" },
        cell: ({ getValue }) => <span className="truncate">{getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.experience ?? 0, {
        id: "experience",
        header: "Experience",
        meta: { headerClass: "text-right", cellClass: "text-right text-xs text-gray-700" },
        cell: ({ getValue }) => <span>{getValue()} yrs</span>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          const statusClass = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
          return (
            <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 capitalize ${statusClass}`}>
              {status}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ row }) => {
          const technician = row.original;
          return (
            <div className="inline-flex items-center gap-1">
              <PermissionGuard permissions={["technician:read"]} fallback={null}>
                <button
                  type="button"
                  onClick={() => onView(technician)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="View"
                  aria-label="View technician"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </PermissionGuard>
              <PermissionGuard permissions={["technician:write"]} fallback={null}>
                <button
                  type="button"
                  onClick={() => onEdit(technician)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Edit"
                  aria-label="Edit technician"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </PermissionGuard>
              <PermissionGuard permissions={["technician:delete"]} fallback={null}>
                <button
                  type="button"
                  onClick={() => onDelete(technician)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Deactivate"
                  aria-label="Deactivate technician"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </PermissionGuard>
            </div>
          );
        },
      }),
    ],
    [onView, onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: TABLE_MIN_PAGE_SIZE } },
  });

  useEffect(() => {
    table.setPageSize(autoPageSize);
  }, [table, autoPageSize]);

  const pageIndex = table.getState().pagination.pageIndex;
  useEffect(() => {
    const lastPage = Math.max(table.getPageCount() - 1, 0);
    if (pageIndex > lastPage) table.setPageIndex(lastPage);
  }, [pageIndex, technicians.length, table]);
  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const lastRow = Math.min(firstRow + table.getState().pagination.pageSize - 1, totalRows);

  if (technicians.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <UserIcon className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900">No technicians found</h3>
        <p className="max-w-md text-gray-600">
          Technicians help you manage service requests efficiently. Add your first technician to get started.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-col rounded-2xl md:h-full md:flex-1 md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm"
    >
      {/* Cards on phones, table from `md` up. */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <TechnicianCard key={row.id} technician={row.original} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { headerClass?: string; cellClass?: string } | undefined;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
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
              <tr key={row.id} className="transition-colors hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as { headerClass?: string; cellClass?: string } | undefined;
                  return (
                    <td key={cell.id} className={`px-2 py-2 ${meta?.cellClass ?? ""}`}>
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
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm md:mt-0 md:rounded-none md:border-x-0 md:border-b-0 md:shadow-none">
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
}

export default TechnicianTable;
