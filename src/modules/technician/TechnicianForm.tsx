import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import TextInput from "../../components/ui/TextInput";
import { MdPerson, MdEmail, MdPhone, MdBusiness } from "react-icons/md";
import { HiLockClosed, HiExclamationCircle, HiCheckCircle } from "react-icons/hi";

interface Branch {
  id: string;
  name: string;
}

interface TechnicianFormProps {
  onSubmit: (data: { 
    name: string; 
    email: string; 
    phone: string; 
    branch_id: string;
    password?: string;
  }) => void;
  loading: boolean;
  editing: boolean;
  initialData?: { name: string; email: string; phone: string };
  branch_id: string;
  onCancel: () => void;
  branches: Branch[];
  userRole: string;
}

export default function TechnicianForm({ onSubmit, loading, editing, initialData, branch_id, onCancel, branches, userRole }: TechnicianFormProps) {
  const [form, setForm] = useState<{ name: string; email: string; phone: string; password: string; confirmPassword: string }>({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(branch_id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        password: "",
        confirmPassword: ""
      });
    }
    setSelectedBranch(branch_id);
  }, [initialData, branch_id]);

  // Track changes for edit mode
  useEffect(() => {
    if (editing && initialData) {
      const hasFormChanges = 
        form.name !== (initialData.name || "") ||
        form.email !== (initialData.email || "") ||
        form.phone !== (initialData.phone || "") ||
        selectedBranch !== branch_id;
      
      setHasChanges(hasFormChanges);
    }
  }, [form, initialData, editing, selectedBranch, branch_id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleBranchChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedBranch(e.target.value);
    if (errors.branch) setErrors({ ...errors, branch: "" });
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
    
    if (userRole === "shop_admin" && !selectedBranch) {
      newErrors.branch = "Branch selection is required";
    }
    
    // Password validation (only for new technicians)
    if (!editing) {
      if (!form.password.trim()) {
        newErrors.password = "Password is required";
      } else if (form.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
        newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      }
      
      if (!form.confirmPassword.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
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
        branch_id: selectedBranch,
        password: editing ? undefined : form.password
      });
      
      if (!editing) {
        setForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: ""
        });
      }
      setSuccess(editing ? "Technician updated successfully!" : "Technician created successfully!");
    } catch (error: unknown) {
      console.error('TechnicianForm - Error in onSubmit:', error);
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Personal Information Section */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
              <p className="text-gray-600 text-sm">
                {editing ? "Update the technician's basic details" : "Enter the technician's basic details"}
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
              icon={<MdPerson className="h-5 w-5 text-gray-400" />}
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
              icon={<MdEmail className="h-5 w-5 text-gray-400" />}
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
              icon={<MdPhone className="h-5 w-5 text-gray-400" />}
              error={errors.phone}
            />
          </div>
        </div>
      </div>

      {/* Login Details Section (only for new technicians) */}
      {!editing && (
        <div className="border-b border-gray-200">
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <HiLockClosed className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Login Details</h3>
                <p className="text-gray-600 text-sm">Create login credentials for the technician</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextInput
                id="password"
                name="password"
                type="password"
                label="Password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                icon={<HiLockClosed className="h-5 w-5 text-gray-400" />}
                error={errors.password}
                autoComplete="off"
              />
              <TextInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                icon={<HiLockClosed className="h-5 w-5 text-gray-400" />}
                error={errors.confirmPassword}
                autoComplete="off"
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <HiExclamationCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Password Requirements</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• At least 6 characters long</li>
                    <li>• Contains at least one uppercase letter</li>
                    <li>• Contains at least one lowercase letter</li>
                    <li>• Contains at least one number</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Section */}
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <MdBusiness className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Branch Assignment</h3>
            <p className="text-gray-600 text-sm">Assign technician to a specific branch</p>
          </div>
        </div>
        
        {userRole === "shop_admin" ? (
          <div className="mb-6">
            <label htmlFor="branch_id" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Branch
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdBusiness className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="branch_id"
                name="branch_id"
                value={selectedBranch}
                onChange={handleBranchChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="">Choose a branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            {errors.branch && (
              <p className="mt-1 text-sm text-red-600">{errors.branch}</p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {branches.find(b => b.id === branch_id)?.name || "Branch not found"}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="px-8 pb-6">
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
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="px-8 pb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <HiCheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            {editing && hasChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <HiExclamationCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || (editing && !hasChanges)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editing ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {editing ? "Update Technician" : "Create Technician"}
              </div>
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 