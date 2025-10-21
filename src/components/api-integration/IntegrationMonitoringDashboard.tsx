import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Settings
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';
import { IntegrationMetrics, AlertConfig } from '../../types/api-integration';

interface IntegrationMonitoringDashboardProps {
  integrationId: string;
}

export const IntegrationMonitoringDashboard: React.FC<IntegrationMonitoringDashboardProps> = ({
  integrationId
}) => {
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [integrationId, timeRange]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const timeRangeMap = {
        '1h': { hours: 1 },
        '24h': { hours: 24 },
        '7d': { days: 7 },
        '30d': { days: 30 }
      };

      const range = timeRangeMap[timeRange];
      const endDate = new Date();
      const startDate = new Date();
      
      if ('hours' in range) {
        startDate.setHours(startDate.getHours() - range.hours);
      } else if ('days' in range) {
        startDate.setDate(startDate.getDate() - range.days);
      }

      const [metricsData, alertsData, activeAlertsData, logsData] = await Promise.all([
        apiIntegrationService.getIntegrationMetrics(integrationId, { startDate, endDate }),
        apiIntegrationService.getAlerts(integrationId),
        apiIntegrationService.getActiveAlerts(),
        apiIntegrationService.getIntegrationLogs(integrationId, { limit: 100 })
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setActiveAlerts(activeAlertsData.filter(alert => alert.integrationId === integrationId));
      setLogs(logsData.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (alertData: Omit<AlertConfig, 'id'>) => {
    try {
      await apiIntegrationService.createAlert(integrationId, alertData);
      await loadMonitoringData();
      setShowCreateAlertModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiIntegrationService.acknowledgeAlert(integrationId, alertId);
      await loadMonitoringData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Message', 'Request ID'].join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.message.replace(/,/g, ';'),
        log.requestId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Integration Monitoring</h2>
          <p className="text-gray-600">Real-time performance metrics and health monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={loadMonitoringData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Active Alerts</h3>
              <div className="mt-2 space-y-2">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.alertName}</p>
                      <p className="text-xs text-gray-500">
                        {alert.message} • Triggered {new Date(alert.triggeredAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Requests"
            value={metrics.totalRequests.toLocaleString()}
            icon={Activity}
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%`}
            icon={CheckCircle}
            color="green"
            trend={metrics.successfulRequests > metrics.failedRequests ? 'up' : 'down'}
          />
          <MetricCard
            title="Avg Response Time"
            value={`${metrics.averageResponseTime.toFixed(0)}ms`}
            icon={Clock}
            color="purple"
          />
          <MetricCard
            title="Uptime"
            value={`${metrics.uptime.toFixed(1)}%`}
            icon={Zap}
            color="green"
            trend={metrics.uptime > 99 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* Detailed Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Successful Requests</span>
                <span className="text-sm font-medium text-green-600">
                  {metrics.successfulRequests.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed Requests</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.failedRequests.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {metrics.errorRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Throughput</span>
                <span className="text-sm font-medium text-gray-900">
                  {metrics.throughput.toFixed(1)} req/min
                </span>
              </div>
              {metrics.lastRequestTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Request</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(metrics.lastRequestTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Alert Configuration</h3>
              <button
                onClick={() => setShowCreateAlertModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Alert
              </button>
            </div>
            
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No alerts configured</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.name}</p>
                      <p className="text-xs text-gray-500">
                        {alert.type} {alert.operator} {alert.threshold}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        alert.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Logs</h3>
          <div className="flex space-x-2">
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs available for the selected time range.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                        log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.requestId || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      {showCreateAlertModal && (
        <CreateAlertModal
          onSave={handleCreateAlert}
          onCancel={() => setShowCreateAlertModal(false)}
        />
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'red';
  trend?: 'up' | 'down';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className="ml-2">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateAlertModalProps {
  onSave: (data: Omit<AlertConfig, 'id'>) => void;
  onCancel: () => void;
}

const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<AlertConfig>>({
    name: '',
    type: 'error_rate',
    threshold: 5,
    operator: 'greater_than',
    duration: 5,
    severity: 'medium',
    notifications: [],
    enabled: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<AlertConfig, 'id'>);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Alert</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Name
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="High error rate alert"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Type
              </label>
              <select
                value={formData.type || 'error_rate'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="error_rate">Error Rate</option>
                <option value="response_time">Response Time</option>
                <option value="uptime">Uptime</option>
                <option value="throughput">Throughput</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator
                </label>
                <select
                  value={formData.operator || 'greater_than'}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="greater_than">Greater than</option>
                  <option value="less_than">Less than</option>
                  <option value="equals">Equals</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threshold
                </label>
                <input
                  type="number"
                  required
                  value={formData.threshold || ''}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  required
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={formData.severity || 'medium'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Alert
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};