import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Database,
  Archive,
  Shield
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { 
  RetentionPolicy, 
  RetentionTrigger, 
  DeletionRule,
  DataLifecycleStage 
} from '../../types/compliance';

interface DataLifecycleManagementProps {
  tenantId?: string;
}

export const DataLifecycleManagement: React.FC<DataLifecycleManagementProps> = ({ tenantId }) => {
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicy | null>(null);
  const [activeTab, setActiveTab] = useState<'policies' | 'schedules' | 'monitoring'>('policies');

  useEffect(() => {
    loadRetentionPolicies();
  }, [tenantId]);

  useEffect(() => {
    filterPolicies();
  }, [retentionPolicies, searchTerm, statusFilter]);

  const loadRetentionPolicies = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockPolicies: RetentionPolicy[] = [
        {
          id: '1',
          name: 'Customer Data Retention',
          description: 'Retention policy for customer personal data and transaction records',
          dataCategories: ['Contact Information', 'Transaction History', 'Preferences'],
          retentionPeriod: {
            duration: 7,
            unit: 'years',
            justification: 'Legal requirement for financial records and customer service',
            deletionMethod: 'automatic',
            reviewFrequency: 'annually'
          },
          triggers: [
            {
              type: 'time_based',
              condition: 'Account inactive for 2 years',
              action: 'review'
            },
            {
              type: 'event_based',
              condition: 'Account closure request',
              action: 'delete'
            },
            {
              type: 'consent_withdrawal',
              condition: 'Marketing consent withdrawn',
              action: 'anonymize'
            }
          ],
          deletionRules: [
            {
              id: 'rule-1',
              name: 'Automatic Deletion',
              criteria: 'Data older than retention period',
              method: 'hard_delete',
              verification: true,
              auditTrail: true
            }
          ],
          status: 'active',
          createdDate: new Date('2024-01-15'),
          lastModified: new Date('2024-10-01'),
          approvedBy: 'Jane Smith (DPO)'
        },
        {
          id: '2',
          name: 'Employee HR Records',
          description: 'Retention policy for employee personal data and HR records',
          dataCategories: ['Employment Records', 'Performance Data', 'Training Records'],
          retentionPeriod: {
            duration: 10,
            unit: 'years',
            justification: 'Employment law requirements',
            deletionMethod: 'manual',
            reviewFrequency: 'annually'
          },
          triggers: [
            {
              type: 'event_based',
              condition: 'Employment termination',
              action: 'archive'
            },
            {
              type: 'time_based',
              condition: '10 years after termination',
              action: 'delete'
            }
          ],
          deletionRules: [
            {
              id: 'rule-2',
              name: 'Manual Review Required',
              criteria: 'Employment records after termination',
              method: 'soft_delete',
              verification: true,
              auditTrail: true
            }
          ],
          status: 'active',
          createdDate: new Date('2024-02-01'),
          lastModified: new Date('2024-09-15'),
          approvedBy: 'John Doe (HR Director)'
        },
        {
          id: '3',
          name: 'Marketing Data Cleanup',
          description: 'Retention policy for marketing and analytics data',
          dataCategories: ['Marketing Preferences', 'Website Analytics', 'Campaign Data'],
          retentionPeriod: {
            duration: 2,
            unit: 'years',
            justification: 'Business need for marketing analytics',
            deletionMethod: 'automatic',
            reviewFrequency: 'quarterly'
          },
          triggers: [
            {
              type: 'consent_withdrawal',
              condition: 'Marketing consent withdrawn',
              action: 'delete'
            },
            {
              type: 'time_based',
              condition: 'No engagement for 12 months',
              action: 'anonymize'
            }
          ],
          deletionRules: [
            {
              id: 'rule-3',
              name: 'Anonymization Process',
              criteria: 'Marketing data without consent',
              method: 'anonymization',
              verification: false,
              auditTrail: true
            }
          ],
          status: 'draft',
          createdDate: new Date('2024-10-01'),
          lastModified: new Date('2024-10-15'),
          approvedBy: ''
        }
      ];

      setRetentionPolicies(mockPolicies);
      setTimeout(() => setLoading(false), 1000);
    } catch (error) {
      console.error('Failed to load retention policies:', error);
      setLoading(false);
    }
  };

  const filterPolicies = () => {
    let filtered = retentionPolicies;

    if (searchTerm) {
      filtered = filtered.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(policy => policy.status === statusFilter);
    }

    setFilteredPolicies(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeletionMethodIcon = (method: string) => {
    switch (method) {
      case 'automatic': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case 'manual': return <FileText className="h-4 w-4 text-orange-500" />;
      case 'anonymization': return <Shield className="h-4 w-4 text-purple-500" />;
      default: return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUpcomingDeletions = () => {
    // Mock upcoming deletions
    return [
      {
        id: '1',
        dataType: 'Customer Records',
        count: 1247,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        policy: 'Customer Data Retention',
        method: 'automatic'
      },
      {
        id: '2',
        dataType: 'Marketing Analytics',
        count: 3456,
        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        policy: 'Marketing Data Cleanup',
        method: 'anonymization'
      }
    ];
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Lifecycle Management</h1>
          <p className="text-gray-500">Manage retention policies and automated deletion workflows</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Retention Policies
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Deletion Schedules
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monitoring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data Minimization
          </button>
        </nav>
      </div>

      {/* Retention Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search policies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Policies List */}
          <div className="space-y-4">
            {filteredPolicies.length === 0 ? (
              <Card className="p-12 text-center">
                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Retention Policies Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No policies match your current filters.' 
                    : 'Get started by creating your first retention policy.'}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Policy
                </Button>
              </Card>
            ) : (
              filteredPolicies.map((policy) => (
                <Card key={policy.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                        <Badge className={getStatusColor(policy.status)}>
                          {policy.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{policy.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Retention Period</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {policy.retentionPeriod.duration} {policy.retentionPeriod.unit}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            {getDeletionMethodIcon(policy.retentionPeriod.deletionMethod)}
                            <span className="text-sm font-medium text-gray-700">Deletion Method</span>
                          </div>
                          <p className="text-sm text-gray-600 capitalize">
                            {policy.retentionPeriod.deletionMethod}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Review Frequency</span>
                          </div>
                          <p className="text-sm text-gray-600 capitalize">
                            {policy.retentionPeriod.reviewFrequency}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Data Categories</p>
                        <div className="flex flex-wrap gap-1">
                          {policy.dataCategories.map((category, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {policy.createdDate.toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Modified: {policy.lastModified.toLocaleDateString()}</span>
                        {policy.approvedBy && (
                          <>
                            <span>•</span>
                            <span>Approved by: {policy.approvedBy}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedPolicy(policy)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {}}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {}}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Deletion Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Automated Deletions</h3>
            <div className="space-y-4">
              {getUpcomingDeletions().map((deletion) => (
                <div key={deletion.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{deletion.dataType}</p>
                      <p className="text-sm text-gray-600">{deletion.count.toLocaleString()} records</p>
                      <p className="text-xs text-gray-500">Policy: {deletion.policy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {deletion.scheduledDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{deletion.method}</p>
                    <div className="flex space-x-2 mt-2">
                      <Button size="sm" variant="outline">
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" />
                        Execute Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Data Minimization Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Data Records</p>
                  <p className="text-2xl font-bold text-gray-900">2.4M</p>
                  <p className="text-xs text-gray-500">Across all systems</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Compliant Records</p>
                  <p className="text-2xl font-bold text-green-600">87%</p>
                  <p className="text-xs text-gray-500">Within retention limits</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Overdue for Deletion</p>
                  <p className="text-2xl font-bold text-red-600">312K</p>
                  <p className="text-xs text-gray-500">Requires attention</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Minimization Recommendations</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Excessive Marketing Data Retention</p>
                  <p className="text-sm text-yellow-700">
                    Customer marketing preferences are being retained beyond the necessary period. 
                    Consider implementing automated cleanup for inactive users.
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">
                    Review Policy
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Optimize Employee Records</p>
                  <p className="text-sm text-blue-700">
                    Some employee training records can be anonymized after 5 years instead of full retention.
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">
                    Implement Anonymization
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{selectedPolicy.name}</h2>
                <Button variant="outline" onClick={() => setSelectedPolicy(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-3">Policy Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-gray-900">{selectedPolicy.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Justification</p>
                    <p className="text-gray-900">{selectedPolicy.retentionPeriod.justification}</p>
                  </div>
                </div>
              </div>

              {/* Triggers */}
              <div>
                <h3 className="text-lg font-medium mb-3">Retention Triggers</h3>
                <div className="space-y-3">
                  {selectedPolicy.triggers.map((trigger, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium capitalize">{trigger.type.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">{trigger.condition}</p>
                        </div>
                        <Badge className="capitalize">{trigger.action}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deletion Rules */}
              <div>
                <h3 className="text-lg font-medium mb-3">Deletion Rules</h3>
                <div className="space-y-3">
                  {selectedPolicy.deletionRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge className="capitalize">{rule.method.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.criteria}</p>
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className={`h-4 w-4 ${rule.verification ? 'text-green-500' : 'text-gray-400'}`} />
                          <span>Verification Required</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className={`h-4 w-4 ${rule.auditTrail ? 'text-green-500' : 'text-gray-400'}`} />
                          <span>Audit Trail</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataLifecycleManagement;