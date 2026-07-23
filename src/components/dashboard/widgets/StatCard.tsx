"use client";

import React from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Sparkline } from "../charts/Sparkline";

export interface StatCardProps {
  label: string;
  value: string;
  /** Secondary note under the value, e.g. "3 pending". */
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  color: string;
  trend: number[];
  /** `null` when the prior period had no data — rendered as a dash, not a fake 0%. */
  delta: number | null;
}

export const StatCard = React.memo(function StatCard({ label, value, note, icon: Icon, iconClassName, color, trend, delta }: StatCardProps) {
  const isPositive = delta !== null && delta >= 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`} aria-hidden="true">
          <Icon className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-500">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
            {note && <span className="truncate text-xs text-gray-400">{note}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {delta === null ? (
            <span className="text-sm font-semibold text-gray-400">—</span>
          ) : (
            <span className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          <span className="text-xs text-gray-400">vs last period</span>
        </div>

        <Sparkline points={trend} color={color} className="w-24 shrink-0" height={36} />
      </div>
    </div>
  );
});
