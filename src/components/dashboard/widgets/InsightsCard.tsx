"use client";

import React from "react";

import { CalendarDays, Clock, TrendingUp, UserCheck } from "lucide-react";

import type { Insight } from "@/lib/dashboardAnalytics";

import { Card, CardHeader } from "./Card";

interface InsightsCardProps {
  insights: Insight[];
}

const KIND_STYLE: Record<Insight["kind"], { icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  delay: { icon: Clock, tint: "text-amber-500" },
  technician: { icon: UserCheck, tint: "text-emerald-500" },
  repair: { icon: TrendingUp, tint: "text-blue-500" },
  volume: { icon: CalendarDays, tint: "text-violet-500" },
};

/**
 * Derived observations about the shop. The list is only ever as long as the
 * number of statements that actually hold — an insight invented to fill a row
 * is worse than a short card.
 */
export const InsightsCard = React.memo(function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Business Insights" />

      <div className="flex-1 px-5 pb-5">
        {insights.length === 0 ? (
          <p className="text-sm text-gray-400">Not enough activity yet to draw conclusions</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, index) => {
              const style = KIND_STYLE[insight.kind];
              const Icon = style.icon;

              return (
                <li key={`${insight.kind}-${index}`} className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.tint}`} aria-hidden="true" />
                  <span className="text-sm leading-snug text-gray-600">{insight.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
});
