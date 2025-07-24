"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser, useBranches } from "@/hooks";
import TechnicianForm from "@/modules/technician/TechnicianForm";
import { LoadingSpinner } from "@/components/ui";
import Link from "next/link";

interface TechnicianData {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch_id: string;
  shop_id: string;
  role: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function TechnicianEditPage() {
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
        console.log('Fetching technician with ID:', id);
        
        // Fetch technician document
        const techDoc = await getDoc(doc(db, "technicians", id));
        if (!techDoc.exists()) {
          setError("Technician not found");
          setLoading(false);
          return;
        }

        const techData = techDoc.data() as TechnicianData;
        console.log('Technician data:', techData);
        setTechnician(techData);

        // Try to find the corresponding user document
        try {
          const userQuery = await getDoc(doc(db, "users", id));
          if (userQuery.exists()) {
            setTechUserId(id);
            console.log('Found user document for technician');
          } else {
            console.log('No user document found for technician');
          }
        } catch (userErr) {
          console.log('Error fetching user document:', userErr);
        }

      } catch (err: unknown) {
        console.error('Error fetching technician:', err);
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
      console.log('Updating technician:', id, 'with data:', data);
      console.log('Current user:', user);
      console.log('Shop ID:', user?.shopId);
      console.log('User role:', user?.role);
      
      // Update technician document
      const technicianUpdateData = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        branch_id: data.branch_id,
        updatedAt: new Date(),
      };
      
      console.log('Technician update data:', technicianUpdateData);
      await updateDoc(doc(db, "technicians", id), technicianUpdateData);
      console.log('Technician document updated successfully');
      
      // Update user document if found
      if (techUserId) {
        const userUpdateData = {
          name: data.name.trim(),
          email: data.email.trim(),
          branch_id: data.branch_id,
          updatedAt: new Date(),
        };
        console.log('User update data:', userUpdateData);
        await updateDoc(doc(db, "users", techUserId), userUpdateData);
        console.log('User document updated successfully');
      } else {
        console.log('No user document found for technician');
      }
      
      console.log('Technician updated successfully');
      router.push("/technicians");
    } catch (err: unknown) {
      console.error('Error updating technician:', err);
      
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Technician</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/technicians"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back to Technicians
                </Link>
              </div>
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
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Technician Not Found</h2>
              <p className="text-gray-600 mb-6">The technician you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Link
                href="/technicians"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/technicians"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Technicians
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Technician</h1>
              <p className="text-gray-600">Update technician information and assignments</p>
            </div>
            
                         <TechnicianForm
               onSubmit={handleEdit}
               loading={formLoading}
               editing={true}
               initialData={{
                 name: technician.name,
                 email: technician.email,
                 phone: technician.phone,
               }}
               branch_id={technician.branch_id || user?.branch_id || ""}
               onCancel={() => router.push("/technicians")}
               branches={branches}
               userRole={user?.role || ""}
             />
          </div>
        </div>
      </div>
    </div>
  );
} 