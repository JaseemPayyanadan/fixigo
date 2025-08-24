"use client";

import React from "react";

import { 
  Building2, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  DollarSign
} from "lucide-react";

import { 
  DashboardMetric, 
  EnhancedMetricsGrid, 
  MetricCard,
  RecentServicesCard,
  DashboardHeader
} from "@/components/dashboard/shared/DashboardComponents";

// Mock data for testing
const mockMetrics: DashboardMetric[] = [
  {
    id: "branches",
    label: "Branches",
    value: 5,
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Total active branches",
    change: 12,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "services",
    label: "Total Services",
    value: 127,
    icon: ClipboardList,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "All services across branches",
    change: 8,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "technicians",
    label: "Technicians",
    value: 23,
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Active technicians",
    change: 5,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "revenue",
    label: "Total Revenue",
    value: "₹45,230",
    icon: DollarSign,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    description: "Total revenue across all branches",
    change: 15,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "pending",
    label: "Pending Services",
    value: 18,
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "Services awaiting attention",
    change: -3,
    changeType: "decrease",
    showTrend: true
  },
  {
    id: "completed",
    label: "Completed",
    value: 89,
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "Successfully completed services",
    change: 22,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "active",
    label: "Active Services",
    value: 20,
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Currently in progress",
    change: 7,
    changeType: "increase",
    showTrend: true
  },
  {
    id: "satisfaction",
    label: "Customer Satisfaction",
    value: "Not enough data yet",
    icon: Star,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    description: "Overall satisfaction rate",
    showTrend: false
  },
];

const mockServices = [
  {
    id: "1",
    name: "iPhone Screen Repair",
    status: "pending",
    price: 2500,
    customer: { name: "John Doe" },
    device: { brand: "Apple", model: "iPhone 12", type: "smartphone" }
  },
  {
    id: "2",
    name: "Laptop Battery Replacement",
    status: "completed",
    price: 1800,
    customer: { name: "Jane Smith" },
    device: { brand: "Dell", model: "Inspiron 15", type: "laptop" }
  },
  {
    id: "3",
    name: "Tablet Charging Port Fix",
    status: "awaiting_parts",
    price: 1200,
    customer: { name: "Bob Johnson" },
    device: { brand: "Samsung", model: "Galaxy Tab A", type: "tablet" }
  }
];

export default function TestChangesPage() {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const handleFilterChange = (filter: string) => {
    console.log('Filter changed to:', filter);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard UI/UX Improvements Test</h1>
        
        {/* Test Dashboard Header */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enhanced Dashboard Header</h2>
          <DashboardHeader 
            title="Test Dashboard" 
            subtitle="Testing the new improvements" 
            user={{ name: "Test User" }}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Test Metrics Grid */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enhanced Metrics Grid</h2>
          <EnhancedMetricsGrid metrics={mockMetrics} columns={8} />
        </div>

        {/* Test Individual Metric Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Metric Card</h2>
          <div className="max-w-sm">
            <MetricCard {...mockMetrics[0]} />
          </div>
        </div>

        {/* Test Recent Services */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enhanced Recent Services</h2>
          <RecentServicesCard 
            services={mockServices as any} 
            loading={false} 
            error={null} 
            title="Test Services" 
            viewAllLink="/services" 
            emptyMessage="No test services" 
            createLink="/services/new" 
            onRetry={() => console.log('Retry clicked')} 
          />
        </div>

        {/* Test Responsive Grid */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsive Grid Test</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">4 Columns</h3>
              <EnhancedMetricsGrid metrics={mockMetrics.slice(0, 4)} columns={4} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">6 Columns</h3>
              <EnhancedMetricsGrid metrics={mockMetrics.slice(0, 6)} columns={6} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">8 Columns</h3>
              <EnhancedMetricsGrid metrics={mockMetrics} columns={8} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
