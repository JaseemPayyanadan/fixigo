"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { HiMail, HiPhone, HiStar, HiLogout } from "react-icons/hi";
import { HiMapPin } from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  branchId: string;
  location?: string;
  experience?: number;
  rating?: number;
  created_by?: { role: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

interface PerformanceStats {
  completedJobs: number;
  customerRating: number;
}

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    completedJobs: 0,
    customerRating: 0,
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }
    
    if (!user) {
      router.push("/dashboard");
      return;
    }

    const fetchProfileAndStats = async () => {
      setProfileLoading(true);
      try {
        // Create a basic profile from user data
        const profileData: TechnicianProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: "", // Will be filled from technician data if available
          shopId: user.shopId || "",
          branchId: user.branchId || "",
          location: "", // Keep empty if not filled
          experience: 0,
          rating: 0,
          created_by: { role: user.role, name: user.name },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        // If user is a technician, try to get additional data from technicians collection
        if (user.role === "technician") {
          try {
            const technicianDoc = await getDoc(doc(db, "technicians", user.id));
            if (technicianDoc.exists()) {
              const data = technicianDoc.data();
              profileData.phone = data.phone || "";
              profileData.location = data.location || "";
              profileData.experience = data.experience || 0;
              profileData.rating = data.rating || 0;

              // Fetch work statistics for technicians
              const servicesQuery = query(collection(db, "services"), where("technician_id", "==", user.id));
              const servicesSnapshot = await getDocs(servicesQuery);
              const services = servicesSnapshot.docs.map((doc) => doc.data());

              const completedJobs = services.filter((s) => (s as Record<string, unknown>).status === "completed").length;
              const ratings = services
                .filter((s) => {
                  const feedback = (s as Record<string, unknown>).customerFeedback;
                  return feedback && 
                    typeof feedback === 'object' &&
                    feedback !== null &&
                    'rating' in feedback &&
                    typeof (feedback as Record<string, unknown>).rating === 'number';
                })
                .map((s) => ((s as Record<string, unknown>).customerFeedback as Record<string, unknown>).rating as number);
              
              const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
                : 0;

              setPerformanceStats({
                completedJobs,
                customerRating: Math.round(avgRating * 10) / 10,
              });
            }
          } catch (techError) {
            console.log("Could not fetch technician-specific data:", techError);
          }
        }

        // Set default performance stats for non-technicians
        if (user.role !== "technician") {
          setPerformanceStats({
            completedJobs: 0,
            customerRating: 0,
          });
        }

        setProfile(profileData);
        setFormData({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          location: profileData.location || "",
          experience: profileData.experience?.toString() || "",
        });

      } catch (error) {
        console.error("Failed to load profile:", error);
        setError("Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfileAndStats();
  }, [user, router, loading]);

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
      location: profile?.location || "",
      experience: profile?.experience?.toString() || "",
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
        location: formData.location.trim(),
        experience: parseInt(formData.experience) || 0,
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
              location: formData.location.trim(),
              experience: parseInt(formData.experience) || 0,
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

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load your technician profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Profile Header */}
      <div className="bg-white pt-8 pb-6 px-4">
        <div className="flex flex-col items-center">
          {/* Profile Picture */}
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 flex items-center justify-center border-2 border-gray-300">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Name and Role */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
          <p className="text-gray-600 text-base">
            Technician • Mobile Repair
          </p>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Info</h2>
          
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center gap-3">
              <HiMail className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">{profile.email}</span>
            </div>
            
            {/* Phone */}
            <div className="flex items-center gap-3">
              <HiPhone className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">{profile.phone}</span>
            </div>
            
            {/* Location */}
            {profile.location && (
              <div className="flex items-center gap-3">
                <HiMapPin className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{profile.location}</span>
              </div>
            )}
            
            {/* Experience */}
            {profile.experience && profile.experience > 0 && (
              <div className="flex items-center gap-3">
                <HiStar className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{profile.experience} Years</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Card - Only show for technicians with data */}
      {(user?.role === "technician" && (performanceStats.completedJobs > 0 || performanceStats.customerRating > 0)) && (
        <div className="px-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Completed Jobs */}
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 mb-1">{performanceStats.completedJobs}</p>
                <p className="text-sm text-gray-600">Completed Jobs</p>
              </div>
              
              {/* Customer Rating */}
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 mb-1">{performanceStats.customerRating}/5</p>
                <p className="text-sm text-gray-600">Customer Rating</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 space-y-3">
        {/* Edit Profile Button */}
        <button
          onClick={handleEdit}
          className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors"
        >
          Edit Profile
        </button>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white text-red-600 font-semibold py-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <HiLogout className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
