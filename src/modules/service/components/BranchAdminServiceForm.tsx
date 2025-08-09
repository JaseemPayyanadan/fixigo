"use client";
import React from "react";
import type { ServiceFormProps } from "../types";
import { getFormFieldConfig } from "../utils";
import BaseServiceForm from "./BaseServiceForm";
import { useTechnicians } from "@/hooks/useTechnicians";
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

const BranchAdminServiceForm: React.FC<ServiceFormProps> = (props) => {
  const { user, shopId, branchId } = props;
  const fieldConfig = getFormFieldConfig(user);
  
  // Fetch technicians for the current branch only
  const { technicians, loading: techniciansLoading } = useTechnicians(shopId, branchId);

  // Custom fields for branch admin
  const customFields = (
    <div className="space-y-6">
      {/* Branch Display (Read-only for branch admin) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Branch
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
            {props.branches.find(b => b.id === branchId)?.name || "Current Branch"}
          </div>
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
      {/* Additional branch admin specific features can be added here */}
    </BaseServiceForm>
  );
};

export default BranchAdminServiceForm;
