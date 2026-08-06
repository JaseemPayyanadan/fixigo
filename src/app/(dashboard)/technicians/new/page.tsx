"use client";
import React from "react";

import { useRouter } from "next/navigation";

import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianFormHost from "@/modules/technician/TechnicianFormHost";

export default function NewTechnicianPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:write"]}>
        <NewTechnicianContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function NewTechnicianContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
        <button
          onClick={() => router.push("/technicians")}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← Technicians
        </button>

        <TechnicianFormHost
          onSuccess={() => router.push("/technicians")}
          onCancel={() => router.push("/technicians")}
        />
      </div>
    </div>
  );
}
