"use client";
import React from "react";

import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

import TextInput from "@/components/ui/TextInput";
import { useTechnicians } from "@/hooks/useTechnicians";

import type { ServiceFormProps } from "../types";
import { getFormFieldConfig } from "../utils";

import BaseServiceForm from "./BaseServiceForm";


const ShopAdminServiceForm: React.FC<ServiceFormProps> = (props) => {
  const { user, shopId, branchId, setBranchId, branches } = props;
  const fieldConfig = user ? getFormFieldConfig(user) : null;
  
  // Fetch technicians for the selected branch
  const { technicians, loading: techniciansLoading } = useTechnicians(shopId, branchId);

  // Custom fields for shop admin
  const customFields = (
    <div className="space-y-6">
      {/* Branch Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
            Branch
          </label>
          <select
            id="branchId"
            name="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
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
        </div>

        {/* Technician Assignment */}
        <div>
          <label htmlFor="technician_id" className="block text-sm font-medium text-gray-700 mb-2">
            Assign Technician
          </label>
          <select
            id="technician_id"
            name="technician_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a technician</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name} - {technician.skills.join(", ")}
              </option>
            ))}
          </select>
          {techniciansLoading && (
            <p className="mt-1 text-sm text-gray-500">Loading technicians...</p>
          )}
        </div>
      </div>

      {/* Priority and Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
            Priority Level
          </label>
          <select
            id="priority"
            name="priority"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Duration (minutes)
          </label>
          <input
            type="number"
            id="estimatedDuration"
            name="estimatedDuration"
            min="15"
            step="15"
            defaultValue="60"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <BaseServiceForm {...props} customFields={customFields}>
      {/* Additional shop admin specific features can be added here */}
    </BaseServiceForm>
  );
};

export default ShopAdminServiceForm;
