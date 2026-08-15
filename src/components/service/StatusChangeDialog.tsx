"use client";

import { useEffect, useId, useState } from "react";

import { MdClose, MdSwapHoriz } from "react-icons/md";

import { getStatusConfig } from "@/lib/statusUtils";

interface StatusChangeDialogProps {
  isOpen: boolean;
  fromStatus: string;
  toStatus: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export default function StatusChangeDialog({
  isOpen,
  fromStatus,
  toStatus,
  submitting,
  error,
  onClose,
  onConfirm,
}: StatusChangeDialogProps) {
  const titleId = useId();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNote("");
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fromLabel = getStatusConfig(fromStatus).label;
  const toLabel = getStatusConfig(toStatus).label;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setValidationError("Please enter a note for this status change.");
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <MdSwapHoriz className="h-5 w-5 text-blue-700" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Change Status
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
          Change status from <span className="font-medium text-gray-900">{fromLabel}</span> to{" "}
          <span className="font-medium text-gray-900">{toLabel}</span>. Enter a note explaining why.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={noteId} className="mb-1 block text-sm font-medium text-gray-700">
              Note <span className="text-red-600">*</span>
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (validationError) setValidationError(null);
              }}
              rows={3}
              placeholder="e.g. Part received from supplier"
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
              className="min-h-11 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
