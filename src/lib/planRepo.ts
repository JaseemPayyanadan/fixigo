import { adminDb } from "@/lib/firebaseAdmin";
import type { Plan, PlanFeatures, PlanTier } from "@/types/plan";

export const PLANS = "plans";

/** Firestore Timestamp, JS Date, or ISO string. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function toLimit(value: unknown): number | null {
  if (value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapFeatures(data: unknown): PlanFeatures {
  const raw = (data as Record<string, unknown>) ?? {};
  return {
    maxBranches: toLimit(raw.maxBranches),
    maxTechnicians: toLimit(raw.maxTechnicians),
    maxServicesPerMonth: toLimit(raw.maxServicesPerMonth),
    reports: raw.reports === true,
    reportExport: raw.reportExport === true,
    purchaseManagement: raw.purchaseManagement === true,
    multiUserAccess: raw.multiUserAccess === true,
    prioritySupport: raw.prioritySupport === true,
  };
}

export function mapPlan(id: string, data: Record<string, unknown>): Plan {
  return {
    id,
    tier: (data.tier as PlanTier) || "free",
    name: (data.name as string) || "",
    description: (data.description as string) || "",
    priceMonthly: Number(data.priceMonthly) || 0,
    features: mapFeatures(data.features),
    isActive: data.isActive !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Every active plan, cheapest first. Inactive plans (retired tiers) are excluded. */
export async function listPlans(): Promise<Plan[]> {
  const snapshot = await adminDb.collection(PLANS).get();
  return snapshot.docs
    .map((doc) => mapPlan(doc.id, doc.data() as Record<string, unknown>))
    .filter((plan) => plan.isActive)
    .sort((a, b) => a.priceMonthly - b.priceMonthly);
}

export async function getPlan(id: string): Promise<Plan | null> {
  const snapshot = await adminDb.collection(PLANS).doc(id).get();
  if (!snapshot.exists) return null;
  return mapPlan(snapshot.id, snapshot.data() as Record<string, unknown>);
}
