"use client";

import React from "react";

import { areaPath, buildScale, smoothPath, type Point } from "./geometry";

interface SparklineProps {
  points: number[];
  color: string;
  /** Rendered via viewBox, so these are aspect-ratio units rather than pixels. */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Decorative trend line for a stat card. The card always states the value and
 * the delta in text, so this carries no information on its own and is hidden
 * from assistive tech.
 */
export const Sparkline = React.memo(function Sparkline({ points, color, width = 120, height = 40, className = "" }: SparklineProps) {
  const gradientId = React.useId();

  if (points.length < 2) {
    return <div className={className} style={{ height }} aria-hidden="true" />;
  }

  const scaleY = buildScale(points, height, 4);
  const step = width / (points.length - 1);
  const coords: Point[] = points.map((value, i) => ({ x: i * step, y: scaleY(value) }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath(coords, height)} fill={`url(#${gradientId})`} />
      <path d={smoothPath(coords)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
});
