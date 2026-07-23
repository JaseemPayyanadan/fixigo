// Chart colour slots, assigned in fixed order and never cycled.
//
// Validated as a set against a white card surface: worst all-pairs CVD
// separation ΔE 9.2 (deutan), worst normal-vision ΔE 24.0. `series.completed`
// sits at 2.82:1 against white, below the 3:1 contrast bar — every widget using
// it therefore ships a visible label and value beside the mark, never colour
// alone. The app has no dark mode, so only light steps are defined here; adding
// dark means re-stepping these against the dark surface, not flipping them.

export const CHART_COLORS = {
  series: {
    total: "#2a78d6", // blue   - slot 1
    completed: "#1baf7a", // aqua   - slot 3
    pending: "#eb6834", // orange - slot 2
  },
  axis: "#9ca3af",
  grid: "#f1f2f4",
  surface: "#ffffff",
  muted: "#e5e7eb",
} as const;

export type SeriesKey = keyof typeof CHART_COLORS.series;
