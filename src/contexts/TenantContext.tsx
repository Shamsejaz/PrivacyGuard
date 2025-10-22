import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantUser, Permission } from '../types';

interface TenantContextType {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  tenantUsers: TenantUser[];
  permissions: Permission[];
  switchTenant: (tenantId: string) => Promise<void>;
  updateTenant: (tenant: Partial<Tenant>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // Admin functions
  createTenant: (tenantData: Partial<Tenant>) => Promise<Tenant>;
  deleteTenant: (tenantId: string) => Promise<void>;
  // User management
  inviteUser: (email: string, role: string, permissions: Permission[]) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: Permission[]) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize tenant context
  useEffect(() => {
    const initializeTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check for saved tenant in localStorage
        const savedTenantId = localStorage.getItem('privacycomply_current_tenant');
        
        // Mock data for development - in production this would come from API
        const mockTenants: Tenant[] = [
          {
            id: 'tenant-1',
            name: 'Acme Corporation',
            domain: 'acme.com',
            subscription: {
              id: 'sub-1',
              name: 'enterprise',
              features: ['advanced_analytics', 'custom_integrations', 'priority_support'],
              limits: {
                users: 100,
                dataSources: 50,
                storage: 1000,
                apiCalls: 100000
              },
              price: {
                monthly: 999,
                annual: 9990,
                currency: 'USD'
              }
            },
            complianceFrameworks: [
              {
                id: 'gdpr-1',
                name: 'GDPR',
                version: '2018',
                enabled: true,
                configuration: {}
              },
              {
                id: 'ccpa-1',
                name: 'CCPA',
                version: '2020',
                enabled: true,
                configuration: {}
              }
            ],
            dataResidency: {
              id: 'eu-west-1',
              name: 'Europe West',
              code: 'EU',
              dataCenter: 'Frankfurt',
              regulations: ['GDPR', 'DPA']
            },
            customization: {
              branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#1E40AF'
              },
              theme: 'light',
              language: 'en',
              timezone: 'Europe/London',
              dateFormat: 'DD/MM/YYYY'
            },
            status: 'active',
            createdAt: new Date('2023-01-15'),
            updatedAt: new Date(),
            settings: {
              security: {
                mfaRequired: true,
                sessionTimeout: 480,
                passwordPolicy: {
                  minLength: 12,
                  requireUppercase: true,
                  requireLowercase: true,
                  requireNumbers: true,
                  requireSpecialChars: true,
                  expirationDays: 90
                }
              },
              notifications: {
                email: true,
                sms: false,
                inApp: true
              },
              dataRetention: {
                defaultPeriod: 2555, // 7 years
                autoDelete: false
              },
              integrations: {
                enabled: ['salesforce', 'slack', 'jira'],
                configurations: {}
              }
            }
          },
          {
            id: 'tenant-2',
            name: 'TechStart Inc',
            domain: 'techstart.io',
            subscription: {
              id: 'sub-2',
              name: 'professional',
              features: ['standard_analytics', 'basic_integrations'],
              limits: {
                users: 25,
                dataSources: 10,
                storage: 100,
                apiCalls: 10000
              },
              price: {
                monthly: 299,
                annual: 2990,
                currency: 'USD'
              }
            },
            complianceFrameworks: [
              {
                id: 'gdpr-2',
                name: 'GDPR',
                version: '2018',
                enabled: true,
                configuration: {}
              }
            ],
            dataResidency: {
              id: 'us-east-1',
              name: 'US East',
              code: 'US',
              dataCenter: 'Virginia',
              regulations: ['CCPA', 'CPRA']
            },
            customization: {
              branding: {
                primaryColor: '#10B981',
                secondaryColor: '#059669'
              },
              theme: 'dark',
              language: 'en',
              timezone: 'America/New_York',
              dateFormat: 'MM/DD/YYYY'
            },
            status: 'active',
            createdAt: new Date('2023-06-01'),
            updatedAt: new Date(),
            settings: {
              security: {
                mfaRequired: false,
                sessionTimeout: 240,
                passwordPolicy: {
                  minLength: 8,
                  requireUppercase: true,
                  requireLowercase: true,
                  requireNumbers: true,
                  requireSpecialChars: false,
                  expirationDays: 180
                }
              },
              notifications: {
                email: true,
                sms: true,
                inApp: true
              },
              dataRetention: {
                defaultPeriod: 1095, // 3 years
                autoDelete: true
              },
              integrations: {
                enabled: ['slack'],
                configurations: {}
              }
            }
          }
        ];

        setAvailableTenants(mockTenants);

        // Set current tenant
        let tenant = mockTenants[0]; // Default to first tenant
        if (savedTenantId) {
          const foundTenant = mockTenants.find(t => t.id === savedTenantId);
          if (foundTenant) {
            tenant = foundTenant;
          }
        }

        setCurrentTenant(tenant);
        localStorage.setItem('privacycomply_current_tenant', tenant.id);

        // Load tenant-specific data
        await loadTenantData(tenant.id);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize tenant');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, []);

  const loadTenantData = async (tenantId: string) => {
    // Mock tenant users and permissions
    const mockUsers: TenantUser[] = [
      {
        id: 'user-1',
        name: 'Sarah Johnson',
        email: 'sarah@acme.com',
        role: 'dpo',
        department: 'Legal & Compliance',
        lastLogin: new Date(),
        permissions: ['read', 'write', 'admin'],
        tenantId,
        tenantRole: 'admin',
        lastActiveAt: new Date()
      }
    ];

    const mockPermissions: Permission[] = [
      {
        id: 'perm-1',
        name: 'View Dashboard',
        resource: 'dashboard',
        action: 'read',
        scope: 'tenant'
      },
      {
        id: 'perm-2',
        name: 'Manage Users',
        resource: 'users',
        action: 'admin',
        scope: 'tenant'
      },
      {
        id: 'perm-3',
        name: 'Configure Compliance',
        resource: 'compliance',
        action: 'update',
        scope: 'tenant'
      }
    ];

    setTenantUsers(mockUsers);
    setPermissions(mockPermissions);
  };

  const switchTenant = async (tenantId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const tenant = availableTenants.find(t => t.id === tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      setCurrentTenant(tenant);
      localStorage.setItem('privacycomply_current_tenant', tenantId);

      // Load tenant-specific data
      await loadTenantData(tenantId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenant = async (tenantData: Partial<Tenant>) => {
    try {
      setError(null);

      if (!currentTenant) {
        throw new Error('No current tenant');
      }

      // Mock API call - in production this would be a real API call
      const updatedTenant = { ...currentTenant, ...tenantData, updatedAt: new Date() };
      
      setCurrentTenant(updatedTenant);
      setAvailableTenants(prev => 
        prev.map(t => t.id === updatedTenant.id ? updatedTenant : t)
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    }
  };

  const createTenant = async (tenantData: Partial<Tenant>): Promise<Tenant> => {
    try {
      setError(null);

      // Mock API call - in production this would be a real API call
      const newTenant: Tenant = {
        id: `tenant-${Date.now()}`,
        name: tenantData.name || 'New Tenant',
        domain: tenantData.domain || 'example.com',
        subscription: tenantData.subscription || {
          id: 'sub-starter',
          name: 'starter',
          features: ['basic_analytics'],
          limits: { users: 5, dataSources: 3, storage: 10, apiCalls: 1000 },
          price: { monthly: 99, annual: 990, currency: 'USD' }
        },
        complianceFrameworks: tenantData.complianceFrameworks || [],
        dataResidency: tenantData.dataResidency || {
          id: 'us-east-1',
          name: 'US East',
          code: 'US',
          dataCenter: 'Virginia',
          regulations: []
        },
        customization: tenantData.customization || {
          branding: { primaryColor: '#3B82F6', secondaryColor: '#1E40AF' },
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY'
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: tenantData.settings || {
          security: {
            mfaRequired: false,
            sessionTimeout: 240,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: false,
              expirationDays: 90
            }
          },
          notifications: { email: true, sms: false, inApp: true },
          dataRetention: { defaultPeriod: 1095, autoDelete: false },
          integrations: { enabled: [], configurations: {} }
        }
      };

      setAvailableTenants(prev => [...prev, newTenant]);
      return newTenant;

    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create tenant';
      setError(error);
      throw new Error(error);
    }
  };

  const deleteTenant = async (tenantId: string) => {
    try {
      setError(null);

      // Mock API call - in production this would be a real API call
      setAvailableTenants(prev => prev.filter(t => t.id !== tenantId));

      // If deleting current tenant, switch to another one
      if (currentTenant?.id === tenantId) {
        const remainingTenants = availableTenants.filter(t => t.id !== tenantId);
        if (remainingTenants.length > 0) {
          await switchTenant(remainingTenants[0].id);
        } else {
          setCurrentTenant(null);
          localStorage.removeItem('privacycomply_current_tenant');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    }
  };

  const inviteUser = async (email: string, role: string, permissions: Permission[]) => {
    try {
      setError(null);

      if (!currentTenant) {
        throw new Error('No current tenant');
      }

      // Mock API call - in production this would send an invitation email
      const newUser: TenantUser = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: role as any,
        department: 'Invited',
        lastLogin: new Date(),
        permissions: permissions.map(p => p.name),
        tenantId: currentTenant.id,
        tenantRole: role as any,
        invitedAt: new Date(),
        lastActiveAt: new Date()
      };

      setTenantUsers(prev => [...prev, newUser]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const removeUser = async (userId: string) => {
    try {
      setError(null);

      // Mock API call
      setTenantUsers(prev => prev.filter(u => u.id !== userId));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const updateUserPermissions = async (userId: string, newPermissions: Permission[]) => {
    try {
      setError(null);

      // Mock API call
      setTenantUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, permissions: newPermissions.map(p => p.name) }
            : u
        )
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user permissions');
    }
  };

  const value: TenantContextType = {
    currentTenant,
    availableTenants,
    tenantUsers,
    permissions,
    switchTenant,
    updateTenant,
    isLoading,
    error,
    createTenant,
    deleteTenant,
    inviteUser,
    removeUser,
    updateUserPermissions
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
