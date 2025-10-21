import React, { ReactNode } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';

interface TenantRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  fallback?: ReactNode;
}

export const TenantRoute: React.FC<TenantRouteProps> = ({ 
  children, 
  requiredPermissions = [],
  fallback 
}) => {
  const { currentTenant, isLoading, error } = useTenant();
  const { user, isAuthenticated } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Tenant Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  // Require authentication
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">Authentication Required</div>
          <div className="text-gray-500">Please log in to access this resource.</div>
        </div>
      </div>
    );
  }

  // Require tenant
  if (!currentTenant) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">No Tenant Selected</div>
          <div className="text-gray-500">Please select a tenant to continue.</div>
        </div>
      </div>
    );
  }

  // Check tenant status
  if (currentTenant.status !== 'active') {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-yellow-600 text-xl mb-4">Tenant Inactive</div>
          <div className="text-gray-500">
            This tenant is currently {currentTenant.status}. Please contact support.
          </div>
        </div>
      </div>
    );
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Access Denied</div>
            <div className="text-gray-500">
              You don't have the required permissions to access this resource.
            </div>
          </div>
        </div>
      );
    }
  }

  // Render children with tenant context
  return <>{children}</>;
};

// Higher-order component for tenant-aware routing
export const withTenantRoute = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[]
) => {
  return (props: P) => (
    <TenantRoute requiredPermissions={requiredPermissions}>
      <Component {...props} />
    </TenantRoute>
  );
};