type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: string | number | boolean | null | undefined | Error;
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function getLogLevel(): number {
  return process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[Complex Object]';
    }
  }
  return sanitized;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level}: ${message}${contextStr}`;
}

// Utility function to detect and handle Firestore index building errors
export function isIndexBuildingError(error: string): boolean {
  return error.includes('index is currently building') || 
         error.includes('The query requires an index') ||
         error.includes('cannot be used yet');
}

export function getIndexBuildingMessage(error: string): string {
  if (isIndexBuildingError(error)) {
    return 'Database indexes are being built. This may take a few minutes. Please try again later.';
  }
  return error;
}

export function shouldRetryOnIndexError(error: string): boolean {
  return isIndexBuildingError(error);
}

class LoggerImpl implements Logger {
  private shouldLog(level: number): boolean {
    return level >= getLogLevel();
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const sanitizedContext = sanitizeContext(context);
      console.debug(this.formatMessage('DEBUG', message, sanitizedContext));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const sanitizedContext = sanitizeContext(context);
      console.info(this.formatMessage('INFO', message, sanitizedContext));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const sanitizedContext = sanitizeContext(context);
      console.warn(this.formatMessage('WARN', message, sanitizedContext));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const sanitizedContext = sanitizeContext(context);
      console.error(this.formatMessage('ERROR', message, sanitizedContext));
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    return formatMessage(level, message, context);
  }
}

export const logger = new LoggerImpl();
export default logger; 