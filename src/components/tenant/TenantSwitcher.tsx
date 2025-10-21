import React, { useState } from 'react';
import { ChevronDown, Building2, Check, AlertCircle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';

export const TenantSwitcher: React.FC = () => {
  const { 
    currentTenant, 
    availableTenants, 
    switchTenant, 
    isLoading, 
    error 
  } = useTenant();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Only show for admin users or users with multiple tenants
  if (!user || (user.role !== 'admin' && availableTenants.length <= 1)) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitching(true);
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch tenant:', err);
    } finally {
      setSwitching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || switching}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <Building2 className="w-4 h-4" />
        <span className="max-w-32 truncate">
          {currentTenant?.name || 'Select Tenant'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Available Tenants
            </div>
            
            {error && (
              <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {availableTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSwitch(tenant.id)}
                  disabled={switching}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {tenant.name}
                        </div>
                        {currentTenant?.id === tenant.id && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {tenant.domain}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                          {tenant.status}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {tenant.subscription.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {user.role === 'admin' && (
              <div className="border-t border-gray-100 px-4 py-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to tenant management - this would be handled by routing
                    console.log('Navigate to tenant management');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Manage Tenants
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {switching && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};