"use client";

import React from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import type { DashboardPeriod, TechnicianRow } from "@/lib/dashboardAnalytics";

import { RingGauge } from "../charts/RingGauge";

import { Card, CardHeader } from "./Card";
import { PeriodSelect } from "./PeriodSelect";

interface TopTechniciansTableProps {
  rows: TechnicianRow[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

/** A metric cell. `null` renders an em dash — never a fabricated zero. */
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export const TopTechniciansTable = React.memo(function TopTechniciansTable({
  rows,
  period,
  onPeriodChange,
}: TopTechniciansTableProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Top Technicians"
        action={<PeriodSelect value={period} onChange={onPeriodChange} label="Top technicians period" />}
      />

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-500">No assigned services in this period</p>
      ) : (
        <div className="flex-1 divide-y divide-gray-100">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80 motion-reduce:transition-none"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
                aria-hidden="true"
              >
                {row.initials}
              </span>

              <p className="w-28 shrink-0 truncate text-xs font-semibold text-gray-900 sm:w-32">{row.name}</p>

              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                <Metric label="Completed" value={row.completed} />
                <Metric label="Active" value={row.active} />
              </div>

              <RingGauge fraction={row.completionRate} label={`${row.name} completion rate`} />
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3">
        <Link
          href="/technicians"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0"
        >
          View all technicians
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
});
