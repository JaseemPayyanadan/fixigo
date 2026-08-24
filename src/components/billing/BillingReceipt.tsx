import type { BillingReceiptShop } from "@/lib/billingPdf";
import type { BillingInvoice } from "@/types/billing";

export interface BillingReceiptProps {
  invoice: BillingInvoice;
  shop: BillingReceiptShop | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString()}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <span className="text-gray-700">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Print-only subscription bill, styled like a formal SaaS invoice (issuer
 * block / ORIGINAL marker / invoice-information table across the top,
 * Bill To below). Fixigo is the issuer here — the shop is the customer
 * being billed for its plan, not the seller as in ServiceInvoice.
 */
export default function BillingReceipt({ invoice, shop }: BillingReceiptProps) {
  const orderNumber = invoice.id.slice(-10).toUpperCase();

  return (
    <div className="p-8 text-black">
      <div className="mb-8 grid grid-cols-[1.2fr_0.6fr_1.2fr] gap-6 border-b-2 border-black pb-6">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Fixigo</h1>
          <p className="mt-2 text-sm text-gray-700">fixigo.com</p>
        </div>

        <div className="pt-1 text-sm font-medium tracking-wide text-gray-500">ORIGINAL</div>

        <div>
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">Invoice Information</h2>
          <div className="space-y-1 text-sm">
            <InfoRow label="Invoice Number" value={orderNumber} />
            <InfoRow label="Invoice Date" value={formatDate(invoice.billingDate)} />
            <InfoRow label="Payment Terms" value="Subscription" />
            <InfoRow label="Order Number" value={orderNumber} />
            <InfoRow label="Status" value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
            <InfoRow label="Currency" value={invoice.currency} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-1 border-b border-gray-300 pb-1 text-sm font-bold">Bill To</h3>
        <div className="mt-2 text-sm">
          <p className="font-semibold">{shop?.name || "—"}</p>
          {shop?.address && <p>{shop.address}</p>}
          {shop?.phone && <p>Phone: {shop.phone}</p>}
          {shop?.email && <p>{shop.email}</p>}
          {shop?.gstNumber && <p>Customer GST No: {shop.gstNumber}</p>}
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Type</th>
            <th className="py-2">Plan</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="py-2 align-top">Subscription</td>
            <td className="py-2">
              <div className="font-medium">
                {invoice.planName} plan <span className="text-xs uppercase text-gray-600">({invoice.planTier})</span>
              </div>
              <div className="text-xs text-gray-600">Monthly subscription</div>
            </td>
            <td className="py-2 text-right align-top">{formatAmount(invoice.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between border-t-2 border-black pt-1 font-bold">
          <span>Total</span>
          <span>{formatAmount(invoice.amount)}</span>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-gray-600">Thank you for your business.</p>
    </div>
  );
}
