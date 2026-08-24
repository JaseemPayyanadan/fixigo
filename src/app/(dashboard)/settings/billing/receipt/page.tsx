"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import BillingReceipt from "@/components/billing/BillingReceipt";
import { PageFallback } from "@/components/ui/PageSkeleton";
import { billingReceiptFileName, buildBillingReceiptPdf } from "@/lib/billingPdf";
import type { ShopSummary } from "@/lib/shopRepo";
import type { BillingInvoice } from "@/types/billing";

export const dynamic = "force-dynamic";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
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

function BillingReceiptPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const autoDownload = searchParams.get("download") === "1";
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDownloaded = useRef(false);

  useEffect(() => {
    if (!invoiceId) return;

    const load = async () => {
      try {
        const response = await fetch(`/api/billing/${encodeURIComponent(invoiceId)}`);
        if (!response.ok) throw new Error(await readError(response));
        const body = await response.json();
        const raw = body.invoice as Record<string, unknown> & { id: string };
        setInvoice({
          id: raw.id,
          shopId: raw.shopId as string,
          planId: raw.planId as string,
          planName: (raw.planName as string) || "",
          planTier: (raw.planTier as string) || "",
          amount: (raw.amount as number) || 0,
          currency: (raw.currency as string) || "INR",
          periodStart: toDate(raw.periodStart),
          periodEnd: toDate(raw.periodEnd),
          billingDate: toDate(raw.billingDate),
          status: (raw.status as BillingInvoice["status"]) || "paid",
          createdAt: toDate(raw.createdAt),
        });
        setShop((body.shop as ShopSummary) ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bill");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [invoiceId]);

  const downloadPdf = (currentInvoice: BillingInvoice, currentShop: ShopSummary | null) => {
    const doc = buildBillingReceiptPdf(currentInvoice, currentShop);
    doc.save(billingReceiptFileName());
  };

  useEffect(() => {
    if (invoice && autoDownload && !hasDownloaded.current) {
      hasDownloaded.current = true;
      downloadPdf(invoice, shop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, autoDownload]);

  if (!invoiceId) {
    return <p className="p-6 text-sm text-gray-600">No bill specified.</p>;
  }

  if (loading) {
    return <PageFallback label="Preparing bill" />;
  }

  if (error || !invoice) {
    return <p className="p-6 text-sm text-red-600">{error || "Bill not found."}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex justify-center gap-3 border-b border-gray-200 bg-white p-3 print:hidden">
        <button
          type="button"
          onClick={() => downloadPdf(invoice, shop)}
          className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 cursor-pointer rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Print
        </button>
      </div>
      <div className="mx-auto max-w-2xl bg-white shadow-sm print:shadow-none">
        <BillingReceipt invoice={invoice} shop={shop} />
      </div>
    </div>
  );
}

export default function BillingReceiptPageWrapper() {
  return (
    <Suspense fallback={<PageFallback label="Preparing bill" />}>
      <BillingReceiptPage />
    </Suspense>
  );
}
