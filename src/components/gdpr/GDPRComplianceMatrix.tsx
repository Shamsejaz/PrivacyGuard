import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, FileText, Users, Shield, Clock } from 'lucide-react';

interface ComplianceItem {
  id: string;
  article: string;
  requirement: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string[];
  responsible: string;
  lastReviewed: string;
  nextReview: string;
  priority: 'high' | 'medium' | 'low';
  category: 'principles' | 'rights' | 'obligations' | 'governance' | 'security';
}

const GDPRComplianceMatrix: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const complianceItems: ComplianceItem[] = [
    {
      id: '1',
      article: 'Article 5',
      requirement: 'Lawfulness, fairness and transparency',
      description: 'Personal data shall be processed lawfully, fairly and in a transparent manner',
      status: 'compliant',
      evidence: ['Lawful basis documentation', 'Privacy notices', 'Consent records'],
      responsible: 'Sarah Johnson (DPO)',
      lastReviewed: '2024-01-15',
      nextReview: '2024-07-15',
      priority: 'high',
      category: 'principles'
    },
    {
      id: '2',
      article: 'Article 5',
      requirement: 'Purpose limitation',
      description: 'Personal data shall be collected for specified, explicit and legitimate purposes',
      status: 'compliant',
      evidence: ['Purpose documentation', 'Data mapping', 'Processing records'],
      responsible: 'Sarah Johnson (DPO)',
      lastReviewed: '2024-01-20',
      nextReview: '2024-07-20',
      priority: 'high',
      category: 'principles'
    },
    {
      id: '3',
      article: 'Article 5',
      requirement: 'Data minimisation',
      description: 'Personal data shall be adequate, relevant and limited to what is necessary',
      status: 'partial',
      evidence: ['Data audit reports', 'Minimization procedures'],
      responsible: 'Michael Chen (IT)',
      lastReviewed: '2024-02-01',
      nextReview: '2024-05-01',
      priority: 'medium',
      category: 'principles'
    },
    {
      id: '4',
      article: 'Article 12',
      requirement: 'Transparent information and communication',
      description: 'Information provided to data subjects shall be concise, transparent, intelligible and easily accessible',
      status: 'compliant',
      evidence: ['Privacy policy', 'Data subject notices', 'Communication templates'],
      responsible: 'Legal Team',
      lastReviewed: '2024-01-30',
      nextReview: '2024-07-30',
      priority: 'high',
      category: 'rights'
    },
    {
      id: '5',
      article: 'Article 15',
      requirement: 'Right of access by the data subject',
      description: 'Data subject shall have the right to obtain confirmation of processing and access to personal data',
      status: 'compliant',
      evidence: ['DSAR procedures', 'Access request logs', 'Response templates'],
      responsible: 'Customer Support',
      lastReviewed: '2024-02-05',
      nextReview: '2024-08-05',
      priority: 'high',
      category: 'rights'
    },
    {
      id: '6',
      article: 'Article 17',
      requirement: 'Right to erasure (right to be forgotten)',
      description: 'Data subject shall have the right to obtain erasure of personal data',
      status: 'partial',
      evidence: ['Deletion procedures', 'Erasure logs'],
      responsible: 'IT Team',
      lastReviewed: '2024-01-25',
      nextReview: '2024-04-25',
      priority: 'high',
      category: 'rights'
    },
    {
      id: '7',
      article: 'Article 20',
      requirement: 'Right to data portability',
      description: 'Data subject shall have the right to receive personal data in a structured, commonly used format',
      status: 'compliant',
      evidence: ['Portability procedures', 'Export functionality', 'Format specifications'],
      responsible: 'Development Team',
      lastReviewed: '2024-02-10',
      nextReview: '2024-08-10',
      priority: 'medium',
      category: 'rights'
    },
    {
      id: '8',
      article: 'Article 30',
      requirement: 'Records of processing activities',
      description: 'Controller shall maintain a record of processing activities under its responsibility',
      status: 'compliant',
      evidence: ['Processing records', 'Activity documentation', 'Regular updates'],
      responsible: 'Sarah Johnson (DPO)',
      lastReviewed: '2024-02-01',
      nextReview: '2024-05-01',
      priority: 'high',
      category: 'obligations'
    },
    {
      id: '9',
      article: 'Article 32',
      requirement: 'Security of processing',
      description: 'Implement appropriate technical and organisational measures to ensure security',
      status: 'partial',
      evidence: ['Security policies', 'Technical measures', 'Risk assessments'],
      responsible: 'Security Team',
      lastReviewed: '2024-01-15',
      nextReview: '2024-04-15',
      priority: 'high',
      category: 'security'
    },
    {
      id: '10',
      article: 'Article 33',
      requirement: 'Notification of personal data breach to supervisory authority',
      description: 'Notify supervisory authority of personal data breach within 72 hours',
      status: 'compliant',
      evidence: ['Breach procedures', 'Notification templates', 'Response logs'],
      responsible: 'Sarah Johnson (DPO)',
      lastReviewed: '2024-02-15',
      nextReview: '2024-08-15',
      priority: 'high',
      category: 'obligations'
    },
    {
      id: '11',
      article: 'Article 35',
      requirement: 'Data protection impact assessment',
      description: 'Carry out DPIA where processing is likely to result in high risk',
      status: 'compliant',
      evidence: ['DPIA procedures', 'Assessment reports', 'Risk evaluations'],
      responsible: 'Sarah Johnson (DPO)',
      lastReviewed: '2024-01-30',
      nextReview: '2024-07-30',
      priority: 'high',
      category: 'governance'
    },
    {
      id: '12',
      article: 'Article 37',
      requirement: 'Designation of data protection officer',
      description: 'Designate DPO where required and ensure proper position and tasks',
      status: 'compliant',
      evidence: ['DPO appointment', 'Role definition', 'Independence documentation'],
      responsible: 'Executive Team',
      lastReviewed: '2024-01-01',
      nextReview: '2024-07-01',
      priority: 'high',
      category: 'governance'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Categories', icon: Shield },
    { id: 'principles', label: 'Data Protection Principles', icon: FileText },
    { id: 'rights', label: 'Data Subject Rights', icon: Users },
    { id: 'obligations', label: 'Controller Obligations', icon: CheckCircle },
    { id: 'governance', label: 'Governance & Oversight', icon: Shield },
    { id: 'security', label: 'Security Measures', icon: Shield }
  ];

  const statuses = [
    { id: 'all', label: 'All Statuses' },
    { id: 'compliant', label: 'Compliant' },
    { id: 'partial', label: 'Partially Compliant' },
    { id: 'non_compliant', label: 'Non-Compliant' },
    { id: 'not_applicable', label: 'Not Applicable' }
  ];

  const filteredItems = complianceItems.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
    return categoryMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'not_applicable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non_compliant': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'not_applicable': return <Clock className="h-5 w-5 text-gray-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStats = () => {
    const total = complianceItems.length;
    const compliant = complianceItems.filter(item => item.status === 'compliant').length;
    const partial = complianceItems.filter(item => item.status === 'partial').length;
    const nonCompliant = complianceItems.filter(item => item.status === 'non_compliant').length;
    
    return {
      total,
      compliant,
      partial,
      nonCompliant,
      complianceRate: Math.round((compliant / total) * 100)
    };
  };

  const stats = getComplianceStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">GDPR Compliance Matrix</h2>
          <p className="text-gray-600 mt-1">Track compliance status across all GDPR requirements</p>
        </div>
      </div>

      {/* Compliance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Overall Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-gray-900">{stats.compliant}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Partial</p>
              <p className="text-2xl font-bold text-gray-900">{stats.partial}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Non-Compliant</p>
              <p className="text-2xl font-bold text-gray-900">{stats.nonCompliant}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Matrix */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Compliance Requirements ({filteredItems.length} of {complianceItems.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article & Requirement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Review
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-blue-600">{item.article}</span>
                        <span className="ml-2 inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{item.requirement}</div>
                      <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(item.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.responsible}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.nextReview}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.evidence.slice(0, 2).map((evidence, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {evidence}
                        </span>
                      ))}
                      {item.evidence.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          +{item.evidence.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Progress by Category */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Compliance Progress by Category</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {categories.slice(1).map(category => {
              const categoryItems = complianceItems.filter(item => item.category === category.id);
              const compliantItems = categoryItems.filter(item => item.status === 'compliant');
              const progress = categoryItems.length > 0 ? (compliantItems.length / categoryItems.length) * 100 : 0;
              
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <category.icon className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{category.label}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {compliantItems.length}/{categoryItems.length} ({Math.round(progress)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GDPRComplianceMatrix;