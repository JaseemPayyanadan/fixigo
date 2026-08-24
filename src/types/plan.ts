export type PlanTier = "free" | "basic" | "advanced";

/**
 * What a plan unlocks. `null` on a limit means unlimited — kept explicit
 * rather than a magic number like `-1` or `Infinity`, neither of which
 * survives a Firestore round-trip cleanly.
 */
export interface PlanFeatures {
  maxBranches: number | null;
  maxTechnicians: number | null;
  maxServicesPerMonth: number | null;
  reports: boolean;
  reportExport: boolean;
  purchaseManagement: boolean;
  multiUserAccess: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  /** INR, 0 for the free tier. */
  priceMonthly: number;
  features: PlanFeatures;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
