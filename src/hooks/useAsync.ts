import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}

type AsyncFunction<T> = (...args: unknown[]) => Promise<T>;

export function useAsync<T>(
  asyncFunction: AsyncFunction<T>,
  options: AsyncOptions = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { immediate = true, onSuccess, onError } = options;

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState(prevState => ({ ...prevState, loading: true, error: null }));

      try {
        const data = await asyncFunction(...args);
        setState({ data, loading: false, error: null });
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setState({ data: null, loading: false, error: errorMessage });
        onError?.(error);
        throw error;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
  };
}

// Specialized hook for data fetching
export function useFetch<T>(
  fetchFunction: (...args: unknown[]) => Promise<T>,
  dependencies: unknown[] = [],
  options: AsyncOptions = {}
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
export function useSubmit<T>(
  submitFunction: (data: T) => Promise<unknown>,
  options: AsyncOptions = {}
) {
  const { onSuccess, onError, ...restOptions } = options;

  const handleSubmit = useCallback(
    async (data: T) => {
      try {
        const result = await submitFunction(data);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
    [submitFunction, onSuccess, onError]
  );

  return useAsync(handleSubmit as AsyncFunction<unknown>, restOptions);
} 