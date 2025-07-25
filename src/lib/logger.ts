type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: any;
}

interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LOG_LEVELS = {
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function getLogLevel(): number {
  return process.env.NODE_ENV === 'development' ? LOG_LEVELS.INFO : LOG_LEVELS.INFO;
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

class LoggerImpl implements Logger {
  private shouldLog(level: number): boolean {
    return level >= getLogLevel();
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