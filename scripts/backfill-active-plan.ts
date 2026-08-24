/**
 * Sets `activePlanId: "advanced"` on every document in the `shops` collection.
 *
 * Unconditional: this overwrites `activePlanId` on every shop, including one
 * that already has a different plan set. Re-running it is safe (same result
 * every time) but it is not a "fill in only if missing" backfill — it is a
 * deliberate bulk assignment.
 *
 * Usage:
 *   npx tsx scripts/backfill-active-plan.ts            # dry run
 *   npx tsx scripts/backfill-active-plan.ts --apply     # write
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY, same as the rest of the admin tooling.
 */

import { adminDb } from "../src/lib/firebaseAdmin";

const TARGET_PLAN_ID = "advanced";
const BATCH_LIMIT = 500;

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Mode: APPLY — this will write to Firestore." : "Mode: dry run — nothing will be written.");

  const planDoc = await adminDb.collection("plans").doc(TARGET_PLAN_ID).get();
  if (!planDoc.exists) {
    console.error(`\nplans/${TARGET_PLAN_ID} does not exist — run scripts/seed-plans.ts first.`);
    process.exit(1);
  }

  const snapshot = await adminDb.collection("shops").get();
  const shops = snapshot.docs.map((doc) => ({ id: doc.id, name: (doc.data().name as string) || "(unnamed)", currentPlanId: doc.data().activePlanId as string | undefined }));

  console.log(`\nShops found: ${shops.length}`);
  for (const shop of shops.slice(0, 10)) {
    console.log(`  ${shop.id}  ${shop.name}  (current: ${shop.currentPlanId ?? "none"})`);
  }
  if (shops.length > 10) console.log(`  ... and ${shops.length - 10} more`);

  if (!apply) {
    console.log(`\nDry run complete. Re-run with --apply to set activePlanId="${TARGET_PLAN_ID}" on all ${shops.length} shop(s).`);
    return;
  }
  if (shops.length === 0) {
    console.log("\nNothing to write.");
    return;
  }

  const now = new Date();
  let written = 0;
  for (let i = 0; i < shops.length; i += BATCH_LIMIT) {
    const chunk = shops.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const shop of chunk) {
      batch.update(adminDb.collection("shops").doc(shop.id), { activePlanId: TARGET_PLAN_ID, updatedAt: now });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`Committed ${written}/${shops.length}`);
  }

  console.log(`\nSet activePlanId="${TARGET_PLAN_ID}" on ${written} shop(s).`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
