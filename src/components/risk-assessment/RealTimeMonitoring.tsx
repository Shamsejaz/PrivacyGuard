import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: Date;
  history: Array<{ timestamp: Date; value: number }>;
}

const RealTimeMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<MonitoringMetric[]>([
    {
      id: '1',
      name: 'Data Access Anomalies',
      value: 3,
      threshold: 5,
      unit: 'events/hour',
      trend: 'up',
      status: 'warning',
      lastUpdated: new Date(),
      history: []
    },
    {
      id: '2',
      name: 'Failed Login Attempts',
      value: 12,
      threshold: 20,
      unit: 'attempts/hour',
      trend: 'down',
      status: 'normal',
      lastUpdated: new Date(),
      history: []
    },
    {
      id: '3',
      name: 'PII Exposure Risk',
      value: 23,
      threshold: 30,
      unit: 'risk score',
      trend: 'stable',
      status: 'warning',
      lastUpdated: new Date(),
      history: []
    },
    {
      id: '4',
      name: 'Compliance Violations',
      value: 1,
      threshold: 3,
      unit: 'violations',
      trend: 'up',
      status: 'critical',
      lastUpdated: new Date(),
      history: []
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        const newValue = Math.max(0, metric.value + (Math.random() - 0.5) * 2);
        const newStatus = newValue >= metric.threshold ? 'critical' : 
                         newValue >= metric.threshold * 0.7 ? 'warning' : 'normal';
        
        return {
          ...metric,
          value: newValue,
          status: newStatus,
          lastUpdated: new Date(),
          history: [...metric.history.slice(-20), { timestamp: new Date(), value: newValue }]
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'normal': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'warning': return <Badge variant="warning">Warning</Badge>;
      case 'normal': return <Badge variant="success">Normal</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">{metric.name}</h3>
              </div>
              {getStatusBadge(metric.status)}
            </div>

            <div className="text-center mb-4">
              <div className={`text-3xl font-bold mb-1 ${getStatusColor(metric.status)}`}>
                {metric.value.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">{metric.unit}</p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Threshold</span>
                <span>{metric.threshold} {metric.unit}</span>
              </div>
              <ProgressBar 
                value={metric.value} 
                max={metric.threshold * 1.2}
                variant={metric.status === 'critical' ? 'danger' : 
                        metric.status === 'warning' ? 'warning' : 'success'} 
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className="text-gray-600">Trend</span>
              </div>
              <span className="text-gray-500">
                {metric.lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Health Overview</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live Monitoring</span>
            </div>
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Systems Operational</span>
            </div>
            <p className="text-sm text-green-700">All critical systems are functioning normally</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Monitoring Alerts</span>
            </div>
            <p className="text-sm text-yellow-700">2 metrics approaching warning thresholds</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Response Time</span>
            </div>
            <p className="text-sm text-blue-700">Average response time: 1.2 seconds</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RealTimeMonitoring;