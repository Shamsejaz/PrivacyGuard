import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from './errorHandler';
import { DEFAULT_PERMISSIONS } from '../config/permissions';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export function validatePermission(resource: string, action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const { role, permissions } = req.user;
      const requiredPermission = `${resource}:${action}`;

      // Admin has all permissions
      if (role === 'admin') {
        return next();
      }

      // Check if user has the specific permission
      if (permissions.includes(requiredPermission)) {
        return next();
      }

      // Check if user has wildcard permission for the resource
      if (permissions.includes(`${resource}:*`)) {
        return next();
      }

      // Check if user has global wildcard permission
      if (permissions.includes('*')) {
        return next();
      }

      // Check default role permissions
      const rolePermissions = DEFAULT_PERMISSIONS[role] || [];
      if (rolePermissions.includes(requiredPermission) || rolePermissions.includes(`${resource}:*`)) {
        return next();
      }

      throw new AuthorizationError(`Insufficient permissions. Required: ${requiredPermission}`);

    } catch (error) {
      next(error);
    }
  };
}

export function hasPermission(userRole: string, userPermissions: string[], resource: string, action: string): boolean {
  const requiredPermission = `${resource}:${action}`;

  // Admin has all permissions
  if (userRole === 'admin') {
    return true;
  }

  // Check specific permission
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check wildcard permission for resource
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // Check global wildcard
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check default role permissions
  const rolePermissions = DEFAULT_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(requiredPermission) || rolePermissions.includes(`${resource}:*`);
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAnyPermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const { role, permissions: userPermissions } = req.user;

      // Admin has all permissions
      if (role === 'admin') {
        return next();
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(role, userPermissions, resource, action);
      });

      if (!hasAnyPermission) {
        throw new AuthorizationError(`Insufficient permissions. Required any of: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAllPermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const { role, permissions: userPermissions } = req.user;

      // Admin has all permissions
      if (role === 'admin') {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(role, userPermissions, resource, action);
      });

      if (!hasAllPermissions) {
        throw new AuthorizationError(`Insufficient permissions. Required all of: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}