import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, CheckCircle, Clock, Target, Bell, BarChart3, Activity } from 'lucide-react';
import { useCompliance } from '../../contexts/ComplianceContext';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface ProgressMetric {
  label: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface DeadlineItem {
  id: string;
  framework: ComplianceFramework;
  requirement: string;
  dueDate: Date;
  status: 'overdue' | 'due_soon' | 'on_track';
  assignedTo: string;
  priority: 'high' | 'medium' | 'low';
}

interface TrendDataPoint {
  date: string;
  gdpr: number;
  pdpl: number;
  hipaa: number;
  ccpa: number;
  overall: number;
}

interface NotificationSettings {
  enabled: boolean;
  email: boolean;
  inApp: boolean;
  deadlineThreshold: number; // days before deadline
}

const ComplianceProgressDashboard: React.FC = () => {
  const { modules, progress } = useCompliance();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    email: true,
    inApp: true,
    deadlineThreshold: 7
  });
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  // Initialize trend data
  useEffect(() => {
    const generateTrendData = (): TrendDataPoint[] => {
      const data: TrendDataPoint[] = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        
        // Generate realistic trend data with some randomness
        const baseProgress = 60 + (11 - i) * 2; // Gradual improvement over time
        const variance = Math.random() * 10 - 5; // ±5% variance
        
        data.push({
          date: monthStr,
          gdpr: Math.max(0, Math.min(100, baseProgress + variance)),
          pdpl: Math.max(0, Math.min(100, baseProgress - 5 + variance)),
          hipaa: Math.max(0, Math.min(100, baseProgress + 3 + variance)),
          ccpa: Math.max(0, Math.min(100, baseProgress - 2 + variance)),
          overall: Math.max(0, Math.min(100, baseProgress + variance))
        });
      }
      
      return data;
    };
    
    setTrendData(generateTrendData());
  }, []);

  // Calculate current metrics from progress data
  const calculateMetrics = (): ProgressMetric[] => {
    const totalRequirements = Object.values(progress).reduce((sum, p) => sum + p.totalRequirements, 0);
    const compliantRequirements = Object.values(progress).reduce((sum, p) => sum + p.compliantRequirements, 0);
    const overallScore = totalRequirements > 0 ? Math.round((compliantRequirements / totalRequirements) * 100) : 0;
    
    // Calculate trends from trend data
    const currentData = trendData[trendData.length - 1];
    const previousData = trendData[trendData.length - 2];
    const overallTrend = currentData && previousData ? 
      (currentData.overall > previousData.overall ? 'up' : 
       currentData.overall < previousData.overall ? 'down' : 'stable') : 'stable';
    const overallChange = currentData && previousData ? 
      Number((currentData.overall - previousData.overall).toFixed(1)) : 0;

    return [
      {
        label: 'Overall Compliance Score',
        value: overallScore,
        target: 85,
        trend: overallTrend,
        change: overallChange,
        unit: '%',
        icon: Target,
        color: 'blue'
      },
      {
        label: 'Requirements Completed',
        value: compliantRequirements,
        target: totalRequirements,
        trend: 'up',
        change: 12,
        unit: '',
        icon: CheckCircle,
        color: 'green'
      },
      {
        label: 'Critical Gaps',
        value: Object.values(progress).reduce((sum, p) => sum + p.nonCompliantRequirements, 0),
        target: 0,
        trend: 'down',
        change: -3,
        unit: '',
        icon: AlertTriangle,
        color: 'red'
      },
      {
        label: 'Active Deadlines',
        value: upcomingDeadlines.filter(d => d.status === 'overdue' || d.status === 'due_soon' || d.status === 'on_track').length,
        target: 0,
        trend: 'stable',
        change: 0,
        unit: '',
        icon: Clock,
        color: 'yellow'
      }
    ];
  };

  const progressMetrics = calculateMetrics();

  const upcomingDeadlines: DeadlineItem[] = [
    {
      id: '1',
      framework: 'GDPR',
      requirement: 'Article 30 - Records of Processing Review',
      dueDate: new Date('2024-02-15'),
      status: 'due_soon',
      assignedTo: 'Sarah Johnson',
      priority: 'high'
    },
    {
      id: '2',
      framework: 'PDPL',
      requirement: 'Consent Management Audit',
      dueDate: new Date('2024-02-10'),
      status: 'overdue',
      assignedTo: 'Michael Chen',
      priority: 'high'
    },
    {
      id: '3',
      framework: 'HIPAA',
      requirement: 'Security Risk Assessment',
      dueDate: new Date('2024-02-20'),
      status: 'on_track',
      assignedTo: 'Security Team',
      priority: 'medium'
    },
    {
      id: '4',
      framework: 'CCPA',
      requirement: 'Consumer Rights Documentation',
      dueDate: new Date('2024-02-25'),
      status: 'on_track',
      assignedTo: 'Legal Team',
      priority: 'medium'
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getDeadlineStatusColor = (status: DeadlineItem['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'on_track':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeadlineIcon = (status: DeadlineItem['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'due_soon':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'on_track':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: DeadlineItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrameworkProgress = (framework: ComplianceFramework) => {
    const frameworkProgress = progress[framework];
    if (!frameworkProgress) return 0;
    return frameworkProgress.overallScore;
  };

  const getFrameworkTrend = (framework: ComplianceFramework) => {
    if (trendData.length < 2) return { trend: 'stable' as const, change: 0 };
    
    const current = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];
    const key = framework.toLowerCase() as keyof Omit<TrendDataPoint, 'date' | 'overall'>;
    
    const change = Number((current[key] - previous[key]).toFixed(1));
    const trend: 'up' | 'down' | 'stable' = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    
    return { trend, change };
  };

  const getColorClass = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Progress Tracking</h2>
          <p className="text-gray-600 mt-1">Monitor compliance metrics, deadlines, and trends</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {progressMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-3 rounded-lg', getColorClass(metric.color))}>
                <metric.icon className="h-6 w-6" />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={cn('text-sm font-medium', getTrendColor(metric.trend))}>
                  {metric.change > 0 ? '+' : ''}{metric.change}{metric.unit}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
              <div className="flex items-baseline space-x-2 mb-3">
                <p className="text-3xl font-bold text-gray-900">
                  {metric.value}{metric.unit}
                </p>
                {metric.target > 0 && (
                  <p className="text-sm text-gray-500">/ {metric.target}{metric.unit}</p>
                )}
              </div>
              {metric.target > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        metric.value >= metric.target ? 'bg-green-500' : 
                        metric.value >= metric.target * 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>{metric.target}{metric.unit}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Framework Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Framework Progress</h3>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => {
              const moduleProgress = getFrameworkProgress(module.id);
              const progressData = progress[module.id];
              const frameworkTrend = getFrameworkTrend(module.id);
              
              return (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{module.name}</h4>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(frameworkTrend.trend)}
                        <span className={cn('text-xs', getTrendColor(frameworkTrend.trend))}>
                          {frameworkTrend.change > 0 ? '+' : ''}{frameworkTrend.change}%
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      moduleProgress >= 80 ? 'bg-green-100 text-green-800' :
                      moduleProgress >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {moduleProgress}%
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all duration-500',
                          moduleProgress >= 80 ? 'bg-green-500' :
                          moduleProgress >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${moduleProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {progressData && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-green-600 font-bold text-lg">{progressData.compliantRequirements}</div>
                        <div className="text-gray-600 text-xs">Compliant</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <div className="text-yellow-600 font-bold text-lg">{progressData.partialRequirements}</div>
                        <div className="text-gray-600 text-xs">Partial</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-red-600 font-bold text-lg">{progressData.nonCompliantRequirements}</div>
                        <div className="text-gray-600 text-xs">Gaps</div>
                      </div>
                    </div>
                  )}
                  
                  {progressData && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Total Requirements: {progressData.totalRequirements}</span>
                        <span>Updated: {progressData.lastUpdated.toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h3>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Bell className="h-4 w-4 mr-2" />
            Set Notifications
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingDeadlines.map((deadline) => (
            <div key={deadline.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  {getDeadlineIcon(deadline.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-blue-600">{deadline.framework}</span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getPriorityColor(deadline.priority)
                      )}>
                        {deadline.priority}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">{deadline.requirement}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {deadline.dueDate.toLocaleDateString()}</span>
                      </div>
                      <span>Assigned to: {deadline.assignedTo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getDeadlineStatusColor(deadline.status)
                  )}>
                    {deadline.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Compliance Trends</h3>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">12 months</span>
          </div>
        </div>
        <div className="p-6">
          {trendData.length > 0 ? (
            <div className="space-y-6">
              {/* Trend Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['GDPR', 'PDPL', 'HIPAA', 'CCPA'].map((framework) => {
                  const frameworkTrend = getFrameworkTrend(framework as ComplianceFramework);
                  const currentValue = trendData[trendData.length - 1]?.[framework.toLowerCase() as keyof TrendDataPoint] || 0;
                  
                  return (
                    <div key={framework} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">{framework}</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(currentValue as number)}%</div>
                      <div className="flex items-center justify-center space-x-1">
                        {getTrendIcon(frameworkTrend.trend)}
                        <span className={cn('text-xs', getTrendColor(frameworkTrend.trend))}>
                          {frameworkTrend.change > 0 ? '+' : ''}{frameworkTrend.change}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Simple Trend Visualization */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Monthly Progress</h4>
                {trendData.slice(-6).map((dataPoint) => {
                  const date = new Date(dataPoint.date + '-01');
                  const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  
                  return (
                    <div key={dataPoint.date} className="flex items-center space-x-4">
                      <div className="w-16 text-sm text-gray-600">{monthName}</div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${dataPoint.overall}%` }}
                          ></div>
                        </div>
                        <div className="w-12 text-sm font-medium text-gray-900">
                          {Math.round(dataPoint.overall)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Trend Insights */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Trend Insights</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>• Overall compliance has improved by {Math.round((trendData[trendData.length - 1]?.overall || 0) - (trendData[0]?.overall || 0))}% over the past year</p>
                  <p>• HIPAA shows the strongest performance with consistent improvement</p>
                  <p>• PDPL requires attention with slower progress in recent months</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Loading trend analysis...</p>
              <p className="text-sm">Historical compliance data and forecasting</p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable Notifications</h4>
                <p className="text-sm text-gray-600">Receive alerts for deadlines and compliance changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {notificationSettings.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.email}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, email: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">Email notifications</label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings.inApp}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, inApp: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">In-app notifications</label>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="text-sm text-gray-700">Alert threshold:</label>
                  <select
                    value={notificationSettings.deadlineThreshold}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, deadlineThreshold: Number(e.target.value) }))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                  <span className="text-sm text-gray-500">before deadline</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceProgressDashboard;