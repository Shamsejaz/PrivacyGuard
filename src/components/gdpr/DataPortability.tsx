import React, { useState } from 'react';
import { Download, FileText, Clock, CheckCircle, Calendar } from 'lucide-react';

interface PortabilityRequest {
  id: string;
  requestId: string;
  dataSubject: {
    name: string;
    email: string;
    userId: string;
  };
  requestDate: string;
  status: 'pending' | 'processing' | 'ready' | 'delivered' | 'expired';
  dataCategories: string[];
  format: 'json' | 'csv' | 'xml' | 'pdf';
  deliveryMethod: 'email' | 'download' | 'secure_portal';
  completionDate?: string;
  expiryDate: string;
  fileSize?: string;
  downloadCount: number;
  notes?: string;
}

const DataPortability: React.FC = () => {
  const [requests, setRequests] = useState<PortabilityRequest[]>([
    {
      id: '1',
      requestId: 'DP-2024-001',
      dataSubject: {
        name: 'John Smith',
        email: 'john.smith@email.com',
        userId: 'USR-12345'
      },
      requestDate: '2024-02-10',
      status: 'delivered',
      dataCategories: ['Profile Information', 'Transaction History', 'Communication Preferences'],
      format: 'json',
      deliveryMethod: 'email',
      completionDate: '2024-02-12',
      expiryDate: '2024-03-12',
      fileSize: '2.3 MB',
      downloadCount: 1,
      notes: 'Complete data export including all historical transactions'
    },
    {
      id: '2',
      requestId: 'DP-2024-002',
      dataSubject: {
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        userId: 'USR-67890'
      },
      requestDate: '2024-02-14',
      status: 'processing',
      dataCategories: ['Account Data', 'Usage Analytics', 'Support Tickets'],
      format: 'csv',
      deliveryMethod: 'secure_portal',
      expiryDate: '2024-03-16',
      downloadCount: 0,
      notes: 'Processing large dataset, estimated completion in 2 days'
    },
    {
      id: '3',
      requestId: 'DP-2024-003',
      dataSubject: {
        name: 'Michael Chen',
        email: 'mchen@email.com',
        userId: 'USR-11111'
      },
      requestDate: '2024-02-16',
      status: 'ready',
      dataCategories: ['Personal Details', 'Order History'],
      format: 'pdf',
      deliveryMethod: 'download',
      completionDate: '2024-02-17',
      expiryDate: '2024-03-17',
      fileSize: '1.8 MB',
      downloadCount: 0,
      notes: 'Ready for download via secure link'
    }
  ]);

  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    dataSubjectName: '',
    dataSubjectEmail: '',
    dataSubjectUserId: '',
    dataCategories: '',
    format: 'json' as 'json' | 'csv' | 'xml' | 'pdf',
    deliveryMethod: 'email' as 'email' | 'download' | 'secure_portal',
    notes: ''
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
    
    const request: PortabilityRequest = {
      id: Date.now().toString(),
      requestId: `DP-2024-${String(requests.length + 1).padStart(3, '0')}`,
      dataSubject: {
        name: newRequest.dataSubjectName,
        email: newRequest.dataSubjectEmail,
        userId: newRequest.dataSubjectUserId
      },
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      dataCategories: newRequest.dataCategories.split(',').map(c => c.trim()),
      format: newRequest.format,
      deliveryMethod: newRequest.deliveryMethod,
      expiryDate: expiryDate.toISOString().split('T')[0],
      downloadCount: 0,
      notes: newRequest.notes
    };
    
    setRequests(prev => [...prev, request]);
    setNewRequest({
      dataSubjectName: '',
      dataSubjectEmail: '',
      dataSubjectUserId: '',
      dataCategories: '',
      format: 'json',
      deliveryMethod: 'email',
      notes: ''
    });
    setShowNewRequest(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'ready': return <Download className="h-5 w-5 text-blue-600" />;
      case 'processing': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'pending': return <FileText className="h-5 w-5 text-gray-600" />;
      case 'expired': return <Calendar className="h-5 w-5 text-red-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return now > expiry;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Portability Requests</h2>
          <p className="text-gray-600 mt-1">Manage GDPR Article 20 data portability requests</p>
        </div>
        <button
          onClick={() => setShowNewRequest(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="h-4 w-4 mr-2" />
          New Request
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'processing' || r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'ready').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => isExpiringSoon(r.expiryDate)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Request Form */}
      {showNewRequest && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Data Portability Request</h3>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Subject Name *
                </label>
                <input
                  type="text"
                  value={newRequest.dataSubjectName}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, dataSubjectName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newRequest.dataSubjectEmail}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, dataSubjectEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  value={newRequest.dataSubjectUserId}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, dataSubjectUserId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Categories (comma-separated) *
              </label>
              <input
                type="text"
                value={newRequest.dataCategories}
                onChange={(e) => setNewRequest(prev => ({ ...prev, dataCategories: e.target.value }))}
                placeholder="e.g., Profile Information, Transaction History, Communication Preferences"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format *
                </label>
                <select
                  value={newRequest.format}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, format: e.target.value as 'json' | 'csv' | 'xml' | 'pdf' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Method *
                </label>
                <select
                  value={newRequest.deliveryMethod}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, deliveryMethod: e.target.value as 'email' | 'download' | 'secure_portal' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="email">Email</option>
                  <option value="download">Direct Download</option>
                  <option value="secure_portal">Secure Portal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={newRequest.notes}
                onChange={(e) => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Data Portability Requests</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {requests.map((request) => (
            <div key={request.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{request.requestId}</h4>
                      <p className="text-sm text-gray-600">{request.dataSubject.name} ({request.dataSubject.email})</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Request Date:</span>
                      <p className="text-gray-600">{request.requestDate}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Format:</span>
                      <p className="text-gray-600 uppercase">{request.format}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Delivery Method:</span>
                      <p className="text-gray-600">{request.deliveryMethod.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">File Size:</span>
                      <p className="text-gray-600">{request.fileSize || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Data Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {request.dataCategories.map((category, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Completion Date:</span>
                      <p className="text-gray-600">{request.completionDate || 'Not completed'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Expiry Date:</span>
                      <p className={`${
                        isExpired(request.expiryDate) ? 'text-red-600 font-medium' :
                        isExpiringSoon(request.expiryDate) ? 'text-yellow-600 font-medium' :
                        'text-gray-600'
                      }`}>
                        {request.expiryDate}
                        {isExpired(request.expiryDate) && ' (EXPIRED)'}
                        {isExpiringSoon(request.expiryDate) && ' (EXPIRING SOON)'}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700 text-sm">Notes:</span>
                      <p className="text-gray-600 text-sm mt-1">{request.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Downloads: {request.downloadCount}
                    </div>
                    {request.status === 'ready' && (
                      <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataPortability;