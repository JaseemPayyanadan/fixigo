import React from "react";
import { HiSearch, HiRefresh } from "react-icons/hi";

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
  const hasActiveFilters = search || filters.some(filter => filter.value !== filter.options[0]?.value);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search */}
        <div className="flex-1 relative min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          />
        </div>

        {/* Filters */}
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {filter.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Clear Button - Only show when filters are applied */}
        {showClear && hasActiveFilters && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm"
          >
            <HiRefresh className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchFilter; 