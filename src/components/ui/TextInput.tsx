import React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id || props.name} className="block text-xs md:text-sm font-normal text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full ${icon ? "pl-10" : ""} pr-4 py-2 border text-sm md:text-base font-normal border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${error ? "border-red-400" : ""} ${className}`}
            {...props}
          />
        </div>
        {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

export default TextInput; 