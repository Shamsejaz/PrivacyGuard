import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Filter, Download, RefreshCw, Target } from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface AnalyticsMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}

interface ComplianceAnalyticsProps {
  onExportData?: () => void;
  onRefreshData?: () => void;
}

const ComplianceAnalytics: React.FC<ComplianceAnalyticsProps> = ({
  onExportData,
  onRefreshData
}) => {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | 'all'>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [selectedMetric, setSelectedMetric] = useState<'compliance' | 'risks' | 'costs' | 'efficiency'>('compliance');

  // Mock analytics data
  const frameworkMetrics: Record<ComplianceFramework, AnalyticsMetric[]> = {
    GDPR: [
      { name: 'Compliance Score', value: 82, change: 5.2, trend: 'up', target: 85 },
      { name: 'Requirements Met', value: 156, change: 12, trend: 'up', target: 180 },
      { name: 'Open Gaps', value: 8, change: -3, trend: 'down', target: 0 },
      { name: 'Evidence Documents', value: 89, change: 15, trend: 'up', target: 100 }
    ],
    PDPL: [
      { name: 'Compliance Score', value: 75, change: 3.1, trend: 'up', target: 80 },
      { name: 'Requirements Met', value: 98, change: 8, trend: 'up', target: 120 },
      { name: 'Open Gaps', value: 12, change: -2, trend: 'down', target: 0 },
      { name: 'Evidence Documents', value: 67, change: 10, trend: 'up', target: 80 }
    ],
    HIPAA: [
      { name: 'Compliance Score', value: 88, change: 2.8, trend: 'up', target: 90 },
      { name: 'Requirements Met', value: 134, change: 6, trend: 'up', target: 150 },
      { name: 'Open Gaps', value: 4, change: -1, trend: 'down', target: 0 },
      { name: 'Evidence Documents', value: 112, change: 18, trend: 'up', target: 120 }
    ],
    CCPA: [
      { name: 'Compliance Score', value: 70, change: 1.5, trend: 'up', target: 85 },
      { name: 'Requirements Met', value: 76, change: 4, trend: 'up', target: 100 },
      { name: 'Open Gaps', value: 15, change: -1, trend: 'down', target: 0 },
      { name: 'Evidence Documents', value: 45, change: 8, trend: 'up', target: 60 }
    ]
  };

  const overallMetrics: AnalyticsMetric[] = [
    { name: 'Overall Compliance', value: 79, change: 3.2, trend: 'up', target: 85 },
    { name: 'Total Requirements', value: 464, change: 30, trend: 'up', target: 550 },
    { name: 'Critical Risks', value: 6, change: -2, trend: 'down', target: 0 },
    { name: 'Compliance Cost', value: 245000, change: -8.5, trend: 'down' }
  ];

  const riskDistribution = [
    { framework: 'GDPR', high: 2, medium: 5, low: 8 },
    { framework: 'PDPL', high: 3, medium: 7, low: 6 },
    { framework: 'HIPAA', high: 1, medium: 3, low: 4 },
    { framework: 'CCPA', high: 4, medium: 6, low: 5 }
  ];

  // Compliance trends data for future chart implementation
  // const complianceTrends = [
  //   { month: 'Aug', gdpr: 75, pdpl: 68, hipaa: 82, ccpa: 65 },
  //   { month: 'Sep', gdpr: 78, pdpl: 71, hipaa: 84, ccpa: 67 },
  //   { month: 'Oct', gdpr: 80, pdpl: 73, hipaa: 86, ccpa: 68 },
  //   { month: 'Nov', gdpr: 81, pdpl: 74, hipaa: 87, ccpa: 69 },
  //   { month: 'Dec', gdpr: 82, pdpl: 75, hipaa: 88, ccpa: 70 }
  // ];

  const getMetricsToDisplay = () => {
    if (selectedFramework === 'all') {
      return overallMetrics;
    }
    return frameworkMetrics[selectedFramework];
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
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

  const formatValue = (value: number, name: string) => {
    if (name.toLowerCase().includes('cost')) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    if (name.toLowerCase().includes('score')) {
      return `${value}%`;
    }
    return value.toString();
  };

  const getProgressColor = (value: number, target?: number) => {
    if (!target) return 'bg-blue-500';
    const percentage = (value / target) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const metricsToDisplay = getMetricsToDisplay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Analytics</h2>
          <p className="text-gray-600 mt-1">Advanced analytics and trend forecasting for compliance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={onExportData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value as ComplianceFramework | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Frameworks</option>
                <option value="GDPR">GDPR</option>
                <option value="PDPL">PDPL</option>
                <option value="HIPAA">HIPAA</option>
                <option value="CCPA">CCPA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as 'month' | 'quarter' | 'year')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as 'compliance' | 'risks' | 'costs' | 'efficiency')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="compliance">Compliance Metrics</option>
                <option value="risks">Risk Metrics</option>
                <option value="costs">Cost Analysis</option>
                <option value="efficiency">Efficiency Metrics</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsToDisplay.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={cn('text-sm font-medium', getTrendColor(metric.trend))}>
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{metric.name}</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatValue(metric.value, metric.name)}
                </p>
                {metric.target && (
                  <p className="text-sm text-gray-500">/ {formatValue(metric.target, metric.name)}</p>
                )}
              </div>
              {metric.target && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full', getProgressColor(metric.value, metric.target))}
                      style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Compliance Trends</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Compliance Trend Chart</p>
              <p className="text-sm">Interactive chart showing compliance score trends over time</p>
              <div className="mt-4 text-xs text-gray-400">
                <p>Framework: {selectedFramework === 'all' ? 'All' : selectedFramework}</p>
                <p>Period: {selectedTimeframe}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Risk Distribution</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-gray-500">
              <PieChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Risk Distribution Chart</p>
              <p className="text-sm">Risk levels across compliance frameworks</p>
              <div className="mt-4 space-y-2">
                {riskDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{item.framework}</span>
                    <div className="flex space-x-2">
                      <span className="text-red-600">H: {item.high}</span>
                      <span className="text-yellow-600">M: {item.medium}</span>
                      <span className="text-green-600">L: {item.low}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Framework Performance Analysis</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {Object.entries(frameworkMetrics).map(([framework, metrics]) => (
              <div key={framework} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">{framework} Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {metrics.map((metric, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatValue(metric.value, metric.name)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{metric.name}</div>
                      <div className="flex items-center justify-center space-x-1">
                        {getTrendIcon(metric.trend)}
                        <span className={cn('text-xs', getTrendColor(metric.trend))}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </span>
                      </div>
                      {metric.target && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className={cn('h-1 rounded-full', getProgressColor(metric.value, metric.target))}
                              style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Key Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">HIPAA shows strongest compliance performance</p>
                  <p className="text-xs text-gray-500">88% compliance score with consistent improvement</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">CCPA requires immediate attention</p>
                  <p className="text-xs text-gray-500">15-point gap from target compliance level</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Overall trend is positive</p>
                  <p className="text-xs text-gray-500">3.2% improvement in overall compliance this quarter</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Prioritize CCPA consumer rights automation</p>
                  <p className="text-xs text-gray-500">Focus on data portability and deletion workflows</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Enhance PDPL consent management</p>
                  <p className="text-xs text-gray-500">Implement granular consent controls</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-900">Maintain HIPAA excellence</p>
                  <p className="text-xs text-gray-500">Continue current security practices and monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceAnalytics;