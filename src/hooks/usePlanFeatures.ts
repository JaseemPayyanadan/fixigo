"use client";
import { useEffect, useState } from "react";

import type { PlanFeatures } from "@/types/plan";

import { useUser } from "./useUser";

/**
 * The unrestricted defaults `planAccess.ts` falls back to server-side when no
 * plan can be resolved — kept in sync with that file so the client never
 * blocks something the server would actually allow.
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

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

/**
 * The current shop's plan features, for gating UI (not a security boundary —
 * the API routes are). Falls back to unrestricted on any fetch failure, same
 * as the server does, rather than locking a page behind a network hiccup.
 */
export function usePlanFeatures() {
  const { user } = useUser();
  const [features, setFeatures] = useState<PlanFeatures>(UNRESTRICTED_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const shopResponse = await fetch("/api/shop");
        if (!shopResponse.ok) throw new Error(await readError(shopResponse));
        const shopBody = await shopResponse.json();
        const activePlanId = shopBody?.shop?.activePlanId as string | undefined;
        if (!activePlanId) {
          if (!cancelled) setFeatures(UNRESTRICTED_FEATURES);
          return;
        }

        const plansResponse = await fetch("/api/plans");
        if (!plansResponse.ok) throw new Error(await readError(plansResponse));
        const plansBody = await plansResponse.json();
        const plans: Array<{ id: string; features: PlanFeatures }> = Array.isArray(plansBody?.plans) ? plansBody.plans : [];
        const plan = plans.find((p) => p.id === activePlanId);

        if (!cancelled) setFeatures(plan?.features ?? UNRESTRICTED_FEATURES);
      } catch {
        if (!cancelled) setFeatures(UNRESTRICTED_FEATURES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { features, loading };
}
