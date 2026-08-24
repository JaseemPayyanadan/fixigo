import { adminDb } from "@/lib/firebaseAdmin";
import type { BillingInvoice, BillingStatus } from "@/types/billing";

export const BILLING_INVOICES = "billingInvoices";

/** Firestore Timestamp, JS Date, or ISO string. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

export function mapBillingInvoice(id: string, data: Record<string, unknown>): BillingInvoice {
  return {
    id,
    shopId: (data.shopId as string) || "",
    planId: (data.planId as string) || "",
    planName: (data.planName as string) || "",
    planTier: (data.planTier as string) || "",
    amount: Number(data.amount) || 0,
    currency: (data.currency as string) || "INR",
    periodStart: toDate(data.periodStart),
    periodEnd: toDate(data.periodEnd),
    billingDate: toDate(data.billingDate),
    status: (data.status as BillingStatus) || "paid",
    createdAt: toDate(data.createdAt),
  };
}

/** All invoices for a shop, most recent billing date first. */
export async function listInvoicesForShop(shopId: string): Promise<BillingInvoice[]> {
  const snapshot = await adminDb.collection(BILLING_INVOICES).where("shopId", "==", shopId).get();
  return snapshot.docs
    .map((doc) => mapBillingInvoice(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.billingDate.getTime() - a.billingDate.getTime());
}

/** Returns null if the invoice doesn't exist or belongs to a different shop. */
export async function getInvoiceForShop(shopId: string, id: string): Promise<BillingInvoice | null> {
  const snapshot = await adminDb.collection(BILLING_INVOICES).doc(id).get();
  if (!snapshot.exists) return null;
  const invoice = mapBillingInvoice(snapshot.id, snapshot.data() as Record<string, unknown>);
  return invoice.shopId === shopId ? invoice : null;
}

/**
 * Adds `months` to `date`, keeping the same day-of-month unless the target
 * month is shorter — e.g. anchoring on the 31st lands on Feb 28/29.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1, date.getHours(), date.getMinutes(), date.getSeconds());
  const lastDayOfShiftedMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDayOfShiftedMonth));
  return shifted;
}

/**
 * The shop's billing cycle is anchored to the day-of-month its account was
 * created (e.g. created Jan 12 → bills on the 12th of every month after).
 * Returns the next occurrence of that anchor day strictly after `now`.
 */
export function nextBillingDate(accountCreatedAt: Date, now: Date = new Date()): Date {
  let months = 0;
  let candidate = addMonthsClamped(accountCreatedAt, months);
  while (candidate <= now) {
    months += 1;
    candidate = addMonthsClamped(accountCreatedAt, months);
  }
  return candidate;
}

/** Completed monthly billing periods from account creation up to `until`. */
export function billingPeriodsUntil(accountCreatedAt: Date, until: Date): Array<{ start: Date; end: Date }> {
  const periods: Array<{ start: Date; end: Date }> = [];
  let start = accountCreatedAt;
  let months = 1;
  let end = addMonthsClamped(accountCreatedAt, months);
  while (end <= until) {
    periods.push({ start, end });
    start = end;
    months += 1;
    end = addMonthsClamped(accountCreatedAt, months);
  }
  return periods;
}
