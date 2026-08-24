import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/apiAuth";
import { getPlan } from "@/lib/planRepo";
import { getShop } from "@/lib/shopRepo";
import type { PlanFeatures } from "@/types/plan";

const FALLBACK_PLAN_ID = "free";

/**
 * Used when no plan can be resolved at all — the shop predates plans, the
 * free-tier doc is missing, or the plan lookup itself failed. Deliberately
 * unrestricted (fail open), not the free tier's limits (fail closed): a
 * billing feature that isn't fully rolled out should never become a single
 * point of failure blocking every branch/technician/service creation in the
 * app. A limit only ever applies once a plan is actually found.
 */
const UNRESTRICTED_FEATURES: PlanFeatures = {
  maxBranches: null,
  maxTechnicians: null,
  maxServicesPerMonth: null,
  reports: true,
  reportExport: true,
  purchaseManagement: true,
  multiUserAccess: true,
  prioritySupport: true,
};

/**
 * The features a shop's current plan unlocks. Falls back to the free tier
 * when the shop has never been assigned a plan (`activePlanId` absent) or
 * points at a plan that no longer exists. If even the free tier can't be
 * found, see `UNRESTRICTED_FEATURES` above.
 */
export async function getShopPlanFeatures(shopId: string): Promise<PlanFeatures> {
  try {
    const shop = await getShop(shopId);
    const planId = shop?.activePlanId || FALLBACK_PLAN_ID;

    const plan = (await getPlan(planId)) ?? (await getPlan(FALLBACK_PLAN_ID));
    if (plan) return plan.features;

    logger.warn("No plan found for shop; allowing unrestricted access", { shopId, planId });
  } catch (error) {
    logger.error("Plan lookup failed; allowing unrestricted access", { shopId, error: error instanceof Error ? error.message : String(error) });
  }
  return UNRESTRICTED_FEATURES;
}

/** Throws when `current` has already reached a numeric plan limit. `null` means unlimited. */
export function assertWithinPlanLimit(current: number, limit: number | null, message: string): void {
  if (limit !== null && current >= limit) {
    throw new ApiError(403, message);
  }
}

/** Throws when a boolean plan feature is off. */
export function assertPlanFeatureEnabled(enabled: boolean, message: string): void {
  if (!enabled) {
    throw new ApiError(403, message);
  }
}
