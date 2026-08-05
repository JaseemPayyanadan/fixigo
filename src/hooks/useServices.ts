"use client";
import { useState, useEffect, useCallback, useRef } from "react";

import { logger } from "@/lib/logger";
import type { Service } from "@/types";

import { useUser } from "./useUser";

export interface ServiceFilters {
  status?: string;
  priority?: string;
  technician_id?: string;
  search?: string;
}

export interface ServiceSortOptions {
  field: "createdAt" | "updatedAt" | "name" | "price" | "status";
  direction: "asc" | "desc";
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function useServices(shopId?: string, branchId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useUser();
  const requestSeq = useRef(0);

  // shopId is accepted for call-site compatibility; the server scopes by session.
  const fetchServices = useCallback(async () => {
    const seq = ++requestSeq.current;

    if (!user) {
      if (seq === requestSeq.current) setLoading(false);
      return;
    }

    if (!shopId && !user.shopId) {
      if (seq === requestSeq.current) {
        setServices([]);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = branchId
        ? `/api/services?branchId=${encodeURIComponent(branchId)}`
        : "/api/services";

      const response = await fetch(url);
      if (!response.ok) throw new Error(await readError(response));

      const body = await response.json();
      const list = Array.isArray(body?.services) ? body.services : null;
      if (!list) throw new Error("Malformed response from server");

      if (seq !== requestSeq.current) return;
      setServices(list);
      logger.debug("Services fetched successfully", { count: list.length, branchId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch services";
      if (seq !== requestSeq.current) return;
      setError(message);
      logger.error("Error fetching services", { error: message });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [user, shopId, branchId]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const refreshServices = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refreshing,
    refreshServices,
    fetchServices,
  };
}
