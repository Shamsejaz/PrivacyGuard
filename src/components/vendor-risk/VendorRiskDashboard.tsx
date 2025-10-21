import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  VendorRiskMetrics, 
  Vendor, 
  VendorAssessment,
  DataProcessingAgreement,
  VendorCertification 
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  FileText, 
  Award,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  Building2
} from 'lucide-react';

interface VendorRiskDashboardProps {
  onVendorSelected?: (vendor: Vendor) => void;
  onNavigateToModule?: (module: string) => void;
}

export const VendorRiskDashboard: React.FC<VendorRiskDashboardProps> = ({
  onVendorSelected,
  onNavigateToModule
}) => {
  const [metrics, setMetrics] = useState<VendorRiskMetrics | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<VendorAssessment[]>([]);
  const [expiringItems, setExpiringItems] = useState<{
    dpas: DataProcessingAgreement[];
    certifications: VendorCertification[];
    assessments: VendorAssessment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, vendorsData, assessmentsData, expiringData] = await Promise.all([
        vendorRiskService.getVendorRiskMetrics(),
        vendorRiskService.getVendors(),
        vendorRiskService.getAssessments(),
        vendorRiskService.getExpiringItems()
      ]);

      setMetrics(metricsData);
      setVendors(vendorsData);
      setRecentAssessments(assessmentsData.slice(0, 10)); // Latest 10 assessments
      setExpiringItems(expiringData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100';
      case 'medium': return 'bg-yellow-100';
      case 'high': return 'bg-orange-100';
      case 'critical': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const highRiskVendors = vendors.filter(v => v.riskLevel === 'high' || v.riskLevel === 'critical');
  const nonCompliantVendors = vendors.filter(v => v.complianceStatus === 'non_compliant');
  const overdueAssessments = vendors.filter(v => {
    if (!v.lastAssessmentDate) return true;
    const daysSinceAssessment = Math.ceil(
      (new Date().getTime() - new Date(v.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceAssessment > 365;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Risk Dashboard</h2>
          <p className="text-gray-600">Comprehensive overview of vendor risk and compliance status</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalVendors}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {metrics.activeVendors} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Risk Score</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.averageRiskScore.toFixed(1)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {metrics.highRiskVendors} high risk vendors
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-3xl font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${metrics.complianceRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.pendingAssessments + metrics.overdueDPAs + metrics.expiredCertifications}
                </p>
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Requires attention
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Risk Distribution and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        {metrics && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Risk Distribution</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {Object.entries(metrics.riskDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getRiskLevelBg(level)}`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{level} Risk</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          level === 'low' ? 'bg-green-600' :
                          level === 'medium' ? 'bg-yellow-600' :
                          level === 'high' ? 'bg-orange-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${(count / metrics.totalVendors) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8">{count}</span>
                    <span className="text-xs text-gray-500 w-12">
                      {((count / metrics.totalVendors) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Monthly Trends */}
        {metrics && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {metrics.monthlyTrends.slice(-6).map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{trend.month}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{trend.newVendors} new</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span>{trend.assessmentsCompleted} assessed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <span>{trend.riskScoreAverage.toFixed(1)} avg risk</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Risk Vendors */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">High Risk Vendors</h3>
            <Badge variant="destructive">{highRiskVendors.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {highRiskVendors.slice(0, 5).map(vendor => (
              <div 
                key={vendor.id} 
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
                onClick={() => onVendorSelected?.(vendor)}
              >
                <div>
                  <p className="font-medium text-gray-900">{vendor.name}</p>
                  <p className="text-sm text-gray-600">{vendor.industry}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${getRiskLevelBg(vendor.riskLevel)} ${getRiskLevelColor(vendor.riskLevel)}`}>
                    {vendor.riskLevel.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">{vendor.riskScore}/100</p>
                </div>
              </div>
            ))}
            
            {highRiskVendors.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigateToModule?.('vendor-list')}
              >
                View All {highRiskVendors.length} High Risk Vendors
              </Button>
            )}
          </div>
        </Card>

        {/* Overdue Assessments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Overdue Assessments</h3>
            <Badge variant="secondary">{overdueAssessments.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {overdueAssessments.slice(0, 5).map(vendor => {
              const daysSinceAssessment = vendor.lastAssessmentDate 
                ? Math.ceil((new Date().getTime() - new Date(vendor.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
                <div 
                  key={vendor.id} 
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
                  onClick={() => onVendorSelected?.(vendor)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-600">
                      {vendor.lastAssessmentDate 
                        ? `${daysSinceAssessment} days overdue`
                        : 'Never assessed'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              );
            })}
            
            {overdueAssessments.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigateToModule?.('assessments')}
              >
                View All {overdueAssessments.length} Overdue Assessments
              </Button>
            )}
          </div>
        </Card>

        {/* Expiring Items */}
        {expiringItems && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expiring Items</h3>
              <Badge variant="secondary">
                {expiringItems.dpas.length + expiringItems.certifications.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {/* Expiring DPAs */}
              {expiringItems.dpas.slice(0, 3).map(dpa => (
                <div key={dpa.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{dpa.title}</p>
                    <p className="text-sm text-gray-600">DPA expires soon</p>
                  </div>
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
              ))}
              
              {/* Expiring Certifications */}
              {expiringItems.certifications.slice(0, 3).map(cert => (
                <div key={cert.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{cert.name}</p>
                    <p className="text-sm text-gray-600">Certification expires soon</p>
                  </div>
                  <Award className="w-5 h-5 text-orange-600" />
                </div>
              ))}
              
              {(expiringItems.dpas.length + expiringItems.certifications.length) > 6 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigateToModule?.('expiring-items')}
                >
                  View All Expiring Items
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Industry Breakdown */}
      {metrics && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Distribution by Industry</h3>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(metrics.industryBreakdown).map(([industry, count]) => (
              <div key={industry} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{industry}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((count / metrics.totalVendors) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assessment Activity</h3>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {recentAssessments.map(assessment => (
            <div key={assessment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  assessment.status === 'completed' ? 'bg-green-500' :
                  assessment.status === 'in_progress' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900">
                    Assessment for Vendor ID: {assessment.vendorId}
                  </p>
                  <p className="text-sm text-gray-600">
                    {assessment.assessmentType} • {assessment.assessorName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={
                  assessment.status === 'completed' ? 'default' :
                  assessment.status === 'in_progress' ? 'secondary' :
                  'outline'
                }>
                  {assessment.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(assessment.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};