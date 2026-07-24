"use client";

import React from "react";

import { CheckCircle2, ClipboardList, PackageSearch, Truck, Wrench } from "lucide-react";

import type { TodayCounts } from "@/lib/dashboardAnalytics";

interface StatTileRowProps {
  counts: TodayCounts;
}

/**
 * Five compact counts of current shop state. Deliberately plain — no trend, no
 * delta, no sparkline: these are point-in-time numbers, and decorating them
 * like period metrics would imply a comparison that was never measured.
 */
export const StatTileRow = React.memo(function StatTileRow({ counts }: StatTileRowProps) {
  const tiles = [
    { key: "received", label: "Received", caption: "Today", value: counts.received, icon: ClipboardList, tint: "bg-blue-50 text-blue-600" },
    { key: "repairing", label: "Repairing", caption: "Now", value: counts.repairing, icon: Wrench, tint: "bg-violet-50 text-violet-600" },
    { key: "waiting", label: "Waiting Parts", caption: "Now", value: counts.waitingParts, icon: PackageSearch, tint: "bg-amber-50 text-amber-600" },
    { key: "ready", label: "Ready", caption: "Now", value: counts.readyForDelivery, icon: Truck, tint: "bg-teal-50 text-teal-600" },
    { key: "completed", label: "Completed", caption: "Today", value: counts.completedToday, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <div
            key={tile.key}
            className="flex flex-col items-start gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile.tint}`} aria-hidden="true">
              <Icon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-500">{tile.label}</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">{tile.value}</p>
              <p className="text-xs text-gray-400">{tile.caption}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});
