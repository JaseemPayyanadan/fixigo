"use client";
import { useMemo } from 'react';
import { useUser } from './useUser';
import { useBranches } from './useBranches';
import { useTechnicians } from './useTechnicians';
import { useServices } from './useServices';
import { useInvoices } from './useInvoices';
import { calculateDashboardMetrics, getRecentServices } from '@/components/dashboard/shared/DashboardUtils';

export interface DashboardData {
  // Loading states
  isLoading: boolean;
  servicesLoading: boolean;
  branchesLoading: boolean;
  techniciansLoading: boolean;
  invoicesLoading: boolean;
  
  // Data
  services: any[];
  branches: any[];
  technicians: any[];
  invoices: any[];
  
  // Calculated metrics
  metrics: {
    totalServices: number;
    pendingServices: number;
    completedServices: number;
    activeServices: number;
    totalCustomers: number;
    customerSatisfaction: number;
  };
  
  // Recent data
  recentServices: any[];
  
  // Revenue
  totalRevenue: number;
  
  // User info
  user: any;
}

export const useDashboardData = (shopId?: string, branchId?: string): DashboardData => {
  const { user } = useUser();
  const { branches, loading: branchesLoading } = useBranches(shopId);
  const { technicians, loading: techniciansLoading } = useTechnicians(shopId, branchId);
  const { services, loading: servicesLoading } = useServices(shopId, branchId);
  const { invoices, loading: invoicesLoading } = useInvoices(shopId, branchId);

  // Check if any data is still loading
  const isLoading = useMemo(() => 
    branchesLoading || techniciansLoading || servicesLoading || invoicesLoading,
    [branchesLoading, techniciansLoading, servicesLoading, invoicesLoading]
  );

  // Calculate metrics
  const metrics = useMemo(() => 
    calculateDashboardMetrics(services),
    [services]
  );

  // Get recent services
  const recentServices = useMemo(() => 
    getRecentServices(services, 5),
    [services]
  );

  // Calculate total revenue
  const totalRevenue = useMemo(() => 
    invoices?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0,
    [invoices]
  );

  return {
    // Loading states
    isLoading,
    servicesLoading,
    branchesLoading,
    techniciansLoading,
    invoicesLoading,
    
    // Data
    services: services || [],
    branches: branches || [],
    technicians: technicians || [],
    invoices: invoices || [],
    
    // Calculated metrics
    metrics,
    
    // Recent data
    recentServices,
    
    // Revenue
    totalRevenue,
    
    // User info
    user
  };
};
