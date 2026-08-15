import type { ShopSummary } from "@/lib/shopRepo";
import type { Branch } from "@/types";

export interface ServiceInvoiceProps {
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    paidAmount?: number;
    createdAt: Date;
    device?: {
      brand?: string;
      model?: string;
      imei?: string;
      color?: string;
    };
    customer?: {
      name?: string;
      phone?: string;
      email?: string;
      place?: string;
      address?: string;
    };
  };
  shop: ShopSummary | null;
  branch: Branch | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Print-only invoice. Kept out of the normal document flow on screen
 * (`hidden print:block` on the wrapper in ServiceDetailsView) so it never
 * competes with the card layout — it only exists for `window.print()`.
 */
export default function ServiceInvoice({ service, shop, branch }: ServiceInvoiceProps) {
  const paidAmount = service.paidAmount ?? 0;
  const dueAmount = Math.max((service.price ?? 0) - paidAmount, 0);

  return (
    <div className="p-8 text-black">
      <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-xl font-bold">{shop?.name || "Repair Shop"}</h1>
          {shop?.address && <p className="text-sm">{shop.address}</p>}
          {shop?.phone && <p className="text-sm">Phone: {shop.phone}</p>}
          {shop?.email && <p className="text-sm">Email: {shop.email}</p>}
          {shop?.gstNumber && <p className="text-sm">GSTIN: {shop.gstNumber}</p>}
          {branch?.name && <p className="mt-1 text-sm font-medium">Branch: {branch.name}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase tracking-wide">Invoice</h2>
          <p className="text-sm">#{service.id.slice(-8).toUpperCase()}</p>
          <p className="text-sm">Date: {formatDate(service.createdAt)}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-600">Bill To</h3>
          <p className="text-sm font-semibold">{service.customer?.name || "—"}</p>
          {service.customer?.phone && <p className="text-sm">{service.customer.phone}</p>}
          {service.customer?.email && <p className="text-sm">{service.customer.email}</p>}
          {(service.customer?.place || service.customer?.address) && (
            <p className="text-sm">{service.customer.place || service.customer.address}</p>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-600">Device</h3>
          <p className="text-sm">
            {[service.device?.brand, service.device?.model].filter(Boolean).join(" ") || "—"}
          </p>
          {service.device?.color && <p className="text-sm">Color: {service.device.color}</p>}
          {service.device?.imei && <p className="text-sm">IMEI: {service.device.imei}</p>}
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Service</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="py-2">
              <div className="font-medium">{service.name || "Repair Service"}</div>
              {service.description && <div className="text-xs text-gray-600">{service.description}</div>}
            </td>
            <td className="py-2 text-right">₹{(service.price ?? 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Service Fee</span>
          <span>₹{(service.price ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid Amount</span>
          <span>₹{paidAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t-2 border-black pt-1 font-bold">
          <span>Due Amount</span>
          <span>₹{dueAmount.toLocaleString()}</span>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-gray-600">Thank you for your business.</p>
    </div>
  );
}
