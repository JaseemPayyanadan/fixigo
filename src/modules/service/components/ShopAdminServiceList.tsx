"use client";
import React, { useState, useMemo } from "react";

import { 
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";

import type { ServiceListProps } from "../types";

import BaseServiceList from "./BaseServiceList";

const ShopAdminServiceList: React.FC<ServiceListProps> = (props) => {
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  // Custom filters for shop admin
  const customFilters = (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <FunnelIcon className="w-4 h-4" />
          {showFilters ? (
            <>
              Hide Filters
              <ChevronUpIcon className="w-4 h-4" />
            </>
          ) : (
            <>
              Show Filters
              <ChevronDownIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="on_hold">On Hold</option>
              <option value="awaiting_parts">Awaiting Parts</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="quality_check">Quality Check</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Branches</option>
              {props.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );

  // Custom actions for shop admin
  const customActions = (service: any) => (
    <div className="flex gap-1.5">
      {/* Additional shop admin specific actions can be added here */}
    </div>
  );

  return (
    <BaseServiceList 
      {...props} 
      customFilters={customFilters}
      customActions={customActions}
    >
      {/* Additional shop admin specific features can be added here */}
    </BaseServiceList>
  );
};

export default ShopAdminServiceList;
