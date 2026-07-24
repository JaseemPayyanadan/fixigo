"use client";

import React from "react";

import { BarMeter } from "../charts/BarMeter";
import { Card, CardHeader } from "./Card";
import { PeriodSelect } from "./PeriodSelect";

import type { DashboardPeriod, RankedItem } from "@/lib/dashboardAnalytics";

interface RankedListCardProps {
  title: string;
  items: RankedItem[];
  color: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  emptyMessage: string;
  /** Renders an avatar-style initial badge beside each row (used for technicians). */
  showInitials?: boolean;
  /** Suffix for the row's secondary line, e.g. "services". */
  unit?: string;
}

export const RankedListCard = React.memo(function RankedListCard({
  title,
  items,
  color,
  period,
  onPeriodChange,
  emptyMessage,
  showInitials = false,
  unit,
}: RankedListCardProps) {
  const max = items.reduce((highest, item) => Math.max(highest, item.count), 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title={title} action={<PeriodSelect value={period} onChange={onPeriodChange} label={`${title} period`} />} />

      <div className="flex flex-1 flex-col px-5 pb-5">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                {showInitials && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
                    aria-hidden="true"
                  >
                    {item.label.slice(0, 2).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-800">{item.label}</p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{item.count}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <BarMeter fraction={max === 0 ? 0 : item.count / max} color={color} />
                    {unit && <span className="shrink-0 text-xs text-gray-400">{unit}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
});
