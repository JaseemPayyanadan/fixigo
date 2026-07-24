"use client";

import React from "react";

import {
  ClipboardList,
  PackageSearch,
  SearchCheck,
  Truck,
  Wrench,
} from "lucide-react";

import type { PipelineStage } from "@/lib/dashboardAnalytics";

import { BarMeter } from "../charts/BarMeter";
import { CHART_COLORS } from "../charts/palette";

import { Card, CardHeader } from "./Card";

interface PipelineCardProps {
  stages: PipelineStage[];
  total: number;
}

const STAGE_STYLE: Record<string, { icon: React.ComponentType<{ className?: string }>; tint: string; color: string }> = {
  pending: { icon: ClipboardList, tint: "bg-blue-50 text-blue-600", color: CHART_COLORS.series.total },
  in_progress: { icon: Wrench, tint: "bg-violet-50 text-violet-600", color: "#7c5cd6" },
  awaiting_parts: { icon: PackageSearch, tint: "bg-amber-50 text-amber-600", color: CHART_COLORS.series.pending },
  quality_check: { icon: SearchCheck, tint: "bg-indigo-50 text-indigo-600", color: "#4f6bd8" },
  ready_for_pickup: { icon: Truck, tint: "bg-teal-50 text-teal-600", color: "#14a2a2" },
};

/** Lifecycle funnel: open work only, with the shop's open total at the foot. */
export const PipelineCard = React.memo(function PipelineCard({ stages, total }: PipelineCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Service Pipeline" />

      {stages.every((stage) => stage.count === 0) ? (
        <p className="px-5 pb-5 text-sm text-gray-500">No open devices in the pipeline</p>
      ) : (
        <div className="flex-1 space-y-1 px-3 pb-2">
          {stages.map((stage) => {
            const style = STAGE_STYLE[stage.status] ?? STAGE_STYLE.pending;
            const Icon = style.icon;

            return (
              <div
                key={stage.status}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 motion-reduce:transition-none"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.tint}`} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </div>

                <span className="w-28 shrink-0 truncate text-sm text-gray-600">{stage.label}</span>

                <BarMeter fraction={stage.fraction} color={style.color} className="min-w-0 flex-1" />

                <span className="w-7 shrink-0 text-right text-sm font-semibold text-gray-900">{stage.count}</span>
                <span className="w-12 shrink-0 text-right text-xs text-gray-400">
                  ({Math.round(stage.fraction * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-3">
        <span className="text-sm font-medium text-gray-600">Open Devices</span>
        <span className="text-base font-bold tabular-nums text-gray-900">{total}</span>
      </div>
    </Card>
  );
});
