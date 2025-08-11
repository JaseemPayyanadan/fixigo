"use client";
import React from "react";

import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  NoSymbolIcon
} from "@heroicons/react/24/outline";

import { Button, LoadingSpinner } from "@/components/ui";
import ServiceCard from "./ServiceCard";
import type { ServiceListProps } from "./types";
import type { Branch, Technician, User } from "@/types";

interface ServiceListSharedProps extends ServiceListProps {
  services: any[]; // Using any for compatibility
  branches: Branch[];
  technicians: Technician[];
  loading: boolean;
  error?: string | null;
  user: User | null;
  onEdit?: (service: any) => void;
  onDelete?: (id: string) => void;
  onRetry?: () => void;
  onViewDetails?: (id: string) => void;
}

const ServiceList: React.FC<ServiceListSharedProps> = ({
  services,
  branches,
  technicians,
  loading,
  error,
  user,
  onEdit,
  onDelete,
  onRetry,
  onViewDetails
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading services...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Error Loading Services
          </h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="secondary"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <NoSymbolIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Services Found
          </h3>
          <p className="text-gray-600 text-sm">
            There are no services to display at the moment.
          </p>
        </div>
      </div>
    );
  }

  // Services list
  return (
    <div className="space-y-4">
      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            branches={branches}
            technicians={technicians}
            user={user!}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Services Count */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-600">
          Showing {services.length} service{services.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default ServiceList;
