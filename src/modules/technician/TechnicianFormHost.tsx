// src/modules/technician/TechnicianFormHost.tsx
"use client";

import React from "react";

import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { useTechnicians } from "@/hooks/useTechnicians";
import TechnicianForm from "@/modules/technician/TechnicianForm";
import type { Technician } from "@/types";

export interface TechnicianFormActionState {
  submitting: boolean;
  submitLabel: string;
}

export interface TechnicianFormHostProps {
  editId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  formId?: string;
  hideSubmit?: boolean;
  onActionStateChange?: (state: TechnicianFormActionState) => void;
}

/**
 * Shared load + submit shell for create/edit technician. Used by the
 * full-page routes (mobile) and the desktop list slide-over, mirroring
 * `PurchaseFormHost`.
 */
export default function TechnicianFormHost({
  editId,
  onSuccess,
  onCancel,
  formId,
  hideSubmit = false,
  onActionStateChange,
}: TechnicianFormHostProps) {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const currentUserBranchId = user?.branchId || "";
  const userRole = user?.role as "shop_admin" | "branch_admin";
  const { branches } = useBranches(shopId);
  const { createTechnician, updateTechnician } = useTechnicians(shopId);

  const [technician, setTechnician] = React.useState<Technician | null>(null);
  const [loadingEdit, setLoadingEdit] = React.useState(Boolean(editId));
  const [editLoadError, setEditLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submitLabel = editId ? "Save Changes" : "Create Technician";

  React.useEffect(() => {
    onActionStateChange?.({ submitting, submitLabel });
  }, [submitting, submitLabel, onActionStateChange]);

  React.useEffect(() => {
    if (!editId) {
      setTechnician(null);
      setLoadingEdit(false);
      setEditLoadError(null);
      return;
    }

    setLoadingEdit(true);
    setEditLoadError(null);
    setTechnician(null);

    const controller = new AbortController();

    async function loadExisting() {
      try {
        const response = await fetch(`/api/technicians/${editId}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not load the technician");
        }
        const body = (await response.json()) as { technician: Technician };
        setTechnician(body.technician);
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

  const handleSubmit = React.useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      password: string;
      branchId: string;
      role: "technician";
      experience: number;
    }) => {
      setSubmitting(true);
      setError(null);

      try {
        if (editId) {
          await updateTechnician(editId, {
            name: data.name,
            email: data.email,
            phone: data.phone,
            branchId: data.branchId,
            experience: data.experience,
          });
        } else {
          const targetBranchId = userRole === "branch_admin" ? currentUserBranchId : data.branchId;
          await createTechnician({
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            branchId: targetBranchId,
            experience: data.experience,
          });
        }
        onSuccess();
      } catch (caught) {
        setError((caught as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [editId, userRole, currentUserBranchId, createTechnician, updateTechnician, onSuccess]
  );

  if (loadingEdit) {
    return <div className="text-sm text-gray-500">Loading technician…</div>;
  }

  if (editLoadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{editLoadError}</div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      <TechnicianForm
        key={technician?.id ?? "new"}
        onSubmit={handleSubmit}
        loading={submitting}
        editing={Boolean(editId)}
        initialData={
          technician
            ? {
                name: technician.name,
                email: technician.email,
                phone: technician.phone,
                branchId: technician.branchId,
                role: "technician",
                experience: technician.experience,
              }
            : undefined
        }
        onCancel={onCancel}
        branches={branches}
        userRole={userRole}
        currentUserBranchId={currentUserBranchId}
        formId={formId}
        hideSubmit={hideSubmit}
      />
    </div>
  );
}
