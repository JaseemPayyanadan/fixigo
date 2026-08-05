"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";
import type { Branch } from "@/types";

import { useUser } from "./useUser";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function useBranches(shopId?: string) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const requestSeq = useRef(0);

  // shopId is accepted for call-site compatibility; the server scopes by session.
  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;

    if (!user) {
      if (seq === requestSeq.current) setLoading(false);
      return;
    }

    if (!shopId && !user.shopId) {
      if (seq === requestSeq.current) {
        setBranches([]);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error(await readError(response));

      const body = await response.json();
      const list = Array.isArray(body?.branches) ? body.branches : null;
      if (!list) throw new Error("Malformed response from server");

      if (seq !== requestSeq.current) return;
      setBranches(list);
      logger.debug("Branches fetched successfully", { count: list.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch branches";
      if (seq !== requestSeq.current) return;
      setError(message);
      logger.error("Error fetching branches", { error: message });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [user, shopId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBranch = useCallback(
    async (branchData: Omit<Branch, "id" | "createdAt" | "updatedAt"> & { password?: string; managerName?: string; managerPhone?: string }) => {
      const response = await fetch("/api/branches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      await refresh();
      return { branchId: body.branchId as string };
    },
    [refresh]
  );

  const updateBranch = useCallback(
    async (branchId: string, updates: Partial<Branch>) => {
      const response = await fetch(`/api/branches/${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  const deleteBranch = useCallback(
    async (branchId: string) => {
      const response = await fetch(`/api/branches/${encodeURIComponent(branchId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    },
    [refresh]
  );

  return {
    branches,
    loading,
    error,
    createBranch,
    updateBranch,
    deleteBranch,
    refresh,
  };
}
