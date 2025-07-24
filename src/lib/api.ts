import { logger } from './logger';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
}

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

class ApiClientImpl implements ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const fullURL = `${this.baseURL}${url}`;
      const headers = { ...this.defaultHeaders, ...config?.headers };
      
      const requestConfig: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      };

      logger.info('API Request', { method, url: fullURL, data });

      const response = await fetch(fullURL, requestConfig);
      const responseData = await response.json();

      if (!response.ok) {
        const error: ApiError = new Error(responseData.message || 'API request failed');
        error.status = response.status;
        error.code = responseData.code;
        throw error;
      }

      logger.info('API Response', { method, url: fullURL, success: true });

      return {
        success: true,
        data: responseData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('API Error', error as Error, { method, url, error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

// Create default API client instance
export const apiClient = new ApiClientImpl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api');

// Export types for external use
export type { ApiResponse, ApiError, RequestConfig, ApiClient }; 