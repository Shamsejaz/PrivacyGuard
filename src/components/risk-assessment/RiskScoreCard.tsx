import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Target } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

interface RiskScore {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
  factors: string[];
}

interface RiskScoreCardProps {
  title: string;
  score: RiskScore;
  regulation?: string;
  icon?: React.ReactNode;
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ title, score, regulation, icon }) => {
  const getTrendIcon = (trend: string, change: number) => {
    const iconClass = "h-4 w-4";
    switch (trend) {
      case 'up': return <TrendingUp className={`${iconClass} text-red-500`} />;
      case 'down': return <TrendingDown className={`${iconClass} text-green-500`} />;
      default: return <Minus className={`${iconClass} text-gray-500`} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const change = score.current - score.previous;
  const changePercent = score.previous > 0 ? ((change / score.previous) * 100) : 0;

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon || <Shield className="h-6 w-6 text-blue-600" />}
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {regulation && (
              <Badge variant="info" size="sm">{regulation}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getTrendIcon(score.trend, change)}
          <span className={`text-sm font-medium ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {change > 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className={`text-4xl font-bold mb-2 ${getSeverityColor(score.severity)}`}>
          {score.current}
        </div>
        <p className="text-sm text-gray-600">Risk Score (0-100)</p>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Risk Level</span>
          <Badge variant={
            score.severity === 'critical' ? 'danger' :
            score.severity === 'high' ? 'danger' :
            score.severity === 'medium' ? 'warning' : 'success'
          }>
            {score.severity.toUpperCase()}
          </Badge>
        </div>
        <ProgressBar 
          value={score.current} 
          variant={getProgressVariant(score.severity)} 
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-medium">Key Risk Factors:</p>
        <div className="space-y-1">
          {score.factors.slice(0, 3).map((factor, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-xs text-gray-600">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Last updated: {score.lastUpdated.toLocaleString()}
        </p>
      </div>
    </Card>
  );
};

export default RiskScoreCard;