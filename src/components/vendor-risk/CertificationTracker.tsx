import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { VendorCertification, Vendor } from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Award, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Edit, 
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Shield,
  FileText,
  ExternalLink
} from 'lucide-react';

interface CertificationTrackerProps {
  vendor?: Vendor;
  onCertificationUpdated?: (certification: VendorCertification) => void;
}

export const CertificationTracker: React.FC<CertificationTrackerProps> = ({
  vendor,
  onCertificationUpdated
}) => {
  const [certifications, setCertifications] = useState<VendorCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCertification, setEditingCertification] = useState<VendorCertification | null>(null);
  const [filter, setFilter] = useState({
    status: 'all',
    type: 'all',
    expiringWithin: 'all'
  });

  const certificationTypes = [
    { value: 'ISO27001', label: 'ISO 27001' },
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'GDPR', label: 'GDPR Compliance' },
    { value: 'HIPAA', label: 'HIPAA Compliance' },
    { value: 'PCI_DSS', label: 'PCI DSS' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadCertifications();
  }, [vendor]);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const data = await vendorRiskService.getCertifications(vendor?.id);
      setCertifications(data);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVerifyCertification = async (certification: VendorCertification) => {
    try {
      const verifiedCert = await vendorRiskService.verifyCertification(certification.id);
      setCertifications(prev => prev.map(c => c.id === certification.id ? verifiedCert : c));
      if (onCertificationUpdated) {
        onCertificationUpdated(verifiedCert);
      }
    } catch (error) {
      console.error('Failed to verify certification:', error);
    }
  };

  const filteredCertifications = certifications.filter(cert => {
    if (filter.status !== 'all' && cert.status !== filter.status) return false;
    if (filter.type !== 'all' && cert.type !== filter.type) return false;
    
    if (filter.expiringWithin !== 'all') {
      const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
      switch (filter.expiringWithin) {
        case '30':
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        case '90':
          return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        case 'expired':
          return daysUntilExpiry < 0;
        default:
          return true;
      }
    }

    return true;
  });

  const expiringCertifications = certifications.filter(cert => {
    const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
  });

  const expiredCertifications = certifications.filter(cert => {
    const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate);
    return daysUntilExpiry < 0;
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
          <h3 className="text-lg font-semibold text-gray-900">Certification Tracking</h3>
          <p className="text-sm text-gray-600">
            Monitor vendor certifications and renewal alerts
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadCertifications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Certification
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Certifications</p>
              <p className="text-2xl font-bold text-gray-900">{certifications.length}</p>
            </div>
            <Award className="w-6 h-6 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid</p>
              <p className="text-2xl font-bold text-green-600">
                {certifications.filter(c => c.status === 'valid').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{expiringCertifications.length}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{expiredCertifications.length}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {(expiringCertifications.length > 0 || expiredCertifications.length > 0) && (
        <div className="space-y-3">
          {expiredCertifications.length > 0 && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">
                    {expiredCertifications.length} certification(s) have expired
                  </h4>
                  <p className="text-sm text-red-600">
                    Immediate action required to maintain compliance
                  </p>
                </div>
              </div>
            </Card>
          )}

          {expiringCertifications.length > 0 && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-yellow-400 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    {expiringCertifications.length} certification(s) expiring within 60 days
                  </h4>
                  <p className="text-sm text-yellow-600">
                    Plan renewal activities to avoid compliance gaps
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {certificationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiring Within</label>
            <select
              value={filter.expiringWithin}
              onChange={(e) => setFilter(prev => ({ ...prev, expiringWithin: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Timeframes</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="expired">Already Expired</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Certifications List */}
      <div className="space-y-4">
        {filteredCertifications.map(certification => {
          const daysUntilExpiry = getDaysUntilExpiry(certification.expiryDate);
          const isExpiringSoon = daysUntilExpiry <= 60 && daysUntilExpiry > 0;
          const isExpired = daysUntilExpiry < 0;

          return (
            <Card key={certification.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{certification.name}</h4>
                    <Badge className={getStatusColor(certification.status)}>
                      {certification.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {certificationTypes.find(t => t.value === certification.type)?.label || certification.type}
                    </Badge>
                    <Badge className={getVerificationStatusColor(certification.verificationStatus)}>
                      {certification.verificationStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Issuing Body</div>
                        <div>{certification.issuingBody}</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Issue Date</div>
                        <div>{new Date(certification.issueDate).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Expiry Date</div>
                        <div className={isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}>
                          {new Date(certification.expiryDate).toLocaleDateString()}
                          {daysUntilExpiry !== null && (
                            <div className="text-xs">
                              {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : `Expired ${Math.abs(daysUntilExpiry)} days ago`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {certification.certificateNumber && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-medium">Certificate #</div>
                          <div className="font-mono text-xs">{certification.certificateNumber}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expiry Warning */}
                  {isExpiringSoon && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2" />
                        <p className="text-sm text-yellow-800">
                          This certification expires in {daysUntilExpiry} days. Plan renewal activities.
                        </p>
                      </div>
                    </div>
                  )}

                  {isExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <p className="text-sm text-red-800">
                          This certification expired {Math.abs(daysUntilExpiry)} days ago. Immediate action required.
                        </p>
                      </div>
                    </div>
                  )}

                  {certification.verificationStatus === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <p className="text-sm text-red-800">
                          Verification failed. Please review certification details and re-verify.
                        </p>
                      </div>
                    </div>
                  )}

                  {certification.verificationDate && (
                    <div className="text-sm text-gray-500">
                      Last verified: {new Date(certification.verificationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {certification.verificationStatus !== 'verified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyCertification(certification)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify
                    </Button>
                  )}

                  {certification.documentUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(certification.documentUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCertification(certification)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredCertifications.length === 0 && (
          <Card className="p-8 text-center">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Certifications Found</h4>
            <p className="text-gray-600 mb-4">
              {certifications.length === 0 
                ? "No certifications have been added yet."
                : "No certifications match the current filters."
              }
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Certification
            </Button>
          </Card>
        )}
      </div>

      {/* Add/Edit Certification Modal would go here */}
      {(showAddForm || editingCertification) && (
        <CertificationFormModal
          certification={editingCertification}
          vendor={vendor}
          onClose={() => {
            setShowAddForm(false);
            setEditingCertification(null);
          }}
          onSaved={(cert) => {
            if (editingCertification) {
              setCertifications(prev => prev.map(c => c.id === cert.id ? cert : c));
            } else {
              setCertifications(prev => [...prev, cert]);
            }
            if (onCertificationUpdated) {
              onCertificationUpdated(cert);
            }
            setShowAddForm(false);
            setEditingCertification(null);
          }}
        />
      )}
    </div>
  );
};

// Certification Form Modal Component
interface CertificationFormModalProps {
  certification?: VendorCertification | null;
  vendor?: Vendor;
  onClose: () => void;
  onSaved: (certification: VendorCertification) => void;
}

const CertificationFormModal: React.FC<CertificationFormModalProps> = ({
  certification,
  vendor,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'ISO27001' as const,
    issuingBody: '',
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
    documentUrl: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (certification) {
      setFormData({
        name: certification.name,
        type: certification.type,
        issuingBody: certification.issuingBody,
        issueDate: new Date(certification.issueDate).toISOString().split('T')[0],
        expiryDate: new Date(certification.expiryDate).toISOString().split('T')[0],
        certificateNumber: certification.certificateNumber || '',
        documentUrl: certification.documentUrl || ''
      });
    }
  }, [certification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const certData = {
        ...formData,
        vendorId: vendor?.id || '',
        status: 'valid' as const,
        issueDate: new Date(formData.issueDate),
        expiryDate: new Date(formData.expiryDate),
        verificationStatus: 'pending' as const
      };

      let savedCert;
      if (certification) {
        savedCert = await vendorRiskService.updateCertification(certification.id, certData);
      } else {
        savedCert = await vendorRiskService.createCertification(certData);
      }

      onSaved(savedCert);
    } catch (error) {
      console.error('Failed to save certification:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {certification ? 'Edit' : 'Add'} Certification
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter certification name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ISO27001">ISO 27001</option>
                <option value="SOC2">SOC 2</option>
                <option value="GDPR">GDPR Compliance</option>
                <option value="HIPAA">HIPAA Compliance</option>
                <option value="PCI_DSS">PCI DSS</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Body *
              </label>
              <Input
                value={formData.issuingBody}
                onChange={(e) => setFormData(prev => ({ ...prev, issuingBody: e.target.value }))}
                placeholder="Enter issuing organization"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Number
              </label>
              <Input
                value={formData.certificateNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                placeholder="Enter certificate number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date *
              </label>
              <Input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date *
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document URL
            </label>
            <Input
              type="url"
              value={formData.documentUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
              placeholder="https://example.com/certificate.pdf"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {certification ? 'Update' : 'Add'} Certification
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};