// src/app/(dashboard)/purchases/requests/details/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PurchaseDetailsSkeleton } from "@/components/ui/PageSkeleton";
import { useUser } from "@/hooks";
import { toastHref } from "@/hooks/useCrossNavToast";
import PurchaseRequestDetails from "@/modules/purchase/PurchaseRequestDetails";
import type { PurchaseRequest } from "@/types/purchaseRequest";

function revive(request: PurchaseRequest): PurchaseRequest {
  return {
    ...request,
    requestedAt: new Date(request.requestedAt),
    decidedAt: request.decidedAt ? new Date(request.decidedAt) : undefined,
  };
}

function PurchaseRequestDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { user } = useUser();

  const [request, setRequest] = React.useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState(false);
  const [showApprove, setShowApprove] = React.useState(false);
  const [approveError, setApproveError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectError, setRejectError] = React.useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
      setError("No purchase request selected");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchase-requests/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase request");
        }
        const body = (await response.json()) as { purchaseRequest: PurchaseRequest };
        setRequest(revive(body.purchaseRequest));
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
  }, [id]);

  const patchAction = React.useCallback(
    async (body: unknown) => {
      const response = await fetch(`/api/purchase-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const responseBody = (await response.json()) as { error?: string };
        throw new Error(responseBody.error ?? "Could not update the request");
      }
      const responseBody = (await response.json()) as { purchaseRequest: PurchaseRequest };
      return revive(responseBody.purchaseRequest);
    },
    [id]
  );

  const handleApprove = React.useCallback(async () => {
    setApproving(true);
    setApproveError(null);
    try {
      const updated = await patchAction({ action: "approve" });
      router.push(toastHref("/purchases/requests", `Request ${updated.ref} was approved`));
    } catch (caught) {
      setApproveError((caught as Error).message);
    } finally {
      setApproving(false);
    }
  }, [patchAction, router]);

  const handleReject = React.useCallback(async () => {
    if (rejectReason.trim() === "") return;
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      const updated = await patchAction({ action: "reject", reason: rejectReason.trim() });
      router.push(toastHref("/purchases/requests", `Request ${updated.ref} was rejected`));
    } catch (caught) {
      setRejectError((caught as Error).message);
    } finally {
      setRejectSubmitting(false);
    }
  }, [patchAction, rejectReason, router]);

  const handleCancel = React.useCallback(async () => {
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const updated = await patchAction({ action: "cancel" });
      router.push(toastHref("/purchases/requests", `Request ${updated.ref} was cancelled`));
    } catch (caught) {
      setCancelError((caught as Error).message);
    } finally {
      setCancelSubmitting(false);
    }
  }, [patchAction, router]);

  if (loading) {
    return <PurchaseDetailsSkeleton />;
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Purchase request not found"}
        </div>
        <Link href="/purchases/requests" className="mt-3 inline-block text-sm text-blue-600">
          Back to purchase requests
        </Link>
      </div>
    );
  }

  const canDecide =
    request.status === "pending" && (user?.role === "branch_admin" || user?.role === "shop_admin");
  const canCancel = request.status === "pending" && user?.id === request.requestedBy.userId;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <nav className="flex items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
        <Link href="/purchases/requests" className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Purchase Requests
        </Link>
        <span aria-hidden="true">•</span>
        <span className="text-gray-700">{request.ref}</span>
      </nav>

      <PurchaseRequestDetails
        request={request}
        canDecide={canDecide}
        canCancel={canCancel}
        onOpenApprove={() => {
          setApproveError(null);
          setShowApprove(true);
        }}
        onOpenReject={() => {
          setRejectReason("");
          setRejectError(null);
          setRejecting(true);
        }}
        onOpenCancel={() => {
          setCancelError(null);
          setCancelling(true);
        }}
      />

      <ConfirmDialog
        open={showApprove}
        title="Approve request?"
        description={`Approve "${request.ref}"? This clears it for purchasing — no purchase is created automatically.`}
        confirmLabel={approving ? "Approving…" : "Approve request"}
        cancelLabel="Keep pending"
        confirming={approving}
        error={approveError}
        variant="primary"
        onConfirm={handleApprove}
        onClose={() => {
          if (!approving) {
            setShowApprove(false);
            setApproveError(null);
          }
        }}
      />

      <ConfirmDialog
        open={rejecting}
        title="Reject request?"
        description={`Reject "${request.ref}"? The technician will see this reason.`}
        confirmLabel={rejectSubmitting ? "Rejecting…" : "Reject request"}
        confirming={rejectSubmitting}
        confirmDisabled={rejectReason.trim() === ""}
        error={rejectError}
        onConfirm={handleReject}
        onClose={() => {
          if (!rejectSubmitting) {
            setRejecting(false);
            setRejectError(null);
          }
        }}
      >
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason <span className="text-red-600">*</span>
        </label>
        <input
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          className="mb-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. part not needed"
          disabled={rejectSubmitting}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelling}
        title="Cancel request?"
        description={`This cancels "${request.ref}". You can't undo this.`}
        confirmLabel={cancelSubmitting ? "Cancelling…" : "Cancel request"}
        cancelLabel="Keep request"
        confirming={cancelSubmitting}
        error={cancelError}
        onConfirm={handleCancel}
        onClose={() => {
          if (!cancelSubmitting) {
            setCancelling(false);
            setCancelError(null);
          }
        }}
      />
    </div>
  );
}

export default function PurchaseRequestDetailsPage() {
  return (
    <Suspense fallback={<PurchaseDetailsSkeleton />}>
      <PurchaseRequestDetailsContent />
    </Suspense>
  );
}
