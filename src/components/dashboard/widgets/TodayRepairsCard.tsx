"use client";

import React from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";

import type { TodayRepairItem, TodayRepairsSummary } from "@/lib/dashboardAnalytics";
import { getStatusColor, formatCurrency } from "../shared/DashboardUtils";

import { Card, CardHeader } from "./Card";

interface TodayRepairsCardProps {
  summary: TodayRepairsSummary;
  items: TodayRepairItem[];
  /** The date the card and its list are filtered to. Defaults to now. */
  now?: Date;
}

/**
 * Today's repair activity, replacing the "Most Common Repairs" ranking on the
 * shop dashboard. Fixed to today rather than a selectable period — it answers
 * "how is today going", not a trend a period picker would imply.
 *
 * The tiles are the headline counts; the table below is the full event list
 * they summarise, so a row exists for every unit the tiles counted.
 */
export const TodayRepairsCard = React.memo(function TodayRepairsCard({ summary, items, now = new Date() }: TodayRepairsCardProps) {
  const router = useRouter();

  const tiles = [
    { key: "total", label: "Total Services", value: summary.total, icon: ClipboardList, tint: "bg-blue-50 text-blue-600" },
    { key: "completed", label: "Completed", value: summary.completed, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
    { key: "cancelled", label: "Cancelled", value: summary.cancelled, icon: XCircle, tint: "bg-red-50 text-red-600" },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Today's Repairs"
        titleSuffix={now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      />

      <div className="grid grid-cols-1 gap-3 px-5 pb-4 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <div
              key={tile.key}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tile.tint}`} aria-hidden="true">
                <Icon className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-gray-900">{tile.value}</p>
                <p className="truncate text-xs font-medium text-gray-500">{tile.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-gray-100 px-5 pt-3 pb-5">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No activity yet today</p>
        ) : (
          <div className="max-h-80 min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  <th className="sticky top-0 bg-white pb-2">Service</th>
                  <th className="sticky top-0 w-px bg-white pb-2 whitespace-nowrap">Status</th>
                  <th className="sticky top-0 w-px bg-white pr-1 pb-2 text-right whitespace-nowrap">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const statusColors = getStatusColor(item.service.status);

                  return (
                    <tr
                      key={item.service.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50/80 motion-reduce:transition-none"
                      onClick={() => router.push(`/services/details?id=${item.service.id}`)}
                    >
                      <td className="max-w-[160px] py-2.5 pr-2">
                        <p className="truncate font-medium text-gray-900">{item.service.name}</p>
                        <p className="truncate text-xs text-gray-500">{item.service.customer?.name || "Unknown Customer"}</p>
                      </td>
                      <td className="w-px py-2.5 pr-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusColors.text} ${statusColors.bg}`}
                        >
                          {item.service.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="w-px py-2.5 pr-1 text-right font-semibold tabular-nums whitespace-nowrap text-gray-900">
                        {formatCurrency(item.service.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
});
