"use client";
import React, { Suspense } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianFormHost from "@/modules/technician/TechnicianFormHost";

export default function TechnicianEditPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:write"]}>
        <Suspense fallback={null}>
          <TechnicianEditContent />
        </Suspense>
      </PermissionGuard>
    </RoleGuard>
  );
}

function TechnicianEditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const technicianId = searchParams.get("id");

  if (!technicianId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">No technician specified</h2>
          <Link href="/technicians" className="text-sm text-blue-600 hover:text-blue-700">
            ← Technicians
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 md:p-6">
        <Link href="/technicians" className="text-sm text-blue-600 hover:text-blue-700">
          ← Technicians
        </Link>

        <TechnicianFormHost
          editId={technicianId}
          onSuccess={() => router.push("/technicians")}
          onCancel={() => router.push("/technicians")}
        />
      </div>
    </div>
  );
}
