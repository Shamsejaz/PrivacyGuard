import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Shield,
  FileText
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  ComplianceMetrics, 
  ComplianceDeadline, 
  ComplianceTrend,
  RiskLevel,
  ComplianceFramework as Framework
} from '../../types/compliance';
import { complianceDashboardService } from '../../services/complianceDashboardService';
import { useAuditLogger } from '../../hooks/useAuditLogger';
import ComplianceDeadlineTracker from './ComplianceDeadlineTracker';
import ComplianceTrendChart from './ComplianceTrendChart';
import RealTimeComplianceAlerts from './RealTimeComplianceAlerts';

interface ComplianceMetricsDashboardProps {
  framework?: Framework;
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

const ComplianceMetricsDashboard: React.FC<ComplianceMetricsDashboardProps> = ({
  framework,
  timeRange = 'month'
}) => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [trends, setTrends] = useState<ComplianceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const { logPageView, logButtonClick } = useAuditLogger({
    component: 'ComplianceMetricsDashboard'
  });

  useEffect(() => {
    loadDashboardData();
    logPageView('compliance_metrics_dashboard', { framework, timeRange });

    // Set up real-time refresh
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [framework, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, deadlinesData, trendsData] = await Promise.all([
        complianceDashboardService.getMetrics(framework, timeRange),
        complianceDashboardService.getDeadlines(framework),
        complianceDashboardService.getTrends(framework, timeRange)
      ]);

      setMetrics(metricsData);
      setDeadlines(deadlinesData);
      setTrends(trendsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await logButtonClick('refresh_compliance_dashboard');
    await loadDashboardData();
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance Dashboard
            {framework && <span className="ml-2 text-blue-600">- {framework}</span>}
          </h1>
          <p className="text-gray-600">Real-time compliance metrics and monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Real-time Alerts */}
      <RealTimeComplianceAlerts framework={framework} />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Compliance Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Compliance</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatPercentage(metrics.overallScore)}
              </p>
              <div className="flex items-center mt-2">
                {getTrendIcon(metrics.overallTrend)}
                <span className={`text-sm ml-1 ${
                  metrics.overallTrend === 'up' ? 'text-green-600' :
                  metrics.overallTrend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metrics.overallTrendValue > 0 ? '+' : ''}{formatPercentage(metrics.overallTrendValue)}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-full ${getRiskColor(metrics.riskLevel)}`}>
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Active Requirements */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Requirements</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.activeRequirements)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {formatNumber(metrics.completedRequirements)} completed
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.upcomingDeadlines)}
              </p>
              <p className="text-sm text-red-500 mt-2">
                {formatNumber(metrics.overdueItems)} overdue
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Risk Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(metrics.riskScore)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(metrics.riskLevel)}`}>
                  {metrics.riskLevel.toUpperCase()}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-full ${getRiskColor(metrics.riskLevel)}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Framework-specific Metrics */}
      {metrics.frameworkMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(metrics.frameworkMetrics).map(([frameworkName, frameworkData]) => (
            <Card key={frameworkName} className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                {frameworkName} Compliance
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compliance Score</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPercentage(frameworkData.score)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      frameworkData.score >= 0.9 ? 'bg-green-500' :
                      frameworkData.score >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${frameworkData.score * 100}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Requirements:</span>
                    <span className="ml-2 font-medium">{frameworkData.totalRequirements}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <span className="ml-2 font-medium">{frameworkData.completedRequirements}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">In Progress:</span>
                    <span className="ml-2 font-medium">{frameworkData.inProgressRequirements}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Overdue:</span>
                    <span className="ml-2 font-medium text-red-600">{frameworkData.overdueRequirements}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trends */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Compliance Trends
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMetric('trends');
                logButtonClick('view_compliance_trends');
              }}
            >
              View Details
            </Button>
          </div>
          <ComplianceTrendChart trends={trends} timeRange={timeRange} />
        </Card>

        {/* Deadline Tracker */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Upcoming Deadlines
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMetric('deadlines');
                logButtonClick('view_compliance_deadlines');
              }}
            >
              View All
            </Button>
          </div>
          <ComplianceDeadlineTracker 
            deadlines={deadlines.slice(0, 5)} 
            compact={true}
          />
        </Card>
      </div>

      {/* Risk Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2" />
          Risk Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.riskBreakdown && Object.entries(metrics.riskBreakdown).map(([riskLevel, count]) => (
            <div key={riskLevel} className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${getRiskColor(riskLevel as RiskLevel)}`}>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2 capitalize">{riskLevel}</p>
              <p className="text-xs text-gray-500">
                {formatPercentage(count / (metrics.activeRequirements || 1))}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Recent Compliance Activity
        </h3>
        <div className="space-y-3">
          {metrics.recentActivity?.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'completed' ? 'bg-green-500' :
                activity.type === 'overdue' ? 'bg-red-500' :
                activity.type === 'updated' ? 'bg-blue-500' : 'bg-yellow-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">{activity.timestamp}</p>
              </div>
              {activity.framework && (
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  {activity.framework}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Predictive Analytics */}
      {metrics.predictions && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Predictive Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-900">Compliance Forecast</h4>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatPercentage(metrics.predictions.complianceScore30Days)}
              </p>
              <p className="text-xs text-blue-700">Expected in 30 days</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-yellow-900">Risk Trend</h4>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {metrics.predictions.riskTrend === 'increasing' ? '↗' : 
                 metrics.predictions.riskTrend === 'decreasing' ? '↘' : '→'}
              </p>
              <p className="text-xs text-yellow-700 capitalize">{metrics.predictions.riskTrend}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-green-900">Completion Rate</h4>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatPercentage(metrics.predictions.completionRate)}
              </p>
              <p className="text-xs text-green-700">This quarter</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ComplianceMetricsDashboard;