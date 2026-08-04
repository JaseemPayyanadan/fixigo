"use client";

import { useEffect, useId, useState } from "react";

import { MdClose, MdRefresh } from "react-icons/md";

interface ReopenServiceDialogProps {
  isOpen: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function ReopenServiceDialog({
  isOpen,
  submitting,
  error,
  onClose,
  onConfirm,
}: ReopenServiceDialogProps) {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Please enter a reason for reopening.");
      return;
    }
    setValidationError(null);
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50"
        aria-label="Close dialog"
        onClick={() => {
          if (!submitting) onClose();
        }}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <MdRefresh className="h-5 w-5 text-amber-700" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Reopen Service
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          This will move the job back to In Progress and keep payment as-is. Enter why it is being
          reopened.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-gray-700">
              Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              rows={3}
              placeholder="e.g. Same issue came back"
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {(validationError || error) && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {validationError || error}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {submitting ? "Reopening..." : "Confirm Reopen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
