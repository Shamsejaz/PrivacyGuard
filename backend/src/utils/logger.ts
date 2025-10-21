import * as winston from 'winston';
import { join } from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }) as winston.transport,
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }) as winston.transport,
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }) as winston.transport
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error?: any, context?: any) => {
  logger.error(message, {
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : undefined,
    context,
  });
};

export const logInfo = (message: string, context?: any) => {
  logger.info(message, { context });
};

export const logWarn = (message: string, context?: any) => {
  logger.warn(message, { context });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug(message, { context });
};

// Audit logging for compliance
export const auditLog = (action: string, userId?: string, resourceType?: string, resourceId?: string, details?: any) => {
  logger.info('AUDIT', {
    action,
    userId,
    resourceType,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Performance logging
export const performanceLog = (operation: string, duration: number, context?: any) => {
  logger.info('PERFORMANCE', {
    operation,
    duration,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Security logging
export const securityLog = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  logger.warn('SECURITY', {
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
  });
};
