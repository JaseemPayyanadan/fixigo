"use client";

import { useEffect, useId, useState } from "react";

import { MdClose, MdPayments } from "react-icons/md";

import type { ServicePaymentStatus } from "@/lib/paymentUtils";

export interface CollectPaymentSaveInput {
  paymentStatus: ServicePaymentStatus;
  paidAmount?: number;
}

interface CollectPaymentDialogProps {
  isOpen: boolean;
  amount: number;
  /** Pre-select when reopening to update an existing payment. */
  initialStatus?: ServicePaymentStatus;
  initialPaidAmount?: number;
  /** "complete" after status → Completed; "update" from the ⋯ menu. */
  context?: "complete" | "update";
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: CollectPaymentSaveInput) => void;
}

type Choice = "paid" | "partial" | "pending";

export default function CollectPaymentDialog({
  isOpen,
  amount,
  initialStatus = "paid",
  initialPaidAmount,
  context = "complete",
  submitting,
  error,
  onClose,
  onSave,
}: CollectPaymentDialogProps) {
  const titleId = useId();
  const amountId = useId();
  const [choice, setChoice] = useState<Choice>("paid");
  const [partialAmount, setPartialAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const next: Choice =
      initialStatus === "partial" || initialStatus === "pending" || initialStatus === "paid"
        ? initialStatus
        : "paid";
    setChoice(next);
    setPartialAmount(
      typeof initialPaidAmount === "number" && initialPaidAmount > 0
        ? String(initialPaidAmount)
        : ""
    );
    setValidationError(null);
  }, [isOpen, initialStatus, initialPaidAmount]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (!submitting) onClose();
  };

  const handleSave = () => {
    if (choice === "paid") {
      setValidationError(null);
      onSave({ paymentStatus: "paid", paidAmount: amount > 0 ? amount : undefined });
      return;
    }
    if (choice === "pending") {
      setValidationError(null);
      onSave({ paymentStatus: "pending" });
      return;
    }

    const paid = Number(partialAmount);
    if (!Number.isFinite(paid) || paid <= 0) {
      setValidationError("Enter how much was paid.");
      return;
    }
    if (amount > 0 && paid >= amount) {
      setValidationError("Partial payment must be less than the full amount. Choose Fully paid instead.");
      return;
    }
    setValidationError(null);
    onSave({ paymentStatus: "partial", paidAmount: paid });
  };

  const optionClass = (active: boolean) =>
    `flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
      active
        ? "border-emerald-300 bg-emerald-50"
        : "border-gray-200 bg-white hover:bg-gray-50"
    }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50"
        aria-label="Close dialog"
        onClick={handleDismiss}
        disabled={submitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <MdPayments className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {context === "update" ? "Update Payment" : "Payment Status"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-600">
          {context === "update"
            ? "Update how much of the service amount has been collected."
            : "Job is complete — record whether the customer paid in full, partially, or not yet."}
        </p>
        <p className="mb-4 text-2xl font-bold text-gray-900">
          ₹{amount.toLocaleString()}
          <span className="ml-2 text-sm font-medium text-gray-500">total</span>
        </p>

        <fieldset className="mb-4 space-y-2" disabled={submitting}>
          <legend className="sr-only">Payment status</legend>

          <label className={optionClass(choice === "paid")}>
            <input
              type="radio"
              name="payment-status"
              className="h-4 w-4 accent-emerald-600"
              checked={choice === "paid"}
              onChange={() => setChoice("paid")}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Fully paid</span>
              <span className="block text-xs text-gray-500">Customer paid the full amount</span>
            </span>
          </label>

          <label className={optionClass(choice === "partial")}>
            <input
              type="radio"
              name="payment-status"
              className="h-4 w-4 accent-emerald-600"
              checked={choice === "partial"}
              onChange={() => setChoice("partial")}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Partially paid</span>
              <span className="block text-xs text-gray-500">Customer paid some of the amount</span>
            </span>
          </label>

          <label className={optionClass(choice === "pending")}>
            <input
              type="radio"
              name="payment-status"
              className="h-4 w-4 accent-emerald-600"
              checked={choice === "pending"}
              onChange={() => setChoice("pending")}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Unpaid</span>
              <span className="block text-xs text-gray-500">No payment collected yet</span>
            </span>
          </label>
        </fieldset>

        {choice === "partial" && (
          <div className="mb-4">
            <label htmlFor={amountId} className="mb-1 block text-sm font-medium text-gray-700">
              Amount paid <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
                ₹
              </span>
              <input
                id={amountId}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={partialAmount}
                onChange={(e) => {
                  setPartialAmount(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                disabled={submitting}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            {(() => {
              const paid = Number(partialAmount);
              if (!Number.isFinite(paid) || paid <= 0 || amount <= 0 || paid >= amount) return null;
              return (
                <p className="mt-1.5 text-xs text-gray-500">
                  Remaining: ₹{(amount - paid).toLocaleString()}
                </p>
              );
            })()}
          </div>
        )}

        {(validationError || error) && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {validationError || error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
