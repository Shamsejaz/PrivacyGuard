import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auditService } from '../services/auditService';
import { AuditConfiguration, AuditAlert, AuditStatistics } from '../types/audit';
import { useAuth } from './AuthContext';

interface AuditContextType {
  configuration: AuditConfiguration | null;
  alerts: AuditAlert[];
  statistics: AuditStatistics | null;
  isLoading: boolean;
  error: string | null;
  updateConfiguration: (config: Partial<AuditConfiguration>) => Promise<void>;
  createAlert: (alert: Omit<AuditAlert, 'id' | 'createdAt'>) => Promise<void>;
  refreshStatistics: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};

interface AuditProviderProps {
  children: ReactNode;
}

export const AuditProvider: React.FC<AuditProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [configuration, setConfiguration] = useState<AuditConfiguration | null>(null);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadInitialData();
    }
  }, [isAuthenticated, user]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load configuration and alerts in parallel
      const [configResult, alertsResult] = await Promise.allSettled([
        auditService.getConfiguration(),
        loadAlerts()
      ]);

      if (configResult.status === 'fulfilled') {
        setConfiguration(configResult.value);
      } else {
        console.error('Failed to load audit configuration:', configResult.reason);
      }

      if (alertsResult.status === 'fulfilled') {
        setAlerts(alertsResult.value);
      } else {
        console.error('Failed to load audit alerts:', alertsResult.reason);
      }

      // Load statistics for the last 30 days
      await refreshStatistics();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlerts = async (): Promise<AuditAlert[]> => {
    try {
      const response = await fetch('/api/audit/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('privacyguard_session')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load alerts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to load audit alerts:', error);
      return [];
    }
  };

  const updateConfiguration = async (config: Partial<AuditConfiguration>) => {
    try {
      setIsLoading(true);
      setError(null);

      await auditService.updateConfiguration(config);
      
      // Reload configuration to get the updated version
      const updatedConfig = await auditService.getConfiguration();
      setConfiguration(updatedConfig);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createAlert = async (alert: Omit<AuditAlert, 'id' | 'createdAt'>) => {
    try {
      setIsLoading(true);
      setError(null);

      const createdAlert = await auditService.createAlert(alert);
      setAlerts(prev => [...prev, createdAlert]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create alert';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatistics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const stats = await auditService.getStatistics({
        startDate,
        endDate,
        limit: 1000
      });

      setStatistics(stats);
    } catch (error) {
      console.error('Failed to refresh audit statistics:', error);
    }
  };

  const refreshAlerts = async () => {
    try {
      const alertsData = await loadAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to refresh audit alerts:', error);
    }
  };

  const contextValue: AuditContextType = {
    configuration,
    alerts,
    statistics,
    isLoading,
    error,
    updateConfiguration,
    createAlert,
    refreshStatistics,
    refreshAlerts
  };

  return (
    <AuditContext.Provider value={contextValue}>
      {children}
    </AuditContext.Provider>
  );
};

export default AuditProvider;