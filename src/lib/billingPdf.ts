import { jsPDF } from "jspdf";

import type { BillingInvoice } from "@/types/billing";

/** The subset of shop fields the receipt needs — matches both ShopSummary and the Settings page's local ShopSettings. */
export interface BillingReceiptShop {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

/** Builds the billing receipt as a vector-text PDF, mirroring BillingReceipt's layout. */
export function buildBillingReceiptPdf(invoice: BillingInvoice, shop: BillingReceiptShop | null): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const orderNumber = invoice.id.slice(-10).toUpperCase();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.text("Fixigo", marginX, y);
  doc.setTextColor(0, 0, 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("fixigo.com", marginX, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("ORIGINAL", marginX + 220, y);
  doc.setTextColor(0, 0, 0);

  const infoX = marginX + 340;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Invoice Information", infoX, y);
  doc.setLineWidth(0.5);
  doc.line(infoX, y + 6, pageWidth - marginX, y + 6);

  const infoRows: Array<[string, string]> = [
    ["Invoice Number", orderNumber],
    ["Invoice Date", formatDate(invoice.billingDate)],
    ["Payment Terms", "Subscription"],
    ["Order Number", orderNumber],
    ["Status", invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)],
    ["Currency", invoice.currency],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let infoY = y + 24;
  for (const [label, value] of infoRows) {
    doc.setTextColor(90, 90, 90);
    doc.text(label, infoX, infoY);
    doc.setTextColor(0, 0, 0);
    doc.text(value, infoX + 110, infoY);
    infoY += 16;
  }

  y = Math.max(y + 60, infoY + 12);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill To", marginX, y);
  doc.setLineWidth(0.5);
  doc.line(marginX, y + 6, marginX + 220, y + 6);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(shop?.name || "—", marginX, y);
  doc.setFont("helvetica", "normal");
  y += 14;
  for (const line of [shop?.address, shop?.phone ? `Phone: ${shop.phone}` : undefined, shop?.email, shop?.gstNumber ? `Customer GST No: ${shop.gstNumber}` : undefined]) {
    if (!line) continue;
    doc.text(line, marginX, y);
    y += 14;
  }

  y += 20;
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Type", marginX, y);
  doc.text("Plan", marginX + 90, y);
  doc.text("Amount", pageWidth - marginX, y, { align: "right" });
  y += 6;
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.text("Subscription", marginX, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoice.planName} plan`, marginX + 90, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`(${invoice.planTier})`, marginX + 90, y + 12);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(formatAmount(invoice.amount), pageWidth - marginX, y, { align: "right" });
  y += 30;

  doc.setLineWidth(1.2);
  doc.line(pageWidth - marginX - 180, y, pageWidth - marginX, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Total", pageWidth - marginX - 180, y);
  doc.text(formatAmount(invoice.amount), pageWidth - marginX, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your business.", pageWidth / 2, doc.internal.pageSize.getHeight() - 48, { align: "center" });

  return doc;
}

export function billingReceiptFileName(): string {
  return "invoice.pdf";
}
