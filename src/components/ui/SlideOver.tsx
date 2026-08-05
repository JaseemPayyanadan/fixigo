// src/components/ui/SlideOver.tsx
"use client";

import React from "react";
import { createPortal } from "react-dom";

interface SlideOverProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the panel. Defaults to a form-friendly width. */
  maxWidthClassName?: string;
}

/**
 * Desktop right-side panel with sticky header/footer and backdrop.
 * Renders via portal so nested stacking (e.g. item modals) stays predictable.
 */
export default function SlideOver({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-xl",
}: SlideOverProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] hidden md:block" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full ${maxWidthClassName} flex-col bg-white shadow-xl`}
        style={{ animation: "purchase-slide-in 200ms ease-out" }}
      >
        <style>{`@keyframes purchase-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <span className="block text-xl leading-none">&times;</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
