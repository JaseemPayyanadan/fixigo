// src/modules/purchase/PurchaseSummaryCards.tsx
"use client";

import React from "react";

import { formatRupees } from "@/lib/purchaseFormat";
import type { PurchaseSummary } from "@/lib/purchaseSummary";

interface Props {
  summary: PurchaseSummary | null;
  loading: boolean;
}

interface Card {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

/**
 * Five cards, not six. Low Stock Alerts needs stock levels this module does
 * not have, and a card that can only ever render 0 is worse than no card.
 */
function buildCards(summary: PurchaseSummary): Card[] {
  return [
    {
      label: "Today's Purchase",
      value: formatRupees(summary.todayTotal),
      hint: `${summary.todayCount} transaction${summary.todayCount === 1 ? "" : "s"}`,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "This Month",
      value: formatRupees(summary.monthTotal),
      hint: "Current calendar month",
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending Payments",
      value: formatRupees(summary.pendingPayments),
      hint: `${summary.pendingBillCount} bill${summary.pendingBillCount === 1 ? "" : "s"} pending`,
      accent: "bg-orange-50 text-orange-600",
    },
    {
      label: "Suppliers",
      value: String(summary.activeSupplierCount),
      hint: "Active suppliers",
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "Items Purchased Today",
      value: String(summary.itemsPurchasedToday),
      hint: "Units received",
      accent: "bg-sky-50 text-sky-600",
    },
  ];
}

const PurchaseSummaryCards = React.memo(function PurchaseSummaryCards({ summary, loading }: Props) {
  const cards = React.useMemo(() => (summary ? buildCards(summary) : []), [summary]);

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${card.accent}`}>
            {card.label}
          </div>
          <p className="text-xl font-semibold text-gray-900">{card.value}</p>
          <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
});

export default PurchaseSummaryCards;
