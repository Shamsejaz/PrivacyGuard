import React, { useState } from 'react';
import { 
  Users, Settings, BarChart3, FileText, Download, Plus, Search, Filter, 
  Eye, Edit, Trash2, CheckCircle, Clock, AlertTriangle, RefreshCw,
  MessageSquare, User
} from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ProgressBar from '../../ui/ProgressBar';
import { useDSARRequests, useDSARStatistics, useDSARActions } from '../../../hooks/useDSAR';
import { DSARRequest, DSARFilters } from '../../../services/dsarService';

const DSARAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<DSARRequest | null>(null);
  const [filters, setFilters] = useState<DSARFilters>({
    page: 1,
    limit: 10
  });

  // API hooks
  const { data: requestsData, loading: requestsLoading, error: requestsError, refetch } = useDSARRequests(filters);
  const { data: statistics, loading: statsLoading } = useDSARStatistics();
  const { updateStatus, assignRequest, deleteRequest, loading: actionLoading } = useDSARActions();

  const requests = requestsData?.data || [];
  const totalRequests = requestsData?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'in_progress': return <Badge variant="info">In Progress</Badge>;
      case 'in_review': return <Badge variant="info">In Review</Badge>;
      case 'submitted': return <Badge variant="warning">Submitted</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'cancelled': return <Badge variant="danger">Cancelled</Badge>;
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

  const handleStatusUpdate = async (id: string, status: DSARRequest['status'], comment?: string) => {
    try {
      await updateStatus(id, status, comment);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAssignRequest = async (id: string, assigneeId: string) => {
    try {
      await assignRequest(id, assigneeId);
      refetch();
    } catch (error) {
      console.error('Failed to assign request:', error);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await deleteRequest(id);
        refetch();
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    }
  };

  const handleFilterChange = (newFilters: Partial<DSARFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.subjectEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || request.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const RequestDetailModal = () => {
    if (!selectedRequest) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.requestId}</h2>
                <p className="text-gray-600">{selectedRequest.subjectName}</p>
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
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Request Type</p>
                      <p className="text-gray-900 capitalize">{selectedRequest.requestType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Submitted</p>
                      <p className="text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Updated</p>
                      <p className="text-gray-900">{new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Assigned To</p>
                      <p className="text-gray-900">{selectedRequest.assignedTo || 'Unassigned'}</p>
                    </div>
                    {selectedRequest.dueDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Due Date</p>
                        <p className="text-gray-900">{new Date(selectedRequest.dueDate).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Subject Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-gray-900">{selectedRequest.subjectName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{selectedRequest.subjectEmail}</p>
                    </div>
                    {selectedRequest.subjectPhone && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-gray-900">{selectedRequest.subjectPhone}</p>
                      </div>
                    )}
                  </div>
                  {selectedRequest.description && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-gray-900">{selectedRequest.description}</p>
                    </div>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'in_progress')}
                      disabled={actionLoading || selectedRequest.status === 'in_progress'}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Start Processing
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                      disabled={actionLoading || selectedRequest.status === 'completed'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleDeleteRequest(selectedRequest.id)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Request
                    </Button>
                  </div>
                </Card>

                {selectedRequest.dataCategories.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Categories</h3>
                    <div className="space-y-1">
                      {selectedRequest.dataCategories.map((category, index) => (
                        <Badge key={index} variant="info" size="sm">{category}</Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, count: null },
    { id: 'requests', label: 'DSAR Requests', icon: FileText, count: totalRequests },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading statistics...</p>
              </div>
            ) : statistics ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Requests</p>
                      <p className="text-2xl font-bold text-blue-600">{statistics.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-600">{statistics.inProgress}</p>
                    </div>
                    <RefreshCw className="h-8 w-8 text-yellow-600" />
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{statistics.completionRate.toFixed(1)}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </Card>
              </div>
            ) : null}

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
              {requestsLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{request.requestId}</p>
                        <p className="text-sm text-gray-600">{request.subjectEmail}</p>
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
              )}
            </Card>
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
                    <option value="submitted">Submitted</option>
                    <option value="in_review">In Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {requestsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{requestsError}</p>
              </div>
            )}

            {requestsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading requests...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">{request.requestId}</h3>
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Data Subject</p>
                            <p className="font-medium">{request.subjectName}</p>
                            <p className="text-sm text-gray-500">{request.subjectEmail}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Request Type</p>
                            <p className="font-medium capitalize">{request.requestType}</p>
                            <p className="text-sm text-gray-500">Submitted {new Date(request.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Assigned To</p>
                            <p className="font-medium">{request.assignedTo || 'Unassigned'}</p>
                            {request.dueDate && (
                              <p className="text-sm text-gray-500">Due {new Date(request.dueDate).toLocaleDateString()}</p>
                            )}
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
            )}
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
          <p className="text-gray-600 mt-1">Manage data subject access requests</p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <Badge variant="default" size="sm">{tab.count}</Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
      {selectedRequest && <RequestDetailModal />}
    </div>
  );
};

export default DSARAdminDashboard;