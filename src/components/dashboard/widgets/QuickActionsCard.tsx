
"use client";

import React from "react";

import Link from "next/link";

import { BarChart3, Building2, ClipboardList, Plus, UserPlus } from "lucide-react";

// Every destination is a route that exists in the app. The mockup's "Add
// Customer", "Create Invoice", "Scan Barcode" and "Collect Payment" tiles are
// omitted deliberately: there are no such routes, and a tile that goes nowhere
// is worse than an absent one.
const ACTIONS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  ring: string;
  comingSoon?: boolean;
}> = [
  { href: "/services/new", label: "New Service", icon: Plus, tint: "bg-blue-600 text-white", ring: "hover:bg-blue-700" },
  { href: "/technicians/new", label: "Add Technician", icon: UserPlus, tint: "bg-emerald-50 text-emerald-700", ring: "hover:bg-emerald-100" },
  { href: "/branch/new", label: "Add Branch", icon: Building2, tint: "bg-violet-50 text-violet-700", ring: "hover:bg-violet-100" },
  { href: "/services", label: "All Services", icon: ClipboardList, tint: "bg-gray-100 text-gray-700", ring: "hover:bg-gray-200" },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    tint: "bg-gray-50 text-gray-400",
    ring: "",
    comingSoon: true,
  },
];

/**
 * Full-width action bar. Sits at the foot of the dashboard as a row of equal
 * pills on wide screens, wrapping to a two-column grid on phones.
 */
export const QuickActionsCard = React.memo(function QuickActionsCard() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ACTIONS.map(({ href, label, icon: Icon, tint, ring, comingSoon }) =>
        comingSoon ? (
          <div
            key={href}
            title="Coming soon"
            aria-disabled="true"
            className={`flex cursor-not-allowed items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm ${tint}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </div>
        ) : (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tint} ${ring}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        )
      )}
    </div>
  );
});
