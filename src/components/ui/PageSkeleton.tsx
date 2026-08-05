// src/components/ui/PageSkeleton.tsx
"use client";

import React from "react";

/**
 * Shared pulse block — same visual language as `DashboardSkeleton`
 * (rounded gray pulse, no spinners).
 */
export function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  );
}

/** KPI / summary card placeholders. */
export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Pulse className="mb-3 h-5 w-24 rounded-md" />
          <Pulse className="h-7 w-20" />
          <Pulse className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Data-table / list panel placeholder. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      <div className="hidden border-b border-gray-100 bg-gray-50 px-4 py-3 md:flex md:gap-4">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-3 w-20" />
        <Pulse className="ml-auto h-3 w-16" />
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-20" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Pulse className="h-4 w-40 max-w-full" />
              <Pulse className="h-3 w-24 max-w-full" />
            </div>
            <Pulse className="hidden h-4 w-20 sm:block" />
            <Pulse className="hidden h-4 w-16 md:block" />
            <Pulse className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Form / slide-over body placeholder. */
export function FormSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading form</span>
      {Array.from({ length: sections }, (_, index) => (
        <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5">
          <Pulse className="mb-1 h-4 w-40" />
          <Pulse className="mb-4 h-3 w-56" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Pulse className="h-11 w-full rounded-xl" />
            <Pulse className="h-11 w-full rounded-xl" />
            <Pulse className="h-11 w-full rounded-xl" />
            <Pulse className="h-11 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Standard list page: optional summary cards + table. */
export function ListPageSkeleton({
  cards = 4,
  rows = 6,
  label = "Loading",
}: {
  cards?: number;
  rows?: number;
  label?: string;
}) {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {cards > 0 ? <SummaryCardsSkeleton count={cards} /> : null}
      <div className="flex flex-wrap gap-3">
        <Pulse className="h-11 min-w-[12rem] flex-1 rounded-xl" />
        <Pulse className="h-11 w-11 rounded-xl" />
        <Pulse className="h-11 w-28 rounded-xl" />
      </div>
      <TableSkeleton rows={rows} />
    </div>
  );
}

/** Compact fallback for Suspense boundaries and inline hosts. */
export function PageFallback({ label = "Loading" }: { label?: string }) {
  return (
    <div className="space-y-4 p-4 md:p-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Pulse className="h-4 w-32" />
      <Pulse className="h-11 w-full max-w-md rounded-xl" />
      <div className="space-y-3">
        <Pulse className="h-24 w-full rounded-2xl" />
        <Pulse className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default ListPageSkeleton;
