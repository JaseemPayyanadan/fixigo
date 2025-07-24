"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import TechnicianForm from "@/modules/technician/TechnicianForm";
import type { Technician } from "@/modules/technician/TechnicianList";

export default function EditTechnicianPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditTechnicianContent />
    </Suspense>
  );
}

function EditTechnicianContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);
  const [tech, setTech] = useState<Technician | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "technicians", id)).then(docSnap => {
      if (docSnap.exists()) setTech({ id: docSnap.id, ...docSnap.data() } as Technician);
    });
  }, [id]);

  const handleEdit = async (data: { name: string; email: string; phone: string; branch_id: string }) => {
    if (!id) return;
    await updateDoc(doc(db, "technicians", id), data);
    router.push("/technicians");
  };

  return tech ? (
    <TechnicianForm
      onSubmit={handleEdit}
      loading={false}
      editing={true}
      initialData={{ name: tech.name, email: tech.email, phone: tech.phone }}
      branch_id={user?.branch_id || ""}
      onCancel={() => router.push("/technicians")}
      branches={branches}
      userRole={user?.role || ""}
    />
  ) : <div>Loading...</div>;
} 