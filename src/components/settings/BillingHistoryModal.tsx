"use client";

import React, { useEffect, useId } from "react";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Download, Eye } from "lucide-react";

import { billingReceiptFileName, buildBillingReceiptPdf, type BillingReceiptShop } from "@/lib/billingPdf";
import type { BillingInvoice } from "@/types/billing";

interface BillingHistoryModalProps {
  open: boolean;
  invoices: BillingInvoice[];
  loading: boolean;
  error: string | null;
  shop: BillingReceiptShop | null;
  onClose: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString()}`;
}

function orderNumberOf(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

const STATUS_CLASS: Record<BillingInvoice["status"], string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

export default function BillingHistoryModal({ open, invoices, loading, error, shop, onClose }: BillingHistoryModalProps) {
  const titleId = useId();

  const downloadPdf = (invoice: BillingInvoice) => {
    const doc = buildBillingReceiptPdf(invoice, shop);
    doc.save(billingReceiptFileName());
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            Billing history
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading billing history…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-700">{error}</p>
        ) : invoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No bills have been generated yet.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 font-medium uppercase tracking-wide text-gray-500">Order number</th>
                  <th className="px-3 py-2 font-medium uppercase tracking-wide text-gray-500">Billing date</th>
                  <th className="px-3 py-2 font-medium uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-3 py-2 font-medium uppercase tracking-wide text-gray-500">Plan</th>
                  <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-gray-500">Amount</th>
                  <th className="px-3 py-2 font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{orderNumberOf(invoice.id)}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{formatDate(invoice.billingDate)}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">Subscription</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{invoice.planName}</td>
                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">{formatAmount(invoice.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_CLASS[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/settings/billing/receipt?id=${encodeURIComponent(invoice.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`View bill from ${formatDate(invoice.billingDate)}`}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadPdf(invoice)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`Download bill from ${formatDate(invoice.billingDate)}`}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
