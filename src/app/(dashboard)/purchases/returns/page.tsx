// src/app/(dashboard)/purchases/returns/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { PlusIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/ui/PageSkeleton";
import { formatRupees } from "@/lib/purchaseFormat";
import EditReturnModal from "@/modules/purchase/EditReturnModal";
import PurchaseTabs from "@/modules/purchase/PurchaseTabs";
import RecordReturnModal from "@/modules/purchase/RecordReturnModal";
import ReturnList from "@/modules/purchase/ReturnList";
import type { Purchase, PurchaseReturnRow } from "@/types/purchase";

function revivePurchases(purchases: Purchase[]): Purchase[] {
  return purchases.map((purchase) => ({
    ...purchase,
    purchaseDate: new Date(purchase.purchaseDate),
    dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
  }));
}

function reviveReturns(returns: PurchaseReturnRow[]): PurchaseReturnRow[] {
  return returns.map((entry) => ({
    ...entry,
    returnedAt: new Date(entry.returnedAt),
    createdAt: new Date(entry.createdAt),
  }));
}

export default function PurchaseReturnsPage() {
  const router = useRouter();

  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [returns, setReturns] = React.useState<PurchaseReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingReturn, setEditingReturn] = React.useState<PurchaseReturnRow | null>(null);
  const [deletingReturn, setDeletingReturn] = React.useState<PurchaseReturnRow | null>(null);
  const [deletingReturnBusy, setDeletingReturnBusy] = React.useState(false);
  const [deleteReturnError, setDeleteReturnError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    const [purchasesResponse, returnsResponse] = await Promise.all([
      fetch("/api/purchases", { signal }),
      fetch("/api/purchases/returns", { signal }),
    ]);

    if (!purchasesResponse.ok) {
      const body = (await purchasesResponse.json()) as { error?: string };
      throw new Error(body.error ?? "Could not load purchases");
    }
    if (!returnsResponse.ok) {
      const body = (await returnsResponse.json()) as { error?: string };
      throw new Error(body.error ?? "Could not load returns");
    }

    const purchasesBody = (await purchasesResponse.json()) as { purchases: Purchase[] };
    const returnsBody = (await returnsResponse.json()) as { returns: PurchaseReturnRow[] };

    setPurchases(revivePurchases(purchasesBody.purchases));
    setReturns(reviveReturns(returnsBody.returns));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();

    async function run() {
      try {
        await load(controller.signal);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError((caught as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [load]);

  const handleRecorded = React.useCallback(async () => {
    try {
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [load]);

  const handleReturnSaved = React.useCallback(async () => {
    setEditingReturn(null);
    try {
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [load]);

  const handleDeleteReturnConfirm = React.useCallback(async () => {
    if (!deletingReturn) return;

    setDeletingReturnBusy(true);
    setDeleteReturnError(null);
    try {
      const response = await fetch(
        `/api/purchases/${deletingReturn.purchaseId}/returns/${deletingReturn.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not delete the return");
      }
      setDeletingReturn(null);
      await load();
    } catch (caught) {
      setDeleteReturnError((caught as Error).message);
    } finally {
      setDeletingReturnBusy(false);
    }
  }, [deletingReturn, load]);

  const editingPurchase = editingReturn
    ? (purchases.find((purchase) => purchase.id === editingReturn.purchaseId) ?? null)
    : null;

  return (
    <div className="flex min-h-screen flex-col gap-3 p-3 md:p-4">
      <PurchaseTabs />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">Returns</h1>
        <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Record Return
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ReturnList
            returns={returns}
            onOpenPurchase={(id) => router.push(`/purchases/details?id=${id}`)}
            onEditReturn={(entry) => {
              // `purchases` excludes cancelled bills, so a return on one has no
              // match here — editing is unavailable, same as the server enforces.
              const stillEditable = purchases.some(
                (purchase) => purchase.id === entry.purchaseId
              );
              if (!stillEditable) {
                setError("This return can no longer be edited — its bill has been cancelled.");
                return;
              }
              setError(null);
              setEditingReturn(entry);
            }}
            onDeleteReturn={(entry) => {
              setDeleteReturnError(null);
              setDeletingReturn(entry);
            }}
          />
        </div>
      )}

      <RecordReturnModal
        open={modalOpen}
        purchases={purchases}
        onClose={() => setModalOpen(false)}
        onRecorded={handleRecorded}
      />

      <EditReturnModal
        open={editingReturn !== null}
        purchase={editingPurchase}
        purchaseReturn={editingReturn}
        onClose={() => setEditingReturn(null)}
        onSaved={handleReturnSaved}
      />

      <ConfirmDialog
        open={deletingReturn !== null}
        title="Delete return?"
        description={
          deletingReturn
            ? `Delete the ${formatRupees(deletingReturn.totalAmount)} return recorded against ${deletingReturn.purchaseRef}? This adds the amount back to the bill's balance.`
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
