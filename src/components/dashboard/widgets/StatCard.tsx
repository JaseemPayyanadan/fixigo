"use client";

import React from "react";

import { Sparkline } from "../charts/Sparkline";

export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Background utility for the icon tile, e.g. "bg-violet-600". */
  iconClassName: string;
  /** Sparkline stroke. Decorative only — the value and delta are always text. */
  color: string;
  /**
   * Pass `[]` for a metric with no reconstructable history. The sparkline's
   * height is still reserved, so cards stay the same shape in a row, but no
   * line is drawn — better than plotting a series that was never measured.
   */
  trend?: number[];
  /** `null` when there is no honest comparison — rendered as a dash, not a fake 0%. */
  delta?: number | null;
}

export const StatCard = React.memo(function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  color,
  trend,
  delta,
}: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const isPositive = hasDelta && delta >= 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`} aria-hidden="true">
          <Icon className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 truncate text-lg font-bold leading-none tracking-tight text-gray-900" title={value}>
            {value}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[14px]">
          {hasDelta ? (
            <>
              <span
                className={`flex shrink-0 items-center gap-1 font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
              >
                <span className="text-[9px] leading-none" aria-hidden="true">
                  {isPositive ? "▲" : "▼"}
                </span>
                {Math.abs(delta).toFixed(0)}%
              </span>
              <span className="truncate text-gray-400">vs yesterday</span>
            </>
          ) : (
            <span className="shrink-0 text-gray-300" aria-hidden="true">
              —
            </span>
          )}
        </div>

        <Sparkline points={trend ?? []} color={color} className="w-16 shrink-0 sm:w-20" height={32} />
      </div>
    </div>
  );
});
