import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

const RiskOverview: React.FC = () => {
  const riskData = {
    overall: { score: 78, trend: 'down', change: -5 },
    gdpr: { score: 85, status: 'compliant' },
    ccpa: { score: 72, status: 'attention' },
    hipaa: { score: 90, status: 'compliant' },
    pdpl: { score: 68, status: 'attention' }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge variant="success">Compliant</Badge>;
      case 'attention': return <Badge variant="warning">Needs Attention</Badge>;
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getProgressVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Overall Risk Score</h2>
          <div className="flex items-center space-x-2">
            {getTrendIcon(riskData.overall.trend)}
            <span className="text-sm font-medium text-gray-600">
              {riskData.overall.change > 0 ? '+' : ''}{riskData.overall.change}%
            </span>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {riskData.overall.score}
          </div>
          <p className="text-gray-600">out of 100</p>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Risk Level</span>
            <span className="font-medium">Medium</span>
          </div>
          <ProgressBar 
            value={riskData.overall.score} 
            variant={getProgressVariant(riskData.overall.score)} 
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Regulatory Compliance</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium">GDPR</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{riskData.gdpr.score}%</span>
              {getStatusBadge(riskData.gdpr.status)}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-teal-500 rounded-full"></div>
              <span className="font-medium">CCPA</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{riskData.ccpa.score}%</span>
              {getStatusBadge(riskData.ccpa.status)}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">HIPAA</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{riskData.hipaa.score}%</span>
              {getStatusBadge(riskData.hipaa.status)}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
              <span className="font-medium">PDPL</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{riskData.pdpl.score}%</span>
              {getStatusBadge(riskData.pdpl.status)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RiskOverview;