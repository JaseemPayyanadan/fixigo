"use client";
import React, { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  dataLoadTime: number;
  componentMountTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  dataLoading?: boolean;
  children: React.ReactNode;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = React.memo(({
  componentName,
  dataLoading = false,
  children,
  onMetrics
}) => {
  const mountTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(0);
  const dataLoadStartTime = useRef<number>(0);

  useEffect(() => {
    const componentMountTime = Date.now() - mountTime.current;
    
    if (onMetrics) {
      onMetrics({
        renderTime: renderStartTime.current ? Date.now() - renderStartTime.current : 0,
        dataLoadTime: dataLoadStartTime.current ? Date.now() - dataLoadStartTime.current : 0,
        componentMountTime
      });
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${componentName} Performance:`, {
        mountTime: `${componentMountTime}ms`,
        renderTime: renderStartTime.current ? `${Date.now() - renderStartTime.current}ms` : 'N/A',
        dataLoadTime: dataLoadStartTime.current ? `${Date.now() - dataLoadStartTime.current}ms` : 'N/A'
      });
    }
  }, [componentName, onMetrics]);

  useEffect(() => {
    if (dataLoading) {
      dataLoadStartTime.current = Date.now();
    }
  }, [dataLoading]);

  const handleRenderStart = () => {
    renderStartTime.current = Date.now();
  };

  return (
    <div onLoad={handleRenderStart}>
      {children}
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

// Performance optimization wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    return (
      <PerformanceMonitor componentName={componentName}>
        <Component {...props} ref={ref} />
      </PerformanceMonitor>
    );
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
};
