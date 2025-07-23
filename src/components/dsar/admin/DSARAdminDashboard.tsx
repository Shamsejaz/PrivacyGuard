import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, BarChart3, FileText, Download, Plus, Search, Filter, 
  Eye, Edit, Trash2, CheckCircle, Clock, AlertTriangle, RefreshCw,
  Globe, Palette, Mail, Bell, Shield, Database, Key, Upload, Save,
  Calendar, User, MessageSquare, Phone, MapPin, Building, Crown
} from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';

interface DSARRequest {
  id: string;
  referenceNumber: string;
  dataSubject: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  requestType: 'access' | 'delete' | 'portability' | 'rectification' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedDate: Date;
  deadline: Date;
  assignedTo?: string;
  progress: number;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL';
  verificationStatus: 'pending' | 'verified' | 'failed';
  recordsFound?: number;
  estimatedCompletion?: Date;
  notes: string;
  attachments: string[];
  communicationLog: Array<{
    id: string;
    date: Date;
    type: 'email' | 'phone' | 'system' | 'note';
    message: string;
    author: string;
    direction?: 'inbound' | 'outbound';
  }>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'processor' | 'reviewer' | 'viewer';
  department: string;
  lastLogin: Date;
  isActive: boolean;
  permissions: string[];
  assignedRequests: number;
}

interface WhiteLabelConfig {
  branding: {
    companyName: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    favicon: string;
    customCSS: string;
  };
  portal: {
    title: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    languages: string[];
    defaultLanguage: string;
    enableRegistration: boolean;
    requireEmailVerification: boolean;
  };
  compliance: {
    enabledRegulations: string[];
    defaultDeadlineDays: number;
    autoAssignment: boolean;
    escalationRules: boolean;
    retentionPeriod: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookUrl: string;
    slackWebhook: string;
    templates: {
      acknowledgment: string;
      statusUpdate: string;
      completion: string;
    };
  };
  security: {
    enableTwoFactor: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
    };
    ipWhitelist: string[];
  };
}

const DSARAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<DSARRequest | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Mock data
  const [requests, setRequests] = useState<DSARRequest[]>([
    {
      id: '1',
      referenceNumber: 'DSAR-2024-001234',
      dataSubject: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-123-4567',
        address: '123 Main St, Anytown, NY 12345'
      },
      requestType: 'access',
      status: 'processing',
      priority: 'medium',
      submittedDate: new Date('2024-01-15T10:30:00'),
      deadline: new Date('2024-02-14T23:59:59'),
      assignedTo: 'Sarah Johnson',
      progress: 65,
      regulation: 'GDPR',
      verificationStatus: 'verified',
      recordsFound: 127,
      estimatedCompletion: new Date('2024-02-10T17:00:00'),
      notes: 'Customer requesting access to all personal data. Identity verified via email.',
      attachments: ['id_verification.pdf'],
      communicationLog: [
        {
          id: '1',
          date: new Date('2024-01-15T10:30:00'),
          type: 'system',
          message: 'Request submitted and acknowledged',
          author: 'System'
        },
        {
          id: '2',
          date: new Date('2024-01-16T09:15:00'),
          type: 'email',
          message: 'Identity verification completed successfully',
          author: 'Sarah Johnson',
          direction: 'outbound'
        }
      ]
    },
    {
      id: '2',
      referenceNumber: 'DSAR-2024-001189',
      dataSubject: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        phone: '+1-555-987-6543'
      },
      requestType: 'delete',
      status: 'pending',
      priority: 'high',
      submittedDate: new Date('2024-01-14T16:45:00'),
      deadline: new Date('2024-02-13T23:59:59'),
      assignedTo: 'Mike Chen',
      progress: 15,
      regulation: 'CCPA',
      verificationStatus: 'pending',
      notes: 'Deletion request requires legal review due to ongoing contract.',
      attachments: [],
      communicationLog: [
        {
          id: '1',
          date: new Date('2024-01-14T16:45:00'),
          type: 'system',
          message: 'Deletion request received',
          author: 'System'
        }
      ]
    }
  ]);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'admin',
      department: 'Legal & Compliance',
      lastLogin: new Date('2024-01-15T09:30:00'),
      isActive: true,
      permissions: ['read', 'write', 'delete', 'admin'],
      assignedRequests: 12
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'processor',
      department: 'Privacy Team',
      lastLogin: new Date('2024-01-15T08:45:00'),
      isActive: true,
      permissions: ['read', 'write'],
      assignedRequests: 8
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      email: 'lisa.rodriguez@company.com',
      role: 'reviewer',
      department: 'Legal',
      lastLogin: new Date('2024-01-14T17:20:00'),
      isActive: true,
      permissions: ['read', 'review'],
      assignedRequests: 5
    }
  ]);

  const [whiteLabelConfig, setWhiteLabelConfig] = useState<WhiteLabelConfig>({
    branding: {
      companyName: 'Your Company',
      logo: '/logo.png',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      favicon: '/favicon.ico',
      customCSS: ''
    },
    portal: {
      title: 'Privacy Rights Portal',
      description: 'Manage your data protection rights',
      supportEmail: 'privacy@company.com',
      supportPhone: '+1-800-PRIVACY',
      address: '123 Business Ave, Suite 100, City, State 12345',
      languages: ['English', 'Spanish', 'French'],
      defaultLanguage: 'English',
      enableRegistration: true,
      requireEmailVerification: true
    },
    compliance: {
      enabledRegulations: ['GDPR', 'CCPA', 'HIPAA'],
      defaultDeadlineDays: 30,
      autoAssignment: true,
      escalationRules: true,
      retentionPeriod: 2555 // 7 years in days
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      webhookUrl: '',
      slackWebhook: '',
      templates: {
        acknowledgment: 'Your request has been received and is being processed.',
        statusUpdate: 'Your request status has been updated.',
        completion: 'Your request has been completed.'
      }
    },
    security: {
      enableTwoFactor: true,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 8,
        requireSpecialChars: true,
        requireNumbers: true
      },
      ipWhitelist: []
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'processing': return <Badge variant="info">Processing</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'expired': return <Badge variant="danger">Expired</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="danger">Urgent</Badge>;
      case 'high': return <Badge variant="warning">High</Badge>;
      case 'medium': return <Badge variant="info">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge variant="danger"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'processor': return <Badge variant="info">Processor</Badge>;
      case 'reviewer': return <Badge variant="warning">Reviewer</Badge>;
      case 'viewer': return <Badge variant="success">Viewer</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.dataSubject.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${request.dataSubject.firstName} ${request.dataSubject.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || request.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    pending: requests.filter(r => r.status === 'pending').length,
    processing: requests.filter(r => r.status === 'processing').length,
    completed: requests.filter(r => r.status === 'completed').length,
    overdue: requests.filter(r => r.deadline < new Date() && r.status !== 'completed').length,
  };

  const RequestDetailModal = () => {
    if (!selectedRequest) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.referenceNumber}</h2>
                <p className="text-gray-600">{selectedRequest.dataSubject.firstName} {selectedRequest.dataSubject.lastName}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(selectedRequest.status)}
                {getPriorityBadge(selectedRequest.priority)}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Request Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Request Type</p>
                      <p className="text-gray-900 capitalize">{selectedRequest.requestType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Regulation</p>
                      <Badge variant="info">{selectedRequest.regulation}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Submitted</p>
                      <p className="text-gray-900">{selectedRequest.submittedDate.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Deadline</p>
                      <p className="text-gray-900">{selectedRequest.deadline.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Assigned To</p>
                      <p className="text-gray-900">{selectedRequest.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Verification Status</p>
                      <Badge variant={selectedRequest.verificationStatus === 'verified' ? 'success' : 'warning'}>
                        {selectedRequest.verificationStatus}
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Subject Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-gray-900">{selectedRequest.dataSubject.firstName} {selectedRequest.dataSubject.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{selectedRequest.dataSubject.email}</p>
                    </div>
                    {selectedRequest.dataSubject.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-gray-900">{selectedRequest.dataSubject.phone}</p>
                      </div>
                    )}
                    {selectedRequest.dataSubject.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-700">Address</p>
                        <p className="text-gray-900">{selectedRequest.dataSubject.address}</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Log</h3>
                  <div className="space-y-3">
                    {selectedRequest.communicationLog.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {log.type === 'email' && <Mail className="h-5 w-5 text-blue-500" />}
                          {log.type === 'phone' && <Phone className="h-5 w-5 text-green-500" />}
                          {log.type === 'system' && <Settings className="h-5 w-5 text-gray-500" />}
                          {log.type === 'note' && <MessageSquare className="h-5 w-5 text-purple-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900">{log.author}</p>
                            <Badge variant="default" size="sm">{log.type}</Badge>
                            {log.direction && (
                              <Badge variant="info" size="sm">{log.direction}</Badge>
                            )}
                          </div>
                          <p className="text-gray-600">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{log.date.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Progress & Actions */}
              <div className="space-y-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Completion</span>
                        <span className="text-sm text-gray-600">{selectedRequest.progress}%</span>
                      </div>
                      <ProgressBar 
                        value={selectedRequest.progress} 
                        variant={selectedRequest.progress >= 80 ? 'success' : selectedRequest.progress >= 50 ? 'info' : 'warning'} 
                      />
                    </div>
                    {selectedRequest.recordsFound && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Records Found</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedRequest.recordsFound}</p>
                      </div>
                    )}
                    {selectedRequest.estimatedCompletion && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Est. Completion</p>
                        <p className="text-gray-900">{selectedRequest.estimatedCompletion.toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Request
                    </Button>
                    <Button className="w-full" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Update
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    {selectedRequest.status !== 'completed' && (
                      <Button className="w-full">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </Card>

                {selectedRequest.notes && (
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <p className="text-gray-600">{selectedRequest.notes}</p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const WhiteLabelConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">White Label Configuration</h2>
            <button
              onClick={() => setShowConfigModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            {/* Branding */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Branding
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={whiteLabelConfig.branding.companyName}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, companyName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={whiteLabelConfig.branding.primaryColor}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={whiteLabelConfig.branding.logo}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, logo: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={whiteLabelConfig.branding.secondaryColor}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, secondaryColor: e.target.value }
                    }))}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </Card>

            {/* Portal Settings */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Portal Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portal Title</label>
                  <input
                    type="text"
                    value={whiteLabelConfig.portal.title}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      portal: { ...prev.portal, title: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                  <input
                    type="email"
                    value={whiteLabelConfig.portal.supportEmail}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      portal: { ...prev.portal, supportEmail: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={whiteLabelConfig.portal.description}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      portal: { ...prev.portal, description: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Compliance Settings */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Compliance Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Deadline (Days)</label>
                  <input
                    type="number"
                    value={whiteLabelConfig.compliance.defaultDeadlineDays}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      compliance: { ...prev.compliance, defaultDeadlineDays: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (Days)</label>
                  <input
                    type="number"
                    value={whiteLabelConfig.compliance.retentionPeriod}
                    onChange={(e) => setWhiteLabelConfig(prev => ({
                      ...prev,
                      compliance: { ...prev.compliance, retentionPeriod: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enabled Regulations</label>
                  <div className="flex flex-wrap gap-2">
                    {['GDPR', 'CCPA', 'HIPAA', 'PDPL', 'PIPEDA'].map(reg => (
                      <label key={reg} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={whiteLabelConfig.compliance.enabledRegulations.includes(reg)}
                          onChange={(e) => {
                            const newRegs = e.target.checked
                              ? [...whiteLabelConfig.compliance.enabledRegulations, reg]
                              : whiteLabelConfig.compliance.enabledRegulations.filter(r => r !== reg);
                            setWhiteLabelConfig(prev => ({
                              ...prev,
                              compliance: { ...prev.compliance, enabledRegulations: newRegs }
                            }));
                          }}
                          className="mr-2"
                        />
                        {reg}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, count: null },
    { id: 'requests', label: 'DSAR Requests', icon: FileText, count: requests.length },
    { id: 'users', label: 'Admin Users', icon: Users, count: adminUsers.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
    { id: 'settings', label: 'White Label Config', icon: Settings, count: null }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">{statusCounts.processing}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{statusCounts.overdue}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {requests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{request.referenceNumber}</p>
                        <p className="text-sm text-gray-600">{request.dataSubject.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
                <div className="space-y-3">
                  {adminUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{user.assignedRequests}</p>
                        <p className="text-sm text-gray-600">assigned</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );

      case 'requests':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => setShowRequestModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{request.referenceNumber}</h3>
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                        <Badge variant="info">{request.regulation}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Data Subject</p>
                          <p className="font-medium">{request.dataSubject.firstName} {request.dataSubject.lastName}</p>
                          <p className="text-sm text-gray-500">{request.dataSubject.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Request Type</p>
                          <p className="font-medium capitalize">{request.requestType}</p>
                          <p className="text-sm text-gray-500">Submitted {request.submittedDate.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Assigned To</p>
                          <p className="font-medium">{request.assignedTo || 'Unassigned'}</p>
                          <p className="text-sm text-gray-500">Due {request.deadline.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm text-gray-600">{request.progress}%</span>
                          </div>
                          <ProgressBar 
                            value={request.progress} 
                            variant={request.progress >= 80 ? 'success' : request.progress >= 50 ? 'info' : 'warning'} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Admin Users</h2>
              <Button onClick={() => setShowUserModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminUsers.map((user) => (
                <Card key={user.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    {getRoleBadge(user.role)}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{user.department}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Assigned Requests:</span>
                      <span className="font-medium">{user.assignedRequests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="font-medium">{user.lastLogin.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold text-blue-600">18 days</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">94%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Auto-Processed</p>
                    <p className="text-2xl font-bold text-purple-600">67%</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">White Label Configuration</h2>
              <Button onClick={() => setShowConfigModal(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Branding</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Name:</span>
                    <span className="font-medium">{whiteLabelConfig.branding.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Color:</span>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: whiteLabelConfig.branding.primaryColor }}
                      />
                      <span className="font-medium">{whiteLabelConfig.branding.primaryColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Portal Title:</span>
                    <span className="font-medium">{whiteLabelConfig.portal.title}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Settings</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Default Deadline:</span>
                    <span className="font-medium">{whiteLabelConfig.compliance.defaultDeadlineDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enabled Regulations:</span>
                    <div className="flex flex-wrap gap-1">
                      {whiteLabelConfig.compliance.enabledRegulations.map(reg => (
                        <Badge key={reg} variant="success" size="sm">{reg}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto Assignment:</span>
                    <Badge variant={whiteLabelConfig.compliance.autoAssignment ? 'success' : 'danger'}>
                      {whiteLabelConfig.compliance.autoAssignment ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DSAR Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage data subject access requests and white-label configuration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowConfigModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Portal
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
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}

      {selectedRequest && <RequestDetailModal />}
      {showConfigModal && <WhiteLabelConfigModal />}
    </div>
  );
};

export default DSARAdminDashboard;