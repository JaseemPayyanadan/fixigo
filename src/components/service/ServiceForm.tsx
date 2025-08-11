"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { 
  UserIcon, 
  DevicePhoneMobileIcon, 
  BuildingOfficeIcon, 
  CurrencyDollarIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

import { Button, TextInput, LoadingSpinner } from "@/components/ui";
import type { Branch, Technician, User } from "@/types";

// Service Form Types
export interface ServiceFormData {
  customer: {
    name: string;
    phone: string;
    place?: string;
  };
  device: {
    brand: string;
    model: string;
    imei: string;
    color: string;
    type?: string;
  };
  service: {
    name: string;
    description: string;
    price: string;
    branchId: string;
    technician_id?: string;
    priority?: string;
  };
}

export interface ServiceFormProps {
  onSubmit: (data: ServiceFormData) => void;
  loading: boolean;
  editing?: boolean;
  error?: string | null;
  branches: Branch[];
  technicians: Technician[];
  branchId: string;
  setBranchId: (id: string) => void;
  user: User | null;
  shopId?: string;
  initialData?: {
    customer?: { name: string; phone: string; place?: string };
    device?: { brand: string; model: string; imei: string; color: string; type?: string };
    service?: { name: string; description: string; price: string; technician_id?: string; branchId?: string; priority?: string };
  };
  onCancelEdit?: () => void;
}

// Priority options
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-green-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "urgent", label: "Urgent", color: "text-red-600" }
];

// Validation errors interface
interface ValidationErrors {
  customerName?: string;
  customerPhone?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceImei?: string;
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: string;
  branchId?: string;
}

// Form field configuration based on user role
const getFormFieldConfig = (user: User) => {
  const config = {
    showBranchSelector: user.role === "shop_admin",
    showTechnicianSelector: user.role === "shop_admin" || user.role === "branch_admin",
    autoAssignTechnician: user.role === "technician",
    showPrioritySelector: user.role === "shop_admin" || user.role === "branch_admin",
    canEditAllFields: user.role === "shop_admin" || user.role === "branch_admin",
    readOnlyFields: user.role === "technician" ? ["branchId", "technician_id"] : []
  };

  return config;
};

// Validation function
const validateForm = (data: ServiceFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.customer?.name?.trim()) {
    errors.customerName = "Customer name is required";
  }
  if (!data.customer?.phone?.trim()) {
    errors.customerPhone = "Customer phone is required";
  } else if (!/^[0-9+\-\s()]{10,}$/.test(data.customer.phone)) {
    errors.customerPhone = "Please enter a valid phone number";
  }

  if (!data.device?.brand?.trim()) {
    errors.deviceBrand = "Device brand is required";
  }
  if (!data.device?.model?.trim()) {
    errors.deviceModel = "Device model is required";
  }
  if (!data.device?.imei?.trim()) {
    errors.deviceImei = "Device IMEI is required";
  }

  if (!data.service?.name?.trim()) {
    errors.serviceName = "Service name is required";
  }
  if (!data.service?.description?.trim()) {
    errors.serviceDescription = "Service description is required";
  }
  if (!data.service?.price?.trim()) {
    errors.servicePrice = "Service price is required";
  } else if (isNaN(Number(data.service.price)) || Number(data.service.price) <= 0) {
    errors.servicePrice = "Please enter a valid price";
  }
  if (!data.service?.branchId?.trim()) {
    errors.branchId = "Branch selection is required";
  }

  return errors;
};

