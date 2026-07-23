"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** The shared surface every dashboard widget sits on. */
export const Card = React.memo(function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>{children}</div>;
});

interface CardHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader = React.memo(function CardHeader({ title, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-5 pt-4 pb-3 ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
});
