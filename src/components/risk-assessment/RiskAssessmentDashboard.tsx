import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Brain, Target, Download, RefreshCw, Settings, Bell, Calendar, Filter, Search, Eye, Plus, BarChart3, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import RiskScoreCard from './RiskScoreCard';
import VulnerabilityMatrix from './VulnerabilityMatrix';
import ComplianceGapAnalysis from './ComplianceGapAnalysis';
import PredictiveAnalytics from './PredictiveAnalytics';
import RealTimeMonitoring from './RealTimeMonitoring';
import RiskHeatmap from './RiskHeatmap';
import ThreatIntelligence from './ThreatIntelligence';

interface RiskAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'compliance' | 'security' | 'operational' | 'regulatory';
  timestamp: Date;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved';
  affectedSystems: string[];
  recommendedActions: string[];
  assignedTo?: string;
  dueDate?: Date;
}

interface RiskMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
  category: string;
  lastUpdated: Date;
}

const RiskAssessmentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  // Real-time risk alerts
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([
    {
      id: '1',
      title: 'Critical GDPR Compliance Gap Detected',
      description: 'Data retention policies have expired for customer database, creating immediate compliance risk',
      severity: 'critical',
      category: 'compliance',
      timestamp: new Date('2024-01-15T14:30:00'),
      status: 'new',
      affectedSystems: ['Customer Database', 'CRM System'],
      recommendedActions: [
        'Update data retention policies immediately',
        'Conduct emergency compliance review',
        'Notify DPO and legal team'
      ],
      dueDate: new Date('2024-01-16T17:00:00')
    },
    {
      id: '2',
      title: 'Unusual Data Access Pattern Detected',
      description: 'AI monitoring detected abnormal access to sensitive HR data outside business hours',
      severity: 'high',
      category: 'security',
      timestamp: new Date('2024-01-15T13:45:00'),
      status: 'investigating',
      affectedSystems: ['HR Database', 'Employee Portal'],
      recommendedActions: [
        'Review access logs immediately',
        'Verify user identity and authorization',
        'Consider temporary access restriction'
      ],
      assignedTo: 'Security Team',
      dueDate: new Date('2024-01-15T18:00:00')
    },
    {
      id: '3',
      title: 'Vendor Risk Score Deterioration',
      description: 'CloudStorage Inc. risk score increased from 65 to 82 due to recent security incidents',
      severity: 'medium',
      category: 'operational',
      timestamp: new Date('2024-01-15T12:20:00'),
      status: 'acknowledged',
      affectedSystems: ['Cloud Storage', 'Backup Systems'],
      recommendedActions: [
        'Conduct vendor security assessment',
        'Review data processing agreements',
        'Implement additional monitoring'
      ],
      assignedTo: 'Vendor Management',
      dueDate: new Date('2024-01-20T17:00:00')
    },
    {
      id: '4',
      title: 'New Regulatory Requirement Identified',
      description: 'PDPL amendments require updates to consent mechanisms by March 2024',
      severity: 'medium',
      category: 'regulatory',
      timestamp: new Date('2024-01-15T11:10:00'),
      status: 'new',
      affectedSystems: ['Website', 'Mobile App', 'Customer Portal'],
      recommendedActions: [
        'Review new regulatory requirements',
        'Update consent management system',
        'Plan implementation timeline'
      ],
      dueDate: new Date('2024-03-01T23:59:59')
    }
  ]);

  // Real-time risk metrics
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([
    {
      id: '1',
      name: 'Overall Risk Score',
      value: 78,
      target: 70,
      trend: 'down',
      change: -3.2,
      unit: 'score',
      category: 'overall',
      lastUpdated: new Date()
    },
    {
      id: '2',
      name: 'Critical Vulnerabilities',
      value: 12,
      target: 5,
      trend: 'up',
      change: 2,
      unit: 'count',
      category: 'security',
      lastUpdated: new Date()
    },
    {
      id: '3',
      name: 'Compliance Score',
      value: 89,
      target: 95,
      trend: 'stable',
      change: 0.5,
      unit: 'percentage',
      category: 'compliance',
      lastUpdated: new Date()
    },
    {
      id: '4',
      name: 'Mean Time to Resolution',
      value: 4.2,
      target: 3.0,
      trend: 'down',
      change: -0.8,
      unit: 'hours',
      category: 'operational',
      lastUpdated: new Date()
    },
    {
      id: '5',
      name: 'Data Breach Risk',
      value: 23,
      target: 15,
      trend: 'down',
      change: -5.1,
      unit: 'percentage',
      category: 'security',
      lastUpdated: new Date()
    },
    {
      id: '6',
      name: 'Vendor Risk Exposure',
      value: 67,
      target: 50,
      trend: 'up',
      change: 3.4,
      unit: 'score',
      category: 'operational',
      lastUpdated: new Date()
    }
  ]);

  const riskScores = [
    {
      current: 78,
      previous: 82,
      trend: 'down' as const,
      category: 'Overall Risk',
      severity: 'medium' as const,
      lastUpdated: new Date('2024-01-15T14:30:00'),
      factors: ['Data exposure vulnerabilities', 'Incomplete access controls', 'Pending policy updates']
    },
    {
      current: 85,
      previous: 88,
      trend: 'down' as const,
      category: 'GDPR Compliance',
      severity: 'medium' as const,
      lastUpdated: new Date('2024-01-15T14:25:00'),
      factors: ['Privacy notice updates needed', 'DSAR response times', 'Data retention policies']
    },
    {
      current: 72,
      previous: 69,
      trend: 'up' as const,
      category: 'CCPA Compliance',
      severity: 'medium' as const,
      lastUpdated: new Date('2024-01-15T14:20:00'),
      factors: ['Consumer request processing', 'Third-party data sharing', 'Opt-out mechanisms']
    },
    {
      current: 91,
      previous: 89,
      trend: 'up' as const,
      category: 'HIPAA Compliance',
      severity: 'low' as const,
      lastUpdated: new Date('2024-01-15T14:15:00'),
      factors: ['Administrative safeguards', 'Technical safeguards', 'Physical safeguards']
    },
    {
      current: 68,
      previous: 65,
      trend: 'up' as const,
      category: 'PDPL Compliance',
      severity: 'medium' as const,
      lastUpdated: new Date('2024-01-15T14:10:00'),
      factors: ['Consent mechanisms', 'Data localization', 'Cross-border transfers']
    },
    {
      current: 82,
      previous: 79,
      trend: 'up' as const,
      category: 'Security Posture',
      severity: 'medium' as const,
      lastUpdated: new Date('2024-01-15T14:05:00'),
      factors: ['Vulnerability management', 'Access controls', 'Incident response']
    }
  ];

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time updates
      setRiskMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * 2,
        lastUpdated: new Date()
      })));
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleAlertAction = (alertId: string, action: 'acknowledge' | 'investigate' | 'resolve') => {
    setRiskAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            status: action === 'acknowledge' ? 'acknowledged' : 
                   action === 'investigate' ? 'investigating' : 'resolved'
          }
        : alert
    ));
  };

  const handleCreateAlert = () => {
    const newAlert: RiskAlert = {
      id: Date.now().toString(),
      title: 'Manual Risk Alert',
      description: 'Custom risk alert created by user',
      severity: 'medium',
      category: 'operational',
      timestamp: new Date(),
      status: 'new',
      affectedSystems: [],
      recommendedActions: []
    };
    setRiskAlerts(prev => [newAlert, ...prev]);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="danger">New</Badge>;
      case 'acknowledged': return <Badge variant="warning">Acknowledged</Badge>;
      case 'investigating': return <Badge variant="info">Investigating</Badge>;
      case 'resolved': return <Badge variant="success">Resolved</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'compliance': return <Shield className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4" />;
      case 'operational': return <BarChart3 className="h-4 w-4" />;
      case 'regulatory': return <Calendar className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredAlerts = riskAlerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  const alertCounts = {
    critical: riskAlerts.filter(a => a.severity === 'critical').length,
    high: riskAlerts.filter(a => a.severity === 'high').length,
    medium: riskAlerts.filter(a => a.severity === 'medium').length,
    new: riskAlerts.filter(a => a.status === 'new').length,
    overdue: riskAlerts.filter(a => a.dueDate && a.dueDate < new Date() && a.status !== 'resolved').length
  };

  const AlertModal = () => {
    if (!selectedAlert) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(selectedAlert.category)}
                <h2 className="text-xl font-bold text-gray-900">{selectedAlert.title}</h2>
                {getSeverityBadge(selectedAlert.severity)}
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{selectedAlert.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Alert Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(selectedAlert.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{selectedAlert.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{selectedAlert.timestamp.toLocaleString()}</span>
                  </div>
                  {selectedAlert.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{selectedAlert.dueDate.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedAlert.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assigned To:</span>
                      <span className="font-medium">{selectedAlert.assignedTo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Affected Systems</h3>
                <div className="space-y-1">
                  {selectedAlert.affectedSystems.map((system, index) => (
                    <Badge key={index} variant="info" size="sm">
                      {system}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommended Actions</h3>
              <ul className="space-y-2">
                {selectedAlert.recommendedActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAlertAction(selectedAlert.id, 'acknowledge')}
                  disabled={selectedAlert.status !== 'new'}
                >
                  Acknowledge
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAlertAction(selectedAlert.id, 'investigate')}
                  disabled={selectedAlert.status === 'resolved'}
                >
                  Investigate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAlertAction(selectedAlert.id, 'resolve')}
                  disabled={selectedAlert.status === 'resolved'}
                >
                  Resolve
                </Button>
              </div>
              <Button onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Risk Overview', icon: AlertTriangle, count: null },
    { id: 'monitoring', label: 'Real-time Monitoring', icon: BarChart3, count: alertCounts.new },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle, count: 12 },
    { id: 'compliance', label: 'Compliance Gaps', icon: Target, count: 8 },
    { id: 'predictive', label: 'Predictive Analytics', icon: Brain, count: 4 },
    { id: 'heatmap', label: 'Risk Heatmap', icon: BarChart3, count: null },
    { id: 'intelligence', label: 'Threat Intelligence', icon: Shield, count: null }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Key Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {riskMetrics.map((metric) => (
                <Card key={metric.id} padding="sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">{metric.name}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metric.value.toFixed(metric.unit === 'percentage' ? 0 : 1)}
                      {metric.unit === 'percentage' ? '%' : metric.unit === 'score' ? '' : ` ${metric.unit}`}
                    </p>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      ) : metric.trend === 'down' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 transform rotate-180" />
                      ) : (
                        <div className="h-3 w-3 bg-gray-400 rounded-full" />
                      )}
                      <span className={`text-xs ${
                        metric.trend === 'up' ? 'text-red-600' : 
                        metric.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {Math.abs(metric.change).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Risk Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <RiskScoreCard
                title="Overall Risk Score"
                score={riskScores[0]}
                icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
              />
              <RiskScoreCard
                title="GDPR Compliance"
                score={riskScores[1]}
                regulation="GDPR"
                icon={<Target className="h-6 w-6 text-blue-600" />}
              />
              <RiskScoreCard
                title="CCPA Compliance"
                score={riskScores[2]}
                regulation="CCPA"
                icon={<Target className="h-6 w-6 text-teal-600" />}
              />
              <RiskScoreCard
                title="HIPAA Compliance"
                score={riskScores[3]}
                regulation="HIPAA"
                icon={<Target className="h-6 w-6 text-green-600" />}
              />
              <RiskScoreCard
                title="PDPL Compliance"
                score={riskScores[4]}
                regulation="PDPL"
                icon={<Target className="h-6 w-6 text-purple-600" />}
              />
              <RiskScoreCard
                title="Security Posture"
                score={riskScores[5]}
                icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
              />
            </div>

            {/* Recent Alerts */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Risk Alerts</h2>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('monitoring')}>
                  View All Alerts
                </Button>
              </div>
              <div className="space-y-3">
                {riskAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getCategoryIcon(alert.category)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{alert.title}</h3>
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-6">
            {/* Alert Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{alertCounts.critical}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Priority</p>
                    <p className="text-2xl font-bold text-orange-600">{alertCounts.high}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Medium Priority</p>
                    <p className="text-2xl font-bold text-yellow-600">{alertCounts.medium}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">New Alerts</p>
                    <p className="text-2xl font-bold text-blue-600">{alertCounts.new}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{alertCounts.overdue}</p>
                  </div>
                  <Clock className="h-8 w-8 text-red-600" />
                </div>
              </Card>
            </div>

            {/* Controls */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Real-time Risk Monitoring</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoRefresh"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                      Auto-refresh ({refreshInterval}s)
                    </label>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCreateAlert}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        {getCategoryIcon(alert.category)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{alert.title}</h3>
                            {getSeverityBadge(alert.severity)}
                            {getStatusBadge(alert.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{alert.timestamp.toLocaleString()}</span>
                            {alert.assignedTo && <span>Assigned to: {alert.assignedTo}</span>}
                            {alert.dueDate && (
                              <span className={alert.dueDate < new Date() ? 'text-red-600 font-medium' : ''}>
                                Due: {alert.dueDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alert.status === 'new' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>

                    {alert.affectedSystems.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Affected Systems:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.affectedSystems.map((system, index) => (
                            <Badge key={index} variant="info" size="sm">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {alert.recommendedActions.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-2">Recommended Actions:</p>
                        <ul className="space-y-1">
                          {alert.recommendedActions.slice(0, 2).map((action, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-blue-700">{action}</span>
                            </li>
                          ))}
                          {alert.recommendedActions.length > 2 && (
                            <li className="text-sm text-blue-600 ml-3">
                              +{alert.recommendedActions.length - 2} more actions
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredAlerts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">No alerts match your search criteria.</p>
                </div>
              )}
            </Card>
          </div>
        );

      case 'vulnerabilities':
        return <VulnerabilityMatrix />;
      case 'compliance':
        return <ComplianceGapAnalysis />;
      case 'predictive':
        return <PredictiveAnalytics />;
      case 'heatmap':
        return <RiskHeatmap />;
      case 'intelligence':
        return <ThreatIntelligence />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Assessment & Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time risk analysis and predictive compliance monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}

      {selectedAlert && <AlertModal />}
    </div>
  );
};

export default RiskAssessmentDashboard;