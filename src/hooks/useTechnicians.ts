"use client";
import { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import type { Technician } from "@/types";

import { useUser } from "./useUser";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function useTechnicians(shopId?: string, branchId?: string) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  // shopId is accepted for call-site compatibility but the server derives it
  // from the session; only branchId narrows the query.
  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const url = branchId
        ? `/api/technicians?branchId=${encodeURIComponent(branchId)}`
        : "/api/technicians";

      const response = await fetch(url);
      if (!response.ok) throw new Error(await readError(response));

      const { technicians: list } = await response.json();
      setTechnicians(list);
      logger.debug("Technicians fetched successfully", { count: list.length, branchId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch technicians";
      setError(message);
      logger.error("Error fetching technicians", { error: message, branchId });
    } finally {
      setLoading(false);
    }
  }, [user, branchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTechnician = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      password: string;
      branchId: string;
    }) => {
      const response = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await readError(response));

      const { technician } = await response.json();
      await refresh();
      return technician.id as string;
    },
    [refresh]
  );

  const updateTechnician = useCallback(
    async (id: string, updates: Partial<Technician>) => {
      const response = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  const deleteTechnician = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  return {
    technicians,
    loading,
    error,
    createTechnician,
    updateTechnician,
    deleteTechnician,
    refresh,
  };
}
