// src/app/(dashboard)/purchases/requests/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { Suspense } from "react";

import { ListPageSkeleton, TableSkeleton } from "@/components/ui/PageSkeleton";
import Toast from "@/components/ui/Toast";
import { useBranches, useUser } from "@/hooks";
import { useCrossNavToast } from "@/hooks/useCrossNavToast";
import PurchaseRequestList from "@/modules/purchase/PurchaseRequestList";
import PurchaseTabs from "@/modules/purchase/PurchaseTabs";
import type { PurchaseRequest } from "@/types/purchaseRequest";

function reviveRequests(requests: PurchaseRequest[]): PurchaseRequest[] {
  return requests.map((request) => ({
    ...request,
    requestedAt: new Date(request.requestedAt),
    decidedAt: request.decidedAt ? new Date(request.decidedAt) : undefined,
  }));
}

function PurchaseRequestsPageContent() {
  const router = useRouter();
  const { user } = useUser();
  const isShopAdmin = user?.role === "shop_admin";
  const isTechnician = user?.role === "technician";
  const { branches } = useBranches(user?.shopId);

  const [requests, setRequests] = React.useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = useCrossNavToast("/purchases/requests");

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/purchase-requests", { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load purchase requests");
        }
        const body = (await response.json()) as { purchaseRequests: PurchaseRequest[] };
        setRequests(reviveRequests(body.purchaseRequests));
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError((caught as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const handleOpen = React.useCallback(
    (id: string) => router.push(`/purchases/requests/details?id=${id}`),
    [router]
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PurchaseTabs />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <PurchaseRequestList
          requests={requests}
          onOpen={handleOpen}
          branches={branches}
          showBranchColumn={isShopAdmin}
          showRequestedByColumn={!isTechnician}
        />
      )}

      <Toast
        open={Boolean(toastMessage)}
        message={toastMessage ?? ""}
        variant="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default function PurchaseRequestsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton cards={3} rows={6} label="Loading purchase requests" />}>
      <PurchaseRequestsPageContent />
    </Suspense>
  );
}
