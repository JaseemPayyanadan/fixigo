// The single write path for a service's payment flag.
//
// Both the Repairs list and the service detail page mark payment. Writes go
// through /api/services/[id] (Admin SDK) because the browser has no Firebase Auth.

import type { ServicePaymentStatus } from "@/lib/paymentUtils";

export interface PaymentWrite {
  paymentStatus: ServicePaymentStatus;
  /** The moment payment was taken; cleared when a service is marked unpaid. */
  paidAt?: Date;
}

/**
 * Marks a service paid or unpaid via the authenticated API.
 */
export async function setServicePayment(
  serviceId: string,
  paid: boolean,
  _now: Date = new Date()
): Promise<PaymentWrite> {
  const response = await fetch(`/api/services/${encodeURIComponent(serviceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "payment", paid }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || "Failed to update payment"
    );
  }

  const body = (await response.json()) as {
    payment?: { paymentStatus: ServicePaymentStatus; paidAt?: string | Date };
  };

  const payment = body.payment;
  if (!payment) {
    throw new Error("Malformed payment response");
  }

  return {
    paymentStatus: payment.paymentStatus,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
  };
}
