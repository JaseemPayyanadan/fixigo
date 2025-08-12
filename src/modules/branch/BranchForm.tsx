import React, { useState, useEffect } from "react";

import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, CheckCircleIcon, UserIcon, LockClosedIcon } from "@heroicons/react/24/outline";

import PasswordInput from "../../components/ui/PasswordInput";
import TextInput from "../../components/ui/TextInput";

interface BranchFormProps {
  onSubmit: (branch: {
    name: string;
    location: string;
    phone: string;
    email: string;
    password: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  }) => Promise<void>;
  loading: boolean;
  initialData?: Partial<{
    name: string;
    location: string;
    phone: string;
    email: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  }>;
  editing?: boolean;
  onCancel?: () => void;
}

export const BranchForm: React.FC<BranchFormProps> = ({ onSubmit, loading, initialData, editing, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    password: "",
    managerName: initialData?.managerName || "",
    managerEmail: initialData?.managerEmail || "",
    managerPhone: initialData?.managerPhone || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || "",
        location: initialData.location || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        managerName: initialData.managerName || "",
        managerEmail: initialData.managerEmail || "",
        managerPhone: initialData.managerPhone || "",
      }));
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = "Branch name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Branch name must be at least 2 characters";
    }
    
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    } else if (formData.location.trim().length < 2) {
      newErrors.location = "Location must be at least 2 characters";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation (only for new branches)
    if (!editing) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit({
        name: formData.name.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
        managerName: formData.managerName.trim() || (editing ? undefined : ""),
        managerEmail: formData.managerEmail.trim() || (editing ? undefined : ""),
        managerPhone: formData.managerPhone.trim() || (editing ? undefined : ""),
      });
      
      if (!editing) {
        setFormData({
          name: "",
          location: "",
          phone: "",
          email: "",
          password: "",
          managerName: "",
          managerEmail: "",
          managerPhone: "",
        });
      }
      setSuccess(editing ? "Branch updated successfully!" : "Branch created successfully!");
    } catch (error: unknown) {
      console.error('BranchForm - Error in onSubmit:', error);
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Branch Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Branch Information</h3>
                <p className="text-sm text-gray-600">
                  {editing ? "Update the basic details for your branch" : "Enter the basic details for your branch"}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextInput
                type="text"
                name="name"
                id="name"
                label="Branch Name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter branch name"
                required
                icon={<BuildingOfficeIcon className="h-4 w-4 text-gray-400" />}
                error={errors.name}
                autoComplete="off"
                aria-label="Branch Name"
              />
              
              <TextInput
                type="text"
                name="location"
                id="location"
                label="Location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location (city, area, etc.)"
                required
                icon={<MapPinIcon className="h-4 w-4 text-gray-400" />}
                error={errors.location}
                autoComplete="off"
                aria-label="Location"
              />
              
              <TextInput
                type="tel"
                name="phone"
                id="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                required
                icon={<PhoneIcon className="h-4 w-4 text-gray-400" />}
                error={errors.phone}
                autoComplete="off"
                aria-label="Phone Number"
              />
            </div>
          </div>

          {/* Manager Information Section - Only for new branches */}
          {!editing && (
            <div className="space-y-6 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Branch Manager</h3>
                  <p className="text-sm text-gray-600">
                    Set up the branch manager account (optional)
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  type="text"
                  name="managerName"
                  id="managerName"
                  label="Manager Name"
                  value={formData.managerName}
                  onChange={handleInputChange}
                  placeholder="Enter manager name"
                  icon={<UserIcon className="h-4 w-4 text-gray-400" />}
                  error={errors.managerName}
                  autoComplete="off"
                  aria-label="Manager Name"
                />
                
                <TextInput
                  type="tel"
                  name="managerPhone"
                  id="managerPhone"
                  label="Manager Phone"
                  value={formData.managerPhone}
                  onChange={handleInputChange}
                  placeholder="Enter manager phone"
                  icon={<PhoneIcon className="h-4 w-4 text-gray-400" />}
                  error={errors.managerPhone}
                  autoComplete="off"
                  aria-label="Manager Phone"
                />
              </div>
            </div>
          )}

          {/* Account Setup Section - Only for new branches */}
          {!editing && (
            <div className="space-y-6 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <LockClosedIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Account Setup</h3>
                  <p className="text-sm text-gray-600">
                    Create login credentials for the branch manager
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  type="email"
                  name="email"
                  id="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                  icon={<EnvelopeIcon className="h-4 w-4 text-gray-400" />}
                  error={errors.email}
                  autoComplete="off"
                  aria-label="Email Address"
                />
                
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter password"
                  icon={<LockClosedIcon className="h-4 w-4 text-gray-400" />}
                  error={errors.password}
                />
              </div>
            </div>
          )}

          {/* Account Setup Section - For editing mode */}
          {editing && (
            <div className="space-y-6 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  <p className="text-sm text-gray-600">
                    Update the contact details for your branch
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  type="email"
                  name="email"
                  id="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                  icon={<EnvelopeIcon className="h-4 w-4 text-gray-400" />}
                  error={errors.email}
                  autoComplete="off"
                  aria-label="Email Address"
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
          <div className="flex items-center justify-between pt-8 border-t border-gray-100">
            <button
              type="button"
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              onClick={onCancel || (() => window.history.back())}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editing ? "Saving..." : "Creating..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  {editing ? "Save Changes" : "Create Branch"}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}; 