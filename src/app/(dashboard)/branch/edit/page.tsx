"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/hooks";
import { BranchForm } from "@/modules/branch/BranchForm";
import { Branch } from "@/types";

export default function EditBranchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditBranchContent />
    </Suspense>
  );
}

function EditBranchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();
  const shopId = user?.shopId;
  const { updateBranch } = useBranches(shopId);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      if (!shopId || !id) return;
      setLoading(true);
      try {
        const docRef = doc(db, `shops/${shopId}/branches`, id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBranch({ id: docSnap.id, ...docSnap.data() } as Branch);
        } else {
          setError("Branch not found");
        }
      } catch (err) {
        setError((err as Error).message || "Failed to fetch branch");
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [shopId, id]);

  const handleEditBranch = async (branchData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    branchPassword: string;
  }) => {
    if (!branch) return;
    setFormLoading(true);
    setError(null);
    try {
      await updateBranch(branch.id, branchData);
      router.push("/branch");
    } catch (err) {
      setError((err as Error).message || "Failed to update branch");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!branch) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Edit Branch</h1>
        <BranchForm
          onSubmit={handleEditBranch}
          loading={formLoading}
          initialData={{
            name: branch.name,
            address: branch.address || branch.location || "",
            phone: branch.phone || branch.contactNumber || "",
            email: branch.email || branch.branchEmail || "",
          }}
          editMode={true}
        />
        <button
          className="mt-4 text-sm text-blue-600 hover:underline"
          onClick={() => router.push("/branch")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 