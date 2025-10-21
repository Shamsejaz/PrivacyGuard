import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { Tenant } from '../../types';

interface TenantAwareProps {
  tenant?: Tenant;
  tenantId?: string;
  children?: React.ReactNode;
}

// Higher-order component to make any component tenant-aware
export function withTenantContext<P extends object>(
  WrappedComponent: React.ComponentType<P & TenantAwareProps>
) {
  return function TenantAwareComponent(props: P) {
    const { currentTenant } = useTenant();
    
    return (
      <WrappedComponent
        {...props}
        tenant={currentTenant}
        tenantId={currentTenant?.id}
      />
    );
  };
}

// Hook for tenant-aware data filtering
export function useTenantFilter() {
  const { currentTenant } = useTenant();
  
  const filterByTenant = <T extends { tenantId?: string }>(items: T[]): T[] => {
    if (!currentTenant) return [];
    return items.filter(item => item.tenantId === currentTenant.id);
  };
  
  const addTenantId = <T extends object>(item: T): T & { tenantId: string } => {
    if (!currentTenant) {
      throw new Error('No current tenant available');
    }
    return { ...item, tenantId: currentTenant.id };
  };
  
  return {
    currentTenant,
    filterByTenant,
    addTenantId,
    hasTenant: !!currentTenant
  };
}

// Component for tenant-specific branding
export const TenantBranding: React.FC = () => {
  const { currentTenant } = useTenant();
  
  if (!currentTenant?.customization?.branding) {
    return null;
  }
  
  const { branding } = currentTenant.customization;
  
  React.useEffect(() => {
    // Apply tenant-specific CSS custom properties
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--tenant-primary-color', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--tenant-secondary-color', branding.secondaryColor);
    }
    
    // Update favicon if provided
    if (branding.favicon) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.favicon;
      }
    }
    
    return () => {
      // Cleanup on unmount or tenant change
      root.style.removeProperty('--tenant-primary-color');
      root.style.removeProperty('--tenant-secondary-color');
    };
  }, [branding]);
  
  return null; // This component only applies styles
};

// Tenant-aware data display component
interface TenantDataDisplayProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export const TenantDataDisplay: React.FC<TenantDataDisplayProps> = ({
  data,
  renderItem,
  emptyMessage = 'No data available for this tenant',
  className = ''
}) => {
  const { filterByTenant, hasTenant } = useTenantFilter();
  
  if (!hasTenant) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        Please select a tenant to view data
      </div>
    );
  }
  
  const filteredData = filterByTenant(data);
  
  if (filteredData.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className={className}>
      {filteredData.map(renderItem)}
    </div>
  );
};

// Tenant-aware form wrapper
interface TenantFormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  className?: string;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  onSubmit,
  children,
  className = ''
}) => {
  const { addTenantId, hasTenant } = useTenantFilter();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasTenant) {
      console.error('Cannot submit form without tenant context');
      return;
    }
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    const dataWithTenant = addTenantId(data);
    
    onSubmit(dataWithTenant);
  };
  
  if (!hasTenant) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please select a tenant to use this form
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
};

// Tenant access control component
interface TenantAccessControlProps {
  requiredFeatures?: string[];
  requiredSubscription?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const TenantAccessControl: React.FC<TenantAccessControlProps> = ({
  requiredFeatures = [],
  requiredSubscription = [],
  fallback,
  children
}) => {
  const { currentTenant } = useTenant();
  
  if (!currentTenant) {
    return fallback || (
      <div className="text-center text-gray-500 py-8">
        Tenant access required
      </div>
    );
  }
  
  // Check subscription tier
  if (requiredSubscription.length > 0) {
    const hasSubscription = requiredSubscription.includes(currentTenant.subscription.name);
    if (!hasSubscription) {
      return fallback || (
        <div className="text-center text-yellow-600 py-8">
          This feature requires a {requiredSubscription.join(' or ')} subscription
        </div>
      );
    }
  }
  
  // Check features
  if (requiredFeatures.length > 0) {
    const hasAllFeatures = requiredFeatures.every(feature =>
      currentTenant.subscription.features.includes(feature)
    );
    
    if (!hasAllFeatures) {
      return fallback || (
        <div className="text-center text-yellow-600 py-8">
          This feature is not available in your current subscription plan
        </div>
      );
    }
  }
  
  return <>{children}</>;
};

// Tenant compliance framework filter
interface TenantComplianceFilterProps {
  frameworks: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const TenantComplianceFilter: React.FC<TenantComplianceFilterProps> = ({
  frameworks,
  children,
  fallback
}) => {
  const { currentTenant } = useTenant();
  
  if (!currentTenant) {
    return fallback || null;
  }
  
  const hasFramework = frameworks.some(framework =>
    currentTenant.complianceFrameworks.some(cf => 
      cf.name === framework && cf.enabled
    )
  );
  
  if (!hasFramework) {
    return fallback || null;
  }
  
  return <>{children}</>;
};