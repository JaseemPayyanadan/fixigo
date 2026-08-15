"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
  UserGroupIcon,
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

import { SortableTableHeader, TablePaginationFooter, TABLE_MIN_PAGE_SIZE, useViewportPageSize } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/ui/PageSkeleton";
import type { Branch, Technician } from "@/types";

const HEADER_CLASS = "px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500";

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-700 bg-emerald-50",
  inactive: "text-gray-600 bg-gray-100",
  maintenance: "text-amber-700 bg-amber-50",
};

interface ShopAdminBranchListProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  shopId?: string;
  onAddBranch?: () => void;
  onEditBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branch: Branch) => void;
}

interface BranchRow extends Branch {
  technicianNames: string[];
  technicianCount: number;
  locationLabel: string;
  phoneLabel: string;
  emailLabel: string;
}

const columnHelper = createColumnHelper<BranchRow>();

function BranchCard({
  branch,
  onEdit,
  onDelete,
}: {
  branch: BranchRow;
  onEdit: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
}) {
  const statusClass = STATUS_STYLE[branch.status] ?? STATUS_STYLE.inactive;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{branch.name}</p>
            <p className="truncate text-xs text-gray-500">{branch.locationLabel}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 capitalize ${statusClass}`}
        >
          {branch.status}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p className="flex items-center gap-1.5">
          <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
          {branch.phoneLabel}
        </p>
        <p className="flex items-center gap-1.5">
          <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
          {branch.emailLabel}
        </p>
        <p className="flex items-center gap-1.5">
          <UserGroupIcon className="h-3.5 w-3.5 shrink-0" />
          {branch.technicianCount} {branch.technicianCount === 1 ? "technician" : "technicians"}
        </p>
        {branch.technicianNames.length > 0 && (
          <p className="pl-5 text-gray-400">
            {branch.technicianNames.slice(0, 2).join(", ")}
            {branch.technicianNames.length > 2 && ` +${branch.technicianNames.length - 2} more`}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
        <button
          type="button"
          onClick={() => onEdit(branch)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
          aria-label="Edit branch"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(branch)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete branch"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Branches list as a TanStack data table: sortable headers, pagination, cards below `md`. */
export const ShopAdminBranchList: React.FC<ShopAdminBranchListProps> = ({
  branches,
  loading,
  error,
  shopId,
  onAddBranch,
  onDeleteBranch,
}) => {
  const router = useRouter();
  const [techniciansByBranch, setTechniciansByBranch] = useState<Record<string, string[]>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPageSize = useViewportPageSize(containerRef);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length || !shopId) return;

      try {
        const response = await fetch("/api/technicians");
        if (!response.ok) throw new Error("Failed to fetch technicians");
        const { technicians } = (await response.json()) as { technicians: Technician[] };

        const byBranch: Record<string, string[]> = {};
        for (const branch of branches) {
          const forBranch = technicians.filter(
            (technician) => technician.branchId === branch.id && technician.status === "active"
          );
          byBranch[branch.id] = forBranch.map((technician) => technician.name).filter(Boolean);
        }
        setTechniciansByBranch(byBranch);
      } catch (fetchError) {
        console.error("Error fetching technicians:", fetchError);
        setTechniciansByBranch({});
      }
    };

    void fetchTechnicians();
  }, [branches, shopId]);

  const data = useMemo<BranchRow[]>(
    () =>
      branches.map((branch) => {
        const technicianNames = techniciansByBranch[branch.id] ?? [];
        return {
          ...branch,
          technicianNames,
          technicianCount: technicianNames.length,
          locationLabel: branch.location || "No location",
          phoneLabel: branch.phone || "No phone",
          emailLabel: branch.email || "No email",
        };
      }),
    [branches, techniciansByBranch]
  );

  const handleEdit = useCallback(
    (branch: Branch) => {
      if (branch.id) router.push(`/branch/edit?id=${encodeURIComponent(branch.id)}`);
    },
    [router]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "name",
        header: "Branch",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900">{row.original.name}</p>
              <p className="truncate text-xs text-gray-400">{row.original.locationLabel}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("phoneLabel", {
        id: "contact",
        header: "Contact",
        meta: { headerClass: "hidden lg:table-cell", cellClass: "hidden lg:table-cell" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-gray-700">
              <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {row.original.phoneLabel}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {row.original.emailLabel}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("technicianCount", {
        id: "technicians",
        header: "Technicians",
        cell: ({ row }) => (
          <div>
            <p className="flex items-center gap-1.5 text-xs text-gray-700">
              <UserGroupIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {row.original.technicianCount}{" "}
              {row.original.technicianCount === 1 ? "technician" : "technicians"}
            </p>
            {row.original.technicianNames.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">
                {row.original.technicianNames.slice(0, 2).join(", ")}
                {row.original.technicianNames.length > 2 &&
                  ` +${row.original.technicianNames.length - 2} more`}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          const statusClass = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
          return (
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 capitalize ${statusClass}`}
            >
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
          const branch = row.original;
          return (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleEdit(branch)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Edit"
                aria-label="Edit branch"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              {onDeleteBranch && (
                <button
                  type="button"
                  onClick={() => onDeleteBranch(branch)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Delete"
                  aria-label="Delete branch"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [handleEdit, onDeleteBranch]
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

  const rows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  useEffect(() => {
    const lastPage = Math.max(table.getPageCount() - 1, 0);
    if (pageIndex > lastPage) table.setPageIndex(lastPage);
  }, [pageIndex, branches.length, table]);

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto max-w-sm px-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Branches</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="mx-auto max-w-sm px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No branches yet</h3>
          <p className="mb-6 text-sm text-gray-600">
            Get started by adding your first branch to manage multiple locations.
          </p>
          {onAddBranch && (
            <button
              type="button"
              onClick={onAddBranch}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Your First Branch
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col p-4 md:p-6">
      <div
        ref={containerRef}
        className="flex min-h-0 flex-col rounded-2xl md:h-full md:flex-1 md:overflow-hidden md:border md:border-gray-100 md:bg-white md:shadow-sm"
      >
        <div className="space-y-3 md:hidden">
          {rows.map((row) => (
            <BranchCard
              key={row.id}
              branch={row.original}
              onEdit={handleEdit}
              onDelete={onDeleteBranch}
            />
          ))}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
            <SortableTableHeader table={table} headerClass={HEADER_CLASS} />
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { headerClass?: string; cellClass?: string }
                      | undefined;
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

        <TablePaginationFooter table={table} />
      </div>
    </div>
  );
};

export default ShopAdminBranchList;
