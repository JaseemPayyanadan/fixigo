"use client";
import React from "react";

import { 
  UserGroupIcon
} from "@heroicons/react/24/outline";

import type { ServiceFormProps } from "../types";
import { getFormFieldConfig } from "../utils";

import BaseServiceForm from "./BaseServiceForm";

const TechnicianServiceForm: React.FC<ServiceFormProps> = (props) => {
  const { user, branchId } = props;
  const fieldConfig = user ? getFormFieldConfig(user) : null;

  // Custom fields for technician (minimal)
  const customFields = (
    <div className="space-y-6">
      {/* Branch Display (Read-only for technician) */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Branch
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
            {props.branches.find(b => b.id === branchId)?.name || "Current Branch"}
          </div>
        </div>
      </div>

      {/* Auto-assignment notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Auto-Assignment</h4>
            <p className="text-sm text-blue-700 mt-1">
              This service will be automatically assigned to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BaseServiceForm {...props} customFields={customFields}>
      {/* Additional technician specific features can be added here */}
    </BaseServiceForm>
  );
};

export default TechnicianServiceForm;
