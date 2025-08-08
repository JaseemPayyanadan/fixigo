import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Branch } from "../../types";
import TextInput from "../../components/ui/TextInput";
import { UserIcon, PhoneIcon, DevicePhoneMobileIcon, BuildingOfficeIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useTechnicians } from "../../hooks/useTechnicians";

interface ServiceFormData {
  customer: { 
    name: string; 
    phone: string; 
    place?: string;
    email?: string;
  };
  device: { 
    brand: string; 
    model: string; 
    serial: string; 
    color: string;
    type?: string;
  };
  service: { 
    name: string; 
    description: string; 
    price: string; 
    branch_id: string; 
    technician_id?: string;
    priority?: string;
    estimatedDuration?: number;
  };
}

interface ServiceFormProps {
  onSubmit: (data: ServiceFormData) => void;
  loading: boolean;
  editing?: boolean;
  error?: string | null;
  branches: Branch[];
  branchId: string;
  setBranchId: (id: string) => void;
  isShopAdmin: boolean;
  isBranchAdmin?: boolean;
  userBranchId?: string;
  shopId?: string;
  initialData?: {
    customer?: { name: string; phone: string; place?: string; email?: string };
    device?: { brand: string; model: string; serial: string; color: string; type?: string };
    service?: { name: string; description: string; price: string; technician_id?: string; priority?: string; estimatedDuration?: number };
  };
  onCancelEdit?: () => void;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  onSubmit,
  loading,
  editing,
  error,
  branches,
  branchId,
  setBranchId,
  isShopAdmin,
  isBranchAdmin,
  userBranchId,
  shopId,
  initialData,
  onCancelEdit,
}) => {
  const [customer, setCustomer] = useState({ name: "", phone: "", place: "", email: "" });
  const [device, setDevice] = useState({ brand: "", model: "", serial: "", color: "", type: "" });
  const [service, setService] = useState({ 
    name: "", 
    description: "", 
    price: "", 
    technician_id: "",
    priority: "medium",
    estimatedDuration: 60
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch technicians for the selected branch
  const { technicians, loading: techniciansLoading, error: techniciansError } = useTechnicians(shopId, branchId || userBranchId);

  // Memoized form validation
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    // Customer validation
    if (!customer.name.trim()) {
      errors.customerName = "Customer name is required";
    }
    if (!customer.phone.trim()) {
      errors.customerPhone = "Phone number is required";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(customer.phone.replace(/\s/g, ''))) {
      errors.customerPhone = "Please enter a valid phone number";
    }

    // Device validation
    if (!device.brand.trim()) {
      errors.deviceBrand = "Device brand is required";
    }
    if (!device.model.trim()) {
      errors.deviceModel = "Device model is required";
    }
    if (!device.serial.trim()) {
      errors.deviceSerial = "Device IMEI is required";
    } else if (!/^\d{15}$/.test(device.serial.replace(/\s/g, ''))) {
      errors.deviceSerial = "IMEI must be 15 digits";
    }
    if (!device.color.trim()) {
      errors.deviceColor = "Device color is required";
    }

    // Service validation
    if (!service.name.trim()) {
      errors.serviceName = "Service name is required";
    }
    if (!service.description.trim()) {
      errors.serviceDescription = "Service description is required";
    }
    if (!service.price.trim()) {
      errors.servicePrice = "Service price is required";
    } else if (isNaN(Number(service.price)) || Number(service.price) <= 0) {
      errors.servicePrice = "Please enter a valid price";
    }
    if (!branchId) {
      errors.branchId = "Please select a branch";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [customer, device, service, branchId]);

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.customer) {
        setCustomer({ 
          name: initialData.customer.name || "", 
          phone: initialData.customer.phone || "", 
          place: initialData.customer.place || "",
          email: initialData.customer.email || ""
        });
      }
      if (initialData.device) {
        setDevice({ 
          brand: initialData.device.brand || "", 
          model: initialData.device.model || "", 
          serial: initialData.device.serial || "", 
          color: initialData.device.color || "",
          type: initialData.device.type || ""
        });
      }
      if (initialData.service) {
        setService({ 
          ...service,
          ...initialData.service,
          technician_id: initialData.service.technician_id || ""
        });
      }
    }
  }, [initialData, service]);

  // Set branch ID for branch admins
  useEffect(() => {
    if (isBranchAdmin && userBranchId) {
      setBranchId(userBranchId);
    }
  }, [isBranchAdmin, userBranchId, setBranchId]);

  // Memoized change handlers
  const handleCustomerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[`customer${name.charAt(0).toUpperCase() + name.slice(1)}`]) {
      setFormErrors(prev => ({ ...prev, [`customer${name.charAt(0).toUpperCase() + name.slice(1)}`]: "" }));
    }
  }, [formErrors]);

  const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDevice(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[`device${name.charAt(0).toUpperCase() + name.slice(1)}`]) {
      setFormErrors(prev => ({ ...prev, [`device${name.charAt(0).toUpperCase() + name.slice(1)}`]: "" }));
    }
  }, [formErrors]);

  const handleServiceChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setService(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[`service${name.charAt(0).toUpperCase() + name.slice(1)}`]) {
      setFormErrors(prev => ({ ...prev, [`service${name.charAt(0).toUpperCase() + name.slice(1)}`]: "" }));
    }
  }, [formErrors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        customer,
        device,
        service: { ...service, branch_id: branchId },
      });
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [customer, device, service, branchId, validateForm, onSubmit]);

  // Memoized priority options
  const priorityOptions = useMemo(() => [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" },
    { value: "urgent", label: "Urgent" }
  ], []);

  const isFormDisabled = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-0" noValidate>
      {/* Customer Information */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center" aria-hidden="true">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Customer Information</h3>
              <p className="text-gray-600 text-sm">Enter your customer&apos;s contact details</p>
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
              icon={<UserIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.customerName ? "customer-name-error" : undefined}
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
              icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.customerPhone ? "customer-phone-error" : undefined}
            />
            <TextInput
              type="text"
              name="place"
              label="Place (Optional)"
              value={customer.place}
              onChange={handleCustomerChange}
              placeholder="Enter place/location"
              disabled={isFormDisabled}
              icon={<MapPinIcon className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </div>
      </div>
      
      {/* Device Details */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center" aria-hidden="true">
              <DevicePhoneMobileIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Device Details</h3>
              <p className="text-gray-600 text-sm">Information about the device to be serviced</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <TextInput
              type="text"
              name="brand"
              label="Brand"
              value={device.brand}
              onChange={handleDeviceChange}
              placeholder="Apple, Samsung, etc."
              required
              error={formErrors.deviceBrand}
              disabled={isFormDisabled}
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.deviceBrand ? "device-brand-error" : undefined}
            />
            <TextInput
              type="text"
              name="model"
              label="Model"
              value={device.model}
              onChange={handleDeviceChange}
              placeholder="iPhone 14, Galaxy S23"
              required
              error={formErrors.deviceModel}
              disabled={isFormDisabled}
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.deviceModel ? "device-model-error" : undefined}
            />
            <TextInput
              type="text"
              name="serial"
              label="IMEI"
              value={device.serial}
              onChange={handleDeviceChange}
              placeholder="Device IMEI number"
              required
              error={formErrors.deviceSerial}
              disabled={isFormDisabled}
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.deviceSerial ? "device-serial-error" : undefined}
            />
            <TextInput
              type="text"
              name="color"
              label="Color"
              value={device.color}
              onChange={handleDeviceChange}
              placeholder="Black, Silver, etc."
              required
              error={formErrors.deviceColor}
              disabled={isFormDisabled}
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
              aria-describedby={formErrors.deviceColor ? "device-color-error" : undefined}
            />
          </div>
        </div>
      </div>
      
      {/* Service Details */}
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center" aria-hidden="true">
            <BuildingOfficeIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Service Details</h3>
            <p className="text-gray-600 text-sm">Service information and assignment</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TextInput
            type="text"
            name="name"
            label="Service Name"
            value={service.name}
            onChange={handleServiceChange}
            placeholder="Screen repair, Battery replacement"
            required
            error={formErrors.serviceName}
            disabled={isFormDisabled}
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            aria-describedby={formErrors.serviceName ? "service-name-error" : undefined}
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
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            aria-describedby={formErrors.servicePrice ? "service-price-error" : undefined}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Service Description
          </label>
          <textarea
            id="description"
            name="description"
            value={service.description}
            onChange={handleServiceChange}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none ${
              formErrors.serviceDescription ? 'border-red-300' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            placeholder="Describe the service requirements..."
            rows={3}
            required
            disabled={isFormDisabled}
            aria-describedby={formErrors.serviceDescription ? "service-description-error" : undefined}
          />
          {formErrors.serviceDescription && (
            <p id="service-description-error" className="mt-1 text-sm text-red-600">
              {formErrors.serviceDescription}
            </p>
          )}
        </div>

        {/* Priority Selection */}
        <div className="mb-6">
          <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
            Priority Level
          </label>
          <select
            id="priority"
            name="priority"
            value={service.priority}
            onChange={handleServiceChange}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
              isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
            disabled={isFormDisabled}
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Branch Selection */}
        {isShopAdmin && (
          <div className="mb-6">
            <label htmlFor="branch_id" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Branch
            </label>
            <select
              id="branch_id"
              name="branch_id"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
                formErrors.branchId ? 'border-red-300' : 'border-gray-300'
              } ${isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              required
              disabled={isFormDisabled}
              aria-describedby={formErrors.branchId ? "branch-id-error" : undefined}
            >
              <option value="">Choose a branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            {formErrors.branchId && (
              <p id="branch-id-error" className="mt-1 text-sm text-red-600">
                {formErrors.branchId}
              </p>
            )}
          </div>
        )}
        
        {isBranchAdmin && userBranchId && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {branches.find(b => b.id === userBranchId)?.name || userBranchId}
            </div>
          </div>
        )}
        
        {/* Technician Selection */}
        <div className="mb-6">
          <label htmlFor="technician_id" className="block text-sm font-semibold text-gray-700 mb-2">
            Assign Technician
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="technician_id"
              name="technician_id"
              value={service.technician_id}
              onChange={handleServiceChange}
              className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
                isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              disabled={isFormDisabled}
            >
              <option value="">Select a technician</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name} - {technician.phone}
                </option>
              ))}
            </select>
          </div>
          {techniciansLoading && (
            <p className="mt-2 text-sm text-blue-600">Loading technicians...</p>
          )}
          {techniciansError && (
            <p className="mt-2 text-sm text-red-600">Error loading technicians: {techniciansError}</p>
          )}
          {!techniciansLoading && technicians.length === 0 && (
            <p className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠️ No technicians available for this branch. Please add technicians first.
            </p>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="px-8 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {editing && onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
                disabled={isFormDisabled}
              >
                Cancel
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isFormDisabled}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isFormDisabled ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editing ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5" />
                {editing ? "Update Service" : "Create Service"}
              </div>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ServiceForm; 