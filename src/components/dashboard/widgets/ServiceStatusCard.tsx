"use client";

import React from "react";

import { TrendingUp } from "lucide-react";

import { DonutChart, type DonutSegment } from "../charts/DonutChart";
import { CHART_COLORS } from "../charts/palette";
import { Card, CardHeader } from "./Card";

import type { StatusBreakdown } from "@/lib/dashboardAnalytics";

interface ServiceStatusCardProps {
  breakdown: StatusBreakdown;
}

const SEGMENT_COLORS: Record<string, string> = {
  completed: CHART_COLORS.series.completed,
  in_progress: CHART_COLORS.series.total,
  to_do: CHART_COLORS.series.pending,
};

export const ServiceStatusCard = React.memo(function ServiceStatusCard({ breakdown }: ServiceStatusCardProps) {
  const segments: DonutSegment[] = breakdown.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.count,
    color: SEGMENT_COLORS[bucket.key],
  }));

  const completedShare = breakdown.buckets.find((bucket) => bucket.key === "completed")?.percentage ?? 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Service Status" />

      <div className="flex flex-1 flex-col items-center gap-5 px-5 pb-4 sm:flex-row sm:items-center sm:justify-center lg:flex-col xl:flex-row">
        <DonutChart segments={segments} centerValue={breakdown.total} centerLabel="Total" />

        {/* Every segment carries a label and a count, so colour is never the only cue */}
        <ul className="w-full space-y-3 sm:w-auto">
          {breakdown.buckets.map((bucket) => (
            <li key={bucket.key} className="flex items-start gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[bucket.key] }} />
              <div>
                <p className="text-sm font-medium text-gray-700">{bucket.label}</p>
                <p className="text-xs text-gray-500">
                  {bucket.count} ({bucket.percentage.toFixed(1)}%)
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {breakdown.total > 0 && (
        <div className="mx-5 mb-5 mt-auto flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
          <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {completedShare >= 50 ? "Keep up the good work!" : "Room to improve"}
            </p>
            <p className="text-xs text-emerald-700">{completedShare.toFixed(0)}% of services in this period are completed.</p>
          </div>
        </div>
      )}
    </Card>
  );
});
