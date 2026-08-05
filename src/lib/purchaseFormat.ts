// src/lib/purchaseFormat.ts
import { isOverdue } from "@/lib/purchasePayments";
import type { Purchase } from "@/types/purchase";

/**
 * Indian digit grouping (₹3,42,800 not ₹342,800). Paise are shown only when
 * non-zero, so the common whole-rupee case stays readable.
 */
export function formatRupees(value: number): string {
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(value);
}

export interface StatusLabel {
  label: string;
  className: string;
}

/**
 * Precedence matters: cancelled outranks overdue, which outranks the stored
 * payment status. Overdue is derived here rather than stored, because it
 * changes with the clock alone.
 */
export function paymentStatusLabel(purchase: Purchase, now: Date): StatusLabel {
  if (purchase.status === "cancelled") {
    return { label: "Cancelled", className: "bg-gray-100 text-gray-600" };
  }

  if (isOverdue(purchase.balance, purchase.dueDate, now)) {
    return { label: "Overdue", className: "bg-purple-100 text-purple-700" };
  }

  switch (purchase.paymentStatus) {
    case "paid":
      return { label: "Paid", className: "bg-emerald-100 text-emerald-700" };
    case "partial":
      return { label: "Partially Paid", className: "bg-amber-100 text-amber-700" };
    default:
      return { label: "Pending", className: "bg-red-100 text-red-700" };
  }
}
