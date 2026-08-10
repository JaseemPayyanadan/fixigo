// src/modules/purchase/PurchaseFormHost.tsx
"use client";

import React from "react";

import { FormSkeleton } from "@/components/ui/PageSkeleton";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import PurchaseForm, { type PurchasePayload } from "@/modules/purchase/PurchaseForm";
import type { Purchase, Supplier } from "@/types/purchase";

export interface PurchaseFormActionState {
  canSubmit: boolean;
  submitting: boolean;
  submitLabel: string;
}

export interface PurchaseFormHostProps {
  editId?: string | null;
  onSuccess: (purchaseId: string) => void;
  formId?: string;
  hideSubmit?: boolean;
  onActionStateChange?: (state: PurchaseFormActionState) => void;
}

/**
 * Shared load + submit shell for create/edit purchase. Used by the full-page
 * route (mobile) and the desktop list slide-over.
 */
export default function PurchaseFormHost({
  editId,
  onSuccess,
  formId,
  hideSubmit = false,
  onActionStateChange,
}: PurchaseFormHostProps) {
  const { user } = useUser();
  const isShopAdmin = user?.role === "shop_admin";
  const { branches } = useBranches(user?.shopId);
  const [initial, setInitial] = React.useState<Purchase | null>(null);
  const [loadingEdit, setLoadingEdit] = React.useState(Boolean(editId));
  const [editLoadError, setEditLoadError] = React.useState<string | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canSubmit, setCanSubmit] = React.useState(false);

  const submitLabel = editId ? "Update purchase" : "Save purchase";

  const handleSupplierCreated = React.useCallback((supplier: Supplier) => {
    setSuppliers((current) => [...current, supplier]);
  }, []);

  React.useEffect(() => {
    onActionStateChange?.({ canSubmit, submitting, submitLabel });
  }, [canSubmit, submitting, submitLabel, onActionStateChange]);

  React.useEffect(() => {
    if (!editId) {
      setInitial(null);
      setLoadingEdit(false);
      setEditLoadError(null);
      return;
    }

    setLoadingEdit(true);
    setEditLoadError(null);
    setInitial(null);

    const controller = new AbortController();

    async function loadExisting() {
      try {
        const response = await fetch(`/api/purchases/${editId}`, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not load the purchase");
        }
        const body = (await response.json()) as { purchase: Purchase };
        setInitial({ ...body.purchase, purchaseDate: new Date(body.purchase.purchaseDate) });
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setEditLoadError((caught as Error).message);
        }
      } finally {
        setLoadingEdit(false);
      }
    }

    loadExisting();
    return () => controller.abort();
  }, [editId]);

  // Suppliers are branch-owned: a branch_admin only ever sees their own
  // branch's suppliers, but a shop_admin picks a supplier from any branch —
  // the purchase's branch then follows whichever supplier they choose.
  React.useEffect(() => {
    if (!user) return;
    if (!isShopAdmin && !user.branchId) return;

    const controller = new AbortController();

    async function load() {
      const query = !isShopAdmin && user?.branchId ? `?branchId=${encodeURIComponent(user.branchId)}` : "";
      const suppliersResponse = await fetch(`/api/suppliers${query}`, {
        signal: controller.signal,
      });
      if (suppliersResponse.ok) {
        const body = (await suppliersResponse.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }
    }

    load();
    return () => controller.abort();
  }, [user, isShopAdmin]);

  const handleSubmit = React.useCallback(
    async (payload: PurchasePayload) => {
      if (editId && !initial) return;

      setSubmitting(true);
      setError(null);

      try {
        let response = await fetch(editId ? `/api/purchases/${editId}` : "/api/purchases", {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!editId && response.status === 409) {
          const body = (await response.json()) as { error: string };
          if (!window.confirm(`${body.error}\n\nRecord it anyway?`)) {
            setSubmitting(false);
            return;
          }
          response = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, confirmDuplicateInvoice: true }),
          });
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Could not save the purchase");
        }

        const body = (await response.json()) as { purchase: { id: string } };
        onSuccess(body.purchase.id);
      } catch (caught) {
        setError((caught as Error).message);
        setSubmitting(false);
      }
    },
    [editId, initial, onSuccess]
  );

  if (loadingEdit) {
    return <FormSkeleton sections={2} />;
  }

  if (editLoadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {editLoadError}
      </div>
    );
  }

  return (
    <PurchaseForm
      key={initial?.id ?? "new"}
      initial={initial}
      submitLabel={submitLabel}
      suppliers={suppliers}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      onSupplierCreated={handleSupplierCreated}
      branches={branches}
      showBranchSelector={isShopAdmin}
      defaultBranchId={isShopAdmin ? "" : user?.branchId ?? ""}
      formId={formId}
      hideSubmit={hideSubmit}
      onCanSubmitChange={setCanSubmit}
    />
  );
}
