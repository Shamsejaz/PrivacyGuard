import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ComplianceTrend } from '../../types/compliance';

interface ComplianceTrendChartProps {
  trends: ComplianceTrend[];
  timeRange: 'day' | 'week' | 'month' | 'quarter' | 'year';
  height?: number;
}

const ComplianceTrendChart: React.FC<ComplianceTrendChartProps> = ({
  trends,
  timeRange,
  height = 200
}) => {
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return null;

    // Sort trends by date
    const sortedTrends = [...trends].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate chart dimensions
    const maxScore = Math.max(...sortedTrends.map(t => t.score));
    const minScore = Math.min(...sortedTrends.map(t => t.score));
    const scoreRange = maxScore - minScore || 1;

    // Generate SVG path for the trend line
    const width = 400;
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    const points = sortedTrends.map((trend, index) => {
      const x = padding + (index / (sortedTrends.length - 1)) * chartWidth;
      const y = padding + ((maxScore - trend.score) / scoreRange) * chartHeight;
      return { x, y, trend };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    // Create area path for gradient fill
    const areaPath = pathData + 
      ` L ${points[points.length - 1].x} ${height - padding}` +
      ` L ${points[0].x} ${height - padding} Z`;

    return {
      points,
      pathData,
      areaPath,
      width,
      height,
      maxScore,
      minScore,
      sortedTrends
    };
  }, [trends, height]);

  const formatDate = (date: Date) => {
    switch (timeRange) {
      case 'day':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString([], { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'quarter':
        return date.toLocaleDateString([], { month: 'short' });
      case 'year':
        return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
      default:
        return date.toLocaleDateString();
    }
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const getTrendDirection = () => {
    if (!chartData || chartData.sortedTrends.length < 2) return 'stable';
    
    const firstScore = chartData.sortedTrends[0].score;
    const lastScore = chartData.sortedTrends[chartData.sortedTrends.length - 1].score;
    
    if (lastScore > firstScore + 0.05) return 'up';
    if (lastScore < firstScore - 0.05) return 'down';
    return 'stable';
  };

  const getTrendIcon = () => {
    const direction = getTrendDirection();
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    const direction = getTrendDirection();
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!chartData || chartData.sortedTrends.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  const currentScore = chartData.sortedTrends[chartData.sortedTrends.length - 1].score;
  const previousScore = chartData.sortedTrends.length > 1 
    ? chartData.sortedTrends[chartData.sortedTrends.length - 2].score 
    : currentScore;
  const scoreChange = currentScore - previousScore;

  return (
    <div className="space-y-4">
      {/* Current Score and Trend */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {formatScore(currentScore)}
          </p>
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm ${getTrendColor()}`}>
              {scoreChange > 0 ? '+' : ''}{formatScore(Math.abs(scoreChange))} change
            </span>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Last updated</p>
          <p>{formatDate(chartData.sortedTrends[chartData.sortedTrends.length - 1].date)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((value, index) => {
            const y = 20 + ((1 - value) * (height - 40));
            return (
              <g key={index}>
                <line
                  x1="20"
                  y1={y}
                  x2={chartData.width - 20}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="15"
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {formatScore(value)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={chartData.areaPath}
            fill="url(#areaGradient)"
          />

          {/* Trend line */}
          <path
            d={chartData.pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                className="hover:r-6 transition-all cursor-pointer"
              />
              
              {/* Tooltip on hover */}
              <g className="opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <rect
                  x={point.x - 40}
                  y={point.y - 35}
                  width="80"
                  height="25"
                  rx="4"
                  fill="rgba(0, 0, 0, 0.8)"
                />
                <text
                  x={point.x}
                  y={point.y - 20}
                  textAnchor="middle"
                  className="text-xs fill-white"
                >
                  {formatScore(point.trend.score)}
                </text>
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="text-xs fill-gray-300"
                >
                  {formatDate(point.trend.date)}
                </text>
              </g>
            </g>
          ))}

          {/* X-axis labels */}
          {chartData.points
            .filter((_, index) => index % Math.ceil(chartData.points.length / 5) === 0)
            .map((point, index) => (
              <text
                key={index}
                x={point.x}
                y={height - 5}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {formatDate(point.trend.date)}
              </text>
            ))}
        </svg>
      </div>

      {/* Legend and Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-600">Highest</p>
          <p className="font-semibold text-green-600">{formatScore(chartData.maxScore)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Lowest</p>
          <p className="font-semibold text-red-600">{formatScore(chartData.minScore)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Average</p>
          <p className="font-semibold text-gray-900">
            {formatScore(chartData.sortedTrends.reduce((sum, t) => sum + t.score, 0) / chartData.sortedTrends.length)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTrendChart;