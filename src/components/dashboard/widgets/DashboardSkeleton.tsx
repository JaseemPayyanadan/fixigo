"use client";

import React from "react";

import { Pulse } from "@/components/ui/PageSkeleton";

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Pulse className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Pulse className="h-3.5 w-24" />
          <Pulse className="h-7 w-20" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <Pulse className="h-3 w-16" />
        <Pulse className="h-8 w-16 sm:w-20" />
      </div>
    </div>
  );
}

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex-1 space-y-3 px-5 pb-5">
        {Array.from({ length: rows }, (_, index) => (
          <Pulse key={index} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Shape-matched placeholders for the admin dashboard. Used instead of a
 * spinner-over-zeros so the page does not flash empty metrics while loading.
 */
export const DashboardSkeleton = React.memo(function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PanelSkeleton rows={5} />
        </div>
        <div className="lg:col-span-5">
          <PanelSkeleton rows={4} />
        </div>
      </div>

      <PanelSkeleton rows={3} />

      <PanelSkeleton rows={4} />
    </div>
  );
});
