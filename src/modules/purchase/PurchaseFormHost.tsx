// src/modules/purchase/PurchaseFormHost.tsx
"use client";

import React from "react";

import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import PurchaseForm, {
  type PurchasePayload,
  type Suggestions,
} from "@/modules/purchase/PurchaseForm";
import type { Purchase, Supplier } from "@/types/purchase";

export interface PurchaseFormActionState {
  canSubmit: boolean;
  submitting: boolean;
  submitLabel: string;
}

export interface PurchaseFormHostProps {
  editId?: string | null;
  onSuccess: (purchaseId: string) => void;
  onAddSupplier: () => void;
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
  onAddSupplier,
  formId,
  hideSubmit = false,
  onActionStateChange,
}: PurchaseFormHostProps) {
  const { user } = useUser();
  const isShopAdmin = user?.role === "shop_admin";
  const { branches } = useBranches(user?.shopId);
  const [branchId, setBranchId] = React.useState("");
  const [initial, setInitial] = React.useState<Purchase | null>(null);
  const [loadingEdit, setLoadingEdit] = React.useState(Boolean(editId));
  const [editLoadError, setEditLoadError] = React.useState<string | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestions>({
    names: [],
    brands: [],
    models: [],
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canSubmit, setCanSubmit] = React.useState(false);

  const submitLabel = editId ? "Update purchase" : "Save purchase";

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
        setBranchId(body.purchase.branchId);
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

  React.useEffect(() => {
    if (!isShopAdmin && user?.branchId) {
      setBranchId(user.branchId);
    }
  }, [isShopAdmin, user?.branchId]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const [suppliersResponse, suggestionsResponse] = await Promise.allSettled([
        fetch("/api/suppliers", { signal: controller.signal }),
        fetch("/api/purchases/item-suggestions", { signal: controller.signal }),
      ]);

      if (suppliersResponse.status === "fulfilled" && suppliersResponse.value.ok) {
        const body = (await suppliersResponse.value.json()) as { suppliers: Supplier[] };
        setSuppliers(body.suppliers);
      }

      if (suggestionsResponse.status === "fulfilled" && suggestionsResponse.value.ok) {
        setSuggestions((await suggestionsResponse.value.json()) as Suggestions);
      }
    }

    load();
    return () => controller.abort();
  }, []);

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
    return <div className="text-sm text-gray-500">Loading purchase…</div>;
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
      suggestions={suggestions}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      onAddSupplier={onAddSupplier}
      branches={branches}
      showBranchSelector={isShopAdmin}
      branchId={branchId}
      setBranchId={setBranchId}
      formId={formId}
      hideSubmit={hideSubmit}
      onCanSubmitChange={setCanSubmit}
    />
  );
}
