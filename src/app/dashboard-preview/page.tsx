"use client";

import React from "react";

import { notFound } from "next/navigation";

import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView";
import {
  fixtureRecentServices,
  fixtureServices,
  fixtureTechnicians,
} from "@/lib/fixtures/dashboardFixtures";

/**
 * Development-only preview of the admin dashboard, rendered against fixtures.
 *
 * Exists so the layout can be reviewed without a Firestore connection, and so
 * the awkward states (unrated technician, days with no work, overdue jobs)
 * are always reachable rather than depending on whatever the live data happens
 * to contain today.
 *
 * Deliberately outside the `(dashboard)` route group: that layout gates on a
 * session, and a preview you cannot open until you are logged in defeats the
 * purpose. It shows fixtures only and never touches real data.
 */
export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Pinned once so the fixture dates — and therefore every count on screen —
  // stay stable across re-renders.
  const now = React.useMemo(() => new Date(), []);
  const services = React.useMemo(() => fixtureServices(now), [now]);
  const recentServices = React.useMemo(() => fixtureRecentServices(now), [now]);
  const technicians = React.useMemo(() => fixtureTechnicians(), []);

  return (
    <>
      <p className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
        Preview — sample data, not your shop. Development builds only.
      </p>
      <AdminDashboardView
        services={services}
        recentServices={recentServices}
        technicians={technicians}
        now={now}
      />
    </>
  );
}
