"use client";
import React from 'react';

interface ServiceMetrics {
  totalServices: number;
  pendingServices: number;
  inProgressServices: number;
  completedServices: number;
  urgentServices: number;
  activeServices: number;
}

interface ServiceMetricsGaugeProps {
  metrics: ServiceMetrics;
  className?: string;
}

const ServiceMetricsGauge: React.FC<ServiceMetricsGaugeProps> = ({ 
  metrics, 
  className = "" 
}) => {
  const { totalServices, pendingServices, inProgressServices, completedServices, urgentServices } = metrics;
  
  // Calculate percentages
  const completedPercentage = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;
  const inProgressPercentage = totalServices > 0 ? Math.round((inProgressServices / totalServices) * 100) : 0;
  const pendingPercentage = totalServices > 0 ? Math.round((pendingServices / totalServices) * 100) : 0;
  
  // SVG dimensions
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Semi-circle circumference
  
  // Calculate stroke dash arrays for each segment
  const completedLength = (completedPercentage / 100) * circumference;
  const inProgressLength = (inProgressPercentage / 100) * circumference;
  const pendingLength = (pendingPercentage / 100) * circumference;
  
  // Calculate stroke dash offsets
  const completedOffset = 0;
  const inProgressOffset = -completedLength;
  const pendingOffset = -(completedLength + inProgressLength);
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-7 shadow-sm ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        {/* <h3 className="text-xl font-bold text-gray-900 mb-2">Service Progress</h3> */}
        <p className="text-sm text-gray-600">Overall completion status</p>
      </div>
      
      {/* Gauge Container */}
      <div className="flex flex-col items-center">
        {/* Semi-circular Progress Gauge */}
        <div className="relative mb-3">
          <svg width={size} height={size / 2 + 30} className="overflow-visible drop-shadow-sm">
            {/* Background arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="opacity-60"
            />
            
            {/* Completed segment (emerald) */}
            {completedLength > 0 && (
              <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${completedLength} ${circumference}`}
                strokeDashoffset={completedOffset}
                className="transition-all duration-1500 ease-out drop-shadow-sm"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))'
                }}
              />
            )}
            
            {/* In Progress segment (blue) */}
            {inProgressLength > 0 && (
              <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${inProgressLength} ${circumference}`}
                strokeDashoffset={inProgressOffset}
                className="transition-all duration-1500 ease-out drop-shadow-sm"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                }}
              />
            )}
            
            {/* Pending segment (amber) */}
            {pendingLength > 0 && (
              <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${pendingLength} ${circumference}`}
                strokeDashoffset={pendingOffset}
                className="transition-all duration-1500 ease-out drop-shadow-sm"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))'
                }}
              />
            )}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {completedPercentage}%
            </div>
            <div className="text-xs text-gray-600 font-medium">
              Project Completed
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-row justify-center gap-3 w-full mb-6">
          {/* Completed */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
            <span className="text-[10px] font-medium text-gray-800">Completed</span>
          </div>
          
          {/* In Progress */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
            <span className="text-[10px] font-medium text-gray-800">On Progress</span>
          </div>
          
          {/* Pending */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></div>
            <span className="text-[10px] font-medium text-gray-800">Still waiting</span>
          </div>
        </div>
        
        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="flex items-center gap-2 text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{totalServices}</div>
            <div className="text-xs text-gray-600">Total Services</div>
          </div>
          <div className="flex items-center gap-2 text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{urgentServices}</div>
            <div className="text-xs text-gray-600">Urgent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceMetricsGauge;
