import React, { useState } from 'react';
import { FileText, Plus, Search, Filter, Download, RefreshCw, Globe, Users, Calendar, CheckCircle, Clock, AlertTriangle, Eye, Edit, Archive } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

interface PolicyDocument {
  id: string;
  title: string;
  type: 'privacy_policy' | 'cookie_policy' | 'terms_of_service' | 'dpa' | 'consent_notice' | 'retention_policy';
  status: 'draft' | 'review' | 'approved' | 'published' | 'expired';
  lastModified: Date;
  author: string;
  version: string;
  languages: string[];
  regulations: string[];
  nextReview: Date;
  aiGenerated: boolean;
  complianceScore: number;
  wordCount: number;
  publishedUrl?: string;
}

interface PolicyTemplate {
  id: string;
  name: string;
  industry: string;
  regulations: string[];
  description: string;
  estimatedTime: string;
}

const PolicyManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('policies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showGenerator, setShowGenerator] = useState(false);

  const policies: PolicyDocument[] = [
    {
      id: '1',
      title: 'Privacy Policy - Main Website',
      type: 'privacy_policy',
      status: 'published',
      lastModified: new Date('2024-01-15T10:30:00'),
      author: 'Sarah Johnson',
      version: '2.1',
      languages: ['English', 'Spanish', 'French'],
      regulations: ['GDPR', 'CCPA'],
      nextReview: new Date('2024-04-15'),
      aiGenerated: true,
      complianceScore: 95,
      wordCount: 3200,
      publishedUrl: 'https://company.com/privacy'
    },
    {
      id: '2',
      title: 'Cookie Policy - E-commerce Platform',
      type: 'cookie_policy',
      status: 'review',
      lastModified: new Date('2024-01-14T16:45:00'),
      author: 'Mike Chen',
      version: '1.3',
      languages: ['English', 'German'],
      regulations: ['GDPR', 'ePrivacy'],
      nextReview: new Date('2024-02-14'),
      aiGenerated: true,
      complianceScore: 88,
      wordCount: 1800
    },
    {
      id: '3',
      title: 'Data Processing Agreement - Vendors',
      type: 'dpa',
      status: 'approved',
      lastModified: new Date('2024-01-13T09:15:00'),
      author: 'Lisa Rodriguez',
      version: '3.0',
      languages: ['English'],
      regulations: ['GDPR', 'CCPA', 'HIPAA'],
      nextReview: new Date('2024-07-13'),
      aiGenerated: false,
      complianceScore: 92,
      wordCount: 5600
    },
    {
      id: '4',
      title: 'Employee Privacy Notice',
      type: 'privacy_policy',
      status: 'draft',
      lastModified: new Date('2024-01-12T14:20:00'),
      author: 'James Wilson',
      version: '1.0',
      languages: ['English'],
      regulations: ['GDPR', 'CCPA'],
      nextReview: new Date('2024-03-12'),
      aiGenerated: true,
      complianceScore: 78,
      wordCount: 2400
    },
    {
      id: '5',
      title: 'Data Retention Policy',
      type: 'retention_policy',
      status: 'expired',
      lastModified: new Date('2023-12-01T11:30:00'),
      author: 'Sarah Johnson',
      version: '1.2',
      languages: ['English', 'Spanish'],
      regulations: ['GDPR', 'CCPA', 'HIPAA'],
      nextReview: new Date('2024-01-01'),
      aiGenerated: false,
      complianceScore: 85,
      wordCount: 3800
    }
  ];

  const templates: PolicyTemplate[] = [
    {
      id: '1',
      name: 'E-commerce Privacy Policy',
      industry: 'E-commerce',
      regulations: ['GDPR', 'CCPA', 'PIPEDA'],
      description: 'Comprehensive privacy policy for online retail businesses',
      estimatedTime: '15 minutes'
    },
    {
      id: '2',
      name: 'Healthcare Privacy Notice',
      industry: 'Healthcare',
      regulations: ['HIPAA', 'GDPR', 'HITECH'],
      description: 'HIPAA-compliant privacy notice for healthcare providers',
      estimatedTime: '20 minutes'
    },
    {
      id: '3',
      name: 'SaaS Terms of Service',
      industry: 'Technology',
      regulations: ['GDPR', 'CCPA', 'SOC2'],
      description: 'Terms of service for software-as-a-service platforms',
      estimatedTime: '25 minutes'
    },
    {
      id: '4',
      name: 'Financial Services DPA',
      industry: 'Financial',
      regulations: ['GDPR', 'PCI DSS', 'SOX'],
      description: 'Data processing agreement for financial institutions',
      estimatedTime: '30 minutes'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="success">Published</Badge>;
      case 'approved': return <Badge variant="info">Approved</Badge>;
      case 'review': return <Badge variant="warning">In Review</Badge>;
      case 'draft': return <Badge variant="default">Draft</Badge>;
      case 'expired': return <Badge variant="danger">Expired</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'review': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'draft': return <Edit className="h-5 w-5 text-gray-500" />;
      case 'expired': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'privacy_policy': return 'Privacy Policy';
      case 'cookie_policy': return 'Cookie Policy';
      case 'terms_of_service': return 'Terms of Service';
      case 'dpa': return 'Data Processing Agreement';
      case 'consent_notice': return 'Consent Notice';
      case 'retention_policy': return 'Retention Policy';
      default: return type;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || policy.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    published: policies.filter(p => p.status === 'published').length,
    review: policies.filter(p => p.status === 'review').length,
    draft: policies.filter(p => p.status === 'draft').length,
    expired: policies.filter(p => p.status === 'expired').length,
  };

  const AIGeneratorModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">AI Policy Generator</h2>
            <button
              onClick={() => setShowGenerator(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Generate compliant policies using advanced AI and legal templates</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <Badge variant="info" size="sm">{template.industry}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Est. Time</p>
                    <p className="font-medium">{template.estimatedTime}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Supported Regulations</p>
                  <div className="flex flex-wrap gap-1">
                    {template.regulations.map((regulation) => (
                      <Badge key={regulation} variant="success" size="sm">
                        {regulation}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  Generate Policy
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'policies', label: 'Policy Library', count: policies.length },
    { id: 'templates', label: 'AI Templates', count: templates.length },
    { id: 'compliance', label: 'Compliance Check', count: 3 },
    { id: 'analytics', label: 'Analytics', count: null }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'policies':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search policies..."
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
                    <option value="published">Published</option>
                    <option value="review">In Review</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
                <Button onClick={() => setShowGenerator(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Policy
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPolicies.map((policy) => (
                <Card key={policy.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(policy.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{policy.title}</h3>
                          {policy.aiGenerated && (
                            <Badge variant="info" size="sm">AI Generated</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{getTypeLabel(policy.type)} • Version {policy.version}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>By {policy.author}</span>
                          <span>Modified {policy.lastModified.toLocaleDateString()}</span>
                          <span>{policy.wordCount.toLocaleString()} words</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(policy.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Compliance Score</span>
                        <span className={`text-sm font-medium ${getComplianceColor(policy.complianceScore)}`}>
                          {policy.complianceScore}%
                        </span>
                      </div>
                      <ProgressBar 
                        value={policy.complianceScore} 
                        variant={policy.complianceScore >= 90 ? 'success' : policy.complianceScore >= 80 ? 'warning' : 'danger'} 
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Languages</p>
                      <div className="flex flex-wrap gap-1">
                        {policy.languages.map((language) => (
                          <Badge key={language} variant="default" size="sm">
                            <Globe className="h-3 w-3 mr-1" />
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Regulations</p>
                      <div className="flex flex-wrap gap-1">
                        {policy.regulations.map((regulation) => (
                          <Badge key={regulation} variant="success" size="sm">
                            {regulation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Next review: {policy.nextReview.toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {policy.publishedUrl && (
                        <Button variant="outline" size="sm">
                          View Live
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'templates':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Policy Templates</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Generate compliant policies in minutes using our advanced AI engine trained on thousands of legal documents and regulatory requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                      <Badge variant="info" size="sm">{template.industry}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Est. Time</p>
                      <p className="font-medium">{template.estimatedTime}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Supported Regulations</p>
                    <div className="flex flex-wrap gap-1">
                      {template.regulations.map((regulation) => (
                        <Badge key={regulation} variant="success" size="sm">
                          {regulation}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Policy
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'compliance':
        return (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance Health Check</h2>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">GDPR Compliance</span>
                  </div>
                  <p className="text-sm text-green-700">All policies are up-to-date and compliant with GDPR requirements</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">CCPA Updates Needed</span>
                  </div>
                  <p className="text-sm text-yellow-700">2 policies require updates for recent CCPA amendments</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">Expired Policies</span>
                  </div>
                  <p className="text-sm text-red-700">1 policy has expired and requires immediate attention</p>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Compliance Score</p>
                    <p className="text-2xl font-bold text-green-600">89%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">AI Generated</p>
                    <p className="text-2xl font-bold text-blue-600">75%</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Languages</p>
                    <p className="text-2xl font-bold text-purple-600">8</p>
                  </div>
                  <Globe className="h-8 w-8 text-purple-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
          <p className="text-gray-600 mt-1">AI-powered policy generation and compliance management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Policy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.published}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.review}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.draft}</p>
            </div>
            <Edit className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
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

      {showGenerator && <AIGeneratorModal />}
    </div>
  );
};

export default PolicyManagementDashboard;