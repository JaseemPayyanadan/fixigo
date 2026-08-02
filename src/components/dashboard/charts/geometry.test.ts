import { describe, expect, it } from "vitest";

import { areaPath, buildScale, pickXTicks, smoothPath, type Point } from "./geometry";

/** Every coordinate in a path, in order. */
function coordsOf(path: string): Array<[number, number]> {
  return [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((match) => [Number(match[1]), Number(match[2])]);
}

/**
 * A spike out of a flat run — the shape a quiet week followed by one big repair
 * makes, and the case where an unclamped curve dips past the baseline.
 */
const spike: Point[] = [
  { x: 0, y: 100 },
  { x: 10, y: 100 },
  { x: 20, y: 100 },
  { x: 30, y: 20 },
  { x: 40, y: 100 },
  { x: 50, y: 100 },
];

describe("smoothPath", () => {
  it("stays within the highest and lowest reading", () => {
    const ys = coordsOf(smoothPath(spike)).map(([, y]) => y);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
  });

  it("never dips below a flat baseline", () => {
    const flat: Point[] = [
      { x: 0, y: 50 },
      { x: 10, y: 50 },
      { x: 20, y: 10 },
      { x: 30, y: 50 },
    ];
    expect(Math.max(...coordsOf(smoothPath(flat)).map(([, y]) => y))).toBeLessThanOrEqual(50);
  });

  it("passes through every reading", () => {
    const coords = coordsOf(smoothPath(spike));
    for (const point of spike) {
      expect(coords).toContainEqual([point.x, point.y]);
    }
  });

  it("handles the degenerate inputs", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 5, y: 5 }])).toBe("M 5 5");
  });
});

describe("areaPath", () => {
  it("closes the line down to the baseline and back", () => {
    const path = areaPath(spike, 120);
    expect(path.endsWith("L 50 120 L 0 120 Z")).toBe(true);
  });

  it("keeps the fill above the baseline it closes onto", () => {
    const ys = coordsOf(areaPath(spike, 120)).map(([, y]) => y);
    expect(Math.max(...ys)).toBe(120);
  });

  it("is empty for no points", () => {
    expect(areaPath([], 100)).toBe("");
  });
});

describe("pickXTicks", () => {
  it("always labels the last reading", () => {
    expect(pickXTicks(30, 6).has(29)).toBe(true);
    expect(pickXTicks(7, 6).has(6)).toBe(true);
    expect(pickXTicks(90, 6).has(89)).toBe(true);
  });

  it("labels the first reading and then an even stride", () => {
    expect([...pickXTicks(30, 6)].sort((a, b) => a - b)).toEqual([0, 5, 10, 15, 20, 25, 29]);
  });

  it("drops a strided tick that would crowd the last one", () => {
    // Stride 5 would put a tick on 25 and the end on 26 — too close to print both.
    expect(pickXTicks(27, 6).has(25)).toBe(false);
    expect(pickXTicks(27, 6).has(26)).toBe(true);
  });

  it("labels everything when there are fewer readings than ticks", () => {
    expect([...pickXTicks(4, 6)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("handles the degenerate inputs", () => {
    expect(pickXTicks(0, 6).size).toBe(0);
    expect([...pickXTicks(1, 6)]).toEqual([0]);
    expect(pickXTicks(10, 0).has(9)).toBe(true);
  });
});

describe("buildScale", () => {
  it("maps the maximum to the top and zero to the bottom", () => {
    const scale = buildScale([100], 200);
    expect(scale(100)).toBe(0);
    expect(scale(0)).toBe(200);
    expect(scale(50)).toBe(100);
  });

  it("keeps a flat all-zero series on the baseline instead of dividing by zero", () => {
    const scale = buildScale([0], 200);
    expect(scale(0)).toBe(200);
  });

  it("floors negatives and non-numbers at the baseline", () => {
    const scale = buildScale([100], 200);
    expect(scale(-50)).toBe(200);
    expect(scale(Number.NaN)).toBe(200);
  });
});
