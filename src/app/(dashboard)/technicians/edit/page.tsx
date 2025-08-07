"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";
import { useTechnicians } from "@/hooks/useTechnicians";
import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianForm from "@/modules/technician/TechnicianForm";
import type { Technician } from "@/types";

interface TechnicianData {
  name: string;
  email: string;
  phone: string;
  branch_id: string;
  skills: string[];
  status: string;
}

export default function TechnicianEditPage() {
  return (
    <RoleGuard allowedRoles={["shop_admin", "branch_admin"]}>
      <PermissionGuard permissions={["technician:write"]}>
        <TechnicianEditContent />
      </PermissionGuard>
    </RoleGuard>
  );
}

function TechnicianEditContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const shopId = user?.shopId || "";
  const branchId = user?.branchId || "";
  const userRole = user?.role as "shop_admin" | "branch_admin";
  const { branches } = useBranches(shopId);
  const { updateTechnician } = useTechnicians(shopId, branchId);
  
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicianId = params.id as string;

  useEffect(() => {
    const fetchTechnician = async () => {
      if (!technicianId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch technician data from Firestore
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        const technicianDoc = await getDoc(doc(db, "technicians", technicianId));
        
        if (technicianDoc.exists()) {
          const data = technicianDoc.data();
          const technicianData: Technician = {
            id: technicianDoc.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "technician",
            shopId: data.shopId || "",
            branchId: data.branchId || "",
            userId: data.userId || "",
            skills: data.skills || [],
            status: data.status || "active",
            bio: data.bio || "",
            specializations: data.specializations || [],
            experience: data.experience || 0,
            rating: data.rating || 0,
            totalServices: data.totalServices || 0,
            completedServices: data.completedServices || 0,
            availability: data.availability || {},
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          setTechnician(technicianData);
        } else {
          setError("Technician not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch technician");
      } finally {
        setLoading(false);
      }
    };

    fetchTechnician();
  }, [technicianId]);

  const handleEdit = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
  }) => {
    if (!technician) return;

    setFormLoading(true);
    setError(null);

    try {
      await updateTechnician(technician.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
      });

      router.push("/technicians");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update technician");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading Technician</h2>
              <p className="text-gray-600">Please wait while we fetch the technician details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Technician</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link
                href="/technicians"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Technicians
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Technician Not Found</h2>
              <p className="text-gray-600 mb-6">The technician you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Link
                href="/technicians"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Technicians
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/technicians"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Technicians
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Technician</h1>
              <p className="text-gray-600">Update technician information and settings</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error updating technician</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Technician Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <TechnicianForm
            onSubmit={handleEdit}
            loading={formLoading}
            editing={true}
            initialData={{
              name: technician.name,
              email: technician.email,
              phone: technician.phone,
              branchId: technician.branchId,
              role: "technician", // Always set as technician
            }}
            onCancel={() => router.push("/technicians")}
            branches={branches}
            userRole={userRole}
            currentUserBranchId={branchId}
          />
        </div>
      </div>
    </div>
  );
} 