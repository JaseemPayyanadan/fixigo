"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/hooks";
import { useBranches } from "@/hooks/useBranches";

import { RoleGuard, PermissionGuard } from "@/components";
import TechnicianForm from "@/modules/technician/TechnicianForm";
import { LoadingSpinner } from "@/components/ui";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import Link from "next/link";
import { logger } from "@/lib/logger";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();
  const { branches } = useBranches(user?.shopId);

  const [technician, setTechnician] = useState<TechnicianData | null>(null);
  const [techUserId, setTechUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const fetchTechnician = async () => {
      if (!id) {
        setError("No technician ID provided");
        setLoading(false);
        return;
      }

      try {
        logger.info('Fetching technician data', { technicianId: id });
        
        // Fetch technician document
        const techDoc = await getDoc(doc(db, "technicians", id));
        if (!techDoc.exists()) {
          setError("Technician not found");
          setLoading(false);
          return;
        }

        const techData = techDoc.data() as TechnicianData;
        logger.debug('Technician data retrieved', { technicianId: id, technicianName: techData.name });
        setTechnician(techData);

        // Try to find the corresponding user document
        try {
          const userQuery = await getDoc(doc(db, "users", id));
          if (userQuery.exists()) {
            setTechUserId(id);
            logger.debug('Found user document for technician', { userId: id, technicianId: id });
          } else {
            logger.debug('No user document found for technician', { technicianId: id });
          }
        } catch (userErr) {
          logger.warn('Error fetching user document', { technicianId: id, error: String(userErr) });
        }

      } catch (err: unknown) {
        logger.error('Error fetching technician', { technicianId: id, error: err as Error });
        setError(err instanceof Error ? err.message : "Failed to load technician");
      } finally {
        setLoading(false);
      }
    };

    fetchTechnician();
  }, [id]);

  const handleEdit = async (data: { 
    name: string; 
    email: string; 
    phone: string; 
    branch_id: string;
    password?: string;
  }) => {
    if (!id) {
      setError("No technician ID available");
      return;
    }
    
    setFormLoading(true);
    setError(null);
    
    try {
              logger.info('Updating technician', { 
          technicianId: id, 
          userId: user?.uid,
          shopId: user?.shopId,
          userRole: user?.role
        });
      
      // Update technician document
      const technicianUpdateData = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        branch_id: data.branch_id,
        updatedAt: new Date(),
      };
      
      logger.debug('Updating technician document', { technicianId: id });
      await updateDoc(doc(db, "technicians", id), technicianUpdateData);
      logger.info('Technician document updated successfully', { technicianId: id });
      
      // Update user document if found
      if (techUserId) {
        const userUpdateData = {
          name: data.name.trim(),
          email: data.email.trim(),
          branch_id: data.branch_id,
          updatedAt: new Date(),
        };
        logger.debug('Updating user document', { userId: techUserId });
        await updateDoc(doc(db, "users", techUserId), userUpdateData);
        logger.info('User document updated successfully', { userId: techUserId });
      } else {
        logger.debug('No user document found for technician', { technicianId: id });
      }
      
      logger.info('Technician updated successfully', { technicianId: id });
      router.push("/technicians");
    } catch (err: unknown) {
      logger.error('Error updating technician', { technicianId: id, error: err as Error });
      
      // Handle specific Firebase errors
      if (err instanceof Error) {
        if (err.message.includes('permission-denied')) {
          setError('You do not have permission to update this technician. Please check your role and shop assignment.');
        } else if (err.message.includes('not-found')) {
          setError('Technician not found. It may have been deleted.');
        } else if (err.message.includes('unavailable')) {
          setError('Service temporarily unavailable. Please try again.');
        } else if (err.message.includes('insufficient')) {
          setError('Insufficient permissions. Please contact your administrator.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
              <LoadingSpinner />
              <h2 className="text-xl font-semibold text-gray-900 mt-4">Loading Technician</h2>
              <p className="text-gray-600 mt-2">Please wait while we fetch the technician details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
            }}
            branch_id={technician.branch_id || user?.branchId || ""}
            onCancel={() => router.push("/technicians")}
            branches={branches}
            userRole={user?.role || ""}
          />
        </div>
      </div>
    </div>
  );
} 