"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** The shared surface every dashboard widget sits on. */
export const Card = React.memo(function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>{children}</div>
  );
});

interface CardHeaderProps {
  title: string;
  /** Qualifier set beside the title in lighter type, e.g. the window a figure covers. */
  titleSuffix?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader = React.memo(function CardHeader({
  title,
  titleSuffix,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div className={`flex min-h-[52px] items-center justify-between gap-3 px-5 pt-4 pb-3 ${className}`}>
      <h2 className="truncate text-base font-semibold tracking-tight text-gray-900">
        {title}
        {titleSuffix ? <span className="font-medium text-gray-500"> {titleSuffix}</span> : null}
      </h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
});
