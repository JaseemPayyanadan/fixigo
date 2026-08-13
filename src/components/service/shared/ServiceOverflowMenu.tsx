"use client";

import React, { useEffect, useId, useRef, useState } from "react";

import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

export interface ServiceOverflowMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  /** Align the menu to the trigger's left edge (default right). */
  align?: "left" | "right";
  className?: string;
}

/**
 * Kebab (⋯) menu for service row/card actions. Edit always lives here when
 * provided — keep that consistent across list, card, table, and details.
 */
export default function ServiceOverflowMenu({
  onEdit,
  onDelete,
  editLabel = "Edit Service",
  deleteLabel = "Delete Service",
  align = "right",
  className = "",
}: ServiceOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!onEdit && !onDelete) return null;

  const closeAnd = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-50 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => closeAnd(onEdit)}
              className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <PencilIcon className="h-4 w-4 text-gray-600" />
              {editLabel}
            </button>
          )}
          {onEdit && onDelete && <hr className="my-1 border-gray-100" />}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => closeAnd(onDelete)}
              className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <TrashIcon className="h-4 w-4 text-red-600" />
              {deleteLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
