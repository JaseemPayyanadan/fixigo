// Whether a repair has been paid for, and when.
//
// Payment is tracked with a single flag rather than an invoice model: a counter
// repair is settled in full when the customer collects the device, so "paid or
// not" is the whole of it. Part-payments and deposits are deliberately out of
// scope — recording them needs an amount, a balance and a history, which is a
// subsystem rather than a field.

import { normalizeStatus } from "./statusUtils";

export type ServicePaymentStatus = "pending" | "paid";

/** The subset of a service this module needs. Keeps it usable from the mapper. */
export interface PayableService {
  status?: string;
  paymentStatus?: ServicePaymentStatus;
  paidAt?: Date;
  completedDate?: Date;
  actualCompletion?: Date;
  updatedAt?: Date;
}

/**
 * A service's payment state, falling back to its work status when the document
 * carries no `paymentStatus`.
 *
 * Payment tracking was added after the app had been in use, so most existing
 * repairs have no such field. Those are read as paid if the work was completed:
 * before the flag existed, marking a job completed *was* the act of handing the
 * device back and taking the money. Without that fallback every historical
 * repair would read as unpaid and Total Revenue would show zero until someone
 * re-entered years of takings by hand.
 *
 * Only completion implies payment. Work still in the shop is pending: it may
 * never be billed at all.
 */
export function paymentStatusOf(service: PayableService): ServicePaymentStatus {
  if (service.paymentStatus) return service.paymentStatus;
  return normalizeStatus(service.status ?? "") === "completed" ? "paid" : "pending";
}

export function isPaid(service: PayableService): boolean {
  return paymentStatusOf(service) === "paid";
}

/**
 * Whether a repair's price counts toward revenue.
 *
 * Finishing the job books the money: a completed repair counts whether or not
 * anyone has ticked it paid. This is a deliberate choice of recognising revenue
 * on completion rather than on collection — the shop wants finished work to
 * show up on the dashboard without a second bookkeeping step, and in a counter
 * repair business the two almost always coincide.
 *
 * The cost is real and worth stating: a completed job the customer never
 * settles is still counted, so this figure is what the shop has *earned*, not
 * what it has banked. `isPaid` remains the answer to "has this been collected",
 * and is what the Paid/Unpaid badge on the repairs list reads.
 *
 * Work that is paid but not yet finished still counts too — money in the till
 * is revenue whichever side of handover it arrived on. Cancelled work never
 * counts: it is neither completed nor, absent an explicit flag, paid.
 */
export function countsAsRevenue(service: PayableService): boolean {
  return normalizeStatus(service.status ?? "") === "completed" || isPaid(service);
}

/**
 * When the money came in, or `undefined` when that cannot be known.
 *
 * Falls back to the completion timestamps for the same reason `paymentStatusOf`
 * falls back to the status: services settled before payment tracking existed
 * have no `paidAt`, and dating them to the handover is the closest honest
 * answer. Absent stays absent when there is no timestamp at all — the daily
 * revenue series is built to cope with that rather than invent a date.
 */
export function paidDateOf(service: PayableService): Date | undefined {
  return service.paidAt ?? service.completedDate ?? service.actualCompletion;
}

/**
 * The day a repair's takings belong to on the dashboard.
 *
 * Prefers the real answer — `paidDateOf` — and falls back to `updatedAt` when a
 * repair counts as revenue but carries no payment or completion timestamp at
 * all. That happens to repairs finished before the app began stamping
 * `completedDate`, and to any marked paid straight in Firestore: they show
 * "Paid" on the repairs list, which reads status alone, while having no day to
 * plot against.
 *
 * `updatedAt` is a weaker claim than the others and is treated as such. It is
 * when the record last changed, which for a finished repair is at or after the
 * moment it was finished — so the money lands on a plausible day rather than
 * being dropped from the chart entirely. It is wrong if someone edits an old
 * repair today. Stamping the real dates is the accurate cure; this only keeps
 * undated history visible until then.
 */
export function revenueDateOf(service: PayableService): Date | undefined {
  return paidDateOf(service) ?? service.updatedAt;
}
