"use client";

import React from "react";

interface BarMeterProps {
  /** 0-1 share of the row's full width. */
  fraction: number;
  color: string;
  className?: string;
}

/** Proportional bar with a 4px rounded data-end, anchored to the row baseline. */
export const BarMeter = React.memo(function BarMeter({ fraction, color, className = "" }: BarMeterProps) {
  const safe = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;

  return (
    <div className={`h-2 flex-1 rounded-full bg-gray-100 ${className}`} aria-hidden="true">
      <div
        className="h-2 rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(safe * 100, safe > 0 ? 4 : 0)}%`, backgroundColor: color }}
      />
    </div>
  );
});
