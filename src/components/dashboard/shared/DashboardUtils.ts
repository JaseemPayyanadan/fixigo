import { Service } from '@/types';

// Status color mapping for consistent styling across dashboard components
export const STATUS_COLORS = {
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
  on_hold: { bg: 'bg-orange-100', text: 'text-orange-800' },
  awaiting_parts: { bg: 'bg-purple-100', text: 'text-purple-800' },
  ready_for_pickup: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  quality_check: { bg: 'bg-pink-100', text: 'text-pink-800' }
} as const;

// Get status color based on service status
export const getStatusColor = (status: string): { bg: string; text: string } => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[normalizedStatus as keyof typeof STATUS_COLORS] || 
         { bg: 'bg-gray-100', text: 'text-gray-800' };
};

// Format currency with proper locale
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Extract timestamp seconds from Firestore timestamp
export const getTimestampSeconds = (timestamp: unknown): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp) {
    return (timestamp as { seconds: number }).seconds;
  }
  return 0;
};

// Calculate dashboard metrics from services data
export const calculateDashboardMetrics = (services: Service[] = []) => {
  const totalServices = services.length;
  const pendingServices = services.filter(s => 
    s.status === 'pending' || s.status === 'in_progress'
  ).length;
  const completedServices = services.filter(s => s.status === 'completed').length;
  const activeServices = services.filter(s => s.status === 'in_progress').length;
  const totalCustomers = new Set(
    services.map(s => s.customer?.name).filter(Boolean)
  ).size;
  const customerSatisfaction = totalServices > 0 
    ? Math.round((completedServices / totalServices) * 100) 
    : 0;

  return {
    totalServices,
    pendingServices,
    completedServices,
    activeServices,
    totalCustomers,
    customerSatisfaction
  };
};

// Get recent services with proper sorting
export const getRecentServices = (services: Service[] = [], limit = 5) => {
  if (!services || services.length === 0) return [];
  
  try {
    const sorted = services.sort((a, b) => {
      const aTime = getTimestampSeconds(a.createdAt);
      const bTime = getTimestampSeconds(b.createdAt);
      return bTime - aTime;
    });
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error sorting recent services:', error);
    return services.slice(0, limit);
  }
};

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Loading state component
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ 
  size = 'md', 
  text = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="text-center py-12">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${sizeClasses[size]}`} />
      <p className="mt-4 text-gray-600">{text}</p>
    </div>
  );
};

// Error state component
export const ErrorState: React.FC<{ message: string; retry?: () => void }> = ({ 
  message, 
  retry 
}) => (
  <div className="text-center py-12">
    <div className="text-red-500 mb-4">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
    <p className="text-sm text-gray-500 mb-4">{message}</p>
    {retry && (
      <button
        onClick={retry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Try Again
      </button>
    )}
  </div>
);
