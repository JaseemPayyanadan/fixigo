"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SupplierDetailsSkeleton } from "@/components/ui/PageSkeleton";
import SupplierForm, { type SupplierPayload } from "@/modules/purchase/SupplierForm";
import SupplierProfile from "@/modules/purchase/SupplierProfile";
import type { Purchase, Supplier } from "@/types/purchase";

function SupplierDetailsContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleUpdate = React.useCallback(
    async (payload: SupplierPayload) => {
      setSaving(true);
      setSaveError(null);
      try {
        const response = await fetch(`/api/suppliers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the supplier");
        }
        const body = (await response.json()) as { supplier: Supplier };
        setSupplier({
          ...body.supplier,
          lastPurchaseAt: body.supplier.lastPurchaseAt
            ? new Date(body.supplier.lastPurchaseAt)
            : undefined,
        });
        setEditing(false);
      } catch (caught) {
        setSaveError((caught as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!id || !supplier) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not delete the supplier");
      }
      setConfirmDeleteOpen(false);
      router.push(
        `/purchases/suppliers?toast=${encodeURIComponent(`"${supplier.name}" was deactivated`)}`
      );
    } catch (caught) {
      setDeleteError((caught as Error).message);
    } finally {
      setDeleting(false);
    }
  }, [id, supplier, router]);

  React.useEffect(() => {
    if (!id) {
      setSupplier(null);
      setPurchases([]);
      setError("No supplier selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSupplier(null);
    setPurchases([]);

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/suppliers/${id}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the supplier");
        }
        const body = (await response.json()) as { supplier: Supplier; purchases: Purchase[] };
        if (controller.signal.aborted) return;
        setSupplier({
          ...body.supplier,
          lastPurchaseAt: body.supplier.lastPurchaseAt
            ? new Date(body.supplier.lastPurchaseAt)
            : undefined,
        });
        setPurchases(
          body.purchases.map((purchase) => ({
            ...purchase,
            purchaseDate: new Date(purchase.purchaseDate),
            dueDate: purchase.dueDate ? new Date(purchase.dueDate) : undefined,
          }))
        );
        setError(null);
      } catch (caught) {
        if ((caught as Error).name === "AbortError" || controller.signal.aborted) return;
        setError((caught as Error).message);
        setSupplier(null);
        setPurchases([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <SupplierDetailsSkeleton />;
  }

  if (error || !supplier) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Supplier not found"}
        </div>
      </div>
    );
  }

  const isInactive = supplier.status === "inactive";
  const outstandingNote =
    supplier.outstanding > 0
      ? ` Outstanding balance of ₹${supplier.outstanding.toLocaleString("en-IN")} will remain on past purchases.`
      : "";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
          <Link
            href="/purchases"
            className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Purchases
          </Link>
          <span aria-hidden="true">•</span>
          <Link
            href="/purchases/suppliers"
            className="hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Suppliers
          </Link>
          <span aria-hidden="true">•</span>
          <span className="truncate text-gray-700">{supplier.name}</span>
        </nav>
        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            {!isInactive && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDeleteOpen(true);
                }}
                disabled={deleting}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {isInactive && !editing && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          This supplier is inactive and will not appear when adding new purchases.
        </div>
      )}

      {editing ? (
        <SupplierForm
          initial={supplier}
          saving={saving}
          error={saveError}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditing(false);
            setSaveError(null);
          }}
        />
      ) : (
        <SupplierProfile
          supplier={supplier}
          purchases={purchases}
          onOpenPurchase={(purchaseId) => router.push(`/purchases/details?id=${purchaseId}`)}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete supplier?"
        description={`Deactivate "${supplier.name}"? They will no longer appear when adding purchases.${outstandingNote}`}
        confirmLabel="Delete supplier"
        confirming={deleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deleting) {
            setConfirmDeleteOpen(false);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}

export default function SupplierDetailsPage() {
  return (
    <Suspense fallback={<SupplierDetailsSkeleton />}>
      <SupplierDetailsContent />
    </Suspense>
  );
}
