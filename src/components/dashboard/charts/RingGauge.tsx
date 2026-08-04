"use client";

import React from "react";

import { CHART_COLORS } from "./palette";

interface RingGaugeProps {
  /** 0-1. Values outside the range are clamped rather than overdrawing the arc. */
  fraction: number;
  color?: string;
  size?: number;
  thickness?: number;
  label: string;
}

/**
 * Small completion ring with the percentage in the middle. The percentage is
 * always written out, so the arc never carries the value on colour alone.
 */
export const RingGauge = React.memo(function RingGauge({
  fraction,
  color = CHART_COLORS.series.completed,
  size = 44,
  thickness = 4,
  label,
}: RingGaugeProps) {
  const safe = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const percent = Math.round(safe * 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${percent}%`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={CHART_COLORS.muted} strokeWidth={thickness} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${safe * circumference} ${circumference}`}
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-700">
        {percent}%
      </span>
    </div>
  );
});
