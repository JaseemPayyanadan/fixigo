"use client";

import React from "react";

export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  color: string;
  /** Bar column height in pixels, excluding the value and axis labels. */
  height?: number;
  className?: string;
}

/**
 * Vertical bars with the value written above each one and the category below.
 *
 * Laid out with flexbox rather than SVG: every bar is a plain element, so the
 * chart reflows with the card instead of needing a measured viewBox, and the
 * labels stay real text for selection and assistive tech.
 */
export const BarChart = React.memo(function BarChart({ data, color, height = 160, className = "" }: BarChartProps) {
  const max = data.reduce((highest, datum) => Math.max(highest, datum.value), 0);

  if (data.length === 0) {
    return <p className={`text-sm text-gray-400 ${className}`}>No activity to chart</p>;
  }

  return (
    <div className={`flex items-end justify-between gap-2 ${className}`} style={{ height: height + 40 }}>
      {data.map((datum) => {
        // Zero stays zero-height; everything else gets a 4px floor so a single
        // low bar is still visible next to a tall one.
        const ratio = max === 0 ? 0 : datum.value / max;
        const barHeight = datum.value === 0 ? 0 : Math.max(4, ratio * height);

        return (
          <div key={datum.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-900">{datum.value}</span>
            <div
              className="w-full max-w-[36px] rounded-t-md transition-[height] duration-300"
              style={{ height: barHeight, backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="truncate text-xs text-gray-500">{datum.label}</span>
          </div>
        );
      })}
    </div>
  );
});
