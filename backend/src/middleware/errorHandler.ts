import express from 'express';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
import { logger } from '../utils/logger';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements APIError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements APIError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements APIError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements APIError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements APIError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error implements APIError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
  }
}

export class ExternalServiceError extends Error implements APIError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ExternalServiceError';
    this.details = details;
  }
}

export function errorHandler(
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log error details
  logger.error('API Error:', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Prepare error response
  const errorResponse: any = {
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId,
      path: req.originalUrl,
    },
  };

  // Add details for client errors (4xx) but not server errors (5xx) in production
  if (statusCode < 500 || process.env.NODE_ENV !== 'production') {
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Handle specific error types
  switch (error.name) {
    case 'ValidationError':
      errorResponse.error.message = 'Validation failed';
      break;
    
    case 'CastError':
      errorResponse.error.code = 'INVALID_ID';
      errorResponse.error.message = 'Invalid resource ID format';
      break;
    
    case 'MongoError':
    case 'MongoServerError':
      if (error.message.includes('duplicate key')) {
        errorResponse.error.code = 'DUPLICATE_RESOURCE';
        errorResponse.error.message = 'Resource already exists';
      } else {
        errorResponse.error.code = 'DATABASE_ERROR';
        errorResponse.error.message = 'Database operation failed';
      }
      break;
    
    case 'JsonWebTokenError':
      errorResponse.error.code = 'INVALID_TOKEN';
      errorResponse.error.message = 'Invalid authentication token';
      break;
    
    case 'TokenExpiredError':
      errorResponse.error.code = 'TOKEN_EXPIRED';
      errorResponse.error.message = 'Authentication token has expired';
      break;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
