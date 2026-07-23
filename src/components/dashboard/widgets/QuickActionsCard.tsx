"use client";

import React from "react";

import Link from "next/link";

import { BarChart3, Building2, ClipboardList, Plus, UserPlus } from "lucide-react";

import { Card, CardHeader } from "./Card";

// Every destination is a route that exists in the app. The mockup's "Add
// Customer" and "Create Invoice" tiles are omitted deliberately: there are no
// such routes, and a tile that goes nowhere is worse than an absent one.
const ACTIONS = [
  { href: "/services/new", label: "New Service", icon: Plus, tint: "bg-blue-50 text-blue-600" },
  { href: "/technicians/new", label: "Add Technician", icon: UserPlus, tint: "bg-emerald-50 text-emerald-600" },
  { href: "/branch/new", label: "Add Branch", icon: Building2, tint: "bg-violet-50 text-violet-600" },
  { href: "/services", label: "All Services", icon: ClipboardList, tint: "bg-amber-50 text-amber-600" },
  { href: "/reports", label: "Reports", icon: BarChart3, tint: "bg-rose-50 text-rose-600" },
];

export const QuickActionsCard = React.memo(function QuickActionsCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Quick Actions" />

      <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIONS.map(({ href, label, icon: Icon, tint }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 px-3 py-4 text-center transition-all duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tint} transition-transform duration-200 group-hover:scale-105`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium leading-tight text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
});
