"use client";

import React from "react";

import { AreaChart, type AreaSeries } from "../charts/AreaChart";
import { CHART_COLORS } from "../charts/palette";
import { Card, CardHeader } from "./Card";
import { PeriodSelect } from "./PeriodSelect";

import type { DashboardPeriod, SeriesPoint } from "@/lib/dashboardAnalytics";

interface ServicesOverviewCardProps {
  points: SeriesPoint[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export const ServicesOverviewCard = React.memo(function ServicesOverviewCard({ points, period, onPeriodChange }: ServicesOverviewCardProps) {
  const series: AreaSeries[] = React.useMemo(
    () => [
      { key: "total", label: "Total", color: CHART_COLORS.series.total, values: points.map((p) => p.total) },
      { key: "completed", label: "Completed", color: CHART_COLORS.series.completed, values: points.map((p) => p.completed) },
      { key: "pending", label: "Pending", color: CHART_COLORS.series.pending, values: points.map((p) => p.pending) },
    ],
    [points]
  );

  const last = points.at(-1);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Services Overview"
        action={<PeriodSelect value={period} onChange={onPeriodChange} label="Services overview period" />}
      />

      {/* Legend: identity is never colour-alone */}
      <div className="flex flex-wrap items-center gap-4 px-5 pb-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="px-2 pb-2">
        <AreaChart labels={points.map((p) => p.label)} series={series} height={260} />
      </div>

      {/* Direct labels double as the relief required by the aqua contrast warning */}
      <div className="mt-auto grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        {series.map((s, index) => (
          <div key={s.key} className="px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <div>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{last ? [last.total, last.completed, last.pending][index] : 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});
