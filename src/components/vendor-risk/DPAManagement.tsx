import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { DataProcessingAgreement, Vendor } from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Edit, 
  Download,
  RefreshCw,
  Clock,
  Users,
  Shield,
  MapPin
} from 'lucide-react';

interface DPAManagementProps {
  vendor?: Vendor;
  onDPAUpdated?: (dpa: DataProcessingAgreement) => void;
}

export const DPAManagement: React.FC<DPAManagementProps> = ({
  vendor,
  onDPAUpdated
}) => {
  const [dpas, setDPAs] = useState<DataProcessingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDPA, setSelectedDPA] = useState<DataProcessingAgreement | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    expiringWithin: 'all'
  });

  useEffect(() => {
    loadDPAs();
  }, [vendor]);

  const loadDPAs = async () => {
    try {
      setLoading(true);
      const data = await vendorRiskService.getDPAs(vendor?.id);
      setDPAs(data);
    } catch (error) {
      console.error('Failed to load DPAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredDPAs = dpas.filter(dpa => {
    if (filter.status !== 'all' && dpa.status !== filter.status) {
      return false;
    }

    if (filter.expiringWithin !== 'all') {
      const daysUntilExpiry = dpa.expiryDate ? getDaysUntilExpiry(dpa.expiryDate) : Infinity;
      switch (filter.expiringWithin) {
        case '30':
          return daysUntilExpiry <= 30;
        case '90':
          return daysUntilExpiry <= 90;
        case 'expired':
          return daysUntilExpiry < 0;
        default:
          return true;
      }
    }

    return true;
  });

  const handleRenewDPA = async (dpa: DataProcessingAgreement) => {
    try {
      const renewalPeriod = dpa.renewalPeriod || 12; // Default 12 months
      const renewedDPA = await vendorRiskService.renewDPA(dpa.id, renewalPeriod);
      setDPAs(prev => prev.map(d => d.id === dpa.id ? renewedDPA : d));
      if (onDPAUpdated) {
        onDPAUpdated(renewedDPA);
      }
    } catch (error) {
      console.error('Failed to renew DPA:', error);
    }
  };

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
          <h3 className="text-lg font-semibold text-gray-900">Data Processing Agreements</h3>
          <p className="text-sm text-gray-600">
            Manage contracts and compliance documentation
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New DPA
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiring Within
            </label>
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

          <div className="flex items-end">
            <Button variant="outline" onClick={loadDPAs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* DPA List */}
      <div className="grid gap-6">
        {filteredDPAs.map(dpa => {
          const daysUntilExpiry = dpa.expiryDate ? getDaysUntilExpiry(dpa.expiryDate) : null;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
          const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

          return (
            <Card key={dpa.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{dpa.title}</h4>
                    <Badge className={getStatusColor(dpa.status)}>
                      {dpa.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{dpa.type}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Effective Date</div>
                        <div>{new Date(dpa.effectiveDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {dpa.expiryDate && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-medium">Expiry Date</div>
                          <div className={isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}>
                            {new Date(dpa.expiryDate).toLocaleDateString()}
                            {daysUntilExpiry !== null && (
                              <span className="ml-1">
                                ({daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Sub-processors</div>
                        <div>{dpa.subProcessors.length}</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Data Locations</div>
                        <div>{dpa.dataLocation.length} regions</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {(isExpiringSoon || isExpired) && dpa.autoRenewal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRenewDPA(dpa)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDPA(dpa)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>

                  {dpa.documentUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(dpa.documentUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>

              {/* Expiry Warning */}
              {isExpiringSoon && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-800">
                      This DPA expires in {daysUntilExpiry} days. 
                      {dpa.autoRenewal ? ' Auto-renewal is enabled.' : ' Please review for renewal.'}
                    </p>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-800">
                      This DPA has expired. Immediate action required.
                    </p>
                  </div>
                </div>
              )}

              {/* DPA Details */}
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Data Categories</h5>
                  <div className="flex flex-wrap gap-2">
                    {dpa.dataCategories.map(category => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Processing Purposes</h5>
                  <div className="flex flex-wrap gap-2">
                    {dpa.processingPurposes.map(purpose => (
                      <Badge key={purpose} variant="outline" className="text-xs">
                        {purpose}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Retention Period:</span>
                    <span className="ml-2 text-gray-600">{dpa.retentionPeriod || 'Not specified'}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Breach Notification:</span>
                    <span className="ml-2 text-gray-600">{dpa.breachNotificationTime}h</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Audit Rights:</span>
                    <span className="ml-2 text-gray-600">
                      {dpa.auditRights ? (
                        <CheckCircle className="w-4 h-4 inline text-green-500" />
                      ) : (
                        <span className="text-red-500">No</span>
                      )}
                    </span>
                  </div>
                </div>

                {dpa.subProcessors.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Sub-processors</h5>
                    <div className="space-y-2">
                      {dpa.subProcessors.map(subProcessor => (
                        <div key={subProcessor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{subProcessor.name}</span>
                            <span className="text-sm text-gray-600 ml-2">({subProcessor.location})</span>
                          </div>
                          <Badge 
                            variant={subProcessor.status === 'approved' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {subProcessor.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {filteredDPAs.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No DPAs Found</h4>
            <p className="text-gray-600 mb-4">
              {dpas.length === 0 
                ? "No data processing agreements have been created yet."
                : "No DPAs match the current filters."
              }
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First DPA
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit DPA Modal would go here */}
      {(showCreateForm || selectedDPA) && (
        <DPAFormModal
          dpa={selectedDPA}
          vendor={vendor}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedDPA(null);
          }}
          onSaved={(dpa) => {
            if (selectedDPA) {
              setDPAs(prev => prev.map(d => d.id === dpa.id ? dpa : d));
            } else {
              setDPAs(prev => [...prev, dpa]);
            }
            if (onDPAUpdated) {
              onDPAUpdated(dpa);
            }
            setShowCreateForm(false);
            setSelectedDPA(null);
          }}
        />
      )}
    </div>
  );
};

// DPA Form Modal Component
interface DPAFormModalProps {
  dpa?: DataProcessingAgreement | null;
  vendor?: Vendor;
  onClose: () => void;
  onSaved: (dpa: DataProcessingAgreement) => void;
}

const DPAFormModal: React.FC<DPAFormModalProps> = ({
  dpa,
  vendor,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'DPA' as const,
    effectiveDate: '',
    expiryDate: '',
    autoRenewal: true,
    renewalPeriod: 12,
    dataCategories: [] as string[],
    processingPurposes: [] as string[],
    dataSubjects: [] as string[],
    retentionPeriod: '',
    dataLocation: [] as string[],
    securityMeasures: [] as string[],
    breachNotificationTime: 24,
    auditRights: true,
    terminationRights: [] as string[]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dpa) {
      setFormData({
        title: dpa.title,
        type: dpa.type,
        effectiveDate: new Date(dpa.effectiveDate).toISOString().split('T')[0],
        expiryDate: dpa.expiryDate ? new Date(dpa.expiryDate).toISOString().split('T')[0] : '',
        autoRenewal: dpa.autoRenewal,
        renewalPeriod: dpa.renewalPeriod || 12,
        dataCategories: dpa.dataCategories,
        processingPurposes: dpa.processingPurposes,
        dataSubjects: dpa.dataSubjects,
        retentionPeriod: dpa.retentionPeriod || '',
        dataLocation: dpa.dataLocation,
        securityMeasures: dpa.securityMeasures,
        breachNotificationTime: dpa.breachNotificationTime,
        auditRights: dpa.auditRights,
        terminationRights: dpa.terminationRights
      });
    }
  }, [dpa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dpaData = {
        ...formData,
        vendorId: vendor?.id || '',
        status: 'draft' as const,
        effectiveDate: new Date(formData.effectiveDate),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        subProcessors: [],
        version: '1.0'
      };

      let savedDPA;
      if (dpa) {
        savedDPA = await vendorRiskService.updateDPA(dpa.id, dpaData);
      } else {
        savedDPA = await vendorRiskService.createDPA(dpaData);
      }

      onSaved(savedDPA);
    } catch (error) {
      console.error('Failed to save DPA:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {dpa ? 'Edit' : 'Create'} Data Processing Agreement
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DPA Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter DPA title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agreement Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DPA">Data Processing Agreement</option>
                <option value="BAA">Business Associate Agreement</option>
                <option value="MSA">Master Service Agreement</option>
                <option value="SLA">Service Level Agreement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date *
              </label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Additional form fields would go here */}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {dpa ? 'Update' : 'Create'} DPA
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};