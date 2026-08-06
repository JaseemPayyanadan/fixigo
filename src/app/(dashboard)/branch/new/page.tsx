"use client";

import { useCallback, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useUser } from "@/hooks";
import { BranchForm } from "@/modules/branch/BranchForm";

export default function NewBranchPage() {
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateBranch = useCallback(
    async (branchData: {
      name: string;
      location: string;
      phone: string;
      email: string;
      password: string;
      managerName?: string;
      managerEmail?: string;
      managerPhone?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/branches/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...branchData,
            shopId: shopId!,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || "Failed to create branch");
        }

        router.push("/branch");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [shopId, router]
  );

  const handleBack = useCallback(() => {
    router.push("/branch");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleBack}
            aria-label="Back to branches"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">New branch</p>
            <p className="truncate text-xs text-gray-500">Add a location to your shop</p>
          </div>
        </div>
      </div>

      <BranchForm
        onSubmit={handleCreateBranch}
        loading={loading}
        editing={false}
        onCancel={handleBack}
      />

      {error && (
        <div className="fixed bottom-6 right-6 max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
