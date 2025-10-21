import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  FileText, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { 
  DPODashboardMetrics, 
  ComplianceAlert, 
  DataProcessingActivity 
} from '../../types/compliance';

interface DPODashboardProps {
  tenantId?: string;
}

export const DPODashboard: React.FC<DPODashboardProps> = ({ tenantId }) => {
  const [metrics, setMetrics] = useState<DPODashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [recentActivities, setRecentActivities] = useState<DataProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [tenantId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockMetrics: DPODashboardMetrics = {
        totalDataProcessingActivities: 127,
        activeDataSubjectRequests: 23,
        pendingBreachNotifications: 2,
        complianceScore: 87,
        riskLevel: 'medium',
        trendsData: {
          dsarTrend: 12,
          breachTrend: -5,
          complianceTrend: 8
        },
        lastUpdated: new Date()
      };

      const mockAlerts: ComplianceAlert[] = [
        {
          id: '1',
          type: 'deadline',
          severity: 'high',
          title: 'DSAR Response Due',
          description: 'Data subject access request #DSR-2024-001 response due in 2 days',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          assignedTo: 'John Smith',
          status: 'open',
          createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: 'breach',
          severity: 'critical',
          title: 'Data Breach Notification Required',
          description: 'Security incident #INC-2024-003 requires regulatory notification',
          assignedTo: 'Jane Doe',
          status: 'open',
          createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      
      // Simulate loading delay
      setTimeout(() => setLoading(false), 1000);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-500 mb-4">Unable to retrieve dashboard metrics</p>
          <Button onClick={loadDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DPO Dashboard</h1>
          <p className="text-gray-500">
            Last updated: {metrics.lastUpdated.toLocaleString()}
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Data Processing Activities</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalDataProcessingActivities}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getTrendIcon(metrics.trendsData.complianceTrend)}
            <span className={`ml-1 ${metrics.trendsData.complianceTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(metrics.trendsData.complianceTrend)}% from last month
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active DSARs</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeDataSubjectRequests}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getTrendIcon(metrics.trendsData.dsarTrend)}
            <span className={`ml-1 ${metrics.trendsData.dsarTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(metrics.trendsData.dsarTrend)}% from last month
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Breach Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.pendingBreachNotifications}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getTrendIcon(metrics.trendsData.breachTrend)}
            <span className={`ml-1 ${metrics.trendsData.breachTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {Math.abs(metrics.trendsData.breachTrend)}% from last month
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Compliance Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.complianceScore}%</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <Badge className={getRiskLevelColor(metrics.riskLevel)}>
              {metrics.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
        </Card>
      </div>

      {/* Alerts and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
            <Badge variant="outline">{alerts.length}</Badge>
          </div>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">No critical alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-500">{alert.description}</p>
                    {alert.dueDate && (
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Due: {alert.dueDate.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Real-time Activity Monitor */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">New DSAR submitted - ID: DSR-2024-045</span>
              <span className="text-gray-400">2 min ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Data processing activity updated - Marketing Campaign</span>
              <span className="text-gray-400">5 min ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600">Risk assessment overdue - Customer Database</span>
              <span className="text-gray-400">12 min ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600">Compliance report generated - Q4 2024</span>
              <span className="text-gray-400">18 min ago</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col">
            <FileText className="h-6 w-6 mb-2" />
            <span className="text-sm">New RoPA Entry</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Users className="h-6 w-6 mb-2" />
            <span className="text-sm">Review DSARs</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <AlertTriangle className="h-6 w-6 mb-2" />
            <span className="text-sm">Breach Response</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Shield className="h-6 w-6 mb-2" />
            <span className="text-sm">Generate Report</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DPODashboard;