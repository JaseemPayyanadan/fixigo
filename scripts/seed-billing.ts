/**
 * Backfills `billingInvoices` for every shop that has an `activePlanId`,
 * one invoice per completed monthly cycle from the shop's `createdAt` date
 * up to today. The billing cycle is anchored to the day-of-month the shop
 * account was created (e.g. created Jan 12 → bills on the 12th of every
 * month), matching `nextBillingDate`/`billingPeriodsUntil` in
 * src/lib/billingRepo.ts.
 *
 * Idempotent: skips a shop/period pair that already has an invoice
 * (matched by shopId + periodStart), so re-running after a plan or price
 * change only adds newly completed cycles.
 *
 * Usage:
 *   npx tsx scripts/seed-billing.ts            # dry run
 *   npx tsx scripts/seed-billing.ts --apply     # write
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY, same as the rest of the admin tooling.
 */

import { adminDb } from "../src/lib/firebaseAdmin";
import { billingPeriodsUntil, BILLING_INVOICES } from "../src/lib/billingRepo";
import { mapPlan } from "../src/lib/planRepo";
import type { Plan } from "../src/types/plan";

const BATCH_LIMIT = 500;

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Mode: APPLY — this will write to Firestore." : "Mode: dry run — nothing will be written.");

  const [shopsSnapshot, existingInvoicesSnapshot] = await Promise.all([
    adminDb.collection("shops").get(),
    adminDb.collection(BILLING_INVOICES).get(),
  ]);

  const existingKeys = new Set(
    existingInvoicesSnapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const periodStart = (data.periodStart as { toDate?: () => Date })?.toDate?.() ?? new Date(data.periodStart as string);
      return `${data.shopId}:${periodStart.toISOString().slice(0, 10)}`;
    })
  );

  const planCache = new Map<string, Plan | null>();
  async function getPlan(planId: string): Promise<Plan | null> {
    if (planCache.has(planId)) return planCache.get(planId)!;
    const doc = await adminDb.collection("plans").doc(planId).get();
    const plan = doc.exists ? mapPlan(doc.id, doc.data() as Record<string, unknown>) : null;
    planCache.set(planId, plan);
    return plan;
  }

  const now = new Date();
  const toCreate: Array<{ shopId: string; shopName: string; plan: Plan; start: Date; end: Date }> = [];

  for (const shopDoc of shopsSnapshot.docs) {
    const data = shopDoc.data() as Record<string, unknown>;
    const activePlanId = data.activePlanId as string | undefined;
    if (!activePlanId) continue;

    const createdAtRaw = data.createdAt as { toDate?: () => Date } | string | undefined;
    const createdAt = typeof createdAtRaw === "object" && createdAtRaw?.toDate ? createdAtRaw.toDate() : new Date(createdAtRaw as string);
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

    const plan = await getPlan(activePlanId);
    if (!plan) continue;

    const periods = billingPeriodsUntil(createdAt, now);
    for (const period of periods) {
      const key = `${shopDoc.id}:${period.start.toISOString().slice(0, 10)}`;
      if (existingKeys.has(key)) continue;
      toCreate.push({ shopId: shopDoc.id, shopName: (data.name as string) || "(unnamed)", plan, start: period.start, end: period.end });
    }
  }

  console.log(`\nShops with an active plan: checked ${shopsSnapshot.size}`);
  console.log(`Invoices to create: ${toCreate.length}`);
  for (const item of toCreate.slice(0, 10)) {
    console.log(`  ${item.shopName}  ${item.plan.name}  ${item.start.toDateString()} → ${item.end.toDateString()}`);
  }
  if (toCreate.length > 10) console.log(`  ... and ${toCreate.length - 10} more`);

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to write these invoices.");
    return;
  }
  if (toCreate.length === 0) {
    console.log("\nNothing to write.");
    return;
  }

  let written = 0;
  for (let i = 0; i < toCreate.length; i += BATCH_LIMIT) {
    const chunk = toCreate.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const item of chunk) {
      const ref = adminDb.collection(BILLING_INVOICES).doc();
      batch.set(ref, {
        shopId: item.shopId,
        planId: item.plan.id,
        planName: item.plan.name,
        planTier: item.plan.tier,
        amount: item.plan.priceMonthly,
        currency: "INR",
        periodStart: item.start,
        periodEnd: item.end,
        billingDate: item.start,
        status: "paid",
        createdAt: now,
      });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`Committed ${written}/${toCreate.length}`);
  }

  console.log(`\nCreated ${written} invoice(s).`);
}

main().catch((error) => {
  console.error("Seeding billing invoices failed:", error);
  process.exit(1);
});
