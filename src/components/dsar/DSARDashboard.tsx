import React, { useState } from 'react';
import { UserCheck, Plus, Search, Filter, Download, RefreshCw, Clock, CheckCircle, AlertTriangle, User, Mail, Calendar, Eye, MessageSquare } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

interface DSARRequest {
  id: string;
  dataSubject: string;
  email: string;
  requestType: 'access' | 'delete' | 'portability' | 'rectification' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'expired';
  submittedDate: Date;
  deadline: Date;
  assignedTo: string;
  progress: number;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletion?: Date;
  recordsFound?: number;
  verificationStatus: 'pending' | 'verified' | 'failed';
  communicationLog: Array<{
    date: Date;
    type: 'email' | 'phone' | 'system';
    message: string;
    author: string;
  }>;
}

const DSARDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showNewRequest, setShowNewRequest] = useState(false);

  const dsarRequests: DSARRequest[] = [
    {
      id: '1',
      dataSubject: 'John Doe',
      email: 'john.doe@email.com',
      requestType: 'access',
      status: 'processing',
      submittedDate: new Date('2024-01-15T10:30:00'),
      deadline: new Date('2024-02-14T23:59:59'),
      assignedTo: 'Sarah Johnson',
      progress: 65,
      regulation: 'GDPR',
      priority: 'medium',
      estimatedCompletion: new Date('2024-02-10T17:00:00'),
      recordsFound: 127,
      verificationStatus: 'verified',
      communicationLog: [
        {
          date: new Date('2024-01-15T10:30:00'),
          type: 'system',
          message: 'Request submitted and acknowledged',
          author: 'System'
        },
        {
          date: new Date('2024-01-16T09:15:00'),
          type: 'email',
          message: 'Identity verification completed',
          author: 'Sarah Johnson'
        }
      ]
    },
    {
      id: '2',
      dataSubject: 'Jane Smith',
      email: 'jane.smith@company.com',
      requestType: 'delete',
      status: 'pending',
      submittedDate: new Date('2024-01-14T16:45:00'),
      deadline: new Date('2024-02-13T23:59:59'),
      assignedTo: 'Mike Chen',
      progress: 15,
      regulation: 'CCPA',
      priority: 'high',
      verificationStatus: 'pending',
      communicationLog: [
        {
          date: new Date('2024-01-14T16:45:00'),
          type: 'system',
          message: 'Deletion request received',
          author: 'System'
        }
      ]
    },
    {
      id: '3',
      dataSubject: 'Robert Johnson',
      email: 'robert.j@healthcare.com',
      requestType: 'portability',
      status: 'completed',
      submittedDate: new Date('2024-01-10T09:20:00'),
      deadline: new Date('2024-02-09T23:59:59'),
      assignedTo: 'Lisa Rodriguez',
      progress: 100,
      regulation: 'HIPAA',
      priority: 'medium',
      recordsFound: 89,
      verificationStatus: 'verified',
      communicationLog: [
        {
          date: new Date('2024-01-10T09:20:00'),
          type: 'system',
          message: 'Data portability request initiated',
          author: 'System'
        },
        {
          date: new Date('2024-01-12T14:30:00'),
          type: 'email',
          message: 'Data export completed and delivered',
          author: 'Lisa Rodriguez'
        }
      ]
    },
    {
      id: '4',
      dataSubject: 'Ahmed Al-Rashid',
      email: 'ahmed.rashid@company.sa',
      requestType: 'rectification',
      status: 'processing',
      submittedDate: new Date('2024-01-13T11:15:00'),
      deadline: new Date('2024-02-12T23:59:59'),
      assignedTo: 'James Wilson',
      progress: 40,
      regulation: 'PDPL',
      priority: 'low',
      recordsFound: 23,
      verificationStatus: 'verified',
      communicationLog: [
        {
          date: new Date('2024-01-13T11:15:00'),
          type: 'system',
          message: 'Rectification request received',
          author: 'System'
        }
      ]
    },
    {
      id: '5',
      dataSubject: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      requestType: 'access',
      status: 'expired',
      submittedDate: new Date('2023-12-15T14:20:00'),
      deadline: new Date('2024-01-14T23:59:59'),
      assignedTo: 'Sarah Johnson',
      progress: 25,
      regulation: 'GDPR',
      priority: 'medium',
      verificationStatus: 'failed',
      communicationLog: [
        {
          date: new Date('2023-12-15T14:20:00'),
          type: 'system',
          message: 'Access request submitted',
          author: 'System'
        },
        {
          date: new Date('2024-01-14T23:59:59'),
          type: 'system',
          message: 'Request expired due to failed verification',
          author: 'System'
        }
      ]
    }
  ];

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

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'access': return 'Data Access';
      case 'delete': return 'Data Deletion';
      case 'portability': return 'Data Portability';
      case 'rectification': return 'Data Rectification';
      case 'restriction': return 'Processing Restriction';
      case 'objection': return 'Processing Objection';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'expired': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDaysRemaining = (deadline: Date) => {
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredRequests = dsarRequests.filter(request => {
    const matchesSearch = request.dataSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || request.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    pending: dsarRequests.filter(r => r.status === 'pending').length,
    processing: dsarRequests.filter(r => r.status === 'processing').length,
    completed: dsarRequests.filter(r => r.status === 'completed').length,
    expired: dsarRequests.filter(r => r.status === 'expired' || r.status === 'rejected').length,
  };

  const NewRequestModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">New DSAR Request</h2>
            <button
              onClick={() => setShowNewRequest(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Create a new data subject access request</p>
        </div>

        <div className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Subject Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="access">Data Access</option>
                  <option value="delete">Data Deletion</option>
                  <option value="portability">Data Portability</option>
                  <option value="rectification">Data Rectification</option>
                  <option value="restriction">Processing Restriction</option>
                  <option value="objection">Processing Objection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regulation
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="GDPR">GDPR</option>
                  <option value="CCPA">CCPA</option>
                  <option value="HIPAA">HIPAA</option>
                  <option value="PDPL">PDPL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Details
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide additional details about the request..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowNewRequest(false)}>
                Cancel
              </Button>
              <Button>
                Create Request
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'requests', label: 'All Requests', count: dsarRequests.length },
    { id: 'pending', label: 'Pending Review', count: statusCounts.pending },
    { id: 'processing', label: 'In Progress', count: statusCounts.processing },
    { id: 'analytics', label: 'Analytics', count: null }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'requests':
      case 'pending':
      case 'processing':
        const tabFilteredRequests = activeTab === 'requests' ? filteredRequests : 
                                   filteredRequests.filter(r => r.status === activeTab);
        
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
                <Button onClick={() => setShowNewRequest(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {tabFilteredRequests.map((request) => {
                const daysRemaining = getDaysRemaining(request.deadline);
                
                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(request.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{request.dataSubject}</h3>
                            <Badge variant="info" size="sm">{request.regulation}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{getRequestTypeLabel(request.requestType)}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {request.email}
                            </span>
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {request.assignedTo}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {request.submittedDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm text-gray-600">{request.progress}%</span>
                        </div>
                        <ProgressBar 
                          value={request.progress} 
                          variant={request.progress >= 80 ? 'success' : request.progress >= 50 ? 'info' : 'warning'} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deadline:</span>
                          <span className={`font-medium ${daysRemaining < 7 ? 'text-red-600' : daysRemaining < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {request.deadline.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Days remaining:</span>
                          <span className={`font-medium ${daysRemaining < 7 ? 'text-red-600' : daysRemaining < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {daysRemaining > 0 ? daysRemaining : 'Overdue'}
                          </span>
                        </div>
                        {request.recordsFound && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Records found:</span>
                            <span className="font-medium">{request.recordsFound}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={request.verificationStatus === 'verified' ? 'success' : 
                                  request.verificationStatus === 'failed' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {request.verificationStatus === 'verified' ? 'Verified' : 
                           request.verificationStatus === 'failed' ? 'Verification Failed' : 'Pending Verification'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Records Processed</p>
                    <p className="text-2xl font-bold text-orange-600">2.4M</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-orange-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">Data Subject Rights Management</h1>
          <p className="text-gray-600 mt-1">Automated DSAR processing and compliance management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowNewRequest(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
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
              <p className="text-sm text-gray-600">Expired/Rejected</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.expired}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
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

      {showNewRequest && <NewRequestModal />}
    </div>
  );
};

export default DSARDashboard;