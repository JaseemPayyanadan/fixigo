"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
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

import { isPaid, type ServicePaymentStatus } from "@/lib/paymentUtils";
import { resolveServiceRows, type ResolvedServiceRow } from "@/lib/serviceTableRows";
import { getStatusConfig } from "@/lib/statusUtils";
import type { Technician } from "@/types";

export interface ServiceTableItem {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  paymentStatus?: ServicePaymentStatus;
  customer: {
    name: string;
    phone: string;
  };
  device: {
    brand: string;
    model: string;
    imei: string;
  };
  branchId: string;
  technician_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BranchRef {
  id: string;
  name: string;
}

interface ServiceTableProps {
  services: ServiceTableItem[];
  branches: BranchRef[];
  technicians: Technician[];
  showBranch?: boolean;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (id: string) => void;
  /** Rows per page. Omit to size each page to the viewport height. */
  pageSize?: number;
}

/** Measured from the rendered table: row, header and footer heights in px. */
const ROW_HEIGHT = 61;
/** A stacked card carries the same fields as a row but in several lines, plus
 *  the gap between cards. */
const CARD_HEIGHT = 152 + 12;
const CHROME_HEIGHT = 41 + 49 + 24; // header row + pagination footer + card border/margin
const MIN_PAGE_SIZE = 5;
/** Below this width the table is replaced by cards (Tailwind's `md`). */
const CARD_BREAKPOINT = 768;

/**
 * Rows that fit between the table's top edge and the bottom of the window.
 * Re-measured on resize so rotating a tablet or opening devtools re-pages, and
 * so crossing the card breakpoint re-pages against the taller card height.
 */
function useViewportPageSize(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [size, setSize] = useState(MIN_PAGE_SIZE);

  useEffect(() => {
    if (!enabled) return;

    const measure = () => {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      const available = window.innerHeight - top - CHROME_HEIGHT;
      const rowHeight = window.innerWidth < CARD_BREAKPOINT ? CARD_HEIGHT : ROW_HEIGHT;
      setSize(Math.max(MIN_PAGE_SIZE, Math.floor(available / rowHeight)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref, enabled]);

  return size;
}

function formatPrice(price: number): string {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columnHelper = createColumnHelper<ResolvedServiceRow<ServiceTableItem>>();

/**
 * Phone-sized rendering of one repair. Same fields as a table row, stacked so
 * nothing has to scroll sideways; the whole card is the link to the details
 * page and the action buttons sit outside it.
 */
function ServiceCard({
  service,
  showBranch,
  onEdit,
  onDelete,
}: {
  service: ResolvedServiceRow<ServiceTableItem>;
  showBranch: boolean;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (id: string) => void;
}) {
  const status = getStatusConfig(service.status);
  const paid = isPaid(service);
  const date = service.createdAt ? new Date(service.createdAt) : null;
  const device = [service.device?.brand, service.device?.model].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Link
        href={`/services/details?id=${service.id}`}
        className="block rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{service.name || "Repair"}</p>
            <p className="truncate text-xs text-gray-400">
              #{service.id.slice(-8)}
              {date && !Number.isNaN(date.getTime()) && (
                <span className="text-gray-400"> · {formatDate(date)}</span>
              )}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${status.color} ${status.bg}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium text-gray-900">{service.customer?.name || "—"}</p>
            {service.customer?.phone && (
              <p className="truncate text-xs text-gray-500">{service.customer.phone}</p>
            )}
            {device && <p className="truncate text-xs text-gray-500">{device}</p>}
            <p className="truncate text-xs text-gray-500">
              {showBranch && service.branchName}
              {showBranch && service.technicianName ? " · " : ""}
              {service.technicianName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-gray-900">{formatPrice(service.price)}</p>
            <p className={`text-xs ${paid ? "text-emerald-600" : "text-amber-600"}`}>
              {paid ? "Paid" : "Unpaid"}
            </p>
          </div>
        </div>
      </Link>

      {(onEdit || onDelete) && (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(service)}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Edit repair"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this repair?")) {
                  onDelete(service.id);
                }
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Delete repair"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const HEADER_CLASS = "px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

/**
 * Repairs list as a TanStack data table: sortable headers and client-side
 * pagination over the already-filtered rows. Rows navigate to details; action
 * buttons stop propagation so edit/delete do not also open the detail page.
 */
export function ServiceTable({
  services,
  branches,
  technicians,
  showBranch = true,
  onEdit,
  onDelete,
  pageSize,
}: ServiceTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPageSize = useViewportPageSize(containerRef, pageSize === undefined);

  // Branch and technician names are projected onto the rows rather than looked
  // up inside the column accessors: the table caches accessor results per row
  // and only rebuilds those rows when `data` changes identity, so a lookup that
  // arrives after the services would otherwise never reach the screen. See
  // `resolveServiceRows`.
  const data = useMemo(
    () => resolveServiceRows(services, branches, technicians),
    [services, branches, technicians]
  );

  const openDetails = useCallback(
    (id: string) => {
      router.push(`/services/details?id=${id}`);
    },
    [router]
  );

  const columns = useMemo(
    () => [
      // Sorted on the name but rendered with the reference and date beneath it,
      // so `createdAt` also exists below as a hidden-by-layout sort target.
      columnHelper.accessor((row) => row.name || "Repair", {
        id: "name",
        header: "Repair",
        cell: ({ row }) => {
          const service = row.original;
          const date = service.createdAt ? new Date(service.createdAt) : null;
          return (
            <div className="min-w-0">
              {/* The name is the keyboard path to the details page — the row's
                  click handler is mouse-only. */}
              <Link
                href={`/services/details?id=${service.id}`}
                onClick={(event) => event.stopPropagation()}
                className="block truncate rounded text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {service.name || "Repair"}
              </Link>
              {/* Created date rides under the repair name instead of holding
                  its own column — it identifies the job the same way the
                  reference number does. */}
              <p className="truncate text-xs text-gray-400">
                #{service.id.slice(-8)}
                {date && !Number.isNaN(date.getTime()) && (
                  <span className="text-gray-400"> · {formatDate(date)}</span>
                )}
              </p>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.customer?.name ?? "", {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <>
              <p className="truncate text-sm font-medium text-gray-900">{customer?.name || "—"}</p>
              {customer?.phone && <p className="truncate text-xs text-gray-500">{customer.phone}</p>}
            </>
          );
        },
      }),
      columnHelper.accessor(
        (row) => [row.device?.brand, row.device?.model].filter(Boolean).join(" "),
        {
          id: "device",
          header: "Device",
          meta: { headerClass: "hidden lg:table-cell", cellClass: "hidden lg:table-cell" },
          cell: ({ row, getValue }) => (
            <>
              <p className="truncate text-sm text-gray-900">{getValue() || "—"}</p>
              {row.original.device?.imei && (
                <p className="truncate font-mono text-xs text-gray-400">{row.original.device.imei}</p>
              )}
            </>
          ),
        }
      ),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getStatusConfig(getValue());
          return (
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${status.color} ${status.bg}`}
            >
              {status.label}
            </span>
          );
        },
      }),
      ...(showBranch
        ? [
            columnHelper.accessor("branchName", {
              id: "branch",
              header: "Branch",
              meta: { cellClass: "text-sm text-gray-700" },
              cell: ({ getValue }) => <span className="truncate">{getValue()}</span>,
            }),
          ]
        : []),
      columnHelper.accessor("technicianName", {
        id: "technician",
        header: "Technician",
        meta: {
          headerClass: "hidden md:table-cell",
          cellClass: "hidden text-sm text-gray-700 md:table-cell",
        },
        cell: ({ getValue }) => <span className="truncate">{getValue()}</span>,
      }),
      // Paid state rides under the price rather than taking a column of its
      // own — it is about that amount, and the table is already wide on a shop
      // counter's screen.
      columnHelper.accessor("price", {
        id: "price",
        header: "Price",
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ row, getValue }) => {
          const paid = isPaid(row.original);
          return (
            <>
              <p className="text-sm font-semibold tabular-nums text-gray-900">{formatPrice(getValue())}</p>
              <p className={`text-xs ${paid ? "text-emerald-600" : "text-amber-600"}`}>
                {paid ? "Paid" : "Unpaid"}
              </p>
            </>
          );
        },
      }),
      // Sortable but never rendered as its own column — the date shows under
      // the repair name. Kept so "newest first" stays the default sort.
      columnHelper.accessor((row) => new Date(row.createdAt).getTime() || 0, {
        id: "createdAt",
        header: "Date",
        // Numeric compare on the timestamp, newest first on the first click and
        // as the table's opening order.
        sortingFn: "basic",
        sortDescFirst: true,
        meta: { headerClass: "hidden", cellClass: "hidden" },
        cell: () => null,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { headerClass: "text-right", cellClass: "text-right" },
        cell: ({ row }) => {
          const service = row.original;
          return (
            <div className="inline-flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(service)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Edit"
                  aria-label="Edit repair"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this repair?")) {
                      onDelete(service.id);
                    }
                  }}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Delete"
                  aria-label="Delete repair"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [showBranch, onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: pageSize ?? MIN_PAGE_SIZE } },
  });

  useEffect(() => {
    table.setPageSize(pageSize ?? autoPageSize);
  }, [table, pageSize, autoPageSize]);

  // Filtering happens upstream, so a narrowed result set can leave the table
  // parked on a page that no longer exists.
  const pageIndex = table.getState().pagination.pageIndex;
  useEffect(() => {
    const lastPage = Math.max(table.getPageCount() - 1, 0);
    if (pageIndex > lastPage) table.setPageIndex(lastPage);
  }, [pageIndex, services.length, table]);

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const lastRow = Math.min(firstRow + table.getState().pagination.pageSize - 1, totalRows);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm"
    >
      {/* Cards on phones, table from `md` up — same rows, same page. Each card
          is its own surface with space between, so the wrapper drops its frame
          below `md` rather than boxing them in a second border. */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <ServiceCard
            key={row.id}
            service={row.original}
            showBranch={showBranch}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-left">
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
              // Clicking the row is a mouse shortcut only. It is deliberately
              // not focusable: keyboard users reach the same destination via
              // the repair name link, so making the row a tab stop as well
              // would double every stop in the table. It also removes a trap —
              // a row-level Enter/Space handler swallows those keys from the
              // buttons nested inside it, so activating Edit or Delete from the
              // keyboard would navigate instead.
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-gray-50 focus-within:bg-gray-50"
                onClick={() => openDetails(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { headerClass?: string; cellClass?: string }
                    | undefined;
                  return (
                    <td key={cell.id} className={`px-2 py-3 ${meta?.cellClass ?? ""}`}>
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
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
