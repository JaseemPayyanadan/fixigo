import React, { useState, useEffect } from "react";
import type { Branch } from "../../types";
import TextInput from "../../components/ui/TextInput";
import { UserIcon, PhoneIcon, DevicePhoneMobileIcon, BuildingOfficeIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useTechnicians } from "../../hooks/useTechnicians";

interface ServiceFormProps {
  onSubmit: (data: {
    customer: { name: string; phone: string; place?: string };
    device: { brand: string; model: string; serial: string; color: string };
    service: { name: string; description: string; price: string; branch_id: string; technician_id?: string };
  }) => void;
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
    customer?: { name: string; phone: string; place?: string };
    device?: { brand: string; model: string; serial: string; color: string };
    service?: { name: string; description: string; price: string; technician_id?: string };
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
  const [customer, setCustomer] = useState({ name: "", phone: "", place: "" });
  const [device, setDevice] = useState({ brand: "", model: "", serial: "", color: "" });
  const [service, setService] = useState({ name: "", description: "", price: "", technician_id: "" });
  
  // Fetch technicians for the selected branch
  const { technicians } = useTechnicians(shopId, branchId || userBranchId);

  useEffect(() => {
    if (initialData) {
      if (initialData.customer) setCustomer({ 
        name: initialData.customer.name || "", 
        phone: initialData.customer.phone || "", 
        place: initialData.customer.place || "" 
      });
      if (initialData.device) setDevice({ 
        brand: initialData.device.brand || "", 
        model: initialData.device.model || "", 
        serial: initialData.device.serial || "", 
        color: initialData.device.color || "" 
      });
      if (initialData.service) setService({ 
        ...initialData.service, 
        technician_id: initialData.service.technician_id || "" 
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (isBranchAdmin && userBranchId) {
      setBranchId(userBranchId);
    }
  }, [isBranchAdmin, userBranchId, setBranchId]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };
  const handleDeviceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDevice({ ...device, [e.target.name]: e.target.value });
  };
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customer,
      device,
      service: { ...service, branch_id: branchId },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Customer Information */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
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
              icon={<UserIcon className="h-5 w-5 text-gray-400" />}
            />
            <TextInput
              type="tel"
              name="phone"
              label="Phone Number"
              value={customer.phone}
              onChange={handleCustomerChange}
              placeholder="Enter phone number"
              required
              icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
            />
            <TextInput
              type="text"
              name="place"
              label="Place (Optional)"
              value={customer.place}
              onChange={handleCustomerChange}
              placeholder="Enter place/location"
              icon={<MapPinIcon className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </div>
      </div>
      
      {/* Device Details */}
      <div className="border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
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
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            />
            <TextInput
              type="text"
              name="model"
              label="Model"
              value={device.model}
              onChange={handleDeviceChange}
              placeholder="iPhone 14, Galaxy S23"
              required
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            />
            <TextInput
              type="text"
              name="serial"
              label="IMEI"
              value={device.serial}
              onChange={handleDeviceChange}
              placeholder="Device IMEI number"
              required
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            />
            <TextInput
              type="text"
              name="color"
              label="Color"
              value={device.color}
              onChange={handleDeviceChange}
              placeholder="Black, Silver, etc."
              required
              icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </div>
      </div>
      
      {/* Service Details */}
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
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
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
          />
          <TextInput
            type="number"
            name="price"
            label="Service Price"
            value={service.price}
            onChange={handleServiceChange}
            placeholder="Enter price"
            required
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
            placeholder="Describe the service requirements..."
            rows={3}
          />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              required
            >
              <option value="">Choose a branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
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
              onChange={(e) => setService({ ...service, technician_id: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            >
              <option value="">Select a technician</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name} - {technician.phone}
                </option>
              ))}
            </select>
          </div>
          {technicians.length === 0 && (
            <p className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠️ No technicians available for this branch. Please add technicians first.
            </p>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="px-8 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
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