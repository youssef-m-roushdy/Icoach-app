import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;
  let errorCode: string = 'INTERNAL_ERROR';

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.name.replace('Error', '').toUpperCase();
    
    // Add validation details if available
    if (error.name === 'ValidationError' && (error as any).details) {
      details = (error as any).details;
      errorCode = 'VALIDATION_ERROR';
    }
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Invalid data provided';
    errorCode = 'VALIDATION_ERROR';
    details = error.errors?.map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'The provided data conflicts with existing records';
    errorCode = 'DUPLICATE_ERROR';
    details = error.errors?.map((err: any) => ({
      field: err.path,
      message: `${err.path} already exists`,
    }));
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to related data';
    errorCode = 'REFERENCE_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errorCode = 'EXPIRED_TOKEN';
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    message = 'Requested resource not found';
    errorCode = 'RESOURCE_NOT_FOUND';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid request format';
    errorCode = 'INVALID_FORMAT';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request size exceeds limit';
    errorCode = 'REQUEST_TOO_LARGE';
  } else {
    // For unknown errors, provide a generic message
    statusCode = 500;
    message = 'An unexpected error occurred';
    errorCode = 'INTERNAL_ERROR';
  }

  // Log error for debugging (but not to user)
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  }

  // Build clean error response
  const response: any = {
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details && { details }),
    },
  };

  // Only add technical details in development for specific errors
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.error.technical = {
      type: error.name || 'UnknownError',
      originalMessage: error.message,
    };
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: {
      type: 'NotFoundError',
    },
  });
};

/**
 * Async error wrapper
 * Catches errors from async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};