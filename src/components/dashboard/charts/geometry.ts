// Shared path maths for the SVG charts.

export interface Point {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A smoothed path through `points` using Catmull-Rom control points converted
 * to cubic beziers. `tension` of 0 gives straight segments; 0.2 is the gentle
 * curve the dashboard uses.
 *
 * Each segment's control points are clamped vertically to the two readings they
 * sit between, which keeps the curve inside the data on every segment. Without
 * it a spike out of a run of zeros drags the curve below the baseline on the
 * way in and out — drawing revenue the shop never lost, and on a filled area
 * chart spilling the fill under the axis.
 */
export function smoothPath(points: Point[], tension = 0.2): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const low = Math.min(p1.y, p2.y);
    const high = Math.max(p1.y, p2.y);

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
    const cp1y = clamp(p1.y + ((p2.y - p0.y) / 6) * tension * 3, low, high);
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
    const cp2y = clamp(p2.y - ((p3.y - p1.y) / 6) * tension * 3, low, high);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/** Closes a line path down to `baselineY` so it can be filled as an area. */
export function areaPath(points: Point[], baselineY: number, tension = 0.2): string {
  if (points.length === 0) return "";
  const line = smoothPath(points, tension);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/**
 * Which readings get a printed axis label: an even stride from the left, plus
 * the last one always. Labelling the end matters on a rolling window — a
 * 30-day chart whose axis stopped at "29 Jul" reads as ending there rather
 * than today. A strided tick landing within half a stride of the end is
 * dropped so the two do not collide.
 */
export function pickXTicks(pointCount: number, tickCount: number): Set<number> {
  if (pointCount <= 0) return new Set();

  const stride = Math.max(1, Math.ceil(pointCount / Math.max(1, tickCount)));
  const last = pointCount - 1;

  const ticks = new Set<number>();
  for (let index = 0; index < pointCount; index += stride) {
    if (last - index >= stride / 2) ticks.add(index);
  }
  ticks.add(last);

  return ticks;
}

/** Maps values onto pixel coordinates. Guards the flat-series case where max === min. */
export function buildScale(values: number[], height: number, padTop = 0) {
  const max = values.length > 0 ? Math.max(...values) : 0;
  const span = max === 0 ? 1 : max;
  const usable = height - padTop;

  return (value: number) => {
    const clamped = Number.isFinite(value) ? Math.max(0, value) : 0;
    return padTop + usable - (clamped / span) * usable;
  };
}
