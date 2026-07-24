# Admin Dashboard Production Polish

**Date:** 2026-07-23  
**Status:** Approved design  
**Scope:** Visual and interaction polish of the existing admin dashboard. Same widgets, same data, no new metrics.

## Problem

The shop/branch admin dashboard already has the right information architecture after recent cleanup (duplicate status widgets and bottom actions removed). What remains feels unfinished for production: loading flashes empty zeros behind a banner, empty states are thin, card density and header alignment vary, and KPI cards show a “vs yesterday” caption even when there is no comparison.

## Decision

**Full production polish** of the current layout — density, skeletons, empty/error copy, focus/hover, mobile stacking, and light motion — without adding widgets or changing the Fixigo blue/gray visual language.

## Layout (unchanged)

1. KPI row (5 cards)  
2. Pipeline + Recent Repairs  
3. Top Technicians  
4. Weekly Activity + Most Common Repairs  

## Polish rules

### Density and alignment

- Page: `space-y-5`, `p-4 md:p-6`.
- Cards: shared surface (`rounded-2xl`, `border-gray-100`, `bg-white`, `shadow-sm`); content padding `p-5` / header `px-5 pt-4 pb-3`.
- Every widget header: title left, optional period/action right, same vertical rhythm.

### KPI cards

- Value-first: large number, quieter label.
- Delta chip + “vs yesterday” only when `delta` is a real number; otherwise a quiet em dash (no fake comparison).
- Soft hover shadow only; no multi-layer shadows.
- Sparklines stay decorative (`aria-hidden` via existing chart); empty trend still reserves height so the five cards share one shape.

### Loading

- Replace the blue loading banner with skeleton placeholders that match KPI / card shapes.
- Do not render metric zeros underneath a loading indicator.

### Empty and error

- Empty: one short sentence + one primary action where it applies (e.g. Recent Repairs → Create service).
- Error: what failed + Retry. No apology fluff, no decorative empty illustrations.

### Lists and pipeline

- Pipeline remains open-work only; footer label “Open Devices”.
- Row hover on pipeline stages and recent service rows; keep stage bars.
- Top Technicians: compact rows, aligned metric columns, period select + “View all technicians” unchanged.

### Charts

- Keep existing BarChart / BarMeter / Sparkline implementations.
- Empty week or empty ranked list: short empty copy inside the card, not a blank white box.

### Mobile

- KPIs: 1 column → 2 from `sm` → 5 from `xl`.
- Stack order: KPIs → Pipeline → Recent → Technicians → Weekly → Common Repairs.
- Interactive targets ≥ 44px where practical (period selects, links, retry).

### Accessibility

- Visible focus rings on interactive controls (`focus:ring-2 focus:ring-blue-500`).
- Decorative icons `aria-hidden`.
- Honor `prefers-reduced-motion` for any enter/hover motion (disable or shorten).

## Out of scope

- New widgets or KPIs  
- Color theme / brand redesign  
- Technician dashboard rewrite  
- Sidebar / AppBar / bottom-nav redesign (beyond existing AppBar)  
- Fake data or invented deltas  

## Success criteria

- Dashboard loads without showing zeroed KPIs under a spinner.  
- Empty and error states give a clear next step.  
- Cards share one density and header pattern.  
- Usable on phone and desktop without horizontal overflow.  
- Keyboard focus is visible on period selects and primary links.  
