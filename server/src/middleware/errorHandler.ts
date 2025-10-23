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

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    
    // Add validation details if available
    if (error.name === 'ValidationError' && (error as any).details) {
      details = (error as any).details;
    }
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors?.map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry';
    details = error.errors?.map((err: any) => ({
      field: err.path,
      message: `${err.path} already exists`,
      value: err.value,
    }));
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Foreign key constraint violation';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    message = 'File not found';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON format';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request entity too large';
  }

  // Log error (in production, use proper logging)
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Send error response
  const response: any = {
    success: false,
    message,
    error: {
      type: error.name || 'UnknownError',
      ...(details && { details }),
    },
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
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