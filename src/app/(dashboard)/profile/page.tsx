"use client";

import React, { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { HiCheckCircle, HiClipboardList, HiClock, HiCurrencyDollar, HiMail, HiOfficeBuilding, HiPhone, HiUser } from "react-icons/hi";

import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";

interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  branchId: string;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

interface WorkStats {
  totalServices: number;
  completedServices: number;
  inProgressServices: number;
  pendingServices: number;
  totalEarnings: number;
  averageRating?: number;
}

export default function ProfilePage() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [workStats, setWorkStats] = useState<WorkStats>({
    totalServices: 0,
    completedServices: 0,
    inProgressServices: 0,
    pendingServices: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "technician") {
      router.push("/dashboard");
      return;
    }

    const fetchProfileAndStats = async () => {
      setLoading(true);
      try {
        // Get technician profile from technicians collection
        const technicianDoc = await getDoc(doc(db, "technicians", user.id));
        if (technicianDoc.exists()) {
          const data = technicianDoc.data();
          const profileData: TechnicianProfile = {
            id: technicianDoc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            shopId: data.shopId,
            branchId: data.branchId,
            created_by: data.created_by,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          };
          setProfile(profileData);
          setFormData({
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
          });

          // Get the technician document ID for services lookup
          const technicianQuery = query(collection(db, "technicians"), where("created_by", "==", user.id));
          const technicianSnapshot = await getDocs(technicianQuery);
          const technicianDocForServices = technicianSnapshot.docs[0];

          if (technicianDocForServices) {
            const technicianId = technicianDocForServices.id;

            // Fetch work statistics
            const servicesQuery = query(collection(db, "services"), where("technician_id", "==", technicianId));
            const servicesSnapshot = await getDocs(servicesQuery);
            const services = servicesSnapshot.docs.map((doc) => doc.data());

            const stats: WorkStats = {
              totalServices: services.length,
              completedServices: services.filter((s) => (s as Record<string, unknown>).status === "Completed").length,
              inProgressServices: services.filter((s) => (s as Record<string, unknown>).status === "In Progress").length,
              pendingServices: services.filter((s) => (s as Record<string, unknown>).status === "To Do").length,
              totalEarnings: services.filter((s) => (s as Record<string, unknown>).status === "Completed").reduce((sum: number, s) => sum + (Number((s as Record<string, unknown>).price) || 0), 0),
            };

            setWorkStats(stats);
          } else {
            setWorkStats({
              totalServices: 0,
              completedServices: 0,
              inProgressServices: 0,
              pendingServices: 0,
              totalEarnings: 0,
            });
          }
        }
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStats();
  }, [user, router]);

  const handleEdit = () => {
    setEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setError("All fields are required");
        return;
      }

      // Update technician profile
      await updateDoc(doc(db, "technicians", profile.id), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        updatedAt: new Date(),
      });

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim(),
              updatedAt: new Date(),
            }
          : null
      );

      setEditing(false);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
            <p className="text-gray-600">Unable to load your technician profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiUser className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-q">My Profile</h1>
              <p className="text-gray-600 text-sm">Manage your technician profile and view work statistics</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                  {!editing && (
                    <button onClick={handleEdit} className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors border border-blue-200 rounded-lg hover:bg-blue-50">
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <HiUser className="w-4 h-4" />
                        Full Name
                      </div>
                    </label>
                    {editing ? (
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your full name" />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <HiMail className="w-4 h-4" />
                        Email Address
                      </div>
                    </label>
                    {editing ? (
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email address" />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <HiPhone className="w-4 h-4" />
                        Phone Number
                      </div>
                    </label>
                    {editing ? (
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your phone number" />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.phone}</p>
                    )}
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <HiOfficeBuilding className="w-4 h-4" />
                        Assigned Branch
                      </div>
                    </label>
                    <p className="text-gray-600">Branch ID: {profile.branchId}</p>
                  </div>

                  {/* Created Info */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Created:</span> {profile.createdAt.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {profile.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {editing && (
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                      <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button onClick={handleCancel} className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Work Statistics */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Work Statistics</h2>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Total Tasks */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <HiClipboardList className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                                                  <p className="text-sm font-medium text-gray-600">Total Services</p>
                        <p className="text-2xl font-bold text-gray-900">{workStats.totalServices}</p>
                      </div>
                    </div>
                  </div>

                  {/* Completed Tasks */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <HiCheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-gray-900">{workStats.completedServices}</p>
                      </div>
                    </div>
                  </div>

                  {/* In Progress Tasks */}
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <HiClock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-gray-900">{workStats.inProgressServices}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Tasks */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <HiClipboardList className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{workStats.pendingServices}</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Earnings */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <HiCurrencyDollar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">${workStats.totalEarnings}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={() => router.push("/my-tasks")} className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      View My Tasks
                    </button>
                    <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
