import React, { useState } from 'react';
import { CheckCircle, Clock, X, Eye, Download, Plus, Search, Filter } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  email: string;
  consentType: 'marketing' | 'analytics' | 'processing' | 'sharing' | 'profiling';
  purpose: string;
  status: 'granted' | 'withdrawn' | 'expired';
  grantedDate: Date;
  withdrawnDate?: Date;
  expiryDate?: Date;
  ipAddress: string;
  userAgent: string;
  sourceSystem: string;
  dataScope: string[];
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  processingLocation: 'ksa' | 'gcc' | 'international';
}

const ConsentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('consents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const consentRecords: ConsentRecord[] = [
    {
      id: '1',
      dataSubjectId: 'DS001',
      email: 'ahmed.alrashid@email.com',
      consentType: 'marketing',
      purpose: 'Email marketing campaigns and promotional offers',
      status: 'granted',
      grantedDate: new Date('2024-01-15T10:30:00'),
      expiryDate: new Date('2025-01-15T10:30:00'),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      sourceSystem: 'Website Registration',
      dataScope: ['email', 'name', 'preferences'],
      legalBasis: 'consent',
      processingLocation: 'ksa'
    },
    {
      id: '2',
      dataSubjectId: 'DS002',
      email: 'fatima.hassan@company.sa',
      consentType: 'analytics',
      purpose: 'Website analytics and user behavior tracking',
      status: 'withdrawn',
      grantedDate: new Date('2024-01-10T14:20:00'),
      withdrawnDate: new Date('2024-01-20T09:15:00'),
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      sourceSystem: 'Mobile App',
      dataScope: ['usage_data', 'device_info'],
      legalBasis: 'consent',
      processingLocation: 'ksa'
    },
    {
      id: '3',
      dataSubjectId: 'DS003',
      email: 'mohammed.salem@email.com',
      consentType: 'sharing',
      purpose: 'Data sharing with third-party service providers',
      status: 'granted',
      grantedDate: new Date('2024-01-12T16:45:00'),
      expiryDate: new Date('2024-07-12T16:45:00'),
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      sourceSystem: 'Customer Portal',
      dataScope: ['contact_info', 'transaction_history'],
      legalBasis: 'consent',
      processingLocation: 'gcc'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted': return <Badge variant="success">Granted</Badge>;
      case 'withdrawn': return <Badge variant="danger">Withdrawn</Badge>;
      case 'expired': return <Badge variant="warning">Expired</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getConsentTypeBadge = (type: string) => {
    const colors = {
      marketing: 'info',
      analytics: 'warning',
      processing: 'success',
      sharing: 'danger',
      profiling: 'default'
    };
    return <Badge variant={colors[type as keyof typeof colors] as any}>{type.toUpperCase()}</Badge>;
  };

  const filteredRecords = consentRecords.filter(record => {
    const matchesSearch = record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || record.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    granted: consentRecords.filter(r => r.status === 'granted').length,
    withdrawn: consentRecords.filter(r => r.status === 'withdrawn').length,
    expired: consentRecords.filter(r => r.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDPL Consent Management</h1>
          <p className="text-gray-600 mt-1">Article 6, 7, 10, 11 - Consent collection, proof, and withdrawal tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Consent Log
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Consent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Consents</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.granted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Withdrawn</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.withdrawn}</p>
            </div>
            <X className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.expired}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Consent Records</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search consents..."
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
                <option value="all">All Status</option>
                <option value="granted">Granted</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-gray-900">{record.email}</h3>
                    {getStatusBadge(record.status)}
                    {getConsentTypeBadge(record.consentType)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{record.purpose}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>ID: {record.dataSubjectId}</span>
                    <span>Source: {record.sourceSystem}</span>
                    <span>Location: {record.processingLocation.toUpperCase()}</span>
                    <span>Legal Basis: {record.legalBasis.replace('_', ' ')}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Granted Date</p>
                  <p className="text-sm text-gray-600">{record.grantedDate.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {record.status === 'withdrawn' ? 'Withdrawn Date' : 'Expiry Date'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.status === 'withdrawn' 
                      ? record.withdrawnDate?.toLocaleString() 
                      : record.expiryDate?.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">IP Address</p>
                  <p className="text-sm text-gray-600 font-mono">{record.ipAddress}</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Data Scope</p>
                <div className="flex flex-wrap gap-1">
                  {record.dataScope.map((scope, index) => (
                    <Badge key={index} variant="default" size="sm">
                      {scope.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Technical Details</p>
                <p className="text-xs text-gray-600 break-all">{record.userAgent}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ConsentManagement;