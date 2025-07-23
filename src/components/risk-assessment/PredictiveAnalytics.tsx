import React, { useState } from 'react';
import { TrendingUp, Brain, AlertTriangle, Target, Calendar, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

interface RiskPrediction {
  id: string;
  title: string;
  description: string;
  category: 'compliance' | 'security' | 'operational' | 'regulatory';
  currentRisk: number;
  predictedRisk: number;
  timeframe: '30_days' | '60_days' | '90_days' | '6_months';
  confidence: number;
  triggers: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  affectedRegulations: string[];
  probability: number;
}

interface TrendData {
  date: string;
  gdpr: number;
  ccpa: number;
  hipaa: number;
  overall: number;
}

const PredictiveAnalytics: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('90_days');

  const predictions: RiskPrediction[] = [
    {
      id: '1',
      title: 'GDPR Compliance Risk Increase',
      description: 'Predicted increase in GDPR compliance risk due to upcoming data retention policy changes',
      category: 'compliance',
      currentRisk: 65,
      predictedRisk: 82,
      timeframe: '90_days',
      confidence: 87,
      triggers: ['Data retention policy expiration', 'Increased data volume', 'New processing activities'],
      impact: 'high',
      recommendations: [
        'Update data retention policies before Q2',
        'Implement automated data deletion workflows',
        'Conduct privacy impact assessment for new activities'
      ],
      affectedRegulations: ['GDPR'],
      probability: 78
    },
    {
      id: '2',
      title: 'Vendor Risk Escalation',
      description: 'Third-party vendor showing signs of potential security vulnerabilities',
      category: 'security',
      currentRisk: 45,
      predictedRisk: 71,
      timeframe: '60_days',
      confidence: 92,
      triggers: ['Vendor security score decline', 'Delayed security updates', 'Increased incident reports'],
      impact: 'medium',
      recommendations: [
        'Conduct immediate vendor security assessment',
        'Review and update data processing agreements',
        'Implement additional monitoring controls'
      ],
      affectedRegulations: ['GDPR', 'CCPA'],
      probability: 85
    },
    {
      id: '3',
      title: 'Data Breach Likelihood',
      description: 'Increased probability of data breach based on current security posture',
      category: 'security',
      currentRisk: 38,
      predictedRisk: 67,
      timeframe: '6_months',
      confidence: 74,
      triggers: ['Unpatched vulnerabilities', 'Increased attack patterns', 'Insufficient access controls'],
      impact: 'critical',
      recommendations: [
        'Implement zero-trust security architecture',
        'Enhance employee security training',
        'Deploy advanced threat detection systems'
      ],
      affectedRegulations: ['GDPR', 'CCPA', 'HIPAA'],
      probability: 62
    },
    {
      id: '4',
      title: 'Regulatory Change Impact',
      description: 'Upcoming regulatory changes may affect current compliance status',
      category: 'regulatory',
      currentRisk: 52,
      predictedRisk: 76,
      timeframe: '6_months',
      confidence: 81,
      triggers: ['New regulation proposals', 'Industry guidance updates', 'Enforcement pattern changes'],
      impact: 'medium',
      recommendations: [
        'Monitor regulatory development closely',
        'Prepare compliance gap analysis',
        'Engage with legal counsel for guidance'
      ],
      affectedRegulations: ['PDPL', 'GDPR'],
      probability: 71
    }
  ];

  const trendData: TrendData[] = [
    { date: '2024-01', gdpr: 72, ccpa: 68, hipaa: 85, overall: 75 },
    { date: '2024-02', gdpr: 74, ccpa: 71, hipaa: 83, overall: 76 },
    { date: '2024-03', gdpr: 78, ccpa: 73, hipaa: 87, overall: 79 },
    { date: '2024-04', gdpr: 82, ccpa: 76, hipaa: 89, overall: 82 },
    { date: '2024-05', gdpr: 85, ccpa: 78, hipaa: 91, overall: 85 },
    { date: '2024-06', gdpr: 87, ccpa: 81, hipaa: 93, overall: 87 }
  ];

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'compliance': return <Target className="h-5 w-5 text-blue-500" />;
      case 'security': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'operational': return <BarChart3 className="h-5 w-5 text-green-500" />;
      case 'regulatory': return <Calendar className="h-5 w-5 text-purple-500" />;
      default: return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case '30_days': return '30 Days';
      case '60_days': return '60 Days';
      case '90_days': return '90 Days';
      case '6_months': return '6 Months';
      default: return timeframe;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPredictions = predictions.filter(p => 
    selectedTimeframe === 'all' || p.timeframe === selectedTimeframe
  );

  const averageRiskIncrease = Math.round(
    predictions.reduce((sum, p) => sum + (p.predictedRisk - p.currentRisk), 0) / predictions.length
  );

  const highRiskPredictions = predictions.filter(p => p.impact === 'high' || p.impact === 'critical').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Risk Increase</p>
              <p className="text-2xl font-bold text-orange-600">+{averageRiskIncrease}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk Alerts</p>
              <p className="text-2xl font-bold text-red-600">{highRiskPredictions}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Confidence</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)}%
              </p>
            </div>
            <Brain className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Predictions</p>
              <p className="text-2xl font-bold text-gray-900">{predictions.length}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Trend Forecast</h2>
          <div className="space-y-4">
            {trendData.slice(-3).map((data, index) => (
              <div key={data.date} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{data.date}</span>
                  <span className="text-sm text-gray-600">Overall: {data.overall}%</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 w-12">GDPR</span>
                    <ProgressBar value={data.gdpr} variant="info" className="flex-1" />
                    <span className="text-xs text-gray-600 w-8">{data.gdpr}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 w-12">CCPA</span>
                    <ProgressBar value={data.ccpa} variant="success" className="flex-1" />
                    <span className="text-xs text-gray-600 w-8">{data.ccpa}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 w-12">HIPAA</span>
                    <ProgressBar value={data.hipaa} variant="success" className="flex-1" />
                    <span className="text-xs text-gray-600 w-8">{data.hipaa}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Prediction Summary</h2>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">Critical Predictions</span>
              </div>
              <p className="text-sm text-red-700">
                {predictions.filter(p => p.impact === 'critical').length} critical risk scenarios identified
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Trending Risks</span>
              </div>
              <p className="text-sm text-yellow-700">
                Average risk increase of {averageRiskIncrease}% predicted across all categories
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">AI Insights</span>
              </div>
              <p className="text-sm text-blue-700">
                Machine learning models analyzing 50+ risk factors with 85% accuracy
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Risk Predictions</h2>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Timeframes</option>
            <option value="30_days">30 Days</option>
            <option value="60_days">60 Days</option>
            <option value="90_days">90 Days</option>
            <option value="6_months">6 Months</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredPredictions.map((prediction) => (
            <div key={prediction.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getCategoryIcon(prediction.category)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{prediction.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Timeframe: {getTimeframeLabel(prediction.timeframe)}</span>
                      <span>Probability: {prediction.probability}%</span>
                      <span className={`font-medium ${getConfidenceColor(prediction.confidence)}`}>
                        Confidence: {prediction.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
                {getImpactBadge(prediction.impact)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Risk Progression</span>
                    <span className="text-sm text-gray-600">
                      {prediction.currentRisk}% → {prediction.predictedRisk}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ProgressBar value={prediction.currentRisk} variant="warning" className="flex-1" />
                    <span className="text-xs text-gray-500">→</span>
                    <ProgressBar value={prediction.predictedRisk} variant="danger" className="flex-1" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Affected Regulations</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction.affectedRegulations.map((regulation) => (
                      <Badge key={regulation} variant="info" size="sm">
                        {regulation}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Risk Triggers</p>
                  <div className="flex flex-wrap gap-2">
                    {prediction.triggers.map((trigger, index) => (
                      <Badge key={index} variant="warning" size="sm">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">AI Recommendations</p>
                  <ul className="space-y-1">
                    {prediction.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-blue-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPredictions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No predictions match your selected timeframe.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PredictiveAnalytics;