import { roundMoney } from "@/lib/purchaseTotals";
import type { PurchasePaymentStatus } from "@/types/purchase";

export interface AmountOnly {
  amount: number;
}

export interface PaymentSummary {
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
}

export function paidAmountOf(payments: AmountOnly[]): number {
  return roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
}

/**
 * The single derivation of paidAmount / balance / paymentStatus. Every write
 * path calls this rather than computing the three fields independently, which
 * is what keeps a purchase's stored status consistent with its payments array.
 *
 * The balance is floored at 0: an overpayment is a data-entry problem to be
 * caught by validation, not a reason to show a negative bill.
 */
export function summarizePayments(grandTotal: number, payments: AmountOnly[]): PaymentSummary {
  const paidAmount = paidAmountOf(payments);
  const balance = roundMoney(Math.max(grandTotal - paidAmount, 0));

  // Compare on the rounded balance so a sub-paisa remainder reads as settled.
  const paymentStatus: PurchasePaymentStatus =
    balance === 0 ? "paid" : paidAmount === 0 ? "unpaid" : "partial";

  return { paidAmount, balance, paymentStatus };
}

/** Overdue is always derived, never stored — it changes with the clock alone. */
export function isOverdue(balance: number, dueDate: Date | undefined, now: Date): boolean {
  if (!dueDate) return false;
  if (balance <= 0) return false;
  return now.getTime() > endOfDueDay(dueDate);
}

/** A bill is not overdue until the due date has fully elapsed. */
function endOfDueDay(dueDate: Date): number {
  return new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
}
