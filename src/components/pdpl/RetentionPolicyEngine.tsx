import React, { useState } from 'react';
import { Calendar, Trash2, Archive, AlertTriangle, CheckCircle, Clock, Plus, Search, Filter, Eye, Download } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

interface RetentionPolicy {
  id: string;
  name: string;
  dataCategory: string;
  retentionPeriod: number; // in months
  retentionUnit: 'months' | 'years';
  legalBasis: string;
  deletionMethod: 'automatic' | 'manual' | 'archive';
  status: 'active' | 'draft' | 'expired';
  createdDate: Date;
  lastReview: Date;
  nextReview: Date;
  affectedRecords: number;
  expiredRecords: number;
  description: string;
  exceptions: string[];
}

interface DataRetentionItem {
  id: string;
  dataType: string;
  policyId: string;
  recordCount: number;
  createdDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'flagged' | 'deleted';
  daysUntilExpiry: number;
  location: string;
  owner: string;
}

const RetentionPolicyEngine: React.FC = () => {
  const [activeTab, setActiveTab] = useState('policies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const retentionPolicies: RetentionPolicy[] = [
    {
      id: '1',
      name: 'Customer Personal Data',
      dataCategory: 'Customer Information',
      retentionPeriod: 36,
      retentionUnit: 'months',
      legalBasis: 'PDPL Article 17 - Data retention requirements',
      deletionMethod: 'automatic',
      status: 'active',
      createdDate: new Date('2023-06-01'),
      lastReview: new Date('2024-01-01'),
      nextReview: new Date('2024-07-01'),
      affectedRecords: 125000,
      expiredRecords: 3400,
      description: 'Personal data of customers including contact information, preferences, and transaction history',
      exceptions: ['Legal proceedings', 'Regulatory requirements', 'Customer consent for extended retention']
    },
    {
      id: '2',
      name: 'Employee Records',
      dataCategory: 'HR Data',
      retentionPeriod: 7,
      retentionUnit: 'years',
      legalBasis: 'Labor Law requirements and PDPL compliance',
      deletionMethod: 'manual',
      status: 'active',
      createdDate: new Date('2023-06-01'),
      lastReview: new Date('2024-01-01'),
      nextReview: new Date('2024-07-01'),
      affectedRecords: 2500,
      expiredRecords: 45,
      description: 'Employee personal data, contracts, performance reviews, and payroll information',
      exceptions: ['Pension obligations', 'Legal disputes', 'Reference requests']
    },
    {
      id: '3',
      name: 'Marketing Data',
      dataCategory: 'Marketing Communications',
      retentionPeriod: 24,
      retentionUnit: 'months',
      legalBasis: 'Consent-based retention for marketing purposes',
      deletionMethod: 'automatic',
      status: 'active',
      createdDate: new Date('2023-06-01'),
      lastReview: new Date('2024-01-01'),
      nextReview: new Date('2024-07-01'),
      affectedRecords: 89000,
      expiredRecords: 12000,
      description: 'Marketing preferences, campaign data, and communication history',
      exceptions: ['Active consent renewal', 'Ongoing campaigns']
    },
    {
      id: '4',
      name: 'Financial Transaction Records',
      dataCategory: 'Financial Data',
      retentionPeriod: 10,
      retentionUnit: 'years',
      legalBasis: 'Financial regulations and audit requirements',
      deletionMethod: 'archive',
      status: 'active',
      createdDate: new Date('2023-06-01'),
      lastReview: new Date('2024-01-01'),
      nextReview: new Date('2024-07-01'),
      affectedRecords: 450000,
      expiredRecords: 0,
      description: 'Payment records, invoices, and financial transaction data',
      exceptions: ['Tax audit requirements', 'Regulatory investigations']
    }
  ];

  const dataRetentionItems: DataRetentionItem[] = [
    {
      id: '1',
      dataType: 'Customer Contact Information',
      policyId: '1',
      recordCount: 3400,
      createdDate: new Date('2021-01-15'),
      expiryDate: new Date('2024-01-15'),
      status: 'expired',
      daysUntilExpiry: -15,
      location: 'Customer Database',
      owner: 'Customer Service Team'
    },
    {
      id: '2',
      dataType: 'Marketing Email Lists',
      policyId: '3',
      recordCount: 12000,
      createdDate: new Date('2022-02-01'),
      expiryDate: new Date('2024-02-01'),
      status: 'flagged',
      daysUntilExpiry: 5,
      location: 'Marketing Platform',
      owner: 'Marketing Team'
    },
    {
      id: '3',
      dataType: 'Employee Performance Reviews',
      policyId: '2',
      recordCount: 45,
      createdDate: new Date('2017-03-01'),
      expiryDate: new Date('2024-03-01'),
      status: 'flagged',
      daysUntilExpiry: 30,
      location: 'HR System',
      owner: 'HR Department'
    },
    {
      id: '4',
      dataType: 'Customer Transaction History',
      policyId: '1',
      recordCount: 25000,
      createdDate: new Date('2021-06-01'),
      expiryDate: new Date('2024-06-01'),
      status: 'active',
      daysUntilExpiry: 120,
      location: 'Transaction Database',
      owner: 'Finance Team'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'expired': return <Badge variant="danger">Expired</Badge>;
      case 'flagged': return <Badge variant="warning">Flagged for Deletion</Badge>;
      case 'deleted': return <Badge variant="info">Deleted</Badge>;
      case 'draft': return <Badge variant="default">Draft</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getDeletionMethodBadge = (method: string) => {
    switch (method) {
      case 'automatic': return <Badge variant="success">Automatic</Badge>;
      case 'manual': return <Badge variant="warning">Manual</Badge>;
      case 'archive': return <Badge variant="info">Archive</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'active';
  };

  const getExpiryBadge = (daysUntilExpiry: number) => {
    const status = getExpiryStatus(daysUntilExpiry);
    switch (status) {
      case 'expired': return <Badge variant="danger">Expired ({Math.abs(daysUntilExpiry)} days ago)</Badge>;
      case 'expiring_soon': return <Badge variant="warning">Expires in {daysUntilExpiry} days</Badge>;
      case 'active': return <Badge variant="success">{daysUntilExpiry} days remaining</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const filteredPolicies = retentionPolicies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.dataCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || policy.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredItems = dataRetentionItems.filter(item => {
    const matchesSearch = item.dataType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const policyStatusCounts = {
    active: retentionPolicies.filter(p => p.status === 'active').length,
    draft: retentionPolicies.filter(p => p.status === 'draft').length,
    expired: retentionPolicies.filter(p => p.status === 'expired').length,
  };

  const itemStatusCounts = {
    expired: dataRetentionItems.filter(i => i.status === 'expired').length,
    flagged: dataRetentionItems.filter(i => i.status === 'flagged').length,
    active: dataRetentionItems.filter(i => i.status === 'active').length,
    deleted: dataRetentionItems.filter(i => i.status === 'deleted').length,
  };

  const renderPoliciesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Policies</p>
              <p className="text-2xl font-bold text-green-600">{policyStatusCounts.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft Policies</p>
              <p className="text-2xl font-bold text-yellow-600">{policyStatusCounts.draft}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">
                {retentionPolicies.reduce((sum, p) => sum + p.affectedRecords, 0).toLocaleString()}
              </p>
            </div>
            <Archive className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <Card key={policy.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-gray-900">{policy.name}</h3>
                  {getStatusBadge(policy.status)}
                  {getDeletionMethodBadge(policy.deletionMethod)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{policy.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Category: {policy.dataCategory}</span>
                  <span>Retention: {policy.retentionPeriod} {policy.retentionUnit}</span>
                  <span>Records: {policy.affectedRecords.toLocaleString()}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Legal Basis</p>
                <p className="text-sm text-gray-600">{policy.legalBasis}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Next Review</p>
                <p className="text-sm text-gray-600">{policy.nextReview.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Expired Records</p>
                <p className="text-sm text-red-600 font-medium">{policy.expiredRecords.toLocaleString()}</p>
              </div>
            </div>

            {policy.expiredRecords > 0 && (
              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Action Required</span>
                </div>
                <p className="text-sm text-red-700">
                  {policy.expiredRecords.toLocaleString()} records have exceeded retention period and require deletion or review.
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Exceptions</p>
              <div className="flex flex-wrap gap-1">
                {policy.exceptions.map((exception, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {exception}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderDataItemsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{itemStatusCounts.expired}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Flagged</p>
              <p className="text-2xl font-bold text-yellow-600">{itemStatusCounts.flagged}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{itemStatusCounts.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deleted</p>
              <p className="text-2xl font-bold text-blue-600">{itemStatusCounts.deleted}</p>
            </div>
            <Trash2 className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => {
          const policy = retentionPolicies.find(p => p.id === item.policyId);
          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-gray-900">{item.dataType}</h3>
                    {getStatusBadge(item.status)}
                    {getExpiryBadge(item.daysUntilExpiry)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Records: {item.recordCount.toLocaleString()}</span>
                    <span>Location: {item.location}</span>
                    <span>Owner: {item.owner}</span>
                    <span>Policy: {policy?.name}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {item.status === 'expired' && (
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Created Date</p>
                  <p className="text-sm text-gray-600">{item.createdDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Expiry Date</p>
                  <p className="text-sm text-gray-600">{item.expiryDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Retention Period</p>
                  <p className="text-sm text-gray-600">
                    {policy?.retentionPeriod} {policy?.retentionUnit}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Retention & Deletion Engine</h1>
          <p className="text-gray-600 mt-1">PDPL Article 17 - Automated retention policy management and deletion scheduling</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'policies', label: 'Retention Policies', count: retentionPolicies.length },
            { id: 'data-items', label: 'Data Items', count: dataRetentionItems.length }
          ].map((tab) => (
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
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === 'policies' ? 'Retention Policies' : 'Data Retention Items'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'policies' ? 'policies' : 'data items'}...`}
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
                {activeTab === 'policies' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="flagged">Flagged</option>
                    <option value="expired">Expired</option>
                    <option value="deleted">Deleted</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'policies' ? renderPoliciesTab() : renderDataItemsTab()}
      </Card>
    </div>
  );
};

export default RetentionPolicyEngine;