import React, { useState } from 'react';
import { Shield, AlertTriangle, Calendar, Download, FileText, Users, Target, TrendingUp, TrendingDown, BarChart3, Settings, RefreshCw, Bell } from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';
import { useComplianceDashboard } from '../../hooks/useComplianceDashboard';
import ComplianceAnalytics from './ComplianceAnalytics';
import AutomatedReporting from './AutomatedReporting';
import ComplianceTrendAnalysis from './ComplianceTrendAnalysis';

interface ExecutiveMetric {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
}

interface RiskItem {
  id: string;
  framework: ComplianceFramework;
  risk: string;
  impact: 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  mitigation: string;
  owner: string;
  dueDate: Date;
}

interface ComplianceReport {
  id: string;
  title: string;
  framework: ComplianceFramework;
  type: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  status: 'draft' | 'review' | 'approved' | 'published';
  generatedDate: Date;
  author: string;
}

interface ExecutiveComplianceDashboardProps {
  onExportReport?: () => void;
  onScheduleReport?: () => void;
  onRefreshData?: () => void;
}

const ExecutiveComplianceDashboard: React.FC<ExecutiveComplianceDashboardProps> = ({
  onExportReport,
  onScheduleReport,
  onRefreshData
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [activeView, setActiveView] = useState<'dashboard' | 'analytics' | 'trends' | 'reports'>('dashboard');

  // Calculate period based on selection
  const getPeriod = () => {
    const end = new Date();
    const start = new Date();
    
    switch (selectedPeriod) {
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  };

  const {
    dashboardData,
    reportTemplates,
    generatedReports,
    trendAnalysis,
    kpis,
    loading,
    refreshing,
    generating,
    error,
    refreshData,
    exportDashboard,
    generateReport,
    scheduleReport,
    lastRefresh,
    isRealTime,
    toggleRealTime
  } = useComplianceDashboard({
    autoRefresh: true,
    refreshInterval: 30000,
    period: getPeriod()
  });

  // Use real data from the hook
  const executiveMetrics = dashboardData?.executiveMetrics.map(metric => ({
    ...metric,
    icon: metric.icon === 'Shield' ? Shield :
          metric.icon === 'AlertTriangle' ? AlertTriangle :
          metric.icon === 'Calendar' ? Calendar :
          metric.icon === 'Target' ? Target : Shield
  })) || [];

  const topRisks = dashboardData?.topRisks || [];

  const recentReports = dashboardData?.recentReports || [];

  // Enhanced analytics data
  const complianceTrends = {
    overall: { current: 78, change: 5.2, trend: 'up' as const },
    frameworks: {
      GDPR: { current: 82, change: 3.1, trend: 'up' as const },
      PDPL: { current: 75, change: 2.8, trend: 'up' as const },
      HIPAA: { current: 88, change: 1.5, trend: 'up' as const },
      CCPA: { current: 70, change: -1.2, trend: 'down' as const }
    }
  };

  const keyMetrics = {
    totalRequirements: 464,
    completedRequirements: 367,
    criticalGaps: 6,
    upcomingDeadlines: 12,
    costSavings: 245000,
    riskReduction: 35
  };

  const forecastData = {
    nextQuarter: {
      projectedScore: 82,
      confidence: 85,
      keyMilestones: [
        'CCPA consumer rights automation',
        'PDPL consent management enhancement',
        'HIPAA annual risk assessment'
      ]
    },
    yearEnd: {
      projectedScore: 87,
      confidence: 78,
      targetAchievement: 92
    }
  };

  const handleRefresh = async () => {
    await refreshData();
    onRefreshData?.();
  };

  const handleExportReport = async () => {
    try {
      await exportDashboard('pdf');
      onExportReport?.();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleScheduleReport = async () => {
    // This would typically open a modal for scheduling configuration
    onScheduleReport?.();
  };

  const frameworkScores = dashboardData?.frameworkScores || [];

  const getMetricStatusColor = (status: ExecutiveMetric['status']) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  const getRiskColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
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

  const getReportStatusColor = (status: ComplianceReport['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrameworkStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Compliance Dashboard</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-gray-600">
              High-level compliance metrics and key risk indicators for leadership
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={cn('w-2 h-2 rounded-full', isRealTime ? 'bg-green-500' : 'bg-gray-400')}></div>
              <span>Last updated: {lastRefresh?.toLocaleTimeString() || 'Never'}</span>
              {refreshing && <span className="text-blue-600">Refreshing...</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleRealTime}
            className={cn(
              'inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              isRealTime 
                ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            )}
          >
            <div className={cn('w-2 h-2 rounded-full mr-2', isRealTime ? 'bg-green-500' : 'bg-gray-400')}></div>
            Real-time
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={handleExportReport}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
          <button 
            onClick={handleScheduleReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Executive Overview', icon: Target },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'trends', label: 'Trend Analysis', icon: TrendingUp },
            { id: 'reports', label: 'Automated Reports', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as typeof activeView)}
              className={cn(
                'flex items-center py-2 px-1 border-b-2 font-medium text-sm',
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Executive Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {executiveMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-3 rounded-lg', getMetricStatusColor(metric.status))}>
                <metric.icon className="h-6 w-6" />
              </div>
              <div className={cn('text-sm font-medium', getTrendColor(metric.trend))}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Framework Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Framework Performance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {frameworkScores.map((framework, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{framework.framework}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={cn('text-lg font-bold', getFrameworkStatusColor(framework.status))}>
                      {framework.score}%
                    </span>
                    <span className="text-sm text-gray-500">/ {framework.target}%</span>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={cn(
                        'h-3 rounded-full',
                        framework.status === 'good' ? 'bg-green-500' :
                        framework.status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      )}
                      style={{ width: `${(framework.score / framework.target) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Target: {framework.target}% | 
                  Gap: {framework.target - framework.score}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Risks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Top Compliance Risks</h2>
          <span className="text-sm text-gray-500">{topRisks.length} active risks</span>
        </div>
        <div className="divide-y divide-gray-200">
          {topRisks.map((risk) => (
            <div key={risk.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-blue-600">{risk.framework}</span>
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getRiskColor(risk.severity)
                    )}>
                      {risk.severity} severity
                    </span>
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getRiskColor(risk.likelihood)
                    )}>
                      {risk.likelihood} likelihood
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{risk.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Mitigation:</strong> {risk.mitigation}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{risk.owner}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {risk.dueDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent Compliance Reports</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800">View All Reports</button>
        </div>
        <div className="divide-y divide-gray-200">
          {recentReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">{report.templateName}</h3>
                      <span className="text-sm text-blue-600">{report.framework}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Generated: {report.generatedDate.toLocaleDateString()}</span>
                      <span>Format: {report.format.toUpperCase()}</span>
                      {report.fileSize && <span>Size: {(report.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getReportStatusColor(report.status)
                  )}>
                    {report.status}
                  </span>
                  <button className="text-gray-400 hover:text-blue-600">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditional View Rendering */}
      {activeView === 'dashboard' && (
        <>
          {/* Compliance Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Key Achievements</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">GDPR compliance improved by 8% this quarter</p>
                      <p className="text-xs text-gray-500">Enhanced data mapping and consent management</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Zero critical security incidents</p>
                      <p className="text-xs text-gray-500">Maintained 100% uptime for compliance systems</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Reduced compliance costs by 15%</p>
                      <p className="text-xs text-gray-500">Automation and process optimization</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Priorities</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">PDPL consent management enhancement</p>
                      <p className="text-xs text-gray-500">Due: March 2024</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">CCPA consumer rights automation</p>
                      <p className="text-xs text-gray-500">Due: February 2024</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Annual HIPAA risk assessment</p>
                      <p className="text-xs text-gray-500">Due: April 2024</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forecasting and Predictions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Compliance Forecast & Predictions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Next Quarter Projection</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Projected Overall Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-green-600">{forecastData.nextQuarter.projectedScore}%</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence Level</span>
                      <span className="text-sm font-medium text-gray-900">{forecastData.nextQuarter.confidence}%</span>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Key Milestones</p>
                      <div className="space-y-1">
                        {forecastData.nextQuarter.keyMilestones.map((milestone, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">{milestone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Year-End Outlook</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Projected Score</span>
                      <span className="text-lg font-bold text-blue-600">{forecastData.yearEnd.projectedScore}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Target Achievement</span>
                      <span className="text-sm font-medium text-gray-900">{forecastData.yearEnd.targetAchievement}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence</span>
                      <span className="text-sm font-medium text-gray-900">{forecastData.yearEnd.confidence}%</span>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full"
                          style={{ width: `${(forecastData.yearEnd.projectedScore / forecastData.yearEnd.targetAchievement) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Progress toward year-end target
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === 'analytics' && (
        <ComplianceAnalytics 
          onExportData={onExportReport}
          onRefreshData={onRefreshData}
        />
      )}

      {activeView === 'trends' && (
        <ComplianceTrendAnalysis 
          onExportData={onExportReport}
          onRefreshData={onRefreshData}
        />
      )}

      {activeView === 'reports' && (
        <AutomatedReporting />
      )}
    </div>
  );
};

export default ExecutiveComplianceDashboard;