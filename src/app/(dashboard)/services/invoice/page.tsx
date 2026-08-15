"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import ServiceInvoice, { type ServiceInvoiceProps } from "@/components/service/ServiceInvoice";
import { PageFallback } from "@/components/ui/PageSkeleton";
import { useUser } from "@/hooks";
import type { ShopSummary } from "@/lib/shopRepo";
import type { Branch } from "@/types";

export const dynamic = "force-dynamic";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

function InvoicePage() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("id");
  const { user } = useUser();
  const [service, setService] = useState<ServiceInvoiceProps["service"] | null>(null);
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (!serviceId || !user?.shopId) return;

    const load = async () => {
      try {
        const [serviceRes, shopRes, branchesRes] = await Promise.all([
          fetch(`/api/services/${encodeURIComponent(serviceId)}`),
          fetch("/api/shop"),
          fetch("/api/branches"),
        ]);

        if (!serviceRes.ok) throw new Error(await readError(serviceRes));
        const servicePayload = await serviceRes.json();
        const raw = servicePayload.service as Record<string, unknown> & { id: string };
        setService({
          id: raw.id,
          name: (raw.name as string) || "",
          description: (raw.description as string) || "",
          price: (raw.price as number) || 0,
          paidAmount: raw.paidAmount as number | undefined,
          createdAt: toDate(raw.createdAt),
          device: raw.device as ServiceInvoiceProps["service"]["device"],
          customer: raw.customer as ServiceInvoiceProps["service"]["customer"],
        });

        if (shopRes.ok) {
          const shopPayload = await shopRes.json();
          setShop(shopPayload.shop ?? null);
        }

        if (branchesRes.ok) {
          const branchesPayload = await branchesRes.json();
          const branches: Branch[] = Array.isArray(branchesPayload.branches) ? branchesPayload.branches : [];
          const branchId = raw.branchId as string | undefined;
          setBranch(branches.find((b) => b.id === branchId) ?? null);
        }
      } catch (err) {
        console.error("Error loading invoice:", err);
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [serviceId, user?.shopId]);

  useEffect(() => {
    if (service && !hasPrinted.current) {
      hasPrinted.current = true;
      // Give the browser a tick to paint the invoice before opening the
      // print dialog, or some browsers print a blank page.
      const timer = setTimeout(() => window.print(), 150);
      return () => clearTimeout(timer);
    }
  }, [service]);

  if (!serviceId) {
    return <p className="p-6 text-sm text-gray-600">No repair specified.</p>;
  }

  if (loading) {
    return <PageFallback label="Preparing invoice" />;
  }

  if (error || !service) {
    return <p className="p-6 text-sm text-red-600">{error || "Invoice not found."}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center border-b border-gray-200 bg-white p-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Print / Download
        </button>
      </div>
      <div className="mx-auto max-w-2xl bg-white shadow-sm print:shadow-none">
        <ServiceInvoice service={service} shop={shop} branch={branch} />
      </div>
    </div>
  );
}

export default function InvoicePageWrapper() {
  return (
    <Suspense fallback={<PageFallback label="Preparing invoice" />}>
      <InvoicePage />
    </Suspense>
  );
}
