"use client";

import { useId } from "react";

import { MdClose, MdPayments } from "react-icons/md";

interface CollectPaymentDialogProps {
  isOpen: boolean;
  amount: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onMarkPaid: () => void;
  onKeepUnpaid: () => void;
}

export default function CollectPaymentDialog({
  isOpen,
  amount,
  submitting,
  error,
  onClose,
  onMarkPaid,
  onKeepUnpaid,
}: CollectPaymentDialogProps) {
  const titleId = useId();

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (!submitting) onClose();
  };

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
              Collect Payment
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
          Device is ready to hand over — did the customer pay? It will not count towards collected
          takings until marked paid.
        </p>
        <p className="mb-4 text-2xl font-bold text-gray-900">
          ₹{amount.toLocaleString()}
          <span className="ml-2 text-sm font-medium text-gray-500">outstanding</span>
        </p>

        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onKeepUnpaid}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Keep Unpaid
          </button>
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={submitting}
            className="min-h-11 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
