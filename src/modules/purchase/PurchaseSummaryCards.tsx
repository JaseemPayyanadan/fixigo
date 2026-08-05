// src/modules/purchase/PurchaseSummaryCards.tsx
"use client";

import React from "react";

import { Card } from "@/components/dashboard/widgets";
import { SummaryCardsSkeleton } from "@/components/ui/PageSkeleton";
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
 * Four cards. Low Stock Alerts needs stock levels this module does not have,
 * and Items Purchased Today is omitted — unit counts are less useful than
 * rupee totals on this screen.
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
  ];
}

const PurchaseSummaryCards = React.memo(function PurchaseSummaryCards({ summary, loading }: Props) {
  const cards = React.useMemo(() => (summary ? buildCards(summary) : []), [summary]);

  if (loading || !summary) {
    return <SummaryCardsSkeleton count={4} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${card.accent}`}>
            {card.label}
          </div>
          <p className="text-lg font-bold leading-none tracking-tight text-gray-900">{card.value}</p>
          <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
        </Card>
      ))}
    </div>
  );
});

export default PurchaseSummaryCards;
