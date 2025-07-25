import React from 'react';
import { 
  HiOfficeBuilding, 
  HiUserGroup, 
  HiClipboardList, 
  HiDocumentText, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiClock, 
  HiCheckCircle,
  HiStar,
  HiUsers,
  HiLocationMarker,
  HiChartBar
} from 'react-icons/hi';
import type { DashboardStats as DashboardStatsType } from '@/types';

interface DashboardStatsProps {
  stats: DashboardStatsType;
  userRole: string;
  loading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, change, subtitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <div className="flex items-baseline">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <span className={`ml-2 text-sm font-medium ${
              change.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {change.isPositive ? '+' : ''}{change.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats, 
  userRole, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const getRoleSpecificStats = () => {
    switch (userRole) {
      case 'shop_admin':
        return [
          {
            title: 'Total Services',
            value: stats.totalServices,
            icon: <HiClipboardList className="w-6 h-6 text-white" />,
            color: 'bg-blue-500',
            subtitle: 'All services across branches'
          },
          {
            title: 'Active Technicians',
            value: stats.activeTechnicians,
            icon: <HiUsers className="w-6 h-6 text-white" />,
            color: 'bg-green-500',
            subtitle: 'Currently working'
          },
          {
            title: 'Total Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: <HiCurrencyDollar className="w-6 h-6 text-white" />,
            color: 'bg-yellow-500',
            change: { value: 12, isPositive: true }
          },
          {
            title: 'Customer Satisfaction',
            value: `${stats.customerSatisfaction}/5`,
            icon: <HiStar className="w-6 h-6 text-white" />,
            color: 'bg-purple-500',
            subtitle: 'Average rating'
          }
        ];
      
      case 'branch_admin':
        return [
          {
            title: 'Branch Services',
            value: stats.totalServices,
            icon: <HiClipboardList className="w-6 h-6 text-white" />,
            color: 'bg-blue-500',
            subtitle: 'Services in this branch'
          },
          {
            title: 'Branch Technicians',
            value: stats.activeTechnicians,
            icon: <HiUsers className="w-6 h-6 text-white" />,
            color: 'bg-green-500',
            subtitle: 'Active in this branch'
          },
          {
            title: 'Branch Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: <HiCurrencyDollar className="w-6 h-6 text-white" />,
            color: 'bg-yellow-500'
          },
          {
            title: 'Completion Rate',
            value: formatPercentage(stats.completedServices / Math.max(stats.totalServices, 1)),
            icon: <HiCheckCircle className="w-6 h-6 text-white" />,
            color: 'bg-purple-500'
          }
        ];
      
      case 'technician':
        return [
          {
            title: 'My Services',
            value: stats.totalServices,
            icon: <HiClipboardList className="w-6 h-6 text-white" />,
            color: 'bg-blue-500',
            subtitle: 'Assigned to me'
          },
          {
            title: 'Completed',
            value: stats.completedServices,
            icon: <HiCheckCircle className="w-6 h-6 text-white" />,
            color: 'bg-green-500',
            subtitle: 'Successfully completed'
          },
          {
            title: 'Pending',
            value: stats.pendingServices,
            icon: <HiClock className="w-6 h-6 text-white" />,
            color: 'bg-yellow-500',
            subtitle: 'Awaiting completion'
          },
          {
            title: 'My Rating',
            value: `${stats.customerSatisfaction}/5`,
            icon: <HiStar className="w-6 h-6 text-white" />,
            color: 'bg-purple-500',
            subtitle: 'Customer feedback'
          }
        ];
      
      default:
        return [];
    }
  };

  const roleStats = getRoleSpecificStats();

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roleStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Secondary Stats for Shop Admin */}
      {userRole === 'shop_admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Branches"
            value={stats.totalBranches}
            icon={<HiLocationMarker className="w-6 h-6 text-white" />}
            color="bg-indigo-500"
            subtitle="Active locations"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            icon={<HiTrendingUp className="w-6 h-6 text-white" />}
            color="bg-emerald-500"
            change={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Avg Service Time"
            value={`${Math.round(stats.averageServiceTime)} min`}
            icon={<HiChartBar className="w-6 h-6 text-white" />}
            color="bg-orange-500"
            subtitle="Per service"
          />
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(stats.completedServices / Math.max(stats.totalServices, 1))}
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue / Math.max(stats.totalServices, 1))}
            </div>
            <div className="text-sm text-gray-600">Average Revenue per Service</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.customerSatisfaction.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Customer Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Top Technicians (Shop Admin Only) */}
      {userRole === 'shop_admin' && stats.topTechnicians && stats.topTechnicians.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Technicians</h3>
          <div className="space-y-3">
            {stats.topTechnicians.slice(0, 5).map((technician, index) => (
              <div key={technician.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{technician.name}</div>
                    <div className="text-sm text-gray-600">
                      {technician.completedServices} services completed
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <HiStar
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(technician.rating) ? 'fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {technician.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 