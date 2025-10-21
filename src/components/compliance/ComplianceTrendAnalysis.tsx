import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Download, RefreshCw, Target, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface TrendData {
  date: string;
  gdpr: number;
  pdpl: number;
  hipaa: number;
  ccpa: number;
  overall: number;
}

interface ComplianceTrendAnalysisProps {
  onExportData?: () => void;
  onRefreshData?: () => void;
}

interface TrendInsight {
  type: 'positive' | 'negative' | 'neutral';
  framework: ComplianceFramework | 'overall';
  message: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
}

interface ForecastData {
  framework: ComplianceFramework;
  currentScore: number;
  projectedScore: number;
  confidence: number;
  timeToTarget: number; // months
}

const ComplianceTrendAnalysis: React.FC<ComplianceTrendAnalysisProps> = ({
  onExportData,
  onRefreshData
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'3months' | '6months' | '1year'>('6months');
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'requirements' | 'gaps'>('score');
  const [showForecast, setShowForecast] = useState(false);
  const [insights, setInsights] = useState<TrendInsight[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);

  // Mock trend data for demonstration
  const trendData: TrendData[] = [
    { date: '2023-08', gdpr: 65, pdpl: 58, hipaa: 72, ccpa: 60, overall: 64 },
    { date: '2023-09', gdpr: 68, pdpl: 62, hipaa: 75, ccpa: 63, overall: 67 },
    { date: '2023-10', gdpr: 72, pdpl: 65, hipaa: 78, ccpa: 66, overall: 70 },
    { date: '2023-11', gdpr: 75, pdpl: 68, hipaa: 80, ccpa: 69, overall: 73 },
    { date: '2023-12', gdpr: 78, pdpl: 72, hipaa: 82, ccpa: 72, overall: 76 },
    { date: '2024-01', gdpr: 80, pdpl: 75, hipaa: 85, ccpa: 75, overall: 79 }
  ];

  const frameworks: { id: ComplianceFramework; name: string; color: string }[] = [
    { id: 'GDPR', name: 'GDPR', color: 'blue' },
    { id: 'PDPL', name: 'PDPL', color: 'green' },
    { id: 'HIPAA', name: 'HIPAA', color: 'purple' },
    { id: 'CCPA', name: 'CCPA', color: 'orange' }
  ];

  const getFrameworkTrend = (framework: ComplianceFramework) => {
    const key = framework.toLowerCase() as keyof Omit<TrendData, 'date' | 'overall'>;
    const currentValue = trendData[trendData.length - 1][key];
    const previousValue = trendData[trendData.length - 2][key];
    const change = currentValue - previousValue;
    const trend: 'up' | 'down' | 'stable' = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    return { current: currentValue, change, trend };
  };

  const getOverallTrend = () => {
    const currentValue = trendData[trendData.length - 1].overall;
    const previousValue = trendData[trendData.length - 2].overall;
    const change = currentValue - previousValue;
    const trend: 'up' | 'down' | 'stable' = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    return { current: currentValue, change, trend };
  };

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

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border') => {
    const colorMap = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
      green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' }
    };
    return colorMap[color as keyof typeof colorMap]?.[type] || 'bg-gray-500';
  };

  // Generate insights and forecasts
  useEffect(() => {
    const generateInsights = (): TrendInsight[] => {
      const insights: TrendInsight[] = [];
      
      // Analyze overall trend
      const overallTrend = getOverallTrend();
      if (overallTrend.change > 5) {
        insights.push({
          type: 'positive',
          framework: 'overall',
          message: `Overall compliance improved by ${overallTrend.change}% this month`,
          impact: 'high',
          recommendation: 'Continue current improvement strategies'
        });
      } else if (overallTrend.change < -3) {
        insights.push({
          type: 'negative',
          framework: 'overall',
          message: `Overall compliance declined by ${Math.abs(overallTrend.change)}% this month`,
          impact: 'high',
          recommendation: 'Review and address declining areas immediately'
        });
      }
      
      // Analyze framework-specific trends
      frameworks.forEach(framework => {
        const frameworkTrend = getFrameworkTrend(framework.id);
        if (frameworkTrend.change > 8) {
          insights.push({
            type: 'positive',
            framework: framework.id,
            message: `${framework.name} compliance improved significantly (+${frameworkTrend.change}%)`,
            impact: 'medium',
            recommendation: 'Document and replicate successful practices'
          });
        } else if (frameworkTrend.change < -5) {
          insights.push({
            type: 'negative',
            framework: framework.id,
            message: `${framework.name} compliance needs attention (${frameworkTrend.change}%)`,
            impact: 'medium',
            recommendation: 'Allocate additional resources and review processes'
          });
        }
      });
      
      return insights;
    };
    
    const generateForecast = (): ForecastData[] => {
      return frameworks.map(framework => {
        const frameworkTrend = getFrameworkTrend(framework.id);
        const currentScore = frameworkTrend.current;
        const monthlyGrowth = frameworkTrend.change;
        
        // Simple linear projection
        const projectedScore = Math.min(100, Math.max(0, currentScore + (monthlyGrowth * 3)));
        const confidence = Math.max(60, 100 - Math.abs(monthlyGrowth) * 5); // Lower confidence for volatile trends
        
        // Calculate time to reach 85% target
        const target = 85;
        const timeToTarget = currentScore >= target ? 0 : 
          monthlyGrowth > 0 ? Math.ceil((target - currentScore) / monthlyGrowth) : -1;
        
        return {
          framework: framework.id,
          currentScore,
          projectedScore,
          confidence,
          timeToTarget
        };
      });
    };
    
    setInsights(generateInsights());
    setForecastData(generateForecast());
  }, [trendData]);

  const overallTrend = getOverallTrend();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Trend Analysis</h2>
          <p className="text-gray-600 mt-1">Historical compliance data and trend forecasting</p>
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

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as '3months' | '6months' | '1year')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as 'score' | 'requirements' | 'gaps')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="score">Compliance Score</option>
              <option value="requirements">Requirements Completed</option>
              <option value="gaps">Compliance Gaps</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overall Trend Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Overall Compliance Trend</h3>
          <div className="flex items-center space-x-2">
            {getTrendIcon(overallTrend.trend)}
            <span className={cn('text-sm font-medium', getTrendColor(overallTrend.trend))}>
              {overallTrend.change > 0 ? '+' : ''}{overallTrend.change}% this month
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{overallTrend.current}%</div>
            <p className="text-gray-600">Current Overall Score</p>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    'h-3 rounded-full',
                    overallTrend.current >= 80 ? 'bg-green-500' :
                    overallTrend.current >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  )}
                  style={{ width: `${overallTrend.current}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Framework Performance</h4>
            <div className="space-y-2">
              {frameworks.map((framework) => {
                const frameworkTrend = getFrameworkTrend(framework.id);
                return (
                  <div key={framework.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn('w-3 h-3 rounded-full', getColorClass(framework.color, 'bg'))}></div>
                      <span className="text-sm text-gray-700">{framework.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{frameworkTrend.current}%</span>
                      {getTrendIcon(frameworkTrend.trend)}
                      <span className={cn('text-xs', getTrendColor(frameworkTrend.trend))}>
                        {frameworkTrend.change > 0 ? '+' : ''}{frameworkTrend.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Compliance Score Trends</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Interactive Trend Chart</p>
            <p className="text-sm">Chart visualization would be implemented here</p>
            <p className="text-xs mt-2">Showing {selectedMetric} trends for {selectedTimeframe}</p>
          </div>
        </div>
      </div>

      {/* Framework Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Framework Comparison</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {frameworks.map((framework) => {
              const frameworkTrend = getFrameworkTrend(framework.id);
              const progress = frameworkTrend.current;
              
              return (
                <div key={framework.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn('w-4 h-4 rounded-full', getColorClass(framework.color, 'bg'))}></div>
                      <h4 className="font-medium text-gray-900">{framework.name}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">{progress}%</span>
                      {getTrendIcon(frameworkTrend.trend)}
                      <span className={cn('text-sm font-medium', getTrendColor(frameworkTrend.trend))}>
                        {frameworkTrend.change > 0 ? '+' : ''}{frameworkTrend.change}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getColorClass(framework.color, 'bg'))}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {progress >= 80 ? 'Excellent compliance level' :
                     progress >= 60 ? 'Good compliance, some improvements needed' :
                     'Requires significant attention'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI-Generated Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">AI-Generated Insights</h3>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-500">Updated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={cn(
                  'p-4 rounded-lg border-l-4',
                  insight.type === 'positive' ? 'bg-green-50 border-green-400' :
                  insight.type === 'negative' ? 'bg-red-50 border-red-400' :
                  'bg-blue-50 border-blue-400'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {insight.type === 'positive' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : insight.type === 'negative' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Target className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className={cn(
                        'text-sm font-medium',
                        insight.type === 'positive' ? 'text-green-800' :
                        insight.type === 'negative' ? 'text-red-800' :
                        'text-blue-800'
                      )}>
                        {insight.message}
                      </p>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {insight.impact} impact
                      </span>
                    </div>
                    {insight.recommendation && (
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {insights.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No significant trends detected</p>
                <p className="text-sm">Continue monitoring for changes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forecast and Projections */}
      {showForecast && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">3-Month Forecast</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {forecastData.map((forecast) => (
                <div key={forecast.framework} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{forecast.framework}</h4>
                    <span className="text-sm text-gray-500">
                      {forecast.confidence}% confidence
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Score</span>
                      <span className="font-medium">{Math.round(forecast.currentScore)}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Projected Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{Math.round(forecast.projectedScore)}%</span>
                        {forecast.projectedScore > forecast.currentScore ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : forecast.projectedScore < forecast.currentScore ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <div className="h-4 w-4 bg-gray-400 rounded-full" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Time to 85% Target</span>
                      <span className={cn(
                        'text-sm font-medium',
                        forecast.timeToTarget === 0 ? 'text-green-600' :
                        forecast.timeToTarget > 0 && forecast.timeToTarget <= 6 ? 'text-yellow-600' :
                        'text-red-600'
                      )}>
                        {forecast.timeToTarget === 0 ? 'Achieved' :
                         forecast.timeToTarget > 0 ? `${forecast.timeToTarget} months` :
                         'Target unlikely'}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            forecast.projectedScore >= 85 ? 'bg-green-500' :
                            forecast.projectedScore >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          )}
                          style={{ width: `${Math.min(forecast.projectedScore, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forecast Toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowForecast(!showForecast)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Target className="h-4 w-4 mr-2" />
          {showForecast ? 'Hide' : 'Show'} Forecast Analysis
        </button>
      </div>
    </div>
  );
};

export default ComplianceTrendAnalysis;