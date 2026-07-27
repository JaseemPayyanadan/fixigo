"use client";

import React from "react";

import type { WeekdayPoint } from "@/lib/dashboardAnalytics";

import { BarChart } from "../charts/BarChart";
import { CHART_COLORS } from "../charts/palette";

import { Card, CardHeader } from "./Card";

interface WeeklyActivityCardProps {
  points: WeekdayPoint[];
}

/**
 * Devices received per day across the current week. Fixed to this week by
 * design — it has no period selector because "this week" is the whole idea.
 */
export const WeeklyActivityCard = React.memo(function WeeklyActivityCard({ points }: WeeklyActivityCardProps) {
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Weekly Activity"
        action={<span className="text-xs font-medium text-gray-500">This Week</span>}
      />

      <div className="flex flex-1 flex-col justify-center px-5 pb-5">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No devices received this week</p>
        ) : (
          <BarChart
            data={points.map((point) => ({ label: point.label, value: point.count }))}
            color={CHART_COLORS.series.total}
          />
        )}
      </div>
    </Card>
  );
});
