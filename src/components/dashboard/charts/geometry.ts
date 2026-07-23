// Shared path maths for the SVG charts.

export interface Point {
  x: number;
  y: number;
}

/**
 * A smoothed path through `points` using Catmull-Rom control points converted
 * to cubic beziers. `tension` of 0 gives straight segments; the 0.2 default
 * matches the gentle curve the dashboard uses without overshooting into
 * negative territory on steep steps.
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

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3;

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
