import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Shield,
  Globe
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import { DataProcessingActivity, LawfulBasis } from '../../types/compliance';

interface RoPAManagementProps {
  tenantId?: string;
}

export const RoPAManagement: React.FC<RoPAManagementProps> = ({ tenantId }) => {
  const [activities, setActivities] = useState<DataProcessingActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<DataProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DataProcessingActivity | null>(null);

  useEffect(() => {
    loadActivities();
  }, [tenantId]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, statusFilter]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockActivities: DataProcessingActivity[] = [
        {
          id: '1',
          name: 'Customer Data Processing',
          purpose: 'Customer relationship management and service delivery',
          lawfulBasis: {
            type: 'contract',
            description: 'Processing necessary for the performance of a contract',
            evidence: 'Customer service agreement'
          },
          dataCategories: [
            {
              id: '1',
              name: 'Contact Information',
              type: 'personal',
              sensitivity: 'low',
              examples: ['Name', 'Email', 'Phone']
            },
            {
              id: '2',
              name: 'Financial Data',
              type: 'personal',
              sensitivity: 'high',
              examples: ['Payment details', 'Credit score']
            }
          ],
          dataSubjects: [
            {
              id: '1',
              name: 'Customers',
              description: 'Active and prospective customers',
              vulnerabilityLevel: 'standard'
            }
          ],
          recipients: [
            {
              id: '1',
              name: 'Payment Processor',
              type: 'processor',
              country: 'US',
              adequacyDecision: false,
              safeguards: ['Standard Contractual Clauses']
            }
          ],
          retentionPeriod: {
            duration: 7,
            unit: 'years',
            justification: 'Legal requirement for financial records',
            deletionMethod: 'automatic',
            reviewFrequency: 'annually'
          },
          securityMeasures: [
            {
              id: '1',
              type: 'technical',
              name: 'Encryption at Rest',
              description: 'AES-256 encryption for stored data',
              implemented: true,
              implementationDate: new Date('2024-01-15'),
              responsible: 'IT Security Team'
            }
          ],
          status: 'active',
          createdDate: new Date('2024-01-01'),
          lastReviewed: new Date('2024-10-01'),
          reviewDueDate: new Date('2025-01-01'),
          assignedDPO: 'Jane Smith'
        },
        {
          id: '2',
          name: 'Employee HR Management',
          purpose: 'Human resources management and payroll processing',
          lawfulBasis: {
            type: 'legal_obligation',
            description: 'Processing necessary for compliance with employment law',
            evidence: 'Employment legislation requirements'
          },
          dataCategories: [
            {
              id: '3',
              name: 'Employment Records',
              type: 'personal',
              sensitivity: 'medium',
              examples: ['Employment history', 'Performance reviews']
            }
          ],
          dataSubjects: [
            {
              id: '2',
              name: 'Employees',
              description: 'Current and former employees',
              vulnerabilityLevel: 'standard'
            }
          ],
          recipients: [
            {
              id: '2',
              name: 'Payroll Service',
              type: 'processor',
              country: 'EU',
              adequacyDecision: true
            }
          ],
          retentionPeriod: {
            duration: 10,
            unit: 'years',
            justification: 'Employment law requirements',
            deletionMethod: 'manual',
            reviewFrequency: 'annually'
          },
          securityMeasures: [
            {
              id: '2',
              type: 'organizational',
              name: 'Access Controls',
              description: 'Role-based access to HR systems',
              implemented: true,
              implementationDate: new Date('2024-02-01'),
              responsible: 'HR Department'
            }
          ],
          status: 'under_review',
          createdDate: new Date('2024-02-01'),
          lastReviewed: new Date('2024-09-15'),
          reviewDueDate: new Date('2024-12-15'),
          assignedDPO: 'Jane Smith'
        }
      ];

      setActivities(mockActivities);
      setTimeout(() => setLoading(false), 1000);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }

    setFilteredActivities(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLawfulBasisIcon = (type: string) => {
    switch (type) {
      case 'consent': return <Users className="h-4 w-4" />;
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'legal_obligation': return <Shield className="h-4 w-4" />;
      case 'vital_interests': return <AlertTriangle className="h-4 w-4" />;
      case 'public_task': return <Globe className="h-4 w-4" />;
      case 'legitimate_interests': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const isReviewOverdue = (reviewDate: Date) => {
    return new Date() > reviewDate;
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
          <h1 className="text-2xl font-bold text-gray-900">Records of Processing Activities (RoPA)</h1>
          <p className="text-gray-500">Manage and track all data processing activities</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Export RoPA
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
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
              <option value="inactive">Inactive</option>
              <option value="under_review">Under Review</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Processing Activities Found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No activities match your current filters.' 
                : 'Get started by creating your first data processing activity.'}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Activity
            </Button>
          </Card>
        ) : (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {isReviewOverdue(activity.reviewDueDate) && (
                      <Badge className="bg-red-100 text-red-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Review Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4">{activity.purpose}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        {getLawfulBasisIcon(activity.lawfulBasis.type)}
                        <span className="text-sm font-medium text-gray-700">Lawful Basis</span>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {activity.lawfulBasis.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Data Subjects</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {activity.dataSubjects.map(ds => ds.name).join(', ')}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Retention</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {activity.retentionPeriod.duration} {activity.retentionPeriod.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Assigned to: {activity.assignedDPO}</span>
                    <span>•</span>
                    <span>Last reviewed: {activity.lastReviewed.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Next review: {activity.reviewDueDate.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <Eye className="h-4 w-4" />
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

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{selectedActivity.name}</h2>
                <Button variant="outline" onClick={() => setSelectedActivity(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Purpose and Lawful Basis */}
              <div>
                <h3 className="text-lg font-medium mb-3">Purpose and Legal Basis</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-3">{selectedActivity.purpose}</p>
                  <div className="flex items-center space-x-2">
                    {getLawfulBasisIcon(selectedActivity.lawfulBasis.type)}
                    <span className="font-medium capitalize">
                      {selectedActivity.lawfulBasis.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{selectedActivity.lawfulBasis.description}</p>
                </div>
              </div>

              {/* Data Categories */}
              <div>
                <h3 className="text-lg font-medium mb-3">Data Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedActivity.dataCategories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{category.name}</h4>
                        <Badge className={
                          category.sensitivity === 'high' ? 'bg-red-100 text-red-800' :
                          category.sensitivity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {category.sensitivity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 capitalize">{category.type} data</p>
                      <div className="flex flex-wrap gap-1">
                        {category.examples.map((example, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <h3 className="text-lg font-medium mb-3">Recipients</h3>
                <div className="space-y-3">
                  {selectedActivity.recipients.map((recipient) => (
                    <div key={recipient.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{recipient.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{recipient.type}</p>
                          {recipient.country && (
                            <p className="text-sm text-gray-600">Country: {recipient.country}</p>
                          )}
                        </div>
                        {recipient.adequacyDecision !== undefined && (
                          <Badge className={recipient.adequacyDecision ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {recipient.adequacyDecision ? 'Adequate' : 'Safeguards Required'}
                          </Badge>
                        )}
                      </div>
                      {recipient.safeguards && recipient.safeguards.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Safeguards:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {recipient.safeguards.map((safeguard, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {safeguard}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Measures */}
              <div>
                <h3 className="text-lg font-medium mb-3">Security Measures</h3>
                <div className="space-y-3">
                  {selectedActivity.securityMeasures.map((measure) => (
                    <div key={measure.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{measure.name}</h4>
                          <p className="text-sm text-gray-600">{measure.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Responsible: {measure.responsible}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={measure.implemented ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {measure.implemented ? 'Implemented' : 'Pending'}
                          </Badge>
                          {measure.implementationDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              {measure.implementationDate.toLocaleDateString()}
                            </p>
                          )}
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

export default RoPAManagement;