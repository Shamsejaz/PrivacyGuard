import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { permissionService, PermissionCheck } from '../../services/permissionService';

interface PermissionGuardProps {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface MultiPermissionGuardProps {
  permissions: PermissionCheck[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Single permission guard
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  conditions,
  fallback = null,
  children
}) => {
  const { user } = useAuth();

  const hasPermission = permissionService.hasPermission(user, resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Multiple permissions guard
export const MultiPermissionGuard: React.FC<MultiPermissionGuardProps> = ({
  permissions,
  requireAll = false,
  fallback = null,
  children
}) => {
  const { user } = useAuth();

  const hasPermission = requireAll
    ? permissionService.hasAllPermissions(user, permissions)
    : permissionService.hasAnyPermission(user, permissions);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for checking permissions in components
export const usePermissions = () => {
  const { user } = useAuth();

  const checkPermission = (resource: string, action: string) => {
    return permissionService.hasPermission(user, resource, action);
  };

  const checkPermissions = (checks: PermissionCheck[], requireAll = false) => {
    return requireAll
      ? permissionService.hasAllPermissions(user, checks)
      : permissionService.hasAnyPermission(user, checks);
  };

  const getPermissionsByResource = (resource: string) => {
    return permissionService.getPermissionsByResource(user, resource);
  };

  return {
    user,
    checkPermission,
    checkPermissions,
    getPermissionsByResource,
    hasPermission: checkPermission,
    hasAnyPermission: (checks: PermissionCheck[]) => checkPermissions(checks, false),
    hasAllPermissions: (checks: PermissionCheck[]) => checkPermissions(checks, true)
  };
};

// Higher-order component for permission-based rendering
export const withPermissions = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: PermissionCheck[],
  requireAll = false,
  fallback?: React.ReactNode
) => {
  return (props: P) => (
    <MultiPermissionGuard
      permissions={requiredPermissions}
      requireAll={requireAll}
      fallback={fallback}
    >
      <WrappedComponent {...props} />
    </MultiPermissionGuard>
  );
};

// Permission-aware button component
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  resource,
  action,
  conditions,
  fallback = null,
  children,
  ...buttonProps
}) => {
  const { user } = useAuth();

  const hasPermission = permissionService.hasPermission(user, resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <button {...buttonProps}>{children}</button>;
};

// Permission-aware link component
interface PermissionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  resource,
  action,
  conditions,
  fallback = null,
  children,
  ...linkProps
}) => {
  const { user } = useAuth();

  const hasPermission = permissionService.hasPermission(user, resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <a {...linkProps}>{children}</a>;
};

export default PermissionGuard;