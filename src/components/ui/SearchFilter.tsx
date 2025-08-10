"use client";
import React, { useState } from "react";

import { MagnifyingGlassIcon, ArrowPathIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  search,
  onSearchChange,
  placeholder = "Search...",
  filters = [],
  onClear,
  showClear = false,
  className = ""
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilters = search || filters.some(filter => filter.value !== filter.options[0]?.value);

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          />
        </div>

        {/* Filter Button */}
        {filters.length > 0 && (
          <button
            onClick={toggleFilter}
            className={`flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm transition-colors ${
              hasActiveFilters 
                ? "bg-blue-50 text-blue-600 border-blue-200" 
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        )}

        {/* Clear Button */}
        {showClear && hasActiveFilters && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors text-sm text-slate-600"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {isFilterOpen && filters.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
          <div className="p-3">
            <div className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    {filter.label}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filter.options.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          filter.onChange(option.value);
                          if (option.value === filter.options[0]?.value) {
                            setIsFilterOpen(false);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          filter.value === option.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  );
};

export default SearchFilter; 