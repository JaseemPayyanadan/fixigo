"use client";
import { useState, useEffect, useCallback, useRef } from "react";

import { logger } from "@/lib/logger";
import type { Purchase } from "@/types/purchase";

import { useUser } from "./useUser";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function usePurchases(shopId?: string, branchId?: string) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useUser();
  const requestSeq = useRef(0);

  // shopId is accepted for call-site compatibility; the server scopes by session.
  const fetchPurchases = useCallback(async () => {
    const seq = ++requestSeq.current;

    if (!user) {
      if (seq === requestSeq.current) setLoading(false);
      return;
    }

    if (!shopId && !user.shopId) {
      if (seq === requestSeq.current) {
        setPurchases([]);
        setLoading(false);
      }
      return;
    }

    if (user.role === "technician") {
      if (seq === requestSeq.current) {
        setPurchases([]);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = branchId ? `/api/purchases?branchId=${encodeURIComponent(branchId)}` : "/api/purchases";

      const response = await fetch(url);
      if (!response.ok) throw new Error(await readError(response));

      const body = await response.json();
      const list = Array.isArray(body?.purchases) ? body.purchases : null;
      if (!list) throw new Error("Malformed response from server");

      if (seq !== requestSeq.current) return;
      setPurchases(list);
      logger.debug("Purchases fetched successfully", { count: list.length, branchId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch purchases";
      if (seq !== requestSeq.current) return;
      setError(message);
      logger.error("Error fetching purchases", { error: message });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [user, shopId, branchId]);

  useEffect(() => {
    void fetchPurchases();
  }, [fetchPurchases]);

  const refreshPurchases = useCallback(async () => {
    setRefreshing(true);
    await fetchPurchases();
    setRefreshing(false);
  }, [fetchPurchases]);

  return {
    purchases,
    loading,
    error,
    refreshing,
    refreshPurchases,
    fetchPurchases,
  };
}
