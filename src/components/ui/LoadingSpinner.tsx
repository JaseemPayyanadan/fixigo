import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const colorClasses = {
  primary: 'border-blue-600',
  secondary: 'border-gray-600',
  white: 'border-white',
  gray: 'border-gray-400'
};

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '',
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : ''}`}>
      <div className="flex flex-col items-center space-y-3">
        <div
          className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
          role="status"
          aria-label="Loading"
        />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Skeleton loading component
export function Skeleton({ className = '', lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded mb-2 last:mb-0"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

// Page loading component
export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" color="primary" />
        <p className="mt-4 text-gray-600">{text}</p>
      </div>
    </div>
  );
} 