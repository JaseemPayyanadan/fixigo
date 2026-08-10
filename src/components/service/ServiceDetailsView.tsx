"use client";

import Link from "next/link";
import React from "react";

import {
  MdArrowBack,
  MdBuild,
  MdCheckCircle,
  MdCurrencyRupee,
  MdDelete,
  MdDevices,
  MdEdit,
  MdFeedback,
  MdHistory,
  MdInventory,
  MdMoreVert,
  MdNotes,
  MdPayments,
  MdPerson,
  MdPriorityHigh,
  MdRefresh,
} from "react-icons/md";

import { Button } from "@/components/ui/Button";
import { getStatusConfig } from "@/lib/statusUtils";
import ServicePartsOrdered from "@/modules/purchase/ServicePartsOrdered";
import type { StatusHistoryEntry, Technician } from "@/types";

export interface ServiceDetailsViewModel {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  priority: string;
  branchId: string;
  technician_id?: string;
  notes?: string;
  workNotes?: string[];
  partsUsed?: Array<{ name: string; quantity: number; cost: number }>;
  customerFeedback?: { rating: number; comment?: string; date: Date };
  qualityScore?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  paymentStatus?: "pending" | "partial" | "paid";
  paidAmount?: number;
  paidAt?: Date;
  isReopened?: boolean;
  reopenReason?: string;
  createdAt: Date;
  updatedAt: Date;
  device?: {
    model?: string;
    brand?: string;
    imei?: string;
    color?: string;
    type?: string;
    issue?: string;
  };
  customer?: {
    name?: string;
    phone?: string;
    place?: string;
    email?: string;
    address?: string;
  };
}

export interface ServiceDetailsViewProps {
  service: ServiceDetailsViewModel;
  status: string;
  branchName: string;
  technician: Technician | null;
  technicianId: string | null;
  technicianDisplayName: string;
  paymentLabel: "Paid" | "Partially Paid" | "Unpaid";
  userCanReopen: boolean;
  updatingStatus: boolean;
  statusUpdateSuccess: boolean;
  paymentError: string | null;
  showDropdown: boolean;
  showHistory: boolean;
  statusHistory: StatusHistoryEntry[];
  statusOptions: string[];
  canRequestSparePart: boolean;
  onGoBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDropdown: () => void;
  onToggleHistory: () => void;
  onStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onUpdatePayment: () => void;
  onReopenClick: () => void;
  onRequestSparePart: () => void;
}

function displayOptional(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return labels[priority] || "Medium";
}

const priorityTone: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{children}</div>
    </div>
  );
}

