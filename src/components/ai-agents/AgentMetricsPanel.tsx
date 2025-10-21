import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Activity, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AIAgent, AgentAnalytics, AnalyticsTrend } from '../../types/ai-agents';
import { useAgentAnalytics } from '../../hooks/useAgentAnalytics';

interface AgentMetricsPanelProps {
  agent: AIAgent;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentMetricsPanel: React.FC<AgentMetricsPanelProps> = ({
  agent,
  isOpen,
  onClose
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const { 
    analytics, 
    isLoading, 
    error, 
    refreshAnalytics 
  } = useAgentAnalytics(agent.id, timeRange);

  useEffect(() => {
    if (isOpen) {
      refreshAnalytics();
    }
  }, [isOpen, timeRange, refreshAnalytics]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Metrics</h2>
            <p className="text-sm text-gray-600">{agent.name} ({agent.type})</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Metrics</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refreshAnalytics}>Retry</Button>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Status</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{agent.status}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tasks in Progress</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.metrics.tasksInProgress}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-lg font-semibold text-green-600">{agent.metrics.successRate.toFixed(1)}%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uptime</p>
                      <p className="text-lg font-semibold text-blue-600">{agent.metrics.uptime.toFixed(1)}%</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{analytics.metrics.totalTasks}</p>
                    <p className="text-sm text-gray-600">Total Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{analytics.metrics.successfulTasks}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{analytics.metrics.failedTasks}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatDuration(analytics.metrics.averageResponseTime)}</p>
                    <p className="text-sm text-gray-600">Avg Response</p>
                  </div>
                </div>
              </Card>

              {/* Resource Utilization */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Utilization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">CPU</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {analytics.metrics.resourceUtilization.cpu.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${analytics.metrics.resourceUtilization.cpu}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Memory</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {analytics.metrics.resourceUtilization.memory.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${analytics.metrics.resourceUtilization.memory}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Network</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatBytes(analytics.metrics.resourceUtilization.network)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full w-1/3"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Storage</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatBytes(analytics.metrics.resourceUtilization.storage)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full w-1/4"></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Trends */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
                <div className="space-y-4">
                  {analytics.trends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTrendIcon(trend.trend)}
                        <div>
                          <p className="font-medium text-gray-900">{trend.metric}</p>
                          <p className="text-sm text-gray-600">
                            Change rate: {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTrendColor(trend.trend)}`}>
                          {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {trend.values.length} data points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Insights */}
              {analytics.insights.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
                  <div className="space-y-3">
                    {analytics.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <p className="text-sm text-blue-900">{insight}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Peak Usage */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Usage</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Peak usage occurred at:</p>
                    <p className="font-semibold text-gray-900">
                      {analytics.metrics.peakUsage.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {timeRange} period
                  </Badge>
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Metrics Available</h3>
              <p className="text-gray-600">No analytics data available for the selected time range.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={refreshAnalytics}>
            Refresh
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};