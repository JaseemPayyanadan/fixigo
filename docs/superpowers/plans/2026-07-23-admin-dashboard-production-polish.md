# Admin Dashboard Production Polish — Implementation Plan

> **For agentic workers:** Execute task-by-task. Spec: `docs/superpowers/specs/2026-07-23-admin-dashboard-production-polish-design.md`.

**Goal:** Production-feel polish on the existing admin dashboard — skeletons, density, empty/error, focus/hover, mobile — without new widgets or data.

**Tech:** Next 14 App Router, React, Tailwind, existing dashboard widgets.

## File map

| File | Change |
|---|---|
| `widgets/DashboardSkeleton.tsx` | NEW — KPI + card-shaped skeletons |
| `AdminDashboardView.tsx` | Use skeleton; `space-y-5` |
| `widgets/StatCard.tsx` | Value-first type; motion-safe hover |
| `widgets/Card.tsx` | Shared header rhythm |
| `widgets/PipelineCard.tsx` | Row hover |
| `widgets/TopTechniciansTable.tsx` | Compact rows, focus on link |
| `widgets/RankedListCard.tsx` | Empty padding consistency |
| `widgets/WeeklyActivityCard.tsx` | Empty state height |
| `widgets/PeriodSelect.tsx` | Touch-friendly height + focus |
| `shared/DashboardComponents.tsx` | RecentServicesCard header/empty; replace loading banner usage |

## Tasks

1. Add `DashboardSkeleton` and wire it in `AdminDashboardView`.
2. Polish StatCard, Card, PeriodSelect.
3. Polish Pipeline, Recent, Technicians, charts empty states.
4. Smoke-check TypeScript / lints on touched files.

No new analytics tests required (UI-only). Keep existing `dashboardAnalytics` tests green if touched.
