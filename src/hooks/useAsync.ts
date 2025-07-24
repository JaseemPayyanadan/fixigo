import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { immediate = false, onSuccess, onError } = options;
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        logger.info('Async operation started', { functionName: asyncFunction.name });
        
        const result = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null });
          onSuccess?.(result);
          
          logger.info('Async operation completed', { 
            functionName: asyncFunction.name,
            success: true 
          });
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        
        if (mountedRef.current) {
          setState(prev => ({ ...prev, loading: false, error: errorMessage }));
          onError?.(error as Error);
          
          logger.error('Async operation failed', error as Error, {
            functionName: asyncFunction.name,
            error: errorMessage
          });
        }
        
        throw error;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

// Specialized hook for data fetching
export function useFetch<T = any>(
  fetchFunction: (...args: any[]) => Promise<T>,
  dependencies: any[] = [],
  options: UseAsyncOptions = {}
) {
  const { immediate = true, ...restOptions } = options;

  const asyncHook = useAsync(fetchFunction, restOptions);

  // Auto-execute on mount and when dependencies change
  useEffect(() => {
    if (immediate) {
      asyncHook.execute();
    }
  }, dependencies);

  return asyncHook;
}

// Hook for handling form submissions
export function useSubmit<T = any>(
  submitFunction: (data: T) => Promise<any>,
  options: UseAsyncOptions = {}
) {
  const { onSuccess, onError, ...restOptions } = options;

  const handleSubmit = useCallback(
    async (data: T) => {
      try {
        const result = await submitFunction(data);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error as Error);
        throw error;
      }
    },
    [submitFunction, onSuccess, onError]
  );

  return useAsync(handleSubmit, restOptions);
} 