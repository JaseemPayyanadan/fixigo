import React, { useState, useEffect } from "react";
import { HiOfficeBuilding, HiPhone, HiMail, HiCheckCircle, HiExclamationCircle, HiInformationCircle } from "react-icons/hi";
import TextInput from "../../components/ui/TextInput"

interface BranchFormProps {
  onSubmit: (branch: {
    name: string;
    address: string;
    phone: string;
    email: string;
  }) => Promise<void>;
  loading: boolean;
  initialData?: Partial<{
    name: string;
    address: string;
    phone: string;
    email: string;
  }>;
  editing?: boolean;
  onCancel?: () => void;
}

export const BranchForm: React.FC<BranchFormProps> = ({ onSubmit, loading, initialData, editing, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    address: initialData?.address || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || "",
        address: initialData.address || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
      }));
    }
  }, [initialData]);

  // Track changes for edit mode
  useEffect(() => {
    if (editing && initialData) {
      const hasFormChanges = 
        formData.name !== (initialData.name || "") ||
        formData.address !== (initialData.address || "") ||
        formData.phone !== (initialData.phone || "") ||
        formData.email !== (initialData.email || "");
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, initialData, editing]);

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
    
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
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
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      });
      
      if (!editing) {
        setFormData({
          name: "",
          address: "",
          phone: "",
          email: "",
        });
      }
      setSuccess(editing ? "Branch updated successfully!" : "Branch created successfully!");
    } catch (error: unknown) {
      console.error('BranchForm - Error in onSubmit:', error);
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Branch Information Section */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <HiOfficeBuilding className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Branch Information</h3>
              <p className="text-gray-600 text-sm">
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
              icon={<HiOfficeBuilding className="h-5 w-5 text-gray-400" />}
              error={errors.name}
              autoComplete="off"
              aria-label="Branch Name"
            />
            <TextInput
              type="text"
              name="address"
              id="address"
              label="Branch Address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter branch address"
              required
              icon={<HiOfficeBuilding className="h-5 w-5 text-gray-400" />}
              error={errors.address}
              autoComplete="off"
              aria-label="Branch Address"
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <HiPhone className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Contact Information</h3>
              <p className="text-gray-600 text-sm">How customers can reach this branch</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput
              type="tel"
              name="phone"
              id="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              required
              icon={<HiPhone className="h-5 w-5 text-gray-400" />}
              error={errors.phone}
              autoComplete="off"
              aria-label="Phone Number"
            />
            <TextInput
              type="email"
              name="email"
              id="email"
              label="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              required
              icon={<HiMail className="h-5 w-5 text-gray-400" />}
              error={errors.email}
              autoComplete="off"
              aria-label="Email Address"
            />
          </div>
        </div>
      </div>

      {/* Branch Manager Information Section (only for new branches) */}
      {!editing && (
        <div className="border-b border-gray-200">
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <HiOfficeBuilding className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Branch Manager</h3>
                <p className="text-gray-600 text-sm">A branch manager account will be created automatically</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HiInformationCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Automatic Account Creation</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• A branch manager account will be created using the email address above</li>
                    <li>• A secure temporary password will be generated automatically</li>
                    <li>• The manager will receive login credentials after creation</li>
                    <li>• They should change their password on first login</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              onClick={onCancel || (() => window.history.back())}
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
                <HiOfficeBuilding className="w-5 h-5" />
                {editing ? "Save Changes" : "Create Branch"}
              </div>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}; 