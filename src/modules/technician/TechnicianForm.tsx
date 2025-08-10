import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";

import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  CheckCircleIcon,
  LockClosedIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";

import PasswordInput from "../../components/ui/PasswordInput";
import TextInput from "../../components/ui/TextInput";

interface Branch {
  id: string;
  name: string;
  location: string;
}

interface TechnicianFormProps {
  onSubmit: (data: { 
    name: string; 
    email: string; 
    phone: string; 
    password: string;
    branchId: string;
    role: "technician";
  }) => void;
  loading: boolean;
  editing: boolean;
  initialData?: { 
    name: string; 
    email: string; 
    phone: string;
    branchId?: string;
    role?: "technician";
  };
  onCancel: () => void;
  branches: Branch[];
  userRole: "shop_admin" | "branch_admin";
  currentUserBranchId?: string;
}

export default function TechnicianForm({ 
  onSubmit, 
  loading, 
  editing, 
  initialData, 
  onCancel, 
  branches,
  userRole,
  currentUserBranchId
}: TechnicianFormProps) {
  const [form, setForm] = useState<{ 
    name: string; 
    email: string; 
    phone: string; 
    password: string;
    branchId: string;
    role: "technician";
  }>({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "",
    branchId: "",
    role: "technician",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        password: "",
        branchId: initialData.branchId || "",
        role: initialData.role || "technician",
      });
    } else if (userRole === "branch_admin" && currentUserBranchId) {
      // For branch_admin, pre-select their branch
      setForm(prev => ({
        ...prev,
        branchId: currentUserBranchId,
        role: "technician", // Always set role as technician
      }));
    }
  }, [initialData, userRole, currentUserBranchId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Password validation (only for new technicians)
    if (!editing) {
      if (!form.password) {
        newErrors.password = "Password is required";
      } else if (form.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    // Branch validation (only for shop_admin)
    if (userRole === "shop_admin" && !form.branchId) {
      newErrors.branchId = "Branch selection is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      onSubmit({ 
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        branchId: form.branchId,
        role: form.role,
      });
      
      if (!editing) {
        setForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          branchId: "",
          role: "technician",
        });
      }
      setSuccess(editing ? "Technician updated successfully!" : "Technician created successfully!");
    } catch (error: unknown) {
      console.error('TechnicianForm - Error in onSubmit:', error);
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Technician Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Technician Information</h3>
            <p className="text-gray-600 text-sm">
              {editing ? "Update the technician's details" : "Enter the technician's details"}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextInput
            id="name"
            name="name"
            type="text"
            label="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Enter technician's full name"
            icon={<UserIcon className="h-5 w-5 text-gray-400" />}
            error={errors.name}
          />
          
          <TextInput
            id="email"
            name="email"
            type="email"
            label="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Enter email address"
            icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
            error={errors.email}
          />
          
          <TextInput
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="Enter phone number"
            icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
            error={errors.phone}
          />
        </div>
      </div>

      {/* Branch Selection Section - Only for shop_admin */}
      {userRole === "shop_admin" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Branch Assignment</h3>
              <p className="text-gray-600 text-sm">
                Select the branch for this technician
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="branchId" className="block text-sm font-medium text-gray-700">
              Branch *
            </label>
            <select
              id="branchId"
              name="branchId"
              value={form.branchId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} - {branch.location}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <p className="text-sm text-red-600">{errors.branchId}</p>
            )}
          </div>
        </div>
      )}

      {/* Account Setup Section - Only for new technicians */}
      {!editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <LockClosedIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Account Setup</h3>
              <p className="text-gray-600 text-sm">
                Create login credentials for the technician
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              icon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
              error={errors.password}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          aria-busy={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {editing ? "Saving..." : "Creating..."}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              {editing ? "Save Changes" : "Create Technician"}
            </div>
          )}
        </button>
      </div>
    </form>
  );
} 