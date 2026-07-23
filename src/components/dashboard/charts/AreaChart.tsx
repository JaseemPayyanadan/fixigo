"use client";

import React from "react";

import { CHART_COLORS } from "./palette";
import { areaPath, buildScale, smoothPath, type Point } from "./geometry";
import { useElementWidth } from "./useElementWidth";

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface AreaChartProps {
  labels: string[];
  series: AreaSeries[];
  height?: number;
  /** Roughly how many x labels to print; the rest are skipped to avoid collisions. */
  xTickCount?: number;
}

const PAD = { top: 12, right: 8, bottom: 24, left: 32 };

/** Rounds an axis maximum up to a readable step so ticks land on whole numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export const AreaChart = React.memo(function AreaChart({ labels, series, height = 260, xTickCount = 6 }: AreaChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const gradientPrefix = React.useId();

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = Math.max(0, height - PAD.top - PAD.bottom);

  const allValues = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const axisMax = niceMax(Math.max(...allValues, 0));
  const scaleY = React.useMemo(() => buildScale([axisMax], plotHeight), [axisMax, plotHeight]);

  const pointCount = labels.length;
  const stepX = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;
  const xAt = (index: number) => PAD.left + index * stepX;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(axisMax * fraction));
  const xTickStride = Math.max(1, Math.ceil(pointCount / xTickCount));

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointCount === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - PAD.left;
    const index = stepX === 0 ? 0 : Math.round(x / stepX);
    setHoverIndex(Math.min(pointCount - 1, Math.max(0, index)));
  };

  if (pointCount === 0) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No activity in this period
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      style={{ height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg width={width} height={height} role="img" aria-label={`Services over time: ${series.map((s) => s.label).join(", ")}`}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${gradientPrefix}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines and y axis */}
        {yTicks.map((tick) => {
          const y = PAD.top + scaleY(tick);
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={CHART_COLORS.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={CHART_COLORS.axis}>
                {tick}
              </text>
            </g>
          );
        })}

        {/* x axis labels */}
        {labels.map((label, index) =>
          index % xTickStride === 0 ? (
            <text key={`${label}-${index}`} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize={11} fill={CHART_COLORS.axis}>
              {label}
            </text>
          ) : null
        )}

        {/* Series: fill beneath, line on top */}
        {series.map((s) => {
          const coords: Point[] = s.values.map((value, index) => ({ x: xAt(index), y: PAD.top + scaleY(value) }));
          return (
            <g key={s.key}>
              <path d={areaPath(coords, PAD.top + plotHeight)} fill={`url(#${gradientPrefix}-${s.key})`} />
              <path d={smoothPath(coords)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* Hover crosshair: 2px surface ring keeps markers legible where series overlap */}
        {hoverIndex !== null && (
          <g pointerEvents="none">
            <line x1={xAt(hoverIndex)} y1={PAD.top} x2={xAt(hoverIndex)} y2={PAD.top + plotHeight} stroke={CHART_COLORS.axis} strokeWidth={1} strokeDasharray="3 3" />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={xAt(hoverIndex)}
                cy={PAD.top + scaleY(s.values[hoverIndex] ?? 0)}
                r={4}
                fill={s.color}
                stroke={CHART_COLORS.surface}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>

      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(Math.max(xAt(hoverIndex) - 60, 0), Math.max(0, width - 140)),
            top: 8,
            minWidth: 120,
          }}
        >
          <p className="mb-1 text-xs font-medium text-gray-500">{labels[hoverIndex]}</p>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-gray-900">{s.values[hoverIndex] ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
