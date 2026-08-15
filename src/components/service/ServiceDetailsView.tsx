"use client";

import React from "react";

import {
  MdArrowBack,
  MdCall,
  MdCancel,
  MdCheck,
  MdCheckCircle,
  MdContentCopy,
  MdDelete,
  MdDevices,
  MdEdit,
  MdEmail,
  MdHistory,
  MdInventory,
  MdKeyboardArrowDown,
  MdLocationOn,
  MdNotes,
  MdPayments,
  MdPerson,
  MdPriorityHigh,
  MdPrint,
  MdRefresh,
  MdStore,
} from "react-icons/md";

import { getStatusConfig, normalizeStatus } from "@/lib/statusUtils";
import ServicePartsOrdered from "@/modules/purchase/ServicePartsOrdered";
import type { Branch, StatusHistoryEntry, Technician } from "@/types";

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
  branch: Branch | null;
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
  onStepClick: (status: string) => void;
  onPrint: () => void;
  onUpdatePayment: () => void;
  onReopenClick: () => void;
  onRequestSparePart: () => void;
}

function displayOptional(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
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

// Which of the 4 visual stages each real status belongs to, and which status
// clicking that stage should move the job to. Statuses beyond the primary
// forward-flow (awaiting parts, on hold, ready for pickup, awaiting drop-off)
// still show up as a sub-label under their stage instead of getting their own
// step — the "Other status" select below the stepper is how they're actually
// set.
const PROGRESS_STEPS: Array<{
  step: number;
  label: string;
  baseDescription: string;
  statuses: string[];
  targetStatus: string;
}> = [
  {
    step: 1,
    label: "To Do",
    baseDescription: "Waiting to be started",
    statuses: ["awaiting_drop_off", "pending", "to_do"],
    targetStatus: "pending",
  },
  {
    step: 2,
    label: "In Progress",
    baseDescription: "Repair in progress",
    statuses: ["in_progress", "awaiting_parts", "on_hold"],
    targetStatus: "in_progress",
  },
  {
    step: 3,
    label: "Testing",
    baseDescription: "Quality check",
    statuses: ["quality_check"],
    targetStatus: "quality_check",
  },
  {
    step: 4,
    label: "Completed",
    baseDescription: "Repair completed",
    statuses: ["completed", "ready_for_pickup"],
    targetStatus: "completed",
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{children}</div>
    </div>
  );
}

function ContactField({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Field label={label}>{value}</Field>
      {href && icon && (
        <a
          href={href}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={label}
        >
          {icon}
        </a>
      )}
    </div>
  );
}

export default function ServiceDetailsView({
  service,
  status,
  branchName,
  branch,
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
  onStepClick,
  onPrint,
  onUpdatePayment,
  onReopenClick,
  onRequestSparePart,
}: ServiceDetailsViewProps) {
  const statusConfig = getStatusConfig(status);
  const normalizedStatus = normalizeStatus(status);
  const isCancelled = normalizedStatus === "cancelled";
  const currentStepIndex = Math.max(
    0,
    PROGRESS_STEPS.findIndex((def) => def.statuses.includes(normalizedStatus))
  );
  const createdAt = service.createdAt ? new Date(service.createdAt) : null;
  const updatedAt = service.updatedAt ? new Date(service.updatedAt) : null;
  const priority = service.priority || "medium";
  const cardClass = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const paidAmount = service.paidAmount ?? 0;
  const dueAmount = Math.max((service.price ?? 0) - paidAmount, 0);

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

  const handleHistoryClick = () => {
    onToggleDropdown();
    onToggleHistory();
  };

  const handleDeleteClick = () => {
    onToggleDropdown();
    onDelete();
  };

  const handleReopenMenuClick = () => {
    onToggleDropdown();
    onReopenClick();
  };

  const handleRequestSparePartMenuClick = () => {
    onToggleDropdown();
    onRequestSparePart();
  };

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(service.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <MdArrowBack className="h-5 w-5" />
            Back to Repairs
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <MdPrint className="h-4 w-4" />
              Print / Download
            </button>

            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={onToggleDropdown}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MdEdit className="h-4 w-4" />
                Edit Repair
                <MdKeyboardArrowDown className="h-4 w-4" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
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
                      onClick={handleRequestSparePartMenuClick}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <MdInventory className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Request Spare Part</span>
                    </button>
                  )}
                  {userCanReopen && (
                    <button
                      type="button"
                      onClick={handleReopenMenuClick}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <MdRefresh className="h-4 w-4 text-amber-700" />
                      <span className="text-sm font-medium">Reopen Service</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleHistoryClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <MdHistory className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">{showHistory ? "Hide History" : "View History"}</span>
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

        {/* Hero: repair id, status badges, device + fee summary */}
        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500">Repair ID</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-base font-bold text-gray-900 sm:text-lg md:text-base lg:text-lg">
                  #{service.id.slice(-8).toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy repair ID"
                  className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <MdContentCopy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500">Created: {formatDateTime(createdAt)}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-8">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Status</div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color} ${statusConfig.bg}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Priority</div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[priority] || priorityTone.medium}`}
                >
                  <MdPriorityHigh className="h-3.5 w-3.5" aria-hidden="true" />
                  {getPriorityLabel(priority)}
                </span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Payment Status</div>
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
                  {paymentLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MdDevices className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg md:text-base lg:text-lg">{service.name || "Repair"}</h2>
                <div className="mt-1 text-sm text-gray-600">{displayOptional(service.device?.model)}</div>
                <div className="text-xs text-gray-500">IMEI: {displayOptional(service.device?.imei)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 sm:text-right">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Service Fee</div>
                <div className="text-base font-bold text-gray-900 sm:text-lg md:text-base lg:text-lg">₹{(service.price ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Paid</div>
                <div className="text-base font-bold text-gray-900 sm:text-lg md:text-base lg:text-lg">₹{paidAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Due Amount</div>
                <div className={`text-base font-bold sm:text-lg md:text-base lg:text-lg ${dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{dueAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {service.isReopened && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                <MdRefresh className="h-3.5 w-3.5" aria-hidden="true" />
                Reopened
              </span>
              {service.reopenReason && (
                <span className="text-xs text-gray-500">Reason: {service.reopenReason}</span>
              )}
            </div>
          )}
        </section>

        {/* Customer + Device */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                <MdPerson className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="space-y-3">
              <ContactField label="Name" value={displayOptional(service.customer?.name)} />
              <ContactField
                label="Phone"
                value={displayOptional(service.customer?.phone)}
                href={service.customer?.phone ? `tel:${service.customer.phone}` : undefined}
                icon={<MdCall className="h-4 w-4" />}
              />
              {service.customer?.email && (
                <ContactField
                  label="Email"
                  value={service.customer.email}
                  href={`mailto:${service.customer.email}`}
                  icon={<MdEmail className="h-4 w-4" />}
                />
              )}
              {(service.customer?.place || service.customer?.address) && (
                <ContactField
                  label="Place"
                  value={service.customer.place || service.customer.address || "—"}
                />
              )}
            </div>
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <MdDevices className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Device Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Brand">{displayOptional(service.device?.brand)}</Field>
              <Field label="Model">{displayOptional(service.device?.model)}</Field>
              <Field label="Type">{displayOptional(service.device?.type)}</Field>
              <Field label="Color">{displayOptional(service.device?.color)}</Field>
              <div className="col-span-2">
                <Field label="IMEI">
                  <span className="font-mono text-sm">{displayOptional(service.device?.imei)}</span>
                </Field>
              </div>
              {service.device?.issue && (
                <div className="col-span-2">
                  <Field label="Issue">{service.device.issue}</Field>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Technician + Branch */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                <MdPerson className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Assigned Technician</h3>
            </div>
            {technicianId ? (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700">
                  {technicianDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900">{technicianDisplayName}</div>
                  <div className="text-xs text-gray-500">
                    {technician?.role === "branch_admin" ? "Branch Admin" : "Technician"}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {technician?.phone && (
                      <div className="flex items-center gap-1.5">
                        <MdCall className="h-3.5 w-3.5" aria-hidden="true" />
                        {technician.phone}
                      </div>
                    )}
                    {technician?.email && (
                      <div className="flex items-center gap-1.5">
                        <MdEmail className="h-3.5 w-3.5" aria-hidden="true" />
                        {technician.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No technician assigned.</p>
            )}
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
                <MdStore className="h-4 w-4 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Branch Information</h3>
            </div>
            <div className="text-sm font-semibold text-gray-900">{branch?.name || branchName}</div>
            {branch?.location && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                <MdLocationOn className="h-3.5 w-3.5" aria-hidden="true" />
                {branch.location}
              </div>
            )}
            {branch?.phone && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                <MdCall className="h-3.5 w-3.5" aria-hidden="true" />
                {branch.phone}
              </div>
            )}
          </section>
        </div>

        {/* Service Progress */}
        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Service Progress</h3>
            <div className="flex items-center gap-2">
              {updatingStatus && <span className="text-xs text-gray-500">Updating…</span>}
              {statusUpdateSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <MdCheckCircle className="h-4 w-4" />
                  Updated
                </span>
              )}
            </div>
          </div>

          {isCancelled ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <MdCancel className="h-5 w-5" aria-hidden="true" />
              This repair has been cancelled.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-w-[560px] items-start">
                {PROGRESS_STEPS.map((def, index) => {
                  const isCurrent = index === currentStepIndex;
                  const isDone = index < currentStepIndex;
                  const description =
                    isCurrent && def.targetStatus !== normalizedStatus
                      ? getStatusConfig(status).label
                      : def.baseDescription;
                  return (
                    <React.Fragment key={def.step}>
                      <button
                        type="button"
                        onClick={() => onStepClick(def.targetStatus)}
                        disabled={updatingStatus}
                        className="flex flex-1 cursor-pointer flex-col items-center gap-2 text-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                            isCurrent
                              ? "border-blue-600 bg-blue-600 text-white"
                              : isDone
                                ? "border-blue-300 bg-blue-50 text-blue-600"
                                : "border-gray-300 bg-white text-gray-400"
                          }`}
                        >
                          {isDone ? <MdCheck className="h-5 w-5" /> : def.step}
                        </span>
                        <span className={`text-sm font-semibold ${isCurrent ? "text-blue-700" : "text-gray-700"}`}>
                          {def.label}
                        </span>
                        <span className="max-w-[130px] text-xs text-gray-500">{description}</span>
                      </button>
                      {index < PROGRESS_STEPS.length - 1 && (
                        <div
                          className={`mt-5 h-0.5 flex-1 ${index < currentStepIndex ? "bg-blue-400" : "bg-gray-200"}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Click a stage above to update the status, or pick a specific status here.
            </p>
            <select
              value={status}
              onChange={onStatusChange}
              disabled={updatingStatus}
              aria-label="Set a specific status"
              className="min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {getStatusConfig(opt).label}
                </option>
              ))}
            </select>
          </div>
        </section>

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

        {/* Payment + Service History summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <MdPayments className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Payment Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-semibold text-gray-900">₹{(service.price ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paid Amount</span>
                <span className="font-semibold text-gray-900">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-700">Due Amount</span>
                <span className={`font-bold ${dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{dueAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onUpdatePayment}
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <MdPayments className="h-4 w-4" />
              Record Payment
            </button>
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <MdHistory className="h-4 w-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Service History</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">{formatDateTime(createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-gray-900">{formatDateTime(updatedAt)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleHistory}
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <MdHistory className="h-4 w-4" />
              {showHistory ? "Hide Full History" : "View Full History"}
            </button>
          </section>
        </div>

        {showHistory && (
          <section className={`${cardClass} p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <MdHistory className="h-4 w-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Full Status History</h3>
            </div>
            {statusHistory.length > 0 ? (
              <div className="space-y-2">
                {statusHistory.map((entry, index) => {
                  const entryStatus = getStatusConfig(entry.status);
                  return (
                    <div
                      key={`history-${entry.status}-${entry.timestamp.getTime()}-${index}`}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between">
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
                      {entry.note && <p className="mt-2 text-xs text-gray-700">{entry.note}</p>}
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
