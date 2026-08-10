"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PurchaseDetailsSkeleton } from "@/components/ui/PageSkeleton";
import { useBranches, useUser } from "@/hooks";
import { toastHref } from "@/hooks/useCrossNavToast";
import { formatRupees } from "@/lib/purchaseFormat";
import EditReturnModal from "@/modules/purchase/EditReturnModal";
import PurchaseDetails from "@/modules/purchase/PurchaseDetails";
import RecordPaymentModal from "@/modules/purchase/RecordPaymentModal";
import type { Purchase, PurchaseReturn } from "@/types/purchase";

function revive(purchase: Purchase): Purchase {
  return {
    ...purchase,
    purchaseDate: new Date(purchase.purchaseDate),
    dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
    payments: purchase.payments.map((payment) => ({
      ...payment,
      paidAt: new Date(payment.paidAt),
      createdAt: new Date(payment.createdAt),
    })),
    returns: purchase.returns.map((purchaseReturn) => ({
      ...purchaseReturn,
      returnedAt: new Date(purchaseReturn.returnedAt),
      createdAt: new Date(purchaseReturn.createdAt),
    })),
  };
}

function PurchaseDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);

  const [purchase, setPurchase] = React.useState<Purchase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [cancellingSubmit, setCancellingSubmit] = React.useState(false);
  const [editingReturn, setEditingReturn] = React.useState<PurchaseReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = React.useState<PurchaseReturn | null>(null);
  const [deletingReturnBusy, setDeletingReturnBusy] = React.useState(false);
  const [deleteReturnError, setDeleteReturnError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setPurchase(null);
      setError("No purchase selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPurchase(null);

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/purchases/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase");
        }
        const body = (await response.json()) as { purchase: Purchase };
        if (controller.signal.aborted) return;
        setPurchase(revive(body.purchase));
        setError(null);
      } catch (caught) {
        // Aborted requests from Strict Mode / id changes must not flip UI to "not found".
        if ((caught as Error).name === "AbortError" || controller.signal.aborted) return;
        setError((caught as Error).message);
        setPurchase(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  const handleEdit = React.useCallback(() => {
    if (!purchase) return;
    // Desktop: list-hosted right slide. Mobile: full-page form.
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      router.push(`/purchases?edit=${purchase.id}`);
      return;
    }
    router.push(`/purchases/new?edit=${purchase.id}`);
  }, [purchase, router]);

  const handleCancel = React.useCallback(async () => {
    if (!purchase || cancelReason.trim() === "") return;

    setCancelError(null);
    setCancellingSubmit(true);

    try {
      const response = await fetch(`/api/purchases/${purchase.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setCancelError(body.error ?? "Could not cancel the purchase");
        return;
      }

      const body = (await response.json()) as { purchase: Purchase };
      setPurchase(revive(body.purchase));
      setCancelling(false);
      setCancelReason("");
      setCancelError(null);
      router.push(toastHref("/purchases", `Purchase ${body.purchase.ref} was cancelled`));
    } finally {
      setCancellingSubmit(false);
    }
  }, [purchase, cancelReason, router]);

  const openDelete = React.useCallback(() => {
    setCancelling(true);
    setCancelError(null);
  }, []);

  const handleDeleteReturnConfirm = React.useCallback(async () => {
    if (!purchase || !deletingReturn) return;

    setDeletingReturnBusy(true);
    setDeleteReturnError(null);
    try {
      const response = await fetch(
        `/api/purchases/${purchase.id}/returns/${deletingReturn.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not delete the return");
      }
      const body = (await response.json()) as { purchase: Purchase };
      setPurchase(revive(body.purchase));
      setDeletingReturn(null);
    } catch (caught) {
      setDeleteReturnError((caught as Error).message);
    } finally {
      setDeletingReturnBusy(false);
    }
  }, [purchase, deletingReturn]);

  if (loading) {
    return <PurchaseDetailsSkeleton />;
  }

  if (error || !purchase) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Purchase not found"}
        </div>
        <Link href="/purchases" className="mt-3 inline-block text-sm text-blue-600">
          Back to purchases
        </Link>
      </div>
    );
  }

  const isActive = purchase.status === "active";
  const isLocked = isActive && purchase.payments.length > 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <nav
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-gray-500"
          aria-label="Breadcrumb"
        >
          <Link
            href="/purchases"
            className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Purchases
          </Link>
          <span aria-hidden="true">•</span>
          <span className="truncate text-gray-700">{purchase.ref}</span>
        </nav>

        {isActive && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              disabled={isLocked}
              title={
                isLocked
                  ? "Edit is unavailable after a payment is recorded"
                  : "Edit purchase"
              }
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={openDelete}
              title="Delete purchase"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <PurchaseDetails
        purchase={purchase}
        onRecordPayment={() => setPaymentOpen(true)}
        onEditReturn={(purchaseReturn) => setEditingReturn(purchaseReturn)}
        onDeleteReturn={(purchaseReturn) => {
          setDeleteReturnError(null);
          setDeletingReturn(purchaseReturn);
        }}
        branches={branches}
      />

      <ConfirmDialog
        open={cancelling}
        title="Delete purchase?"
        description={`This cancels "${purchase.ref}". Purchase history is kept, but the bill will no longer count toward totals.`}
        confirmLabel={cancellingSubmit ? "Deleting…" : "Delete purchase"}
        cancelLabel="Keep purchase"
        confirming={cancellingSubmit}
        confirmDisabled={cancelReason.trim() === ""}
        error={cancelError}
        onConfirm={handleCancel}
        onClose={() => {
          if (!cancellingSubmit) {
            setCancelling(false);
            setCancelError(null);
          }
        }}
      >
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason <span className="text-red-600">*</span>
        </label>
        <input
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          className="mb-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. wrong supplier"
          disabled={cancellingSubmit}
        />
      </ConfirmDialog>

      <RecordPaymentModal
        purchase={purchase}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onRecorded={(updated) => setPurchase(revive(updated))}
      />

      <EditReturnModal
        open={editingReturn !== null}
        purchase={purchase}
        purchaseReturn={editingReturn}
        onClose={() => setEditingReturn(null)}
        onSaved={(updated) => {
          setPurchase(revive(updated));
          setEditingReturn(null);
        }}
      />

      <ConfirmDialog
        open={deletingReturn !== null}
        title="Delete return?"
        description={
          deletingReturn
            ? `Delete the ${formatRupees(deletingReturn.totalAmount)} return recorded on ${deletingReturn.returnedAt.toLocaleDateString(
                "en-IN"
              )}? This adds the amount back to the bill's balance.`
            : ""
        }
        confirmLabel="Delete return"
        confirming={deletingReturnBusy}
        error={deleteReturnError}
        onConfirm={handleDeleteReturnConfirm}
        onClose={() => {
          if (!deletingReturnBusy) {
            setDeletingReturn(null);
            setDeleteReturnError(null);
          }
        }}
      />
    </div>
  );
}

export default function PurchaseDetailsPage() {
  return (
    <Suspense fallback={<PurchaseDetailsSkeleton />}>
      <PurchaseDetailsContent />
    </Suspense>
  );
}
