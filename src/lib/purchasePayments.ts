import { roundMoney } from "@/lib/purchaseTotals";
import type { PurchasePaymentStatus } from "@/types/purchase";

export interface AmountOnly {
  amount: number;
}

export interface TotalAmountOnly {
  totalAmount: number;
}

export interface PaymentSummary {
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
}

export function paidAmountOf(payments: AmountOnly[]): number {
  return roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
}

export function returnedAmountOf(returns: TotalAmountOnly[]): number {
  return roundMoney(returns.reduce((sum, ret) => sum + ret.totalAmount, 0));
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

export interface MoneySummary {
  paidAmount: number;
  returnedAmount: number;
  refundReceived: number;
  /** What the shop still owes the supplier. */
  balance: number;
  /** What the supplier still owes the shop, e.g. items returned after full payment. */
  refundDue: number;
  paymentStatus: PurchasePaymentStatus;
}

/**
 * The full derivation once returns and refunds exist alongside payments.
 * `grandTotal` stays the immutable as-billed figure; `returnedAmount` is
 * subtracted from it to get what's actually still payable, and `refundReceived`
 * is subtracted from what was paid to get what's still effectively paid — the
 * two floors (`balance` / `refundDue`) can never both be positive at once.
 */
export function summarizePurchaseMoney(
  grandTotal: number,
  payments: AmountOnly[],
  returns: TotalAmountOnly[],
  refunds: AmountOnly[]
): MoneySummary {
  const paidAmount = paidAmountOf(payments);
  const returnedAmount = returnedAmountOf(returns);
  const refundReceived = paidAmountOf(refunds);

  const effectiveTotal = roundMoney(Math.max(grandTotal - returnedAmount, 0));
  const netPaid = roundMoney(paidAmount - refundReceived);
  const balance = roundMoney(Math.max(effectiveTotal - netPaid, 0));
  const refundDue = roundMoney(Math.max(netPaid - effectiveTotal, 0));

  const paymentStatus: PurchasePaymentStatus =
    balance === 0 ? "paid" : paidAmount === 0 ? "unpaid" : "partial";

  return { paidAmount, returnedAmount, refundReceived, balance, refundDue, paymentStatus };
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
