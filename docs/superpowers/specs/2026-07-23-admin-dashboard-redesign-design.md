# Admin Dashboard Redesign

**Date:** 2026-07-23
**Status:** Approved design, not yet implemented
**Scope:** Rebuild the shop-admin and branch-admin dashboards to match the supplied
mockup's structure and density, using only widgets the existing data model can fill.

## Problem

The current `ShopAdminDashboard` (208 lines) renders four stat cards and two rows of
12-column widgets. It works, but it is sparse relative to what the data supports, and
`BranchAdminDashboard` (152 lines) is a weaker, visually unrelated screen whose trend
deltas are **hardcoded** — `change: 18`, `change: 25`, `change: 12` at
`BranchAdminDashboard.tsx:45,58,70` are invented numbers displayed as though measured.

A mockup was supplied showing a denser single-page layout: a five-card KPI row, a service
pipeline, an activity feed, recent repairs, compact today-tiles, a technician performance
table, a weekly bar chart, common-repair rankings, business insights, and a bottom action
bar.

### Mockup elements with no backing data

Verified against `src/types/index.ts`, `firestore.rules`, and the repos:

| Mockup widget | Backing data |
|---|---|
| Pending Payments / "Collect Today" | **None.** No payment, invoice, or paid flag exists. `Service` has `price` and nothing else financial. |
| Today's Activity timeline | **None.** Nothing in `src/` writes an event log. `audit_logs` appears in `firestore.rules:87` and `firestore.indexes.json` but is never written. |
| Device thumbnails | **None.** `Device` (`types/index.ts:262`) is `{brand, model, imei, color?, type?}` — no image field. |
| Pipeline stages Diagnosing / Delivered | **Absent from the status model.** `ServiceStatus` has `pending, in_progress, awaiting_parts, quality_check, ready_for_pickup, completed, cancelled, on_hold`. |
| Scan Barcode action | **None.** No scanner integration. |

Payments and an activity event log are each a separate subsystem — schema, write paths,
migration. Building them inside a dashboard redesign would balloon this past one spec.

## Decisions

1. **Layout only, real data only.** Widgets without backing data are omitted, not faked.
   Pending Payments, the activity timeline, device thumbnails, Scan Barcode, and Collect
   Payment do not ship. No placeholder or derived-guess numbers.
2. **Both admin dashboards, shared widgets.** One view component owns the layout; the two
   role components are scope wrappers. The hardcoded deltas in `BranchAdminDashboard` die
   when it starts routing through `dashboardAnalytics`.
3. **Pipeline uses the six real statuses.** No schema change, no status migration. The
   widget gets the mockup's visual treatment; the labels are the ones already in use, so
   a pipeline count always matches the equivalent services-list filter.
4. **Desktop-first, deliberate stacking.** Designed at `lg`/`xl` to the mockup, collapsing
   to a single column below `lg` in the order: KPIs → pipeline → recent → tiles →
   technicians → charts → insights → actions.
5. **No tabs.** A four-tab reorganisation was implemented (`9040312`) and reverted
   (`8f0bb44`) earlier the same day. The mockup is emphatically a single dense page.

## Layout

Five bands on a 12-column grid.

**Band 1 — KPI row.** Five `StatCard`s (existing component; icon tile, value, sparkline,
delta chip already match the mockup).

Two of these cards are point-in-time counts of current shop state, not period
aggregates. Only the period-scoped cards get a sparkline and a delta chip; the
point-in-time cards render value and label alone, because "Devices in Shop, up 8% vs the
previous month" compares a snapshot against an aggregate and means nothing.

| Card | Scope | Derivation |
|---|---|---|
| Revenue | period | `summarize().revenue` — completed services only |
| Completed | period | `summarize().completedServices` |
| Devices in Shop | now | `summarize().activeServices` over unfiltered services |
| Ready for Delivery | now | count of `ready_for_pickup` |
| Delayed Jobs | now | `countDelayed` — `estimatedCompletion < now`, excluding completed/cancelled |

The row shares one `DashboardPeriod` selector, defaulting to `this_month`, which affects
only the two period-scoped cards.

**Band 2 — Pipeline (5) · Status donut (3) · Recent Repairs (4).** `PipelineCard` is new.
`ServiceStatusCard` (existing donut) fills the slot where the mockup has the activity
timeline. `RecentServicesCard` is restyled to the mockup's row: name, customer, relative
time, status chip, price, chevron.

**Band 3 — Stat tiles (5) · Top Technicians (7).** `StatTileRow` and
`TopTechniciansTable` are new. The table replaces `RankedListCard` for technicians.

**Band 4 — Weekly Activity (5) · Most Common Repairs (4) · Insights (3).**
`WeeklyActivityCard` and `InsightsCard` are new. Most Common Repairs is the existing
`RankedListCard` over `topServices`, which already matches the mockup exactly.

**Band 5 — Action bar.** Existing `QuickActionsCard`, restyled to a full-width pill row:
New Repair, Receive Device, Deliver Device.

Branch admin renders the same bands scoped to its branch.

## Data layer

Every new number is a pure function in `src/lib/dashboardAnalytics.ts`, tested there.
Widgets are presentational — props in, markup out.

