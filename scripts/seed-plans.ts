/**
 * Creates the `plans` collection with the three starter tiers — Free, Basic,
 * Advanced — if it doesn't already have them.
 *
 * The feature limits and prices below are a starting proposal, not numbers
 * pulled from any existing pricing decision. Review and adjust them before
 * treating this as final.
 *
 * Nothing on the shop or user side is changed by this script — no shop is
 * assigned a plan. That assignment is a deliberate later step.
 *
 * Idempotent: a plan whose doc id already exists is left untouched and
 * reported as skipped, so re-running this after manually editing a plan in
 * the console never clobbers that edit.
 *
 * Usage:
 *   npx tsx scripts/seed-plans.ts            # dry run
 *   npx tsx scripts/seed-plans.ts --apply     # write
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY, same as the rest of the admin tooling.
 */

import { adminDb } from "../src/lib/firebaseAdmin";
import type { Plan } from "../src/types/plan";

type SeedPlan = Omit<Plan, "id" | "createdAt" | "updatedAt">;

const PLANS: Record<string, SeedPlan> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Get started with the basics for a single branch.",
    priceMonthly: 0,
    isActive: true,
    features: {
      maxBranches: 1,
      maxTechnicians: 2,
      maxServicesPerMonth: 50,
      reports: false,
      reportExport: false,
      purchaseManagement: false,
      multiUserAccess: false,
      prioritySupport: false,
    },
  },
  basic: {
    tier: "basic",
    name: "Basic",
    description: "For a growing shop running a few branches.",
    priceMonthly: 999,
    isActive: true,
    features: {
      maxBranches: 3,
      maxTechnicians: 10,
      maxServicesPerMonth: 500,
      reports: true,
      reportExport: false,
      purchaseManagement: true,
      multiUserAccess: true,
      prioritySupport: false,
    },
  },
  advanced: {
    tier: "advanced",
    name: "Advanced",
    description: "Unlimited branches and technicians, full reporting, priority support.",
    priceMonthly: 2999,
    isActive: true,
    features: {
      maxBranches: null,
      maxTechnicians: null,
      maxServicesPerMonth: null,
      reports: true,
      reportExport: true,
      purchaseManagement: true,
      multiUserAccess: true,
      prioritySupport: true,
    },
  },
};

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Mode: APPLY — this will write to Firestore." : "Mode: dry run — nothing will be written.");

  const collection = adminDb.collection("plans");
  const toCreate: string[] = [];
  const toSkip: string[] = [];

  for (const id of Object.keys(PLANS)) {
    const existing = await collection.doc(id).get();
    if (existing.exists) {
      toSkip.push(id);
    } else {
      toCreate.push(id);
    }
  }

  console.log(`\nTo create: ${toCreate.join(", ") || "(none)"}`);
  console.log(`Already exist, skipping: ${toSkip.join(", ") || "(none)"}`);

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to write these plans.");
    return;
  }
  if (toCreate.length === 0) {
    console.log("\nNothing to write.");
    return;
  }

  const now = new Date();
  for (const id of toCreate) {
    await collection.doc(id).set({ ...PLANS[id], createdAt: now, updatedAt: now });
    console.log(`Created plan: ${id}`);
  }

  console.log(`\nDone. Created ${toCreate.length} plan(s).`);
}

main().catch((error) => {
  console.error("Seeding plans failed:", error);
  process.exit(1);
});
