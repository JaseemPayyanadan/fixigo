"use client";

import React, { useEffect, useId } from "react";

import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  error?: string | null;
  /** Defaults to danger for destructive actions. */
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

/** Centered confirm modal used for destructive or irreversible actions. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  error = null,
  variant = "danger",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !confirming) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, confirming, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={() => {
          if (!confirming) onClose();
        }}
        disabled={confirming}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                variant === "danger" ? "bg-red-100" : "bg-blue-100"
              }`}
            >
              <ExclamationTriangleIcon
                className={`h-5 w-5 ${variant === "danger" ? "text-red-700" : "text-blue-700"}`}
              />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">{description}</p>

        {error ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