const ServiceForm: React.FC<ServiceFormProps> = ({
  onSubmit,
  loading,
  editing = false,
  error,
  branches,
  technicians,
  branchId,
  setBranchId,
  user,
  shopId,
  initialData,
  onCancelEdit
}) => {
  const router = useRouter();
  
  const [formData, setFormData] = useState<ServiceFormData>({
    customer: { name: "", phone: "", place: "" },
    device: { brand: "", model: "", imei: "", color: "", type: "" },
    service: { 
      name: "", 
      description: "", 
      price: "", 
      branchId: "",
      technician_id: "",
      priority: "medium"
    }
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fieldConfig = getFormFieldConfig(user!);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        customer: { ...prev.customer, ...initialData.customer },
        device: { ...prev.device, ...initialData.device },
        service: { ...prev.service, ...initialData.service }
      }));
    }
  }, [initialData]);

  // Auto-assign technician for technicians
  useEffect(() => {
    if (fieldConfig.autoAssignTechnician && user?.id && !editing) {
      setFormData(prev => ({
        ...prev,
        service: { ...prev.service, technician_id: user.id }
      }));
    }
  }, [fieldConfig.autoAssignTechnician, user?.id, editing]);

  // Set branchId when it's available
  useEffect(() => {
    if (branchId && !editing) {
      setFormData(prev => ({
        ...prev,
        service: { ...prev.service, branchId }
      }));
    }
  }, [branchId, editing]);

  const handleInputChange = useCallback((section: keyof ServiceFormData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[`${section}${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [`${section}${field.charAt(0).toUpperCase() + field.slice(1)}`]: undefined
      }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit]);

  const handleCancel = useCallback(() => {
    if (editing && onCancelEdit) {
      onCancelEdit();
    } else {
      router.back();
    }
  }, [editing, onCancelEdit, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editing ? "Edit Service" : "Create New Service"}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {editing ? "Update service details" : "Add a new service request"}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircleIcon className="w-5 h-5 text-red-500" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Customer Name"
                  value={formData.customer.name}
                  onChange={(e) => handleInputChange("customer", "name", e.target.value)}
                  error={errors.customerName}
                  required
                  placeholder="Enter customer name"
                />
                
                <TextInput
                  label="Phone Number"
                  value={formData.customer.phone}
                  onChange={(e) => handleInputChange("customer", "phone", e.target.value)}
                  error={errors.customerPhone}
                  required
                  placeholder="Enter phone number"
                />
                
                <TextInput
                  label="Location (Optional)"
                  value={formData.customer.place || ""}
                  onChange={(e) => handleInputChange("customer", "place", e.target.value)}
                  placeholder="Enter location"
                />
              </div>
            </div>

            {/* Device Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DevicePhoneMobileIcon className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Device Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Device Brand"
                  value={formData.device.brand}
                  onChange={(e) => handleInputChange("device", "brand", e.target.value)}    
                  error={errors.deviceBrand}
                  required
                  placeholder="e.g., Apple, Samsung"
                />
                
                <TextInput
                  label="Device Model"
                  value={formData.device.model}
                  onChange={(e) => handleInputChange("device", "model", e.target.value)}
                  error={errors.deviceModel}
                  required
                  placeholder="e.g., iPhone 14, Galaxy S23"
                />
                
                <TextInput
                  label="IMEI Number"
                  value={formData.device.imei}
                  onChange={(e) => handleInputChange("device", "imei", e.target.value)}
                  error={errors.deviceImei}
                  required
                  placeholder="Enter IMEI number"
                />
                
                <TextInput
                  label="Color"
                  value={formData.device.color}
                  onChange={(e) => handleInputChange("device", "color", e.target.value)}
                  placeholder="e.g., Black, White"
                />
              </div>
            </div>

            {/* Service Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Service Name"
                  value={formData.service.name}
                  onChange={(e) => handleInputChange("service", "name", e.target.value)}
                  error={errors.serviceName}
                  required
                  placeholder="e.g., Screen Replacement"
                />
                
                <div className="md:col-span-2">
                  <TextInput
                    label="Description"
                    value={formData.service.description}
                    onChange={(e) => handleInputChange("service", "description", e.target.value)}
                    error={errors.serviceDescription}
                    required
                    placeholder="Describe the service required"
                  />
                </div>
                
                <TextInput
                  label="Price (₹)"
                  value={formData.service.price}
                  onChange={(e) => handleInputChange("service", "price", e.target.value)}
                  error={errors.servicePrice}
                  required
                  placeholder="Enter price"
                  type="number"
                  min="0"
                />
                
                {fieldConfig.showPrioritySelector && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.service.priority}
                      onChange={(e) => handleInputChange("service", "priority", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Branch and Technician Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Assignment</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldConfig.showBranchSelector ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <select
                      value={formData.service.branchId}
                      onChange={(e) => {
                        const selectedBranchId = e.target.value;
                        setBranchId(selectedBranchId);
                        handleInputChange("service", "branchId", selectedBranchId);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    {errors.branchId && (
                      <p className="text-red-600 text-sm mt-1">{errors.branchId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {branches.find(b => b.id === branchId)?.name || "Branch not found"}
                    </div>
                  </div>
                )}

                {fieldConfig.showTechnicianSelector && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Technician
                    </label>
                    <select
                      value={formData.service.technician_id || ""}
                      onChange={(e) => handleInputChange("service", "technician_id", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a technician</option>
                      {technicians
                        .filter(tech => !formData.service.branchId || tech.branchId === formData.service.branchId)
                        .map((technician) => (
                          <option key={technician.id} value={technician.id}>
                            {technician.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="min-w-[120px]"
              >
                {isSubmitting || loading ? "Processing..." : (editing ? "Update Service" : "Create Service")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;