```ts
export interface PipelineStage {
  status: ServiceStatus;
  label: string;
  count: number;
  fraction: number;        // 0-1, share of total; feeds BarMeter
}
export function pipelineBreakdown(services: Service[]): {
  stages: PipelineStage[];
  total: number;
};

export interface TodayCounts {
  received: number;          // createdAt is today
  repairing: number;         // status in_progress
  waitingParts: number;      // status awaiting_parts
  readyForDelivery: number;  // status ready_for_pickup
  completedToday: number;    // completedDate is today
}
export function todayCounts(services: Service[], now?: Date): TodayCounts;

export function countDelayed(services: Service[], now?: Date): number;

export interface TechnicianRow {
  id: string;
  name: string;
  initials: string;
  completed: number;
  active: number;
  avgDays: number | null;    // from actualDuration; null when no completed work
  rating: number | null;     // mean customerFeedback.rating; null when unrated
  completionRate: number;    // 0-1, drives the ring gauge
}
export function technicianPerformance(
  services: Service[],
  technicians: Technician[],
  limit?: number
): TechnicianRow[];

export interface WeekdayPoint { label: string; date: Date; count: number }
export function weeklySeries(services: Service[], now?: Date): WeekdayPoint[];
// Mon-Sun of the current week, zero-filled

export interface Insight { kind: "delay" | "technician" | "repair" | "volume"; text: string }
export function buildInsights(
  services: Service[],
  technicians: Technician[],
  now?: Date
): Insight[];
```

**Nulls, not zeros.** `avgDays` and `rating` are `null` when there is nothing to average,
and widgets render `—`. A technician with no completed jobs must not show "0.0 days" or a
zero rating; that reads as terrible performance rather than absent data.

**`buildInsights` emits only what is true.** Each candidate insight has a predicate.
Sentences that do not apply are omitted and the card shows an empty state if none qualify.
It never pads to a fixed count.

**Period scoping.** Top Technicians and Most Common Repairs keep their existing per-widget
`DashboardPeriod` selectors; the KPI row gains one shared selector governing its two
period-scoped cards. Pipeline, stat tiles, and Weekly Activity are inherently "now"/"this
week" and take no selector — matching the mockup, where those cards have no dropdown.

**Loading and errors** are unchanged: `DashboardLoadingState` while `isLoading`,
`CompactErrorState` for `servicesError`, inside the existing `DashboardErrorBoundary`.
Each card renders its own empty state, so one empty widget never blanks the page.

## Component structure

```
src/components/dashboard/
  AdminDashboardView.tsx        NEW  ~150  five bands, grid, period state
  ShopAdminDashboard.tsx        MOD  ~25   <AdminDashboardView shopId />
  BranchAdminDashboard.tsx      MOD  ~25   <AdminDashboardView shopId branchId />
  widgets/
    PipelineCard.tsx            NEW  ~70   BarMeter rows + total footer
    StatTileRow.tsx             NEW  ~50   five compact today-tiles
    TopTechniciansTable.tsx     NEW  ~90   columns + ring gauge
    WeeklyActivityCard.tsx      NEW  ~60   labelled bars over weeklySeries
    InsightsCard.tsx            NEW  ~55   icon + sentence list, empty state
    RecentServicesCard          MOD        restyled to the mockup row
    QuickActionsCard            MOD        full-width pill row
  charts/
    BarChart.tsx                NEW  ~70   vertical bars + value labels
    RingGauge.tsx               NEW  ~45   the completion-rate donut
```

`AdminDashboardView` takes `{ shopId, branchId? }`, calls `useDashboardData(shopId,
branchId)` and `useTechnicians(shopId, branchId)`, computes memoised aggregates, and lays
out the bands. `useDashboardData` already accepts `branchId` (`useDashboardData.ts:44`),
so branch scoping needs no new plumbing.

`BarChart` and `RingGauge` belong in `charts/` because they are geometry, not domain —
the same shape as the existing `Sparkline` and `BarMeter`, and able to reuse `geometry.ts`
and `useElementWidth`.

`shared/DashboardComponents.tsx` (470 lines) is deliberately **not** extended. It is
already too large; new work goes in `widgets/`.

## Preview route

```
src/app/(dashboard)/dashboard/preview/page.tsx   dev-only, 404s in production
src/lib/fixtures/dashboardFixtures.ts            ~40 services + technicians
```

Renders `AdminDashboardView` against fixture data. The dashboard cannot currently load a
single service — `FIREBASE_SERVICE_ACCOUNT_KEY` is unset, so every Firestore-backed API
route returns 500 — and a redesign that cannot be looked at cannot be reviewed. The
fixtures also pin deterministic edge cases: zero technicians, an unrated technician, an
empty pipeline stage, a delayed job, a service completed at a day boundary.

The route must return `notFound()` when `process.env.NODE_ENV === "production"`.

## Testing

New `dashboardAnalytics.ts` functions get cases in `dashboardAnalytics.test.ts` covering:

- empty input, single service
- day boundaries — completed at 23:59 today vs 00:01 tomorrow
- missing optional fields — absent `estimatedCompletion`, `actualDuration`,
  `customerFeedback`
- null-vs-zero: unrated technician, technician with no completed work
- `pipelineBreakdown` fractions summing to 1, and the zero-total case not dividing by zero
- `buildInsights` returning `[]` when no predicate holds

Widgets get no tests, consistent with the rest of the codebase.

## Out of scope

- Payments / invoicing model and the Pending Payments widgets
- Activity event log and the Today's Activity timeline
- Device images
- Barcode scanning
- New status values (Diagnosing, Delivered)
- `TechnicianDashboard` — a different shape (mobile-first, swipe cards, personal task
  list) needing its own layout work
- The app shell: `SideNavBar`, `AppBar`, `BottomNavBar`, global search, notifications

## Risks

**`Delayed Jobs` may read 0 permanently.** `estimatedCompletion` is optional and may be
unset on most existing service documents. The card ships anyway, to be judged against real
data; if it proves empty, it is one card to remove.

**The redesign cannot be verified against real data until the Firebase service-account
credential is configured.** The preview route mitigates this for layout review, but the
first real-data render remains unverified until then.
