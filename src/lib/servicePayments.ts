// The single write path for a service's payment flag.
//
// Both the Repairs list and the service detail page mark payment. Writes go
// through /api/services/[id] (Admin SDK) because the browser has no Firebase Auth.

import type { ServicePaymentStatus } from "@/lib/paymentUtils";

export interface PaymentWrite {
  paymentStatus: ServicePaymentStatus;
  /** Amount collected when status is partial or paid. */
  paidAmount?: number;
  /** The moment payment was taken; cleared when a service is marked unpaid. */
  paidAt?: Date;
}

export interface SetServicePaymentInput {
  paymentStatus: ServicePaymentStatus;
  paidAmount?: number;
}

/**
 * Updates a service payment status via the authenticated API.
 */
export async function setServicePayment(
  serviceId: string,
  input: SetServicePaymentInput
): Promise<PaymentWrite> {
  const response = await fetch(`/api/services/${encodeURIComponent(serviceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "payment",
      paymentStatus: input.paymentStatus,
      paidAmount: input.paidAmount,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || "Failed to update payment"
    );
  }

  const body = (await response.json()) as {
    payment?: {
      paymentStatus: ServicePaymentStatus;
      paidAt?: string | Date;
      paidAmount?: number;
    };
  };

  const payment = body.payment;
  if (!payment) {
    throw new Error("Malformed payment response");
  }

  return {
    paymentStatus: payment.paymentStatus,
    paidAmount: payment.paidAmount,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
  };
}
