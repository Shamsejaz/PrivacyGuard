import React, { useState } from 'react';
import { Globe, AlertTriangle, CheckCircle, Building, FileText, Plus, Search, Filter, Eye, Download } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface DataTransfer {
  id: string;
  vendorName: string;
  vendorCountry: string;
  dataTypes: string[];
  transferMechanism: 'adequacy_decision' | 'standard_contractual_clauses' | 'binding_corporate_rules' | 'derogation' | 'none';
  approvalStatus: 'approved' | 'pending' | 'rejected' | 'requires_review';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataVolume: 'low' | 'medium' | 'high';
  transferFrequency: 'one_time' | 'monthly' | 'weekly' | 'daily' | 'real_time';
  lastAssessment: Date;
  nextReview: Date;
  dpaStatus: 'signed' | 'pending' | 'expired' | 'not_required';
  contactPerson: string;
  businessJustification: string;
  safeguards: string[];
}

const CrossBorderTransfers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const transfers: DataTransfer[] = [
    {
      id: '1',
      vendorName: 'AWS Middle East',
      vendorCountry: 'UAE',
      dataTypes: ['Customer Data', 'Transaction Records', 'Analytics Data'],
      transferMechanism: 'adequacy_decision',
      approvalStatus: 'approved',
      riskLevel: 'low',
      dataVolume: 'high',
      transferFrequency: 'real_time',
      lastAssessment: new Date('2024-01-10'),
      nextReview: new Date('2024-07-10'),
      dpaStatus: 'signed',
      contactPerson: 'Ahmed Al-Rashid',
      businessJustification: 'Cloud infrastructure hosting for improved performance and data residency compliance',
      safeguards: ['Data encryption in transit and at rest', 'Access controls', 'Regular security audits']
    },
    {
      id: '2',
      vendorName: 'Microsoft Azure',
      vendorCountry: 'UAE',
      dataTypes: ['Employee Data', 'Email Communications', 'Documents'],
      transferMechanism: 'standard_contractual_clauses',
      approvalStatus: 'approved',
      riskLevel: 'medium',
      dataVolume: 'medium',
      transferFrequency: 'daily',
      lastAssessment: new Date('2024-01-05'),
      nextReview: new Date('2024-04-05'),
      dpaStatus: 'signed',
      contactPerson: 'Fatima Hassan',
      businessJustification: 'Office 365 services for productivity and collaboration',
      safeguards: ['Standard Contractual Clauses', 'Data residency controls', 'Compliance certifications']
    },
    {
      id: '3',
      vendorName: 'Salesforce Inc.',
      vendorCountry: 'United States',
      dataTypes: ['Customer Contact Information', 'Sales Data', 'Marketing Data'],
      transferMechanism: 'standard_contractual_clauses',
      approvalStatus: 'requires_review',
      riskLevel: 'high',
      dataVolume: 'medium',
      transferFrequency: 'real_time',
      lastAssessment: new Date('2023-12-15'),
      nextReview: new Date('2024-02-15'),
      dpaStatus: 'pending',
      contactPerson: 'Mohammed Salem',
      businessJustification: 'CRM system for customer relationship management',
      safeguards: ['Pending DPA signature', 'Data encryption', 'Access logging']
    },
    {
      id: '4',
      vendorName: 'Google Analytics',
      vendorCountry: 'United States',
      dataTypes: ['Website Analytics', 'User Behavior Data'],
      transferMechanism: 'none',
      approvalStatus: 'rejected',
      riskLevel: 'critical',
      dataVolume: 'high',
      transferFrequency: 'real_time',
      lastAssessment: new Date('2024-01-08'),
      nextReview: new Date('2024-03-08'),
      dpaStatus: 'not_required',
      contactPerson: 'Sara Al-Zahra',
      businessJustification: 'Website analytics and user behavior tracking',
      safeguards: ['No adequate safeguards in place']
    }
  ];

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Approved</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'requires_review': return <Badge variant="warning">Requires Review</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low': return <Badge variant="success">Low Risk</Badge>;
      case 'medium': return <Badge variant="warning">Medium Risk</Badge>;
      case 'high': return <Badge variant="danger">High Risk</Badge>;
      case 'critical': return <Badge variant="danger">Critical Risk</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getDPABadge = (status: string) => {
    switch (status) {
      case 'signed': return <Badge variant="success">DPA Signed</Badge>;
      case 'pending': return <Badge variant="warning">DPA Pending</Badge>;
      case 'expired': return <Badge variant="danger">DPA Expired</Badge>;
      case 'not_required': return <Badge variant="info">Not Required</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getMechanismLabel = (mechanism: string) => {
    switch (mechanism) {
      case 'adequacy_decision': return 'Adequacy Decision';
      case 'standard_contractual_clauses': return 'Standard Contractual Clauses';
      case 'binding_corporate_rules': return 'Binding Corporate Rules';
      case 'derogation': return 'Derogation';
      case 'none': return 'No Safeguards';
      default: return mechanism;
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.vendorCountry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || transfer.approvalStatus === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    approved: transfers.filter(t => t.approvalStatus === 'approved').length,
    pending: transfers.filter(t => t.approvalStatus === 'pending').length,
    rejected: transfers.filter(t => t.approvalStatus === 'rejected').length,
    requires_review: transfers.filter(t => t.approvalStatus === 'requires_review').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cross-Border Data Transfers</h1>
          <p className="text-gray-600 mt-1">PDPL Articles 29, 30 - International data transfer tracking and compliance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Transfer Log
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Transfer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending + statusCounts.requires_review}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-blue-600">{transfers.length}</p>
            </div>
            <Building className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Data Transfer Registry</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
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
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="requires_review">Requires Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredTransfers.map((transfer) => (
            <div key={transfer.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{transfer.vendorName}</h3>
                      <Badge variant="info" size="sm">{transfer.vendorCountry}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{transfer.businessJustification}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Contact: {transfer.contactPerson}</span>
                      <span>Volume: {transfer.dataVolume}</span>
                      <span>Frequency: {transfer.transferFrequency.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getApprovalBadge(transfer.approvalStatus)}
                  {getRiskBadge(transfer.riskLevel)}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Transfer Mechanism</p>
                  <p className="text-sm text-gray-600">{getMechanismLabel(transfer.transferMechanism)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">DPA Status</p>
                  {getDPABadge(transfer.dpaStatus)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Next Review</p>
                  <p className="text-sm text-gray-600">{transfer.nextReview.toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Data Types</p>
                <div className="flex flex-wrap gap-1">
                  {transfer.dataTypes.map((type, index) => (
                    <Badge key={index} variant="default" size="sm">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Safeguards</p>
                <ul className="space-y-1">
                  {transfer.safeguards.map((safeguard, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">{safeguard}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default CrossBorderTransfers;