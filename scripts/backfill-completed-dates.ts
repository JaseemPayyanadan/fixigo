/**
 * Backfills `completedDate` on services that were completed before the app
 * started recording it.
 *
 * Why this exists: until the completion timestamp was added to the status-change
 * handler, marking a job "completed" wrote only `status` and `updatedAt`. The
 * dashboard dates completed work — and therefore its revenue — from
 * `completedDate`, so every historic job is invisible to "Completed Today",
 * "Revenue Today" and the 14-day sparklines.
 *
 * What it writes: `updatedAt` as an *approximation* of the completion time. That
 * is honest for a job whose last edit was the completion itself, and wrong for
 * one edited afterwards — so the value is an estimate, not a record. It is
 * written to `completedDate` only, never to `actualCompletion`, so a genuine
 * recorded completion is always distinguishable from an inferred one.
 *
 * Safety: dry-run by default. It reports what it would change and writes
 * nothing unless `--apply` is passed, and it never overwrites a `completedDate`
 * that already exists.
 *
 * Usage:
 *   npx tsx scripts/backfill-completed-dates.ts              # dry run
 *   npx tsx scripts/backfill-completed-dates.ts --apply      # write
 *   npx tsx scripts/backfill-completed-dates.ts --shop=<id>  # limit to one shop
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY, same as the rest of the admin tooling.
 */

import { adminDb, Timestamp } from "../src/lib/firebaseAdmin";

// Firestore caps a batched write at 500 operations.
const BATCH_LIMIT = 500;

interface Args {
  apply: boolean;
  shopId?: string;
}

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const shopArg = argv.find((arg) => arg.startsWith("--shop="));
  return { apply, shopId: shopArg?.slice("--shop=".length) || undefined };
}

/** Treats the several shapes a stored date can take, same as the app mapper. */
function readDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isCompleted(status: unknown): boolean {
  return typeof status === "string" && status.trim().toLowerCase().replace(/[\s-]+/g, "_") === "completed";
}

async function main() {
  const { apply, shopId } = parseArgs(process.argv.slice(2));

  console.log(apply ? "Mode: APPLY — this will write to Firestore." : "Mode: dry run — nothing will be written.");
  if (shopId) console.log(`Scope: shop ${shopId}`);

  const base = adminDb.collection("services");
  const snapshot = await (shopId ? base.where("shopId", "==", shopId).get() : base.get());

  const candidates: Array<{ id: string; completedDate: Date }> = [];
  let alreadyStamped = 0;
  let notCompleted = 0;
  let unusable = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (!isCompleted(data.status)) {
      notCompleted += 1;
      return;
    }
    if (readDate(data.completedDate)) {
      alreadyStamped += 1;
      return;
    }

    // `actualCompletion` is a real recorded completion where it exists, so
    // prefer it over the `updatedAt` estimate.
    const inferred = readDate(data.actualCompletion) ?? readDate(data.updatedAt);
    if (!inferred) {
      // No basis for a date at all. Guessing here would put revenue on an
      // arbitrary day, which is worse than leaving the job uncounted.
      unusable += 1;
      return;
    }

    candidates.push({ id: doc.id, completedDate: inferred });
  });

  console.log(
    [
      "",
      `Scanned:            ${snapshot.size}`,
      `  not completed:    ${notCompleted}`,
      `  already stamped:  ${alreadyStamped}`,
      `  no usable date:   ${unusable} (left untouched)`,
      `  to backfill:      ${candidates.length}`,
      "",
    ].join("\n")
  );

  for (const candidate of candidates.slice(0, 10)) {
    console.log(`  ${candidate.id} -> ${candidate.completedDate.toISOString()}`);
  }
  if (candidates.length > 10) console.log(`  ... and ${candidates.length - 10} more`);

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to write these values.");
    return;
  }
  if (candidates.length === 0) {
    console.log("\nNothing to write.");
    return;
  }

  let written = 0;
  for (let i = 0; i < candidates.length; i += BATCH_LIMIT) {
    const chunk = candidates.slice(i, i + BATCH_LIMIT);
    const batch = adminDb.batch();

    for (const { id, completedDate } of chunk) {
      batch.update(adminDb.collection("services").doc(id), {
        completedDate: Timestamp.fromDate(completedDate),
        // Marks the value as inferred rather than observed, so this run can be
        // identified — and undone — later.
        completedDateBackfilled: true,
      });
    }

    await batch.commit();
    written += chunk.length;
    console.log(`Committed ${written}/${candidates.length}`);
  }

  console.log(`\nBackfilled ${written} service(s).`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
