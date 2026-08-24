"use client";

import React from "react";

import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { Download, Printer, RefreshCw, TrendingDown, TrendingUp, Wrench } from "lucide-react";

import {
  filterByPeriod,
  filterByRange,
  getPeriodRange,
  statusBreakdown,
  summarize,
  technicianPerformance,
  revenueTrend,
  revenueForRange,
  PERIOD_OPTIONS,
  TREND_WINDOW_OPTIONS,
  type DashboardPeriod,
  type RevenueTrend,
  type StatusBreakdown,
  type StatusBucketKey,
  type TechnicianRow as TechnicianRowData,
  type TrendWindow,
} from "@/lib/dashboardAnalytics";
import { purchaseTrend, purchaseTrendForRange, type PurchaseTrend } from "@/lib/purchaseAnalytics";
import type { Branch, Service, Technician } from "@/types";
import type { Purchase } from "@/types/purchase";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-reports-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-reports-mono" });

export interface FuturisticReportsViewProps {
  services: Service[];
  technicians: Technician[];
  /** Every branch the shop owns. Only shop_admin passes more than zero — the branch comparison panel needs at least two to be worth showing. */
  branches?: Branch[];
  purchases?: Purchase[];
  isLoading?: boolean;
  servicesError?: string | null;
  /** Re-fetches services. Omit to hide the refresh control (e.g. in the preview route). */
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  /** CSV/PDF export gated by the shop's plan. Defaults to on for the preview route and tests. */
  exportEnabled?: boolean;
  /** Overrides the clock, so tests and previews render deterministically. */
  now?: Date;
}

const MODULES = {
  revenue: { code: "REV", label: "Revenue", accent: "#059669" },
  purchase: { code: "PUR", label: "Purchases", accent: "#BE123C" },
  service: { code: "SVC", label: "Service", accent: "#0E7490" },
  performance: { code: "PERF", label: "Performance", accent: "#7C3AED" },
  branch: { code: "BRN", label: "Branch", accent: "#C2410C" },
} as const;

const STATUS_COLORS: Record<StatusBucketKey, string> = {
  completed: MODULES.revenue.accent,
  in_progress: MODULES.service.accent,
  to_do: MODULES.performance.accent,
};

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

type RevenueSelection = TrendWindow | "custom";
type PeriodSelection = DashboardPeriod | "custom";
interface RangeValue {
  start: Date;
  end: Date;
}

const REVENUE_TAB_OPTIONS: Array<{ value: RevenueSelection; label: string }> = [...TREND_WINDOW_OPTIONS, { value: "custom", label: "Custom" }];
const PERIOD_TAB_OPTIONS: Array<{ value: PeriodSelection; label: string }> = [...PERIOD_OPTIONS, { value: "custom", label: "Custom" }];

