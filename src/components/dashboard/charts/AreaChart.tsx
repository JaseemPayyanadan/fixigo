"use client";

import React from "react";

import { CHART_COLORS } from "./palette";
import { areaPath, buildScale, pickXTicks, smoothPath, type Point } from "./geometry";
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
  /** Renders axis ticks — pass a compact currency formatter for money. */
  formatValue?: (value: number) => string;
  /** Renders tooltip figures. Defaults to `formatValue`; override where the axis is abbreviated but a reading should be exact. */
  formatTooltipValue?: (value: number) => string;
  /** Marks each reading with a dot. Ignored on long series, where dots would merge into the line. */
  showMarkers?: boolean;
  /** What the chart is of, for assistive tech. */
  ariaLabel?: string;
}

const PAD = { top: 12, right: 8, bottom: 24, left: 32 };

/** Widest a y-axis label can get before it would collide with the plot. */
const Y_LABEL_CHAR_WIDTH = 6.5;

const MARKER_LIMIT = 45;

/** Roughly how wide a character is at the 11px axis size, for fitting labels. */
const X_LABEL_CHAR_WIDTH = 6.2;

/** Gap kept between neighbouring x labels. */
const X_LABEL_GUTTER = 8;

/** Space a 45°-turned label needs along the axis: its line height, plus a hair. */
const ROTATED_LABEL_PITCH = 13;

/** Rounds an axis maximum up to a readable step so ticks land on whole numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export const AreaChart = React.memo(function AreaChart({
  labels,
  series,
  height = 260,
  xTickCount = 6,
  formatValue = String,
  formatTooltipValue,
  showMarkers = false,
  ariaLabel,
}: AreaChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const gradientPrefix = React.useId();

  const allValues = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const axisMax = niceMax(Math.max(...allValues, 0));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(axisMax * fraction));

  // Formatted ticks vary in width — "₹30k" needs more room than "12" — so the
  // gutter is measured from the labels rather than fixed.
  const longestTick = yTicks.reduce((longest, tick) => Math.max(longest, formatValue(tick).length), 0);
  const padLeft = Math.max(PAD.left, Math.ceil(longestTick * Y_LABEL_CHAR_WIDTH) + 12);

  const plotWidth = Math.max(0, width - padLeft - PAD.right);

  const pointCount = labels.length;
  const stepX = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;

  // Print every date if they can be made to fit, turning them 45° when they
  // will not sit side by side — a month of readings wants all its dates, and
  // an axis that skips four in five leaves the reader counting. Only when even
  // turned labels would overlap does it fall back to a strided subset.
  const xLabelWidth = labels.reduce((widest, label) => Math.max(widest, label.length), 0) * X_LABEL_CHAR_WIDTH;
  const flatFits = stepX >= xLabelWidth + X_LABEL_GUTTER;
  const rotatedFits = stepX >= ROTATED_LABEL_PITCH;
  const rotateLabels = !flatFits && rotatedFits;
  const labelEveryPoint = flatFits || rotatedFits;

  // Turned labels run down-left from their point, so the axis needs their
  // diagonal height underneath.
  const padBottom = rotateLabels ? Math.min(64, Math.ceil(xLabelWidth * 0.71) + 14) : PAD.bottom;

  const plotHeight = Math.max(0, height - PAD.top - padBottom);
  const scaleY = React.useMemo(() => buildScale([axisMax], plotHeight), [axisMax, plotHeight]);

  const xAt = (index: number) => padLeft + index * stepX;

  const stridedTicks = React.useMemo(() => pickXTicks(pointCount, xTickCount), [pointCount, xTickCount]);
  const markers = showMarkers && pointCount <= MARKER_LIMIT;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointCount === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - padLeft;
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
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel ?? `Services over time: ${series.map((s) => s.label).join(", ")}`}
      >
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
              {/* The zero line is drawn solid as the floor the area sits on; the rest are dotted so they read as guides behind the series. */}
              <line
                x1={padLeft}
                y1={y}
                x2={width - PAD.right}
                y2={y}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : "2 4"}
              />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize={11} fill={CHART_COLORS.axis}>
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {/* x axis labels */}
        {labels.map((label, index) => {
          if (!labelEveryPoint && !stridedTicks.has(index)) return null;

          if (rotateLabels) {
            // Turned text runs down-left from its anchor, so the anchor sits
            // just under the axis and the diagonal fills the padding below it.
            const y = height - padBottom + 6;
            return (
              <text
                key={`${label}-${index}`}
                x={xAt(index)}
                y={y}
                textAnchor="end"
                transform={`rotate(-45, ${xAt(index)}, ${y})`}
                fontSize={11}
                fill={CHART_COLORS.axis}
              >
                {label}
              </text>
            );
          }

          // The end labels are anchored inwards so they sit inside the plot
          // instead of hanging off it.
          const anchor = index === 0 ? "start" : index === pointCount - 1 ? "end" : "middle";
          return (
            <text key={`${label}-${index}`} x={xAt(index)} y={height - 6} textAnchor={anchor} fontSize={11} fill={CHART_COLORS.axis}>
              {label}
            </text>
          );
        })}

        {/* Series: fill beneath, line on top */}
        {series.map((s) => {
          const coords: Point[] = s.values.map((value, index) => ({ x: xAt(index), y: PAD.top + scaleY(value) }));
          return (
            <g key={s.key}>
              <path d={areaPath(coords, PAD.top + plotHeight)} fill={`url(#${gradientPrefix}-${s.key})`} />
              <path d={smoothPath(coords)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {markers &&
                coords.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={s.color}
                    stroke={CHART_COLORS.surface}
                    strokeWidth={1.5}
                  />
                ))}
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
              <span className="font-semibold text-gray-900">
                {(formatTooltipValue ?? formatValue)(s.values[hoverIndex] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
