"use client";

import React, { useCallback, useMemo } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

import { getStatusConfig } from "@/lib/statusUtils";
import type { Technician } from "@/types";

export interface ServiceTableItem {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
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

/**
 * Dense table for the Repairs list. Rows navigate to details; action buttons
 * stop propagation so edit/delete do not also open the detail page.
 */
export function ServiceTable({
  services,
  branches,
  technicians,
  showBranch = true,
  onEdit,
  onDelete,
}: ServiceTableProps) {
  const router = useRouter();

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch) => map.set(branch.id, branch.name));
    return map;
  }, [branches]);

  // Keyed by both ids a service can reference. `ServiceForm` writes the user id
  // when a technician files their own job and only rewrites it to the document
  // id once the technicians list has loaded, so both forms exist in the data —
  // keying on `id` alone leaves those rows showing a dash.
  const technicianMap = useMemo(() => {
    const map = new Map<string, string>();
    technicians.forEach((tech) => {
      map.set(tech.id, tech.name);
      if (tech.userId) map.set(tech.userId, tech.name);
    });
    return map;
  }, [technicians]);

  const openDetails = useCallback(
    (id: string) => {
      router.push(`/services/details?id=${id}`);
    },
    [router]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Repair
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer
              </th>
              <th scope="col" className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                Device
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              {showBranch && (
                <th scope="col" className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 xl:table-cell">
                  Branch
                </th>
              )}
              <th scope="col" className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                Technician
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Price
              </th>
              <th scope="col" className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((service) => {
              const status = getStatusConfig(service.status);
              const date = service.createdAt ? new Date(service.createdAt) : null;
              const technicianName = service.technician_id
                ? technicianMap.get(service.technician_id) ?? "—"
                : "Unassigned";
              const branchName = branchMap.get(service.branchId) ?? "—";

              return (
                // Clicking the row is a mouse shortcut only. It is deliberately
                // not focusable: keyboard users reach the same destination via
                // the "View details" link in the row, so making the row a tab
                // stop as well would double every stop in the table. It also
                // removes a trap — a row-level Enter/Space handler swallows
                // those keys from the buttons nested inside it, so activating
                // Edit or Delete from the keyboard would navigate instead.
                <tr
                  key={service.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50 focus-within:bg-gray-50"
                  onClick={() => openDetails(service.id)}
                >
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{service.name || "Repair"}</p>
                      <p className="truncate text-xs text-gray-400">#{service.id.slice(-8)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate text-sm font-medium text-gray-900">{service.customer?.name || "—"}</p>
                    {service.customer?.phone && (
                      <p className="truncate text-xs text-gray-500">{service.customer.phone}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <p className="truncate text-sm text-gray-900">
                      {[service.device?.brand, service.device?.model].filter(Boolean).join(" ") || "—"}
                    </p>
                    {service.device?.imei && (
                      <p className="truncate font-mono text-xs text-gray-400">{service.device.imei}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap ${status.color} ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  {showBranch && (
                    <td className="hidden px-4 py-3 text-sm text-gray-700 xl:table-cell">
                      <span className="truncate">{branchName}</span>
                    </td>
                  )}
                  <td className="hidden px-4 py-3 text-sm text-gray-700 md:table-cell">
                    <span className="truncate">{technicianName}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                    {formatPrice(service.price)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-500 sm:table-cell">
                    {date && !Number.isNaN(date.getTime()) ? formatDate(date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/services/details?id=${service.id}`}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="View details"
                        aria-label="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
