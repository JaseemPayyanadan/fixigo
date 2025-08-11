import { useState, useCallback, useMemo } from "react";
import type { Service, Branch, Technician, User } from "@/types";
import type { ServiceFilters, ServiceSortOptions, ServiceStats } from "./types";
import { filterServices, sortServices, calculateServiceStats } from "./ServiceUtils";

// Hook for managing service filters
export const useServiceFilters = (initialFilters: ServiceFilters = {}) => {
  const [filters, setFilters] = useState<ServiceFilters>(initialFilters);

  const updateFilter = useCallback((key: keyof ServiceFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key: keyof ServiceFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
    clearFilter,
    setFilters
  };
};

// Hook for managing service sorting
export const useServiceSorting = (initialField: ServiceSortOptions['field'] = 'createdAt', initialDirection: ServiceSortOptions['direction'] = 'desc') => {
  const [sortOptions, setSortOptions] = useState<ServiceSortOptions>({
    field: initialField,
    direction: initialDirection
  });

  const updateSort = useCallback((field: ServiceSortOptions['field'], direction?: ServiceSortOptions['direction']) => {
    setSortOptions(prev => ({
      field,
      direction: direction || (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc')
    }));
  }, []);

  const toggleDirection = useCallback(() => {
    setSortOptions(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  return {
    sortOptions,
    updateSort,
    toggleDirection,
    setSortOptions
  };
};

// Hook for managing service pagination
export const useServicePagination = (initialPageSize: number = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback((totalPages: number) => {
    setCurrentPage(totalPages);
  }, []);

  const updatePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    currentPage,
    pageSize,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    updatePageSize
  };
};

// Hook for managing service search
export const useServiceSearch = (initialSearch: string = '') => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isSearching, setIsSearching] = useState(false);

  const updateSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const startSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  const stopSearch = useCallback(() => {
    setIsSearching(false);
  }, []);

  return {
    searchTerm,
    isSearching,
    updateSearch,
    clearSearch,
    startSearch,
    stopSearch
  };
};

// Hook for managing service selection
export const useServiceSelection = () => {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  const selectService = useCallback((serviceId: string) => {
    setSelectedServices(prev => new Set([...prev, serviceId]));
  }, []);

  const deselectService = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      newSet.delete(serviceId);
      return newSet;
    });
  }, []);

  const toggleServiceSelection = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  }, []);

  const selectAllServices = useCallback((serviceIds: string[]) => {
    setSelectedServices(new Set(serviceIds));
  }, []);

  const deselectAllServices = useCallback(() => {
    setSelectedServices(new Set());
  }, []);

  const isServiceSelected = useCallback((serviceId: string) => {
    return selectedServices.has(serviceId);
  }, [selectedServices]);

  const getSelectedCount = useCallback(() => {
    return selectedServices.size;
  }, [selectedServices]);

  const getSelectedServices = useCallback(() => {
    return Array.from(selectedServices);
  }, [selectedServices]);

  return {
    selectedServices,
    selectService,
    deselectService,
    toggleServiceSelection,
    selectAllServices,
    deselectAllServices,
    isServiceSelected,
    getSelectedCount,
    getSelectedServices
  };
};

// Hook for managing service actions
export const useServiceActions = (services: Service[], user: User) => {
  const canPerformAction = useCallback((action: string, service?: Service) => {
    if (!user) return false;
    
    switch (action) {
      case 'create':
        return user.role === 'shop_admin' || user.role === 'branch_admin';
      case 'edit':
        if (!service) return false;
        return user.role === 'shop_admin' || 
               user.role === 'branch_admin' || 
               (user.role === 'technician' && service.assignedTechnicianId === user.id);
      case 'delete':
        return user.role === 'shop_admin' || user.role === 'branch_admin';
      case 'assign':
        return user.role === 'shop_admin' || user.role === 'branch_admin';
      case 'updateStatus':
        if (!service) return false;
        return user.role === 'shop_admin' || 
               user.role === 'branch_admin' || 
               (user.role === 'technician' && service.assignedTechnicianId === user.id);
      default:
        return false;
    }
  }, [user]);

  const getAvailableActions = useCallback((service: Service) => {
    const actions = [];
    
    if (canPerformAction('edit', service)) {
      actions.push('edit');
    }
    if (canPerformAction('delete', service)) {
      actions.push('delete');
    }
    if (canPerformAction('assign', service)) {
      actions.push('assign');
    }
    if (canPerformAction('updateStatus', service)) {
      actions.push('updateStatus');
    }
    
    return actions;
  }, [canPerformAction]);

  return {
    canPerformAction,
    getAvailableActions
  };
};

// Hook for managing service statistics
export const useServiceStats = (services: Service[]) => {
  const stats = useMemo(() => {
    return calculateServiceStats(services);
  }, [services]);

  const getStatusDistribution = useMemo(() => {
    const distribution = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0,
      awaiting_parts: 0,
      ready_for_pickup: 0,
      quality_check: 0
    };

    services.forEach(service => {
      if (distribution.hasOwnProperty(service.status)) {
        distribution[service.status as keyof typeof distribution]++;
      }
    });

    return distribution;
  }, [services]);

  const getPriorityDistribution = useMemo(() => {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    services.forEach(service => {
      if (distribution.hasOwnProperty(service.priority)) {
        distribution[service.priority as keyof typeof distribution]++;
      }
    });

    return distribution;
  }, [services]);

  const getRevenueByStatus = useMemo(() => {
    const revenueByStatus: Record<string, number> = {};
    
    services.forEach(service => {
      if (!revenueByStatus[service.status]) {
        revenueByStatus[service.status] = 0;
      }
      if (service.status === 'completed') {
        revenueByStatus[service.status] += service.price;
      }
    });

    return revenueByStatus;
  }, [services]);

  return {
    stats,
    getStatusDistribution,
    getPriorityDistribution,
    getRevenueByStatus
  };
};

// Hook for managing service data with filtering, sorting, and pagination
export const useServiceData = (
  services: Service[],
  filters: ServiceFilters,
  sortOptions: ServiceSortOptions,
  pagination: { currentPage: number; pageSize: number }
) => {
  const processedServices = useMemo(() => {
    let filtered = filterServices(services, filters);
    let sorted = sortServices(filtered, sortOptions.field, sortOptions.direction);
    
    return sorted;
  }, [services, filters, sortOptions]);

  const paginatedServices = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return processedServices.slice(startIndex, endIndex);
  }, [processedServices, pagination.currentPage, pagination.pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(processedServices.length / pagination.pageSize);
  }, [processedServices.length, pagination.pageSize]);

  const hasNextPage = useMemo(() => {
    return pagination.currentPage < totalPages;
  }, [pagination.currentPage, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return pagination.currentPage > 1;
  }, [pagination.currentPage]);

  return {
    processedServices,
    paginatedServices,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    totalCount: processedServices.length
  };
};
