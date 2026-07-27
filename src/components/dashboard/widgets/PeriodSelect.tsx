"use client";

import React from "react";

import { ChevronDown } from "lucide-react";

import { PERIOD_OPTIONS, type DashboardPeriod } from "@/lib/dashboardAnalytics";

interface PeriodSelectProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  label: string;
}

/** Native select styled to match the mockup — keeps keyboard and mobile behaviour for free. */
export const PeriodSelect = React.memo(function PeriodSelect({ value, onChange, label }: PeriodSelectProps) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as DashboardPeriod)}
        className="min-h-11 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:py-1.5"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
    </div>
  );
});
