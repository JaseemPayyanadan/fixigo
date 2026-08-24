"use client";

import React from "react";

import { notFound } from "next/navigation";

import { FuturisticReportsView } from "@/components/reports/FuturisticReportsView";
import { fixtureServices, fixtureTechnicians } from "@/lib/fixtures/dashboardFixtures";
import type { Branch } from "@/types";

// The shared fixtures only carry one branch id ("fixture-branch"); a second
// empty branch is enough to exercise the comparison panel's multi-row layout.
const PREVIEW_BRANCHES: Branch[] = [
  {
    id: "fixture-branch",
    name: "Downtown Branch",
    location: "MG Road",
    phone: "",
    email: "",
    status: "active",
    shopId: "fixture-shop",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fixture-branch-2",
    name: "Uptown Branch",
    location: "Ring Road",
    phone: "",
    email: "",
    status: "active",
    shopId: "fixture-shop",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** Temporary dev-only preview for visually checking the Reports redesign against fixtures, no login required. Remove once reviewed. */
export default function ReportsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const now = React.useMemo(() => new Date(), []);
  const services = React.useMemo(() => fixtureServices(now), [now]);
  const technicians = React.useMemo(() => fixtureTechnicians(), []);

  return <FuturisticReportsView services={services} technicians={technicians} branches={PREVIEW_BRANCHES} now={now} />;
}
