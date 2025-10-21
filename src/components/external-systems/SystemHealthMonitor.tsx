import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { externalSystemService, type ConnectionHealth, type ConnectionMetrics } from '../../services/externalSystemService';

export const SystemHealthMonitor: React.FC = () => {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealthData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadConnectionMetrics(selectedConnection);
    }
  }, [selectedConnection]);

  const loadHealthData = async () => {
    try {
      setRefreshing(true);
      const healthData = await externalSystemService.getSystemHealth();
      setHealth(healthData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadConnectionMetrics = async (connectionId: string) => {
    try {
      const metricsData = await externalSystemService.getConnectionMetrics(connectionId);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load connection metrics:', err);
    }
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getHealthStatus = (healthy: boolean) => {
    return healthy ? 'Healthy' : 'Unhealthy';
  };

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Health Monitor</h2>
          <p className="text-gray-600">Monitor the health and performance of external connections</p>
        </div>
        <button
          onClick={loadHealthData}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Connections Health */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Database Connections</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(health.database).map(([connectionId, healthy]) => (
                  <div
                    key={connectionId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedConnection === connectionId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedConnection(connectionId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getHealthIcon(healthy)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{connectionId}</p>
                          <p className={`text-sm ${getHealthColor(healthy)}`}>
                            {getHealthStatus(healthy)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(health.database).length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No database connections</h3>
                    <p className="mt-1 text-sm text-gray-500">Add database connections to monitor their health.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* API Connections Health */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">API Connections</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(health.api).map(([connectionId, healthy]) => (
                  <div
                    key={connectionId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedConnection === connectionId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedConnection(connectionId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getHealthIcon(healthy)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{connectionId}</p>
                          <p className={`text-sm ${getHealthColor(healthy)}`}>
                            {getHealthStatus(healthy)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(health.api).length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No API connections</h3>
                    <p className="mt-1 text-sm text-gray-500">Add API connections to monitor their health.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Metrics */}
      {selectedConnection && metrics && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Connection Metrics: {selectedConnection}
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.metrics.totalRequests}
                </div>
                <div className="text-sm text-gray-500">Total Requests</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.metrics.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Success Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.metrics.averageResponseTime.toFixed(0)}ms
                </div>
                <div className="text-sm text-gray-500">Avg Response Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {metrics.metrics.errorRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Error Rate</div>
              </div>
            </div>

            {/* Circuit Breaker Status */}
            {metrics.circuitBreaker && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Circuit Breaker Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      metrics.circuitBreaker.state === 'closed' ? 'bg-green-100 text-green-800' :
                      metrics.circuitBreaker.state === 'open' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {metrics.circuitBreaker.state.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Failures: {metrics.circuitBreaker.failureCount}
                  </div>
                  <div className="text-sm text-gray-600">
                    Success: {metrics.circuitBreaker.successCount}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Request History */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Requests</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {metrics.history.slice(0, 10).map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {request.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {request.success ? 'Success' : 'Failed'}
                        </p>
                        {request.error && (
                          <p className="text-xs text-red-600">{request.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {request.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};