export default function ServiceDetailsView({
  service,
  status,
  branchName,
  technician,
  technicianId,
  technicianDisplayName,
  paymentLabel,
  userCanReopen,
  updatingStatus,
  statusUpdateSuccess,
  paymentError,
  showDropdown,
  showHistory,
  statusHistory,
  statusOptions,
  canRequestSparePart,
  onGoBack,
  onEdit,
  onDelete,
  onToggleDropdown,
  onToggleHistory,
  onStatusChange,
  onUpdatePayment,
  onReopenClick,
  onRequestSparePart,
}: ServiceDetailsViewProps) {
  const statusConfig = getStatusConfig(status);
  const createdAt = service.createdAt ? new Date(service.createdAt) : null;
  const updatedAt = service.updatedAt ? new Date(service.updatedAt) : null;
  const priority = service.priority || "medium";
  const cardClass = "rounded-2xl border border-gray-100 bg-white shadow-sm";

  // The kebab menu closes on selection; leaving it open over the page after
  // "View History" (or behind the delete confirm) reads as a stuck menu.
  const handleEditClick = () => {
    onToggleDropdown();
    onEdit();
  };

  const handleUpdatePaymentClick = () => {
    onToggleDropdown();
    onUpdatePayment();
  };

  const handleRequestSparePartClick = () => {
    onToggleDropdown();
    onRequestSparePart();
  };

  const handleHistoryClick = () => {
    onToggleDropdown();
    onToggleHistory();
  };

  const handleDeleteClick = () => {
    onToggleDropdown();
    onDelete();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full space-y-4 p-4 md:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onGoBack}
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Go back"
            >
              <MdArrowBack className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900 md:text-lg">Service Details</h1>
              <nav className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Home
                </Link>
                <span aria-hidden="true">•</span>
                <Link
                  href="/services"
                  className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Services
                </Link>
                <span aria-hidden="true">•</span>
                <span className="text-gray-700">Service Details</span>
              </nav>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-14 sm:pl-0">
            {/* Desktop-only: the same control lives in the Actions bar below
                for mobile/tablet, hidden here so it doesn't render twice. */}
            <div className="hidden items-center gap-2 lg:flex">
              <span className="shrink-0 text-sm font-medium text-gray-600">Update Status</span>
              <select
                value={status}
                onChange={onStatusChange}
                disabled={updatingStatus}
                className="min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {updatingStatus && <span className="text-xs text-gray-500">Updating…</span>}
              {statusUpdateSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <MdCheckCircle className="h-4 w-4" />
                  Updated
                </span>
              )}
            </div>

            {/* Desktop-only: mirrors the Actions bar's Reopen button
                below, which is hidden at `lg` so nothing renders twice. */}
            {userCanReopen && (
              <button
                type="button"
                onClick={onReopenClick}
                className="hidden min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 lg:inline-flex"
              >
                <MdRefresh className="h-4 w-4" />
                Reopen Service
              </button>
            )}
            <div className="relative dropdown-container">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onToggleDropdown}
                aria-label="More options"
              >
                <MdMoreVert className="h-5 w-5" />
              </Button>
              {showDropdown && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <MdEdit className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Edit Service</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdatePaymentClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <MdPayments className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Update Payment</span>
                  </button>
                  {canRequestSparePart && (
                    <button
                      type="button"
                      onClick={handleRequestSparePartClick}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <MdInventory className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Request Spare Part</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleHistoryClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <MdHistory className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">View History</span>
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <MdDelete className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Delete Service</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {paymentError && (
          <p role="alert" className="text-sm text-red-600">
            {paymentError}
          </p>
        )}

        {/* Summary hero */}
        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MdDevices className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-gray-900">{service.name || "Repair"}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-gray-700">
                    #{service.id.slice(-8)}
                  </span>
                  <span>Created: {formatShortDate(createdAt)}</span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    •
                  </span>
                  <span>Updated: {formatShortDate(updatedAt)}</span>
                </div>
                {service.isReopened && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      <MdRefresh className="h-3.5 w-3.5" aria-hidden="true" />
                      Reopened
                    </span>
                    {service.reopenReason && (
                      <span className="text-xs text-gray-500">Reason: {service.reopenReason}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Status</div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color} ${statusConfig.bg}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Priority</div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[priority] || priorityTone.medium}`}
                >
                  <MdPriorityHigh className="h-3.5 w-3.5" aria-hidden="true" />
                  {getPriorityLabel(priority)}
                </span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Payment</div>
                <button
                  type="button"
                  onClick={onUpdatePayment}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    paymentLabel === "Paid"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : paymentLabel === "Partially Paid"
                        ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }`}
                  aria-label={`Payment ${paymentLabel}. Update payment`}
                >
                  <MdPayments className="h-3.5 w-3.5" aria-hidden="true" />
                  {paymentLabel}
                </button>
                <div className="mt-1 text-xs text-gray-500">
                  {paymentLabel === "Paid"
                    ? `₹${service.price?.toLocaleString()} received`
                    : paymentLabel === "Partially Paid"
                      ? `₹${(service.paidAmount ?? 0).toLocaleString()} of ₹${service.price?.toLocaleString()} received`
                      : `₹${service.price?.toLocaleString()} outstanding`}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Service Price</div>
                <div className="flex items-center gap-1 text-2xl font-bold text-blue-600">
                  <MdCurrencyRupee className="h-5 w-5" aria-hidden="true" />
                  {service.price?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions bar — mobile/tablet only; the header's top-right row
            carries the same controls at `lg`. */}
        <section className={`${cardClass} p-4 lg:hidden`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <span className="shrink-0 text-sm font-medium text-gray-600">Update Status</span>
              <select
                value={status}
                onChange={onStatusChange}
                disabled={updatingStatus}
                className="min-h-11 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:max-w-xs"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {updatingStatus && (
                <span className="text-xs text-gray-500">Updating…</span>
              )}
              {statusUpdateSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <MdCheckCircle className="h-4 w-4" />
                  Updated
                </span>
              )}
            </div>

            {userCanReopen && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={onReopenClick}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <MdRefresh className="h-4 w-4" />
                  Reopen Service
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Service information */}
        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <MdBuild className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Service Information</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Service Name">{service.name || "—"}</Field>
            <Field label="Branch">{branchName}</Field>
            <Field label="Assigned Technician">{technicianDisplayName}</Field>
            {technician?.phone && <Field label="Technician Phone">{technician.phone}</Field>}
            {technician?.email && <Field label="Technician Email">{technician.email}</Field>}
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Description">{displayOptional(service.description)}</Field>
            </div>
          </div>
        </section>

        {/* Device */}
        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <MdDevices className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Device Information</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Brand">{displayOptional(service.device?.brand)}</Field>
            <Field label="Model">{displayOptional(service.device?.model)}</Field>
            <Field label="Type">{displayOptional(service.device?.type)}</Field>
            <Field label="Color">{displayOptional(service.device?.color)}</Field>
            <div className="sm:col-span-2">
              <Field label="IMEI">
                <span className="font-mono text-sm">{displayOptional(service.device?.imei)}</span>
              </Field>
            </div>
            {service.device?.issue && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Issue">{service.device.issue}</Field>
              </div>
            )}
          </div>
        </section>

        {/* Customer + Technician */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                <MdPerson className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">{displayOptional(service.customer?.name)}</Field>
              <Field label="Phone">{displayOptional(service.customer?.phone)}</Field>
              {service.customer?.email && <Field label="Email">{service.customer.email}</Field>}
              {service.customer?.address && (
                <Field label="Address">{service.customer.address}</Field>
              )}
              {service.customer?.place && <Field label="Place">{service.customer.place}</Field>}
            </div>
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                <MdPerson className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Assigned Technician</h3>
            </div>
            {technicianId ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">{technicianDisplayName}</Field>
                {technician?.phone && <Field label="Phone">{technician.phone}</Field>}
                {technician?.email && <Field label="Email">{technician.email}</Field>}
                {technician?.experience != null && (
                  <Field label="Experience">{technician.experience} years</Field>
                )}
                {technician?.specializations && technician.specializations.length > 0 && (
                  <div className="sm:col-span-2">
                    <Field label="Specializations">
                      {technician.specializations.join(", ")}
                    </Field>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No technician assigned.</p>
            )}
          </section>
        </div>

        {/* Optional blocks */}
        {(service.notes || (service.workNotes && service.workNotes.length > 0)) && (
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <MdNotes className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Notes & Work Notes</h3>
            </div>
            {service.notes && (
              <p className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-900">
                {service.notes}
              </p>
            )}
            {service.workNotes?.map((note, index) => (
              <div
                key={`worknote-${index}-${note.slice(0, 12)}`}
                className="mb-2 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-gray-900"
              >
                {note}
              </div>
            ))}
          </section>
        )}

        {service.partsUsed && service.partsUsed.length > 0 && (
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <MdInventory className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Parts Used</h3>
            </div>
            <div className="space-y-2">
              {service.partsUsed.map((part, index) => (
                <div
                  key={`part-${index}-${part.name}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{part.name}</div>
                    <div className="text-xs text-gray-500">Quantity: {part.quantity}</div>
                  </div>
                  <div className="font-bold text-gray-900">₹{part.cost.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <ServicePartsOrdered serviceId={service.id} />

        {service.customerFeedback && (
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100">
                <MdFeedback className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Customer Feedback</h3>
            </div>
            <p className="text-sm text-gray-900">Rating: {service.customerFeedback.rating}/5</p>
            {service.customerFeedback.comment && (
              <p className="mt-2 text-sm text-gray-600">{service.customerFeedback.comment}</p>
            )}
          </section>
        )}

        {showHistory && (
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <MdHistory className="h-4 w-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Status History</h3>
            </div>
            {statusHistory.length > 0 ? (
              <div className="space-y-2">
                {statusHistory.map((entry, index) => {
                  const entryStatus = getStatusConfig(entry.status);
                  return (
                    <div
                      key={`history-${entry.status}-${entry.timestamp.getTime()}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${entryStatus.color} ${entryStatus.bg}`}
                        >
                          {entryStatus.label}
                        </span>
                        <span className="text-xs text-gray-600">{entry.updatedBy}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No status history available.</p>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
