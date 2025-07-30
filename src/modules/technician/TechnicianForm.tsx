import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import TextInput from "../../components/ui/TextInput";
import { 
  MdPerson, 
  MdEmail, 
  MdPhone, 
  MdBusiness, 
  MdWork,
  MdSchedule,
  MdLocationOn,
  MdDescription
} from "react-icons/md";
import { 
  HiLockClosed, 
  HiExclamationCircle, 
  HiCheckCircle, 
  HiPlus,
  HiX,
  HiStar,
  HiCog,
  HiBadgeCheck
} from "react-icons/hi";

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
  initialData?: { 
    name: string; 
    email: string; 
    phone: string;
  };
  branch_id: string;
  onCancel: () => void;
  branches: Branch[];
  userRole: string;
}





export default function TechnicianForm({ onSubmit, loading, editing, initialData, branch_id, onCancel, branches, userRole }: TechnicianFormProps) {
  const [form, setForm] = useState<{ 
    name: string; 
    email: string; 
    phone: string; 
    password: string; 
  }>({ 
    name: "", 
    email: "", 
    phone: "", 
    password: ""
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
          password: ""
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          password: ""
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <MdPerson className="w-6 h-6 text-blue-600" />
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
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center">
                <HiLockClosed className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Login Details</h3>
                <p className="text-gray-600 text-sm">Create login credentials for the technician</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>


          </div>
        </div>
      )}

      {/* Assignment Section */}
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
            <MdLocationOn className="w-6 h-6 text-indigo-600" />
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
                <HiExclamationCircle className="h-5 w-5 text-red-400" />
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
      <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200">
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
            <div className="flex items-center gap-2">
              <HiBadgeCheck className="w-5 h-5" />
              {editing ? "Update Technician" : "Create Technician"}
            </div>
          </button>
        </div>
      </div>
    </form>
  );
} 