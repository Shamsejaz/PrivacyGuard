import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar, 
  Filter,
  FileText,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  Eye,
  Mail,
  Settings
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  ExecutiveReport, 
  ExecutiveMetrics, 
  TrendAnalysis 
} from '../../types/compliance';

interface ExecutiveReportingProps {
  tenantId?: string;
}

export const ExecutiveReporting: React.FC<ExecutiveReportingProps> = ({ tenantId }) => {
  const [currentMetrics, setCurrentMetrics] = useState<ExecutiveMetrics | null>(null);
  const [trends, setTrends] = useState<TrendAnalysis[]>([]);
  const [reports, setReports] = useState<ExecutiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'trends'>('dashboard');

  useEffect(() => {
    loadExecutiveData();
  }, [tenantId, selectedPeriod]);

  const loadExecutiveData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockMetrics: ExecutiveMetrics = {
        complianceScore: 87,
        dataProcessingActivities: 127,
        dataSubjectRequests: {
          total: 156,
          completed: 142,
          pending: 12,
          overdue: 2
        },
        breachNotifications: {
          total: 3,
          reportedToAuthority: 3,
          reportedToSubjects: 2
        },
        riskAssessments: {
          total: 89,
          highRisk: 12,
          overdue: 5
        },
        trainingCompletion: 94,
        vendorAssessments: {
          total: 45,
          compliant: 38,
          nonCompliant: 7
        }
      };

      const mockTrends: TrendAnalysis[] = [
        {
          metric: 'Compliance Score',
          currentValue: 87,
          previousValue: 82,
          changePercentage: 6.1,
          trend: 'improving',
          analysis: 'Compliance score improved due to enhanced GDPR documentation and staff training completion.'
        },
        {
          metric: 'DSAR Response Time',
          currentValue: 18.5,
          previousValue: 22.3,
          changePercentage: -17.0,
          trend: 'improving',
          analysis: 'Average response time reduced through process automation and dedicated DSAR team.'
        },
        {
          metric: 'Data Breach Incidents',
          currentValue: 3,
          previousValue: 1,
          changePercentage: 200,
          trend: 'declining',
          analysis: 'Increase in reported incidents due to improved detection capabilities and staff awareness.'
        },
        {
          metric: 'Vendor Compliance Rate',
          currentValue: 84.4,
          previousValue: 79.2,
          changePercentage: 6.6,
          trend: 'improving',
          analysis: 'Enhanced vendor assessment process and regular compliance monitoring improved overall rates.'
        }
      ];

      const mockReports: ExecutiveReport[] = [
        {
          id: '1',
          title: 'Q4 2024 Privacy Compliance Report',
          type: 'quarterly',
          period: {
            startDate: new Date('2024-10-01'),
            endDate: new Date('2024-12-31')
          },
          metrics: mockMetrics,
          trends: mockTrends,
          recommendations: [
            'Implement automated DSAR processing to further reduce response times',
            'Enhance vendor risk assessment framework for third-party processors',
            'Develop incident response training for all staff members'
          ],
          generatedDate: new Date('2024-10-15'),
          generatedBy: 'Jane Smith (DPO)',
          recipients: ['CEO', 'Legal Counsel', 'IT Director', 'Compliance Team']
        },
        {
          id: '2',
          title: 'October 2024 Monthly Privacy Report',
          type: 'monthly',
          period: {
            startDate: new Date('2024-10-01'),
            endDate: new Date('2024-10-31')
          },
          metrics: mockMetrics,
          trends: mockTrends.slice(0, 2),
          recommendations: [
            'Review and update privacy notices for new product features',
            'Conduct quarterly privacy impact assessments for high-risk processing'
          ],
          generatedDate: new Date('2024-11-01'),
          generatedBy: 'Jane Smith (DPO)',
          recipients: ['Privacy Team', 'Legal Counsel']
        }
      ];

      setCurrentMetrics(mockMetrics);
      setTrends(mockTrends);
      setReports(mockReports);
      setTimeout(() => setLoading(false), 1000);
    } catch (error) {
      console.error('Failed to load executive data:', error);
      setLoading(false);
    }
  };

  const generateReport = async (type: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc') => {
    try {
      // Mock report generation
      console.log(`Generating ${type} report...`);
      // In real implementation, call API to generate report
      await new Promise(resolve => setTimeout(resolve, 2000));
      loadExecutiveData(); // Reload to show new report
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getTrendIcon = (trend: string, changePercentage: number) => {
    if (trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!currentMetrics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Executive Data</h3>
          <p className="text-gray-500 mb-4">Unable to retrieve executive reporting metrics</p>
          <Button onClick={loadExecutiveData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Reporting & Analytics</h1>
          <p className="text-gray-500">Comprehensive privacy compliance insights for leadership</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="monthly">Monthly View</option>
            <option value="quarterly">Quarterly View</option>
            <option value="annual">Annual View</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => generateReport('ad_hoc')}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Executive Dashboard
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Trend Analysis
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generated Reports
          </button>
        </nav>
      </div>

      {/* Executive Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Overall Compliance Score</p>
                  <p className="text-3xl font-bold text-gray-900">{currentMetrics.complianceScore}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2">
                <Badge className={currentMetrics.complianceScore >= 85 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {currentMetrics.complianceScore >= 85 ? 'EXCELLENT' : 'GOOD'}
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Processing Activities</p>
                  <p className="text-3xl font-bold text-gray-900">{currentMetrics.dataProcessingActivities}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Active processing records</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Training Completion</p>
                  <p className="text-3xl font-bold text-gray-900">{currentMetrics.trainingCompletion}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Staff privacy training</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Compliance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((currentMetrics.vendorAssessments.compliant / currentMetrics.vendorAssessments.total) * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {currentMetrics.vendorAssessments.compliant}/{currentMetrics.vendorAssessments.total} vendors
              </p>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DSAR Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Subject Requests</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Requests</span>
                  <span className="font-semibold">{currentMetrics.dataSubjectRequests.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-green-600">{currentMetrics.dataSubjectRequests.completed}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-yellow-600">{currentMetrics.dataSubjectRequests.pending}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overdue</span>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-600">{currentMetrics.dataSubjectRequests.overdue}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Completion Rate</span>
                  <span className="font-medium">
                    {Math.round((currentMetrics.dataSubjectRequests.completed / currentMetrics.dataSubjectRequests.total) * 100)}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Risk Assessment Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessments</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Assessments</span>
                  <span className="font-semibold">{currentMetrics.riskAssessments.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">High Risk</span>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-600">{currentMetrics.riskAssessments.highRisk}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overdue Reviews</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-orange-600">{currentMetrics.riskAssessments.overdue}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">High Risk Percentage</span>
                  <span className="font-medium">
                    {Math.round((currentMetrics.riskAssessments.highRisk / currentMetrics.riskAssessments.total) * 100)}%
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Breach Notifications */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Breach Notifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentMetrics.breachNotifications.total}</p>
                <p className="text-sm text-gray-500">Total Incidents</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentMetrics.breachNotifications.reportedToAuthority}</p>
                <p className="text-sm text-gray-500">Reported to Authority</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentMetrics.breachNotifications.reportedToSubjects}</p>
                <p className="text-sm text-gray-500">Reported to Subjects</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Trend Analysis Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Performance Trends</h3>
            <div className="space-y-6">
              {trends.map((trend, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{trend.metric}</h4>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(trend.trend, trend.changePercentage)}
                      <span className={`font-semibold ${getTrendColor(trend.trend)}`}>
                        {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Current</p>
                      <p className="text-lg font-semibold">{trend.currentValue}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Previous</p>
                      <p className="text-lg font-semibold text-gray-600">{trend.previousValue}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{trend.analysis}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Generated Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => generateReport('monthly')}>
                Generate Monthly
              </Button>
              <Button variant="outline" onClick={() => generateReport('quarterly')}>
                Generate Quarterly
              </Button>
              <Button onClick={() => generateReport('annual')}>
                Generate Annual
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{report.title}</h4>
                      <Badge className="capitalize">{report.type}</Badge>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Period: {report.period.startDate.toLocaleDateString()} - {report.period.endDate.toLocaleDateString()}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Generated</p>
                        <p className="font-medium">{report.generatedDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Generated By</p>
                        <p className="font-medium">{report.generatedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Recipients</p>
                        <p className="font-medium">{report.recipients.length} stakeholders</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Recommendations</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {report.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveReporting;