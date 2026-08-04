// Deterministic sample data for the dashboard preview route.
//
// Not test fixtures and not seed data — this exists so the admin dashboard can
// be looked at without a Firestore connection, and so the awkward cases are
// always on screen rather than only appearing in production months later:
//
//   - a technician with no completed work (null avgDays, null rating)
//   - a technician with completed work but no ratings
//   - an empty pipeline stage
//   - overdue jobs, and open jobs with no estimate at all
//   - a service completed at 23:59 today, on the day boundary
//
// Dates are relative to the `now` passed in, so the preview never goes stale.
//
// The hand-written seeds below cover the last week only. Anything looking
// further back — the revenue trend runs to 90 days — would otherwise plot a
// flat line on the axis, which is indistinguishable from a broken chart. So a
// generated back-catalogue extends the history; see `historySeeds`.

import type { Service, Technician } from "@/types";

const DAY_MS = 86_400_000;

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

interface ServiceSeed {
  name: string;
  status: Service["status"];
  price: number;
  technician_id?: string;
  createdDaysAgo: number;
  completedDaysAgo?: number;
  durationMinutes?: number;
  rating?: number;
  overdueBy?: number;
}

const SEEDS: ServiceSeed[] = [
  // Completed work, spread across the week, with and without ratings.
  { name: "Battery Replacement", status: "completed", price: 1850, technician_id: "t1", createdDaysAgo: 6, completedDaysAgo: 4, durationMinutes: 2160, rating: 5 },
  { name: "Battery Replacement", status: "completed", price: 1750, technician_id: "t1", createdDaysAgo: 5, completedDaysAgo: 3, durationMinutes: 1440, rating: 4 },
  { name: "Battery Replacement", status: "completed", price: 1900, technician_id: "t2", createdDaysAgo: 5, completedDaysAgo: 2, durationMinutes: 2880, rating: 5 },
  { name: "Display Replacement", status: "completed", price: 4200, technician_id: "t1", createdDaysAgo: 4, completedDaysAgo: 2, durationMinutes: 2880, rating: 4 },
  { name: "Display Replacement", status: "completed", price: 3800, technician_id: "t2", createdDaysAgo: 4, completedDaysAgo: 1, durationMinutes: 4320 },
  { name: "Display Replacement", status: "completed", price: 4100, technician_id: "t3", createdDaysAgo: 3, completedDaysAgo: 1, durationMinutes: 1440 },
  { name: "Charging Port Repair", status: "completed", price: 1200, technician_id: "t2", createdDaysAgo: 3, completedDaysAgo: 1, durationMinutes: 720, rating: 3 },
  { name: "Charging Port Repair", status: "completed", price: 1150, technician_id: "t3", createdDaysAgo: 2, completedDaysAgo: 0, durationMinutes: 1440 },
  { name: "Water Damage Repair", status: "completed", price: 5500, technician_id: "t1", createdDaysAgo: 7, completedDaysAgo: 3, durationMinutes: 5760, rating: 5 },
  // Completed at 23:59 today — the day-boundary case for completedToday.
  { name: "Software Reinstall", status: "completed", price: 800, technician_id: "t2", createdDaysAgo: 1, completedDaysAgo: 0, durationMinutes: 240, rating: 4 },

  // Open work in every remaining stage.
  { name: "Display Replacement", status: "in_progress", price: 4000, technician_id: "t1", createdDaysAgo: 1 },
  { name: "Battery Replacement", status: "in_progress", price: 1800, technician_id: "t2", createdDaysAgo: 1 },
  { name: "Charging Port Repair", status: "in_progress", price: 1250, technician_id: "t4", createdDaysAgo: 0 },
  { name: "Motherboard Repair", status: "in_progress", price: 7500, technician_id: "t3", createdDaysAgo: 2, overdueBy: 1 },

  { name: "Camera Module Repair", status: "awaiting_parts", price: 3200, technician_id: "t1", createdDaysAgo: 5, overdueBy: 2 },
  { name: "Speaker Repair", status: "awaiting_parts", price: 900, technician_id: "t2", createdDaysAgo: 4 },
  { name: "Display Replacement", status: "awaiting_parts", price: 4300, technician_id: "t4", createdDaysAgo: 3 },

  { name: "Battery Replacement", status: "ready_for_pickup", price: 1700, technician_id: "t1", createdDaysAgo: 3 },
  { name: "Water Damage Repair", status: "ready_for_pickup", price: 5200, technician_id: "t3", createdDaysAgo: 6 },

  // Received today — feeds the "received" tile and today's bar.
  { name: "Screen Protector Fitting", status: "pending", price: 300, createdDaysAgo: 0 },
  { name: "Battery Replacement", status: "pending", price: 1800, technician_id: "t4", createdDaysAgo: 0 },
  { name: "Diagnostics", status: "pending", price: 500, createdDaysAgo: 0 },
  { name: "Display Replacement", status: "pending", price: 4000, technician_id: "t2", createdDaysAgo: 1 },
  { name: "Software Issues", status: "pending", price: 700, createdDaysAgo: 2 },

  // Cancelled — must be excluded from the pipeline, revenue and technician stats.
  { name: "Display Replacement", status: "cancelled", price: 4000, technician_id: "t1", createdDaysAgo: 5 },
];

// `quality_check` is deliberately absent above, so the pipeline always shows at
// least one empty stage.

const HISTORY_DAYS = 120;

const HISTORY_REPAIRS: Array<{ name: string; price: number }> = [
  { name: "Battery Replacement", price: 1800 },
  { name: "Display Replacement", price: 4100 },
  { name: "Charging Port Repair", price: 1200 },
  { name: "Water Damage Repair", price: 5400 },
  { name: "Camera Module Repair", price: 3200 },
  { name: "Speaker Repair", price: 900 },
  { name: "Motherboard Repair", price: 7500 },
  { name: "Software Reinstall", price: 800 },
];

/**
 * A deterministic 0-1 value per (day, slot). A hash rather than a seeded
 * generator so a day's takings do not shift when the day before it changes —
 * the preview should look the same on every render and every reload.
 */
function noise(day: number, slot: number): number {
  const x = Math.sin(day * 12.9898 + slot * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Completed, paid repairs going back `HISTORY_DAYS`, one to four a day with a
 * gentle upward drift and the odd quiet day. Gives the trend line something to
 * be a trend of.
 *
 * Each is created a day or two before it completes, so lead-time and
 * technician stats stay plausible rather than showing same-day turnarounds
 * across the whole back-catalogue.
 */
function historySeeds(): ServiceSeed[] {
  const seeds: ServiceSeed[] = [];

  for (let day = 8; day <= HISTORY_DAYS; day += 1) {
    // Quiet days: roughly one in eight, so the line has troughs without gaps.
    if (noise(day, 0) < 0.12) continue;

    // Older days trade a little lighter, giving the window-on-window delta
    // something to report.
    const drift = 1 - (day / HISTORY_DAYS) * 0.4;
    const count = 1 + Math.floor(noise(day, 1) * 3);

    for (let slot = 0; slot < count; slot += 1) {
      const repair = HISTORY_REPAIRS[Math.floor(noise(day, slot + 2) * HISTORY_REPAIRS.length)];
      const variance = 0.75 + noise(day, slot + 9) * 0.5;

      seeds.push({
        name: repair.name,
        status: "completed",
        price: Math.round((repair.price * variance * drift) / 10) * 10,
        technician_id: `t${1 + Math.floor(noise(day, slot + 5) * 3)}`,
        createdDaysAgo: day + 1 + Math.floor(noise(day, slot + 7) * 2),
        completedDaysAgo: day,
        durationMinutes: 720 + Math.floor(noise(day, slot + 11) * 3600),
        rating: noise(day, slot + 13) < 0.7 ? 4 + Math.round(noise(day, slot + 17)) : undefined,
      });
    }
  }

  return seeds;
}

const ALL_SEEDS: ServiceSeed[] = [...SEEDS, ...historySeeds()];

export function fixtureServices(now: Date): Service[] {
  return ALL_SEEDS.map((seed, index) => {
    const createdAt = daysAgo(now, seed.createdDaysAgo);

    const completedDate =
      seed.completedDaysAgo === undefined
        ? undefined
        : seed.completedDaysAgo === 0
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)
          : daysAgo(now, seed.completedDaysAgo);

    return {
      id: `fixture-${index + 1}`,
      name: seed.name,
      description: "",
      customer: {
        name: ["Arun", "Rahul", "Vivek", "Suresh", "Karthik", "Nisha", "Divya"][index % 7],
        phone: "+91 90000 00000",
        email: "customer@example.com",
      },
      device: {
        type: "phone",
        brand: ["Samsung", "Apple", "OnePlus", "Xiaomi", "OPPO"][index % 5],
        model: ["S24 Ultra", "iPhone 13", "11R", "Redmi Note 12", "A78"][index % 5],
        imei: "000000000000000",
      },
      status: seed.status,
      priority: index % 5 === 0 ? "high" : "medium",
      technician_id: seed.technician_id,
      shopId: "fixture-shop",
      branchId: "fixture-branch",
      price: seed.price,
      actualDuration: seed.durationMinutes,
      completedDate,
      estimatedCompletion: seed.overdueBy === undefined ? undefined : daysAgo(now, seed.overdueBy),
      customerFeedback: seed.rating === undefined ? undefined : { rating: seed.rating, date: createdAt },
      createdAt,
      updatedAt: completedDate ?? createdAt,
    } as Service;
  });
}

export function fixtureTechnicians(): Technician[] {
  return [
    { id: "t1", name: "Nijin Raj" },
    { id: "t2", name: "Aswan Kumar" },
    { id: "t3", name: "Fathima Noor" },
    // Has open work only — exercises null avgDays and null rating.
    { id: "t4", name: "Praveen S" },
    // No services at all — must be omitted from the leaderboard entirely.
    { id: "t5", name: "Unassigned Tech" },
  ] as Technician[];
}

export function fixtureRecentServices(now: Date): Service[] {
  return [...fixtureServices(now)]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
}
