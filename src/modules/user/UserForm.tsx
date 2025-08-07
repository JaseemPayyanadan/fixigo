import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import TextInput from "../../components/ui/TextInput";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { User, Role } from "../../types";

interface Branch {
  id: string;
  name: string;
}

interface UserFormProps {
  onSubmit: (data: { 
    name: string; 
    email: string; 
    phone: string; 
    role: Role;
    branchId?: string;
    status: "active" | "inactive" | "suspended";
  }) => void;
  loading: boolean;
  editing: boolean;
  initialData?: Partial<User>;
  onCancel: () => void;
  branches: Branch[];
  currentUserRole: Role;
}

export default function UserForm({ 
  onSubmit, 
  loading, 
  editing, 
  initialData, 
  onCancel, 
  branches,
  currentUserRole 
}: UserFormProps) {
  const [form, setForm] = useState<{ 
    name: string; 
    email: string; 
    phone: string; 
    role: Role;
    branchId: string;
    status: "active" | "inactive" | "suspended";
  }>({ 
    name: "", 
    email: "", 
    phone: "", 
    role: "technician",
    branchId: "",
    status: "active"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        role: initialData.role || "technician",
        branchId: initialData.branchId || "",
        status: initialData.status || "active"
      });
    }
  }, [initialData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    
    // Role validation
    if (!form.role) {
      newErrors.role = "Role is required";
    }
    
    // Branch validation for branch_admin and technician
    if ((form.role === "branch_admin" || form.role === "technician") && !form.branchId) {
      newErrors.branchId = "Branch is required for this role";
    }
    
    // Status validation
    if (!form.status) {
      newErrors.status = "Status is required";
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
        role: form.role,
        branchId: form.branchId || undefined,
        status: form.status
      });
      
      if (!editing) {
        setForm({
          name: "",
          email: "",
          phone: "",
          role: "technician",
          branchId: "",
          status: "active"
        });
      }
      setSuccess(editing ? "User updated successfully!" : "User created successfully!");
    } catch (error: unknown) {
      console.error('UserForm - Error in onSubmit:', error);
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  const getAvailableRoles = (): Role[] => {
    // Shop admin can create branch_admin and technician roles (removed shop_admin)
    if (currentUserRole === "shop_admin") {
      return ["branch_admin", "technician"];
    }
    // Branch admin can only create technicians
    if (currentUserRole === "branch_admin") {
      return ["technician"];
    }
    return [];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">User Information</h3>
            <p className="text-gray-600 text-sm">
              {editing ? "Update the user's basic details" : "Enter the user's basic details"}
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
            placeholder="Enter user's full name"
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
          
          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
              Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="">Choose a role</option>
                {getAvailableRoles().map(role => (
                  <option key={role} value={role}>
                    {role === "shop_admin" ? "Shop Admin" : 
                     role === "branch_admin" ? "Branch Admin" : 
                     "Technician"}
                  </option>
                ))}
              </select>
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="branchId" className="block text-sm font-semibold text-gray-700 mb-2">
              Branch Assignment
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="branchId"
                name="branchId"
                value={form.branchId}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="">Choose a branch (optional for shop admin)</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            {errors.branchId && (
              <p className="mt-1 text-sm text-red-600">{errors.branchId}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status}</p>
            )}
          </div>
        </div>
      </div>

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
              {editing ? "Save Changes" : "Create User"}
            </div>
          )}
        </button>
      </div>
    </form>
  );
} 