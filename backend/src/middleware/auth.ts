import express from 'express';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
import * as jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No valid authentication token provided');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Authentication token has expired'));
    } else {
      next(error);
    }
  }
}

export function authorize(requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has admin role (full access)
    if (req.user.role === 'admin' || userPermissions.includes('*')) {
      return next();
    }
    
    // Check specific permissions
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission) ||
      userPermissions.some(userPerm => 
        userPerm.endsWith(':*') && permission.startsWith(userPerm.slice(0, -1))
      )
    );
    
    if (!hasPermission) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
}

// Alias for authenticate function for backward compatibility
export const authenticateToken = authenticate;
