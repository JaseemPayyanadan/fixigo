"use client";
import React, { useState, useEffect, useCallback } from "react";

import { 
  UserIcon, 
  PhoneIcon, 
  DevicePhoneMobileIcon, 
  BuildingOfficeIcon, 
  MapPinIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

import TextInput from "@/components/ui/TextInput";

import type { ServiceFormProps, ServiceFormData, ServiceValidationErrors } from "../types";
import { validateServiceForm, getFormFieldConfig } from "../utils";

interface BaseServiceFormProps extends ServiceFormProps {
  children?: React.ReactNode;
  customFields?: React.ReactNode;
}

const BaseServiceForm: React.FC<BaseServiceFormProps> = ({
  onSubmit,
  loading,
  editing,
  error,
  branches,
  branchId,
  setBranchId,
  user,
  shopId,
  initialData,
  onCancelEdit,
  children,
  customFields
}) => {
  const [customer, setCustomer] = useState({ name: "", phone: "", place: "" });
  const [device, setDevice] = useState({ brand: "", model: "", imei: "", color: "", type: "" });
  const [service, setService] = useState({ 
    name: "", 
    description: "", 
    price: "", 
    branchId: "",
    technician_id: "",
    priority: "medium",
    estimatedDuration: 60
  });
  
  const [formErrors, setFormErrors] = useState<ServiceValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fieldConfig = getFormFieldConfig(user!);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.customer) {
        setCustomer({
          name: initialData.customer.name || "",
          phone: initialData.customer.phone || "",
          place: initialData.customer.place || ""
        });
      }
      if (initialData.device) {
        setDevice({
          brand: initialData.device.brand || "",
          model: initialData.device.model || "",
          imei: initialData.device.imei || "",
          color: initialData.device.color || "",
          type: initialData.device.type || ""
        });
      }
      if (initialData.service) {
        setService(prev => ({
          ...prev,
          ...initialData.service
        }));
      }
    }
  }, [initialData]);

  // Auto-assign technician for technicians
  useEffect(() => {
    if (fieldConfig.autoAssignTechnician && user?.id && !editing) {
      setService(prev => ({
        ...prev,
        technician_id: user.id
      }));
    }
  }, [fieldConfig.autoAssignTechnician, user?.id, editing]);

  // Handle input changes
  const handleCustomerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[`customer${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]) {
      setFormErrors(prev => ({ ...prev, [`customer${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]: undefined }));
    }
  }, [formErrors]);

  const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDevice(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[`device${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]) {
      setFormErrors(prev => ({ ...prev, [`device${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]: undefined }));
    }
  }, [formErrors]);

  const handleServiceChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setService(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[`service${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]) {
      setFormErrors(prev => ({ ...prev, [`service${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ServiceValidationErrors]: undefined }));
    }
  }, [formErrors]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = { customer, device, service };
    const errors = validateServiceForm(formData);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [customer, device, service, onSubmit]);

  // Handle IMEI formatting
  const handleImeiChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDevice(prev => ({ ...prev, imei: value }));
    if (formErrors.deviceImei) {
      setFormErrors(prev => ({ ...prev, deviceImei: undefined }));
    }
  }, [formErrors]);

  const isFormDisabled = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {editing ? "Edit Service" : "Create New Service"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {editing ? "Update service information" : "Add a new service request"}
              </p>
            </div>
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Customer Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                <p className="text-sm text-gray-600">
                  Enter customer details and contact information
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TextInput
                type="text"
                name="name"
                label="Customer Name"
                value={customer.name}
                onChange={handleCustomerChange}
                placeholder="Enter customer name"
                required
                error={formErrors.customerName}
                disabled={isFormDisabled}
                icon={<UserIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="tel"
                name="phone"
                label="Phone Number"
                value={customer.phone}
                onChange={handleCustomerChange}
                placeholder="Enter phone number"
                required
                error={formErrors.customerPhone}
                disabled={isFormDisabled}
                icon={<PhoneIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="text"
                name="place"
                label="Location"
                value={customer.place}
                onChange={handleCustomerChange}
                placeholder="Enter location"
                disabled={isFormDisabled}
                icon={<MapPinIcon className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Device Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Device Information</h3>
                <p className="text-sm text-gray-600">
                  Enter device details and specifications
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextInput
                type="text"
                name="brand"
                label="Device Brand"
                value={device.brand}
                onChange={handleDeviceChange}
                placeholder="Enter device brand"
                required
                error={formErrors.deviceBrand}
                disabled={isFormDisabled}
                icon={<DevicePhoneMobileIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="text"
                name="model"
                label="Device Model"
                value={device.model}
                onChange={handleDeviceChange}
                placeholder="Enter device model"
                required
                error={formErrors.deviceModel}
                disabled={isFormDisabled}
                icon={<DevicePhoneMobileIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="text"
                name="imei"
                label="IMEI Number"
                value={device.imei}
                onChange={handleImeiChange}
                placeholder="Enter IMEI number"
                required
                error={formErrors.deviceImei}
                disabled={isFormDisabled}
                icon={<DevicePhoneMobileIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="text"
                name="color"
                label="Device Color"
                value={device.color}
                onChange={handleDeviceChange}
                placeholder="Enter device color"
                required
                disabled={isFormDisabled}
                icon={<DevicePhoneMobileIcon className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Service Information Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Service Information</h3>
                <p className="text-sm text-gray-600">
                  Enter service details and pricing
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextInput
                type="text"
                name="name"
                label="Service Name"
                value={service.name}
                onChange={handleServiceChange}
                placeholder="Enter service name"
                required
                error={formErrors.serviceName}
                disabled={isFormDisabled}
                icon={<CurrencyDollarIcon className="h-4 w-4 text-gray-400" />}
              />
              
              <TextInput
                type="number"
                name="price"
                label="Service Price"
                value={service.price}
                onChange={handleServiceChange}
                placeholder="Enter price"
                required
                error={formErrors.servicePrice}
                disabled={isFormDisabled}
                icon={<CurrencyDollarIcon className="h-4 w-4 text-gray-400" />}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={service.description}
                  onChange={handleServiceChange}
                  placeholder="Describe the service requirements"
                  required
                  disabled={isFormDisabled}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.serviceDescription ? 'border-red-300' : 'border-gray-300'
                  } ${isFormDisabled ? 'bg-gray-50' : 'bg-white'}`}
                  rows={4}
                />
                {formErrors.serviceDescription && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.serviceDescription}</p>
                )}
              </div>
            </div>

            {/* Custom Fields (for role-specific components) */}
            {customFields}
          </div>

          {/* Role-specific children */}
          {children}

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isFormDisabled}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isFormDisabled}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {editing ? "Updating..." : "Creating..."}
                </div>
              ) : (
                editing ? "Update Service" : "Create Service"
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default BaseServiceForm;
