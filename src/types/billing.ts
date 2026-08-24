export type BillingStatus = "paid" | "pending" | "failed";

/**
 * One subscription billing cycle for a shop. Distinct from `Purchase`
 * (money the shop pays suppliers for inventory) — this is money the shop
 * pays Fixigo for its plan.
 */
export interface BillingInvoice {
  id: string;
  shopId: string;
  planId: string;
  planName: string;
  planTier: string;
  /** INR */
  amount: number;
  currency: string;
  /** Start of the billed cycle, inclusive. */
  periodStart: Date;
  periodEnd: Date;
  /** Date the invoice was issued — the shop's billing-cycle anchor day. */
  billingDate: Date;
  status: BillingStatus;
  createdAt: Date;
}
