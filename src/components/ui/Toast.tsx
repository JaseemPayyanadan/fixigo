"use client";

import React, { useEffect } from "react";

import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export type ToastVariant = "success" | "error";

interface ToastProps {
  open: boolean;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  onClose: () => void;
}

/** Lightweight bottom toast — auto-dismisses; no third-party toast library. */
export default function Toast({
  open,
  message,
  variant = "success",
  durationMs = 3500,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const isSuccess = variant === "success";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[10002] flex justify-center px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
          isSuccess
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-900"
        }`}
      >
        {isSuccess ? (
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        )}
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-current/60 hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
