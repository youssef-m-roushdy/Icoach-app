import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('Authentication required. Please provide a valid authorization token.');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format. Use Bearer token.');
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      throw new UnauthorizedError('Authentication token is missing.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT configuration error');
    }

    const decoded = jwt.verify(token, secret) as any;
    
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid authentication token. Please login again.'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Authentication token has expired. Please login again.'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to authorize based on user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        throw new UnauthorizedError('Authentication required to access this resource.');
      }

      if (!roles.includes(user.role)) {
        throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user owns the resource or is admin
 */
export const authorizeOwnerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const id = req.params.id;
    
    if (!user) {
      throw new UnauthorizedError('Authentication required to access this resource.');
    }

    if (!id) {
      throw new ForbiddenError('Resource identifier is required.');
    }

    const resourceUserId = parseInt(id);
    if (isNaN(resourceUserId)) {
      throw new ForbiddenError('Invalid resource identifier.');
    }

    // Allow if user is admin or owns the resource
    if (user.role === 'admin' || user.id === resourceUserId) {
      next();
    } else {
      throw new ForbiddenError('Access denied. You can only access your own resources.');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present and valid, but doesn't require authentication
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next();
    }

    const decoded = jwt.verify(token, secret) as any;
    
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // If token is invalid, continue without user info
    next();
  }
};