function displayFont(): React.CSSProperties {
  return { fontFamily: "var(--font-reports-display)" };
}
function monoFont(): React.CSSProperties {
  return { fontFamily: "var(--font-reports-mono)" };
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Last 30 days ending today — the range a "Custom" tab opens on before a person picks their own. */
function defaultRange(now: Date): RangeValue {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  return { start, end };
}

function periodTabLabel(period: PeriodSelection): string {
  return PERIOD_TAB_OPTIONS.find((option) => option.value === period)?.label ?? String(period);
}

function rangeLabel(range: RangeValue): string {
  return `${toInputDate(range.start)} to ${toInputDate(range.end)}`;
}

// --- CSV export -------------------------------------------------------------

function csvField(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(fields: Array<string | number>): string {
  return fields.map(csvField).join(",");
}

function buildReportsCsv(params: {
  now: Date;
  revenueLabel: string;
  trend: RevenueTrend;
  purchaseLabel: string;
  purchaseTrend: PurchaseTrend;
  serviceLabel: string;
  breakdown: StatusBreakdown;
  performanceLabel: string;
  rows: TechnicianRowData[];
  branchLabel: string | null;
  branchRows: BranchReportRow[] | null;
}): string {
  const { now, revenueLabel, trend, purchaseLabel, purchaseTrend: purchases, serviceLabel, breakdown, performanceLabel, rows, branchLabel, branchRows } =
    params;
  const lines: string[] = [];

  lines.push(csvRow(["Fixigo Reports Export"]));
  lines.push(csvRow([`Generated ${now.toLocaleString("en-IN")}`]));
  lines.push("");

  lines.push(csvRow([`Revenue (${revenueLabel})`]));
  lines.push(csvRow(["Date", "Revenue"]));
  trend.points.forEach((point) => lines.push(csvRow([point.label, point.revenue])));
  lines.push(csvRow(["Total", trend.total]));
  lines.push("");

  lines.push(csvRow([`Purchases (${purchaseLabel})`]));
  lines.push(csvRow(["Date", "Spend"]));
  purchases.points.forEach((point) => lines.push(csvRow([point.label, point.amount])));
  lines.push(csvRow(["Total", purchases.total]));
  lines.push("");

  lines.push(csvRow([`Service Status (${serviceLabel})`]));
  lines.push(csvRow(["Status", "Count", "Percentage"]));
  breakdown.buckets.forEach((bucket) => lines.push(csvRow([bucket.label, bucket.count, `${Math.round(bucket.percentage)}%`])));
  lines.push(csvRow(["Total", breakdown.total, ""]));
  lines.push("");

  lines.push(csvRow([`Technician Performance (${performanceLabel})`]));
  lines.push(csvRow(["Rank", "Name", "Completed", "Active", "Completion Rate", "Rating", "Avg Days"]));
  rows.forEach((row, index) =>
    lines.push(
      csvRow([
        index + 1,
        row.name,
        row.completed,
        row.active,
        `${Math.round(row.completionRate * 100)}%`,
        row.rating ?? "",
        row.avgDays ?? "",
      ])
    )
  );

  if (branchRows && branchLabel) {
    lines.push("");
    lines.push(csvRow([`Branch Performance (${branchLabel})`]));
    lines.push(csvRow(["Branch", "Total Services", "Completed", "Revenue"]));
    branchRows.forEach((row) => lines.push(csvRow([row.name, row.totalServices, row.completedServices, row.revenue])));
  }

  return lines.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** The signature motion: a light trace that sweeps a panel's top edge, echoing an instrument scan. Frozen for reduced motion; stripped entirely for print. */
function ScanStyles() {
  return (
    <style>{`
      @keyframes reports-sweep { 0% { background-position: -160% 0; } 100% { background-position: 160% 0; } }
      .reports-sweep { background-size: 220% 100%; animation: reports-sweep 7s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .reports-sweep { animation: none; }
      }
      @media print {
        .no-print { display: none !important; }
        html, body { background: #ffffff !important; }
        .reports-panel, .reports-header {
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
      }
    `}</style>
  );
}

function TabGroup<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  accent: string;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="no-print flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className="min-h-9 rounded-md px-2.5 text-[11px] font-medium transition-colors sm:min-h-0 sm:py-1"
            style={selected ? { color: "#ffffff", backgroundColor: accent } : { color: "#64748B" }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DateRangeInputs({ range, onChange, ariaLabel }: { range: RangeValue; onChange: (range: RangeValue) => void; ariaLabel: string }) {
  const today = toInputDate(new Date());
  return (
    <div className="no-print flex items-center gap-1.5" role="group" aria-label={ariaLabel}>
      <input
        type="date"
        aria-label={`${ariaLabel} start`}
        value={toInputDate(range.start)}
        max={toInputDate(range.end)}
        onChange={(event) => {
          const next = fromInputDate(event.target.value);
          if (next) onChange({ ...range, start: next });
        }}
        className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 sm:min-h-0 sm:py-1"
        style={monoFont()}
      />
      <span className="text-xs text-slate-600">–</span>
      <input
        type="date"
        aria-label={`${ariaLabel} end`}
        value={toInputDate(range.end)}
        min={toInputDate(range.start)}
        max={today}
        onChange={(event) => {
          const next = fromInputDate(event.target.value);
          if (next) onChange({ ...range, end: next });
        }}
        className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 sm:min-h-0 sm:py-1"
        style={monoFont()}
      />
    </div>
  );
}

function Panel({
  code,
  accent,
  title,
  control,
  children,
}: {
  code: string;
  accent: string;
  title: string;
  control?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="reports-panel relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]">
      <div
        aria-hidden="true"
        className="reports-sweep no-print pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div
        aria-hidden="true"
        className="no-print pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full opacity-[0.08] blur-3xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.15em]"
            style={{ ...monoFont(), color: accent, backgroundColor: `${accent}17` }}
          >
            {code}
          </span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900" style={displayFont()}>
            {title}
          </h2>
        </div>
        {control}
      </div>

      <div className="relative p-5">{children}</div>
    </section>
  );
}

function EmptyReadout({ text }: { text: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

// --- Shared: glow area chart, used for both Revenue and Purchases -------------

/**
 * `chartId` seeds this instance's gradient/filter ids — Revenue and Purchases
 * both render one of these on screen at once, and duplicate SVG element ids
 * are invalid even when each `url(#...)` reference stays inside its own
 * `<svg>` subtree.
 */
function AmountChart({
  points,
  accent,
  chartId,
  ariaLabel,
}: {
  points: Array<{ label: string; value: number }>;
  accent: string;
  chartId: string;
  ariaLabel: string;
}) {
  const width = 640;
  const height = 160;
  const padX = 4;
  const padTop = 12;
  const padBottom = 24;
  const fillId = `${chartId}-fill`;
  const glowId = `${chartId}-glow`;

  const max = Math.max(1, ...points.map((point) => point.value));
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;

  const coords = points.map((point, index) => {
    const x = points.length === 1 ? padX : padX + (index / (points.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (point.value / max) * plotHeight;
    return { x, y, ...point };
  });

  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + plotHeight} L ${coords[0].x.toFixed(1)} ${padTop + plotHeight} Z`;

  const tickEvery = Math.max(1, Math.ceil(coords.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-40%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1={padX}
          x2={width - padX}
          y1={padTop + plotHeight * fraction}
          y2={padTop + plotHeight * fraction}
          stroke="#0F172A"
          strokeOpacity="0.06"
        />
      ))}

      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth="2" filter={`url(#${glowId})`} strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((coord, index) =>
        index % tickEvery === 0 ? (
          <text key={coord.label + index} x={coord.x} y={height - 4} textAnchor="middle" fontSize="9" fill="#64748B" style={monoFont()}>
            {coord.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

function RevenuePanel({
  trend,
  window,
  onWindowChange,
  range,
  onRangeChange,
}: {
  trend: RevenueTrend;
  window: RevenueSelection;
  onWindowChange: (window: RevenueSelection) => void;
  range: RangeValue;
  onRangeChange: (range: RangeValue) => void;
}) {
  const accent = MODULES.revenue.accent;
  const rising = trend.delta !== null && trend.delta >= 0;
  const DeltaIcon = rising ? TrendingUp : TrendingDown;

  return (
    <Panel
      code={MODULES.revenue.code}
      accent={accent}
      title="Revenue"
      control={
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup options={REVENUE_TAB_OPTIONS} value={window} onChange={onWindowChange} accent={accent} ariaLabel="Revenue window" />
          {window === "custom" && <DateRangeInputs range={range} onChange={onRangeChange} ariaLabel="Revenue date range" />}
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-3xl font-bold tracking-tight text-slate-900" style={monoFont()}>
          {rupees.format(trend.total)}
        </p>
        {trend.delta !== null && (
          <p className="flex items-center gap-1 text-xs font-medium" style={{ color: rising ? accent : "#DC2626" }}>
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {rising ? "+" : ""}
            {Math.round(trend.delta)}%
            <span className="text-slate-500">{window === "custom" ? "vs previous period" : `vs previous ${window}d`}</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        {trend.total === 0 ? (
          <EmptyReadout text="No revenue recorded in this window yet." />
        ) : (
          <AmountChart
            points={trend.points.map((point) => ({ label: point.label, value: point.revenue }))}
            accent={accent}
            chartId="reports-revenue-chart"
            ariaLabel="Revenue over time"
          />
        )}
      </div>
    </Panel>
  );
}

// --- Purchases: glow area chart ------------------------------------------------

function PurchasePanel({
  trend,
  window,
  onWindowChange,
  range,
  onRangeChange,
}: {
  trend: PurchaseTrend;
  window: RevenueSelection;
  onWindowChange: (window: RevenueSelection) => void;
  range: RangeValue;
  onRangeChange: (range: RangeValue) => void;
}) {
  const accent = MODULES.purchase.accent;
  const rising = trend.delta !== null && trend.delta >= 0;
  const DeltaIcon = rising ? TrendingUp : TrendingDown;

  return (
    <Panel
      code={MODULES.purchase.code}
      accent={accent}
      title="Purchases"
      control={
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup options={REVENUE_TAB_OPTIONS} value={window} onChange={onWindowChange} accent={accent} ariaLabel="Purchases window" />
          {window === "custom" && <DateRangeInputs range={range} onChange={onRangeChange} ariaLabel="Purchases date range" />}
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-3xl font-bold tracking-tight text-slate-900" style={monoFont()}>
          {rupees.format(trend.total)}
        </p>
        {trend.delta !== null && (
          // Neutral colour deliberately: unlike revenue, a spend increase isn't "good" or "bad" on its own.
          <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {rising ? "+" : ""}
            {Math.round(trend.delta)}%
            <span className="text-slate-500">{window === "custom" ? "vs previous period" : `vs previous ${window}d`}</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        {trend.total === 0 ? (
          <EmptyReadout text="No purchases recorded in this window yet." />
        ) : (
          <AmountChart
            points={trend.points.map((point) => ({ label: point.label, value: point.amount }))}
            accent={accent}
            chartId="reports-purchase-chart"
            ariaLabel="Purchase spend over time"
          />
        )}
      </div>
    </Panel>
  );
}

// --- Service: status ring -----------------------------------------------------

function StatusRing({ segments, total }: { segments: Array<{ key: string; value: number; color: string }>; total: number }) {
  const size = 148;
  const thickness = 16;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const gap = 3;

  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Service status breakdown">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={thickness} />
      {total > 0 &&
        segments.map((segment) => {
          const fraction = segment.value / total;
          const length = Math.max(0, fraction * circumference - gap);
          const dasharray = `${length} ${circumference - length}`;
          const dashoffset = -offset;
          offset += fraction * circumference;
          return (
            <circle
              key={segment.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
      <text x={center} y={center - 4} textAnchor="middle" fontSize="24" fontWeight="700" fill="#0F172A" style={monoFont()}>
        {total}
      </text>
      <text x={center} y={center + 16} textAnchor="middle" fontSize="10" fill="#64748B" style={monoFont()}>
        TOTAL
      </text>
    </svg>
  );
}

function ServicePanel({
  breakdown,
  period,
  onPeriodChange,
  range,
  onRangeChange,
}: {
  breakdown: StatusBreakdown;
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  range: RangeValue;
  onRangeChange: (range: RangeValue) => void;
}) {
  const accent = MODULES.service.accent;
  const segments = breakdown.buckets.map((bucket) => ({ key: bucket.key, value: bucket.count, color: STATUS_COLORS[bucket.key] }));

  return (
    <Panel
      code={MODULES.service.code}
      accent={accent}
      title="Service Status"
      control={
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup options={PERIOD_TAB_OPTIONS} value={period} onChange={onPeriodChange} accent={accent} ariaLabel="Service status period" />
          {period === "custom" && <DateRangeInputs range={range} onChange={onRangeChange} ariaLabel="Service status date range" />}
        </div>
      }
    >
      {breakdown.total === 0 ? (
        <EmptyReadout text="No services logged in this period yet." />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <StatusRing segments={segments} total={breakdown.total} />
          <div className="grid w-full max-w-xs grid-cols-1 gap-2.5">
            {breakdown.buckets.map((bucket) => (
              <div key={bucket.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[bucket.key] }} aria-hidden="true" />
                  <span className="text-xs font-medium text-slate-700">{bucket.label}</span>
                </div>
                <span className="text-xs font-semibold text-slate-900" style={monoFont()}>
                  {bucket.count} <span className="text-slate-500">· {Math.round(bucket.percentage)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// --- Performance: technician readouts -----------------------------------------

function TechnicianRow({ rank, name, initials, completed, rating, completionRate, accent }: {
  rank: number;
  name: string;
  initials: string;
  completed: number;
  rating: number | null;
  completionRate: number;
  accent: string;
}) {
  const size = 40;
  const thickness = 4;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, completionRate * circumference);

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
      <span className="w-4 shrink-0 text-right text-[11px] text-slate-400" style={monoFont()}>
        {rank}
      </span>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={thickness} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-700">{initials}</span>
      </div>

      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{name}</p>

      <div className="hidden shrink-0 items-center gap-4 text-right sm:flex">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Done</p>
          <p className="text-xs font-semibold text-slate-900" style={monoFont()}>{completed}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Rating</p>
          <p className="text-xs font-semibold text-slate-900" style={monoFont()}>{rating !== null ? rating.toFixed(1) : "—"}</p>
        </div>
      </div>

      <p className="shrink-0 text-xs font-semibold sm:hidden" style={{ ...monoFont(), color: accent }}>
        {Math.round(completionRate * 100)}%
      </p>
    </div>
  );
}

function PerformancePanel({
  rows,
  period,
  onPeriodChange,
  range,
  onRangeChange,
}: {
  rows: TechnicianRowData[];
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  range: RangeValue;
  onRangeChange: (range: RangeValue) => void;
}) {
  const accent = MODULES.performance.accent;

  return (
    <Panel
      code={MODULES.performance.code}
      accent={accent}
      title="Technician Performance"
      control={
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup options={PERIOD_TAB_OPTIONS} value={period} onChange={onPeriodChange} accent={accent} ariaLabel="Technician performance period" />
          {period === "custom" && <DateRangeInputs range={range} onChange={onRangeChange} ariaLabel="Technician performance date range" />}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyReadout text="No assigned services in this period yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <TechnicianRow
              key={row.id}
              rank={index + 1}
              name={row.name}
              initials={row.initials}
              completed={row.completed}
              rating={row.rating}
              completionRate={row.completionRate}
              accent={accent}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

// --- Branch: per-branch comparison table ---------------------------------------

interface BranchReportRow {
  id: string;
  name: string;
  totalServices: number;
  completedServices: number;
  revenue: number;
}

function BranchPanel({
  rows,
  period,
  onPeriodChange,
  range,
  onRangeChange,
}: {
  rows: BranchReportRow[];
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  range: RangeValue;
  onRangeChange: (range: RangeValue) => void;
}) {
  const accent = MODULES.branch.accent;
  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenue));

  return (
    <Panel
      code={MODULES.branch.code}
      accent={accent}
      title="Branch Performance"
      control={
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup options={PERIOD_TAB_OPTIONS} value={period} onChange={onPeriodChange} accent={accent} ariaLabel="Branch performance period" />
          {period === "custom" && <DateRangeInputs range={range} onChange={onRangeChange} ariaLabel="Branch performance date range" />}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyReadout text="No branches to compare yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-slate-800">{row.name}</p>
                <p className="text-sm font-semibold text-slate-900" style={monoFont()}>
                  {rupees.format(row.revenue)}
                </p>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, (row.revenue / maxRevenue) * 100)}%`, backgroundColor: accent }}
                />
              </div>

              <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500" style={monoFont()}>
                <span>{row.totalServices} total</span>
                <span>{row.completedServices} completed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// --- Shell ----------------------------------------------------------------

function Header({
  lastUpdated,
  exportsDisabled,
  exportEnabled,
  onExportCsv,
  onExportPdf,
  onRefresh,
  refreshing,
}: {
  lastUpdated: Date;
  exportsDisabled: boolean;
  exportEnabled: boolean;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onRefresh?: () => Promise<void>;
  refreshing: boolean;
}) {
  return (
    <div className="reports-header relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5">
      <div aria-hidden="true" className="no-print pointer-events-none absolute -left-10 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
      <div aria-hidden="true" className="no-print pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Wrench className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={displayFont()}>
              Reports
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Revenue, service, and technician telemetry for your shop.</p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          {exportEnabled ? (
            <>
              <button
                type="button"
                onClick={onExportCsv}
                disabled={exportsDisabled}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={onExportPdf}
                disabled={exportsDisabled}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Export PDF
              </button>
            </>
          ) : (
            <span
              className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-400"
              title="Upgrade your plan to export reports"
            >
              Export requires an upgraded plan
            </span>
          )}

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5">
            <span className="text-[11px] text-slate-500" style={monoFont()}>
              Updated {fmtTime(lastUpdated)}
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={refreshing}
                aria-label="Refresh report data"
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:pointer-events-none"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingShell({ panelCount }: { panelCount: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: panelCount }, (_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}

export function FuturisticReportsView({
  services,
  technicians,
  branches = [],
  purchases = [],
  isLoading = false,
  servicesError = null,
  onRefresh,
  refreshing = false,
  exportEnabled = true,
  now: nowOverride,
}: FuturisticReportsViewProps) {
  const now = React.useMemo(() => nowOverride ?? new Date(), [nowOverride]);

  const [lastUpdated, setLastUpdated] = React.useState<Date>(now);
  React.useEffect(() => {
    setLastUpdated(nowOverride ?? new Date());
    // Re-stamps whenever a fresh `services` array arrives — the initial fetch,
    // a manual refresh, or (later) any other reload — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  const [revenueWindow, setRevenueWindow] = React.useState<RevenueSelection>(7);
  const [revenueRange, setRevenueRange] = React.useState<RangeValue>(() => defaultRange(now));

  const [purchaseWindow, setPurchaseWindow] = React.useState<RevenueSelection>(7);
  const [purchaseRange, setPurchaseRange] = React.useState<RangeValue>(() => defaultRange(now));

  const [servicePeriod, setServicePeriod] = React.useState<PeriodSelection>("this_month");
  const [serviceRange, setServiceRange] = React.useState<RangeValue>(() => defaultRange(now));

  const [perfPeriod, setPerfPeriod] = React.useState<PeriodSelection>("this_month");
  const [perfRange, setPerfRange] = React.useState<RangeValue>(() => defaultRange(now));

  const [branchPeriod, setBranchPeriod] = React.useState<PeriodSelection>("this_month");
  const [branchRange, setBranchRange] = React.useState<RangeValue>(() => defaultRange(now));

  const showBranchPanel = branches.length > 1;

  const trend = React.useMemo(
    () => (revenueWindow === "custom" ? revenueForRange(services, revenueRange) : revenueTrend(services, revenueWindow, now)),
    [services, revenueWindow, revenueRange, now]
  );

  const purchaseTrendData = React.useMemo(
    () => (purchaseWindow === "custom" ? purchaseTrendForRange(purchases, purchaseRange) : purchaseTrend(purchases, purchaseWindow, now)),
    [purchases, purchaseWindow, purchaseRange, now]
  );

  const breakdown = React.useMemo(() => {
    const scoped = servicePeriod === "custom" ? filterByRange(services, serviceRange) : filterByPeriod(services, servicePeriod, now);
    return statusBreakdown(scoped);
  }, [services, servicePeriod, serviceRange, now]);

  const technicianRows = React.useMemo(() => {
    const scoped = perfPeriod === "custom" ? filterByRange(services, perfRange) : filterByRange(services, getPeriodRange(perfPeriod, now).current);
    return technicianPerformance(scoped, technicians);
  }, [services, technicians, perfPeriod, perfRange, now]);

  const branchRows = React.useMemo((): BranchReportRow[] => {
    if (!showBranchPanel) return [];

    const scoped = branchPeriod === "custom" ? filterByRange(services, branchRange) : filterByPeriod(services, branchPeriod, now);
    const byBranch = new Map<string, Service[]>();
    for (const service of scoped) {
      const list = byBranch.get(service.branchId) ?? [];
      list.push(service);
      byBranch.set(service.branchId, list);
    }

    return branches
      .map((branch) => {
        const summary = summarize(byBranch.get(branch.id) ?? []);
        return {
          id: branch.id,
          name: branch.name,
          totalServices: summary.totalServices,
          completedServices: summary.completedServices,
          revenue: summary.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [showBranchPanel, services, branches, branchPeriod, branchRange, now]);

  const handleExportCsv = React.useCallback(() => {
    const csv = buildReportsCsv({
      now,
      revenueLabel: revenueWindow === "custom" ? rangeLabel(revenueRange) : `last ${revenueWindow} days`,
      trend,
      purchaseLabel: purchaseWindow === "custom" ? rangeLabel(purchaseRange) : `last ${purchaseWindow} days`,
      purchaseTrend: purchaseTrendData,
      serviceLabel: servicePeriod === "custom" ? rangeLabel(serviceRange) : periodTabLabel(servicePeriod),
      breakdown,
      performanceLabel: perfPeriod === "custom" ? rangeLabel(perfRange) : periodTabLabel(perfPeriod),
      rows: technicianRows,
      branchLabel: showBranchPanel ? (branchPeriod === "custom" ? rangeLabel(branchRange) : periodTabLabel(branchPeriod)) : null,
      branchRows: showBranchPanel ? branchRows : null,
    });
    downloadCsv(`fixigo-reports-${toInputDate(now)}.csv`, csv);
  }, [
    now,
    revenueWindow,
    revenueRange,
    trend,
    purchaseWindow,
    purchaseRange,
    purchaseTrendData,
    servicePeriod,
    serviceRange,
    breakdown,
    perfPeriod,
    perfRange,
    technicianRows,
    showBranchPanel,
    branchPeriod,
    branchRange,
    branchRows,
  ]);

  const handleExportPdf = React.useCallback(() => {
    window.print();
  }, []);

  return (
    <div
      className={`${display.variable} ${mono.variable} reports-root min-h-screen bg-[#F6F8FC] bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,0.06),transparent_60%)]`}
    >
      <ScanStyles />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <Header
          lastUpdated={lastUpdated}
          exportsDisabled={isLoading}
          exportEnabled={exportEnabled}
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdf}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        {isLoading ? (
          <LoadingShell panelCount={showBranchPanel ? 5 : 4} />
        ) : (
          <div className="space-y-6">
            {servicesError && (
              <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Services: {servicesError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <RevenuePanel trend={trend} window={revenueWindow} onWindowChange={setRevenueWindow} range={revenueRange} onRangeChange={setRevenueRange} />
              <PurchasePanel trend={purchaseTrendData} window={purchaseWindow} onWindowChange={setPurchaseWindow} range={purchaseRange} onRangeChange={setPurchaseRange} />
              <ServicePanel breakdown={breakdown} period={servicePeriod} onPeriodChange={setServicePeriod} range={serviceRange} onRangeChange={setServiceRange} />
              <PerformancePanel rows={technicianRows} period={perfPeriod} onPeriodChange={setPerfPeriod} range={perfRange} onRangeChange={setPerfRange} />
              {showBranchPanel && (
                <div className="xl:col-span-2">
                  <BranchPanel rows={branchRows} period={branchPeriod} onPeriodChange={setBranchPeriod} range={branchRange} onRangeChange={setBranchRange} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
