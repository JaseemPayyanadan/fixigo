"use client";

import React, { useCallback, useState } from "react";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ label, error, icon, className = "", ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = useCallback(() => setShowPassword(!showPassword), [showPassword]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-xs font-normal text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={`w-full ${icon ? "pl-10" : ""} pr-12 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${error ? "border-red-400" : ""} ${className}`}
          {...props}
        />
        <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
