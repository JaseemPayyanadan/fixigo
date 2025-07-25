type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get current log level from environment
const getCurrentLogLevel = (): number => {
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  return process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
};

const currentLogLevel = getCurrentLogLevel();

class LoggerImpl implements Logger {
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  private shouldLog(level: number): boolean {
    return level >= currentLogLevel;
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context || this.isProduction()) return context;
    
    // Remove sensitive information in production
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const sanitizedContext = this.sanitizeContext(context);
      console.debug(this.formatMessage('DEBUG', message, sanitizedContext));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const sanitizedContext = this.sanitizeContext(context);
      console.info(this.formatMessage('INFO', message, sanitizedContext));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const sanitizedContext = this.sanitizeContext(context);
      console.warn(this.formatMessage('WARN', message, sanitizedContext));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const errorContext = error ? { 
        error: error.message, 
        stack: this.isProduction() ? undefined : error.stack 
      } : {};
      const fullContext = { ...errorContext, ...context };
      const sanitizedContext = this.sanitizeContext(fullContext);
      console.error(this.formatMessage('ERROR', message, sanitizedContext));
    }
  }
}

// Create logger instance
const logger = new LoggerImpl();

// Export logger and types
export default logger;
export { logger };
export type { Logger, LogContext, LogLevel }; 