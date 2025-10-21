import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Vendor, 
  VendorAssessment, 
  VendorCertification,
  VendorRiskMetrics 
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Award,
  FileText,
  Bell,
  Settings,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';

interface VendorComplianceMonitoringProps {
  vendor?: Vendor;
  onVendorSelected?: (vendor: Vendor) => void;
}

export const VendorComplianceMonitoring: React.FC<VendorComplianceMonitoringProps> = ({
  vendor,
  onVendorSelected
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assessments, setAssessments] = useState<VendorAssessment[]>([]);
  const [certifications, setCertifications] = useState<VendorCertification[]>([]);
  const [metrics, setMetrics] = useState<VendorRiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [filter, setFilter] = useState({
    riskLevel: 'all',
    complianceStatus: 'all',
    assessmentOverdue: false,
    certificationExpiring: false
  });

  const [automatedRules, setAutomatedRules] = useState([
    {
      id: '1',
      name: 'Annual Assessment Due',
      description: 'Trigger assessment when last assessment is over 365 days old',
      enabled: true,
      frequency: 'daily',
      lastRun: new Date(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Certification Expiry Alert',
      description: 'Send alert when certifications expire within 60 days',
      enabled: true,
      frequency: 'weekly',
      lastRun: new Date(),
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      name: 'High Risk Vendor Review',
      description: 'Schedule quarterly review for high and critical risk vendors',
      enabled: true,
      frequency: 'monthly',
      lastRun: new Date(),
      nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);

  useEffect(() => {
    loadData();
  }, [vendor]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorsData, assessmentsData, certificationsData, metricsData] = await Promise.all([
        vendorRiskService.getVendors(),
        vendorRiskService.getAssessments(vendor?.id),
        vendorRiskService.getCertifications(vendor?.id),
        vendorRiskService.getVendorRiskMetrics()
      ]);

      setVendors(vendorsData);
      setAssessments(assessmentsData);
      setCertifications(certificationsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load compliance monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleAssessment = async (vendorId: string, assessmentType: string) => {
    try {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7); // Schedule for next week
      
      await vendorRiskService.scheduleAssessment(vendorId, assessmentType, scheduledDate);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to schedule assessment:', error);
    }
  };

  const verifyCertification = async (certificationId: string) => {
    try {
      await vendorRiskService.verifyCertification(certificationId);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to verify certification:', error);
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredVendors = vendors.filter(v => {
    if (filter.riskLevel !== 'all' && v.riskLevel !== filter.riskLevel) return false;
    if (filter.complianceStatus !== 'all' && v.complianceStatus !== filter.complianceStatus) return false;
    
    if (filter.assessmentOverdue) {
      const daysSinceLastAssessment = v.lastAssessmentDate 
        ? Math.ceil((new Date().getTime() - new Date(v.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      if (daysSinceLastAssessment < 365) return false;
    }

    if (filter.certificationExpiring) {
      const hasExpiringCert = v.certifications.some(cert => {
        const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
        return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
      });
      if (!hasExpiringCert) return false;
    }

    return true;
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
          <h2 className="text-2xl font-bold text-gray-900">Vendor Compliance Monitoring</h2>
          <p className="text-gray-600">Automated compliance tracking and assessment scheduling</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalVendors}</p>
                <p className="text-sm text-gray-500">{metrics.activeVendors} active</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk Vendors</p>
                <p className="text-2xl font-bold text-red-600">{metrics.highRiskVendors}</p>
                <p className="text-sm text-gray-500">
                  {((metrics.highRiskVendors / metrics.totalVendors) * 100).toFixed(1)}% of total
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${metrics.complianceRate}%` }}
                  ></div>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Assessments</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.pendingAssessments}</p>
                <p className="text-sm text-gray-500">Overdue: {metrics.overdueDPAs}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Risk Distribution Chart */}
      {metrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="space-y-4">
            {Object.entries(metrics.riskDistribution).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={getRiskLevelColor(level)}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-600">{count} vendors</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        level === 'low' ? 'bg-green-600' :
                        level === 'medium' ? 'bg-yellow-600' :
                        level === 'high' ? 'bg-orange-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${(count / metrics.totalVendors) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {((count / metrics.totalVendors) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Automated Monitoring Rules */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Automated Monitoring Rules</h3>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure Rules
          </Button>
        </div>
        
        <div className="space-y-4">
          {automatedRules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <h4 className="font-medium text-gray-900">{rule.name}</h4>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Frequency: {rule.frequency}</span>
                  <span>Last run: {rule.lastRun.toLocaleDateString()}</span>
                  <span>Next run: {rule.nextRun.toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => {
                      setAutomatedRules(prev => prev.map(r => 
                        r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                      ));
                    }}
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <select
              value={filter.riskLevel}
              onChange={(e) => setFilter(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Status</label>
            <select
              value={filter.complianceStatus}
              onChange={(e) => setFilter(prev => ({ ...prev, complianceStatus: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partially Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 pt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filter.assessmentOverdue}
                onChange={(e) => setFilter(prev => ({ ...prev, assessmentOverdue: e.target.checked }))}
                className="mr-2"
              />
              Assessment Overdue
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filter.certificationExpiring}
                onChange={(e) => setFilter(prev => ({ ...prev, certificationExpiring: e.target.checked }))}
                className="mr-2"
              />
              Certification Expiring
            </label>
          </div>
        </div>
      </Card>

      {/* Vendor Compliance List */}
      <div className="space-y-4">
        {filteredVendors.map(vendor => {
          const daysSinceLastAssessment = vendor.lastAssessmentDate 
            ? Math.ceil((new Date().getTime() - new Date(vendor.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          const isAssessmentOverdue = daysSinceLastAssessment && daysSinceLastAssessment > 365;
          
          const expiringCertifications = vendor.certifications.filter(cert => {
            const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
            return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
          });

          return (
            <Card key={vendor.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onVendorSelected?.(vendor)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{vendor.name}</h4>
                    <Badge className={getRiskLevelColor(vendor.riskLevel)}>
                      {vendor.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <Badge className={getComplianceStatusColor(vendor.complianceStatus)}>
                      {vendor.complianceStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Risk Score</div>
                        <div className={vendor.riskScore > 70 ? 'text-red-600' : vendor.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'}>
                          {vendor.riskScore}/100
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Last Assessment</div>
                        <div className={isAssessmentOverdue ? 'text-red-600' : ''}>
                          {vendor.lastAssessmentDate 
                            ? new Date(vendor.lastAssessmentDate).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Certifications</div>
                        <div>
                          {vendor.certifications.length} total
                          {expiringCertifications.length > 0 && (
                            <span className="text-orange-600 ml-1">
                              ({expiringCertifications.length} expiring)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">DPAs</div>
                        <div>{vendor.dataProcessingAgreements.length} active</div>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="space-y-2">
                    {isAssessmentOverdue && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                            <span className="text-sm text-red-800">
                              Assessment overdue by {daysSinceLastAssessment! - 365} days
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              scheduleAssessment(vendor.id, 'annual');
                            }}
                          >
                            Schedule Assessment
                          </Button>
                        </div>
                      </div>
                    )}

                    {expiringCertifications.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Bell className="w-4 h-4 text-orange-400 mr-2" />
                            <span className="text-sm text-orange-800">
                              {expiringCertifications.length} certification(s) expiring within 60 days
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle certification renewal
                            }}
                          >
                            Review Certifications
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      scheduleAssessment(vendor.id, 'ad_hoc');
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Assessment
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredVendors.length === 0 && (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Vendors Found</h4>
            <p className="text-gray-600">
              {vendors.length === 0 
                ? "No vendors have been added yet."
                : "No vendors match the current filters."
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};