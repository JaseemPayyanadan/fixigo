// The single write path for a service's payment flag.
//
// Both the Repairs list and the service detail page mark payment, and they
// previously had no shared code for it. Keeping the write here means the two
// screens cannot drift into storing different shapes — a `paidAt` set by one
// and absent from the other would show up as revenue landing on the wrong day.

import { deleteField, doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ServicePaymentStatus } from "@/lib/paymentUtils";

export interface PaymentWrite {
  paymentStatus: ServicePaymentStatus;
  /** The moment payment was taken; cleared when a service is marked unpaid. */
  paidAt?: Date;
}

/**
 * Marks a service paid or unpaid.
 *
 * Unmarking clears `paidAt` rather than leaving the old timestamp behind: a
 * payment recorded by mistake should leave no trace of a date on which money
 * supposedly arrived. Returns what was written so callers can mirror it into
 * local state without re-reading the document.
 */
export async function setServicePayment(
  serviceId: string,
  paid: boolean,
  now: Date = new Date()
): Promise<PaymentWrite> {
  await updateDoc(doc(db, "services", serviceId), {
    paymentStatus: paid ? "paid" : "pending",
    paidAt: paid ? now : deleteField(),
    updatedAt: now,
  });

  return paid ? { paymentStatus: "paid", paidAt: now } : { paymentStatus: "pending" };
}
