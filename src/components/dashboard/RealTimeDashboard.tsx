import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardMetrics } from '../../hooks/useWebSocket';
import { EventData } from '../../services/websocketService';
import { ConnectionStatusIndicator } from '../ui/NotificationSystem';

interface DashboardMetrics {
  timestamp: string;
  dsarMetrics: {
    totalRequests: number;
    pendingRequests: number;
    completedToday: number;
    averageResponseTime: number;
    statusBreakdown: Record<string, number>;
  };
  riskMetrics: {
    totalAssessments: number;
    highRiskCount: number;
    criticalRiskCount: number;
    riskTrend: 'increasing' | 'decreasing' | 'stable';
    complianceScore: number;
  };
  gdprMetrics: {
    lawfulBasisRecords: number;
    processingActivities: number;
    breachNotifications: number;
    complianceGaps: number;
  };
  policyMetrics: {
    totalPolicies: number;
    activePolicies: number;
    pendingReviews: number;
    expiringPolicies: number;
  };
  systemMetrics: {
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastUpdated: string;
  };
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, trend, trendValue, color = 'blue', isLoading }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} transition-all duration-200 ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white">
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            {trendValue && <span className="text-sm font-medium">{trendValue}</span>}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">
          {isLoading ? '...' : value}
        </p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  );
}

interface ActivityFeedItem {
  id: string;
  type: 'dsar' | 'risk' | 'gdpr' | 'policy' | 'system';
  message: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

function ActivityFeed({ activities }: { activities: ActivityFeedItem[] }) {
  const getActivityIcon = (type: ActivityFeedItem['type']) => {
    switch (type) {
      case 'dsar':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'risk':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'gdpr':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'policy':
        return <Clock className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity?: ActivityFeedItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
        <ConnectionStatusIndicator />
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${getSeverityColor(activity.severity)}`}>
                  {activity.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activity.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RealTimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Handle dashboard metrics updates
  const handleMetricsUpdate = useCallback((event: EventData) => {
    if (event.type === 'metrics_update') {
      setMetrics(event.payload);
      setLastUpdate(new Date());
      setIsLoading(false);
    }
  }, []);

  // Subscribe to dashboard metrics
  useDashboardMetrics(handleMetricsUpdate);

  // Add activity when events are received
  const addActivity = useCallback((type: ActivityFeedItem['type'], message: string, severity?: ActivityFeedItem['severity']) => {
    const newActivity: ActivityFeedItem = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      severity
    };

    setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep last 20 activities
  }, []);

  // Load initial metrics
  useEffect(() => {
    const loadInitialMetrics = async () => {
      try {
        // In a real implementation, this would fetch from the API
        // For now, we'll simulate loading
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to load initial metrics:', error);
        setIsLoading(false);
      }
    };

    loadInitialMetrics();
  }, []);

  // Simulate some activities for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const activities = [
        { type: 'dsar' as const, message: 'New DSAR request submitted', severity: 'medium' as const },
        { type: 'risk' as const, message: 'High risk assessment completed', severity: 'high' as const },
        { type: 'gdpr' as const, message: 'GDPR compliance check passed', severity: 'low' as const },
        { type: 'policy' as const, message: 'Policy review due in 7 days', severity: 'medium' as const },
        { type: 'system' as const, message: 'System backup completed successfully', severity: 'low' as const }
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      addActivity(randomActivity.type, randomActivity.message, randomActivity.severity);
    }, 10000); // Add activity every 10 seconds

    return () => clearInterval(interval);
  }, [addActivity]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Real-Time Dashboard</h1>
          <p className="text-gray-600">
            Live privacy compliance monitoring and metrics
            {lastUpdate && (
              <span className="ml-2 text-sm">
                • Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <ConnectionStatusIndicator />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total DSAR Requests"
          value={metrics?.dsarMetrics.totalRequests || 0}
          icon={<Users className="w-6 h-6" />}
          color="blue"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Pending DSARs"
          value={metrics?.dsarMetrics.pendingRequests || 0}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="High Risk Items"
          value={metrics?.riskMetrics.highRiskCount || 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          trend={metrics?.riskMetrics.riskTrend === 'increasing' ? 'up' : 
                 metrics?.riskMetrics.riskTrend === 'decreasing' ? 'down' : 'stable'}
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Compliance Score"
          value={metrics?.riskMetrics.complianceScore ? `${metrics.riskMetrics.complianceScore}%` : '0%'}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users"
          value={metrics?.systemMetrics.activeUsers || 0}
          icon={<Activity className="w-6 h-6" />}
          color="blue"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="System Uptime"
          value={metrics?.systemMetrics.uptime ? formatUptime(metrics.systemMetrics.uptime) : '0m'}
          icon={<TrendingUp className="w-6 h-6" />}
          color={getSystemHealthColor(metrics?.systemMetrics.systemHealth || 'gray')}
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Active Policies"
          value={metrics?.policyMetrics.activePolicies || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          isLoading={isLoading}
        />
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>
        
        {/* Quick Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed Today</span>
              <span className="font-semibold text-green-600">
                {metrics?.dsarMetrics.completedToday || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <span className="font-semibold text-blue-600">
                {metrics?.dsarMetrics.averageResponseTime || 0} days
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Compliance Gaps</span>
              <span className="font-semibold text-red-600">
                {metrics?.gdprMetrics.complianceGaps || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Reviews</span>
              <span className="font-semibold text-yellow-600">
                {metrics?.policyMetrics.pendingReviews || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}