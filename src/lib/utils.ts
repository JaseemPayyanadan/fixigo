import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { logger } from './logger';
import { isIndexBuildingError } from './logger';

// Class name utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type-safe utility functions
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// Safe type conversion utilities
export function safeString(value: unknown): string {
  if (isString(value)) return value;
  if (isNumber(value)) return String(value);
  if (isBoolean(value)) return String(value);
  return '';
}

export function safeNumber(value: unknown): number {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeBoolean(value: unknown): boolean {
  if (isBoolean(value)) return value;
  if (isString(value)) return value.toLowerCase() === 'true';
  if (isNumber(value)) return value !== 0;
  return false;
}

// Date utilities
export function safeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (isString(value)) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  if (isNumber(value)) {
    return new Date(value);
  }
  return new Date();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Firebase timestamp utilities
export function getTimestampSeconds(timestamp: unknown): number {
  if (!timestamp) return 0;
  if (isObject(timestamp) && 'seconds' in timestamp) {
    return (timestamp as { seconds: number }).seconds;
  }
  if (isNumber(timestamp)) return timestamp;
  return 0;
}

export function timestampToDate(timestamp: unknown): Date {
  if (timestamp instanceof Date) return timestamp;
  if (isObject(timestamp) && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (isNumber(timestamp)) return new Date(timestamp);
  return new Date();
}

// String utilities
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)  }...`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Array utilities
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function sortBy<T, K extends keyof T>(
  array: T[],
  key: K,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Object utilities
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// Error handling utilities
export function createError(message: string, code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as Error & { code: string }).code = code;
  }
  return error;
}

export function handleError(error: unknown, context?: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error${context ? ` in ${context}` : ''}`, { error: errorMessage });
  return errorMessage;
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validateStrongPassword(password: string): boolean {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Async utilities
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: lastError.message });
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError!;
}

// Retry configuration for index building errors
const INDEX_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds
};

// Exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = INDEX_RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, INDEX_RETRY_CONFIG.maxDelay);
}

// Retry function for operations that might fail due to index building
export async function retryOnIndexError<T>(
  operation: () => Promise<T>,
  maxRetries: number = INDEX_RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message;

      // Only retry on index building errors
      if (isIndexBuildingError(errorMessage) && attempt < maxRetries) {
        const delay = getRetryDelay(attempt);
        console.log(`Index building in progress, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-index errors or max retries reached, throw the error
      throw lastError;
    }
  }

  throw lastError!;
}

// Utility to check if we should show a loading state for index building
export function shouldShowIndexLoadingState(error: string | null): boolean {
  return error ? isIndexBuildingError(error) : false;
}

// Performance utilities
export function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return result;
}

export async function measureAsyncTime<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return result;
}
