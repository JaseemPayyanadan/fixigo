"use client";

import React from "react";

import { CHART_COLORS } from "./palette";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue: React.ReactNode;
  centerLabel: string;
}

const GAP_DEGREES = 2; // 2px-equivalent surface gap between adjacent fills

export const DonutChart = React.memo(function DonutChart({ segments, size = 180, thickness = 26, centerValue, centerLabel }: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle cx={center} cy={center} r={radius} fill="none" stroke={CHART_COLORS.muted} strokeWidth={thickness} />
        </svg>
        <p className="mt-2 text-sm text-gray-400">No services yet</p>
      </div>
    );
  }

  let offsetDegrees = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
        style={{ transform: "rotate(-90deg)" }}
      >
        {segments.map((segment) => {
          const value = Math.max(0, segment.value);
          if (value === 0) return null;

          const sweep = (value / total) * 360;
          // Only inset a gap when the segment is wide enough to survive it.
          const gap = sweep > GAP_DEGREES * 2 ? GAP_DEGREES : 0;
          const dash = ((sweep - gap) / 360) * circumference;
          const rotation = offsetDegrees;
          offsetDegrees += sweep;

          return (
            <circle
              key={segment.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="butt"
              style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{centerValue}</span>
        <span className="text-xs font-medium text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
});
