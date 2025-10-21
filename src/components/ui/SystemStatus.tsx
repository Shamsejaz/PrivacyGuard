import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Settings, X } from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  databases?: {
    postgresql: string;
    mongodb: string;
    redis: string;
  };
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export const SystemStatusIndicator: React.FC<{
  className?: string;
  showDetails?: boolean;
}> = ({ className = '', showDetails = false }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    fetchAlerts();

    // Poll system health every 30 seconds
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/alerts?resolved=false');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full" />
        <span className="text-sm text-gray-500">Checking status...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Status unavailable</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-2 ${getStatusColor(health.status)} hover:opacity-80 transition-opacity`}
      >
        {getStatusIcon(health.status)}
        <span className="text-sm font-medium capitalize">{health.status}</span>
        {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {criticalAlerts.length + highAlerts.length}
          </span>
        )}
        {showDetails && (
          <Settings className="h-3 w-3" />
        )}
      </button>

      {isExpanded && showDetails && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                System Status
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Status</span>
                <div className={`flex items-center space-x-1 ${getStatusColor(health.status)}`}>
                  {getStatusIcon(health.status)}
                  <span className="text-sm font-medium capitalize">{health.status}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Uptime</span>
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {formatUptime(health.uptime)}
                </span>
              </div>

              {/* Database Status */}
              {health.databases && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Databases
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(health.databases).map(([db, status]) => (
                      <div key={db} className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                          {db}
                        </span>
                        <div className={`flex items-center space-x-1 ${
                          status === 'connected' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {status === 'connected' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          <span className="text-xs">{status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory Usage */}
              {health.memory && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Memory Usage
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Heap Used</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {formatMemory(health.memory.heapUsed)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Heap Total</span>
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {formatMemory(health.memory.heapTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Alerts */}
              {alerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Active Alerts ({alerts.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-2 rounded text-xs ${
                          alert.severity === 'critical'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : alert.severity === 'high'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : alert.severity === 'medium'
                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {alerts.length > 5 && (
                      <div className="text-xs text-neutral-500 text-center">
                        +{alerts.length - 5} more alerts
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-neutral-500 text-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                Last updated: {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Maintenance notification component
export const MaintenanceNotification: React.FC<{
  isVisible: boolean;
  message?: string;
  scheduledTime?: string;
  onDismiss?: () => void;
}> = ({
  isVisible,
  message = 'Scheduled maintenance is planned.',
  scheduledTime,
  onDismiss,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 text-center text-sm z-50">
      <div className="flex items-center justify-center space-x-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{message}</span>
        {scheduledTime && (
          <span className="font-medium">Scheduled for: {scheduledTime}</span>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-yellow-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};