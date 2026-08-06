"use client";

import React from "react";

import {
  BuildingOfficeIcon,
  ClockIcon,
  PhoneIcon,
  UserIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import type { Branch, Technician } from "@/types";

interface TechnicianViewDialogProps {
  technician: Technician | null;
  branches: Branch[];
  onClose: () => void;
}

/** Read-only detail popup for a technician row — there is no dedicated
 * technician details page, so View opens this instead of navigating away. */
export default function TechnicianViewDialog({ technician, branches, onClose }: TechnicianViewDialogProps) {
  if (!technician) return null;

  const branchName = branches.find((branch) => branch.id === technician.branchId)?.name ?? "No branch";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Technician Details</h3>
            <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600" aria-label="Close">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{technician.name}</h4>
                <p className="text-gray-600">{technician.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                <span>{technician.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                <span>{branchName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span>{technician.experience ?? 0} years experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="capitalize">Status: {technician.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
