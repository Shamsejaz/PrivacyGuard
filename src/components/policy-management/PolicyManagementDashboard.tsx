import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, RefreshCw, Globe, Users, Calendar, CheckCircle, Clock, AlertTriangle, Eye, Edit, Archive, Loader2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { usePolicyManagement } from '../../hooks/usePolicyManagement';
import type { PolicyDocument as APIPolicyDocument, PolicyTemplate as APITemplate } from '../../services/policyService';

// Legacy interface for backward compatibility
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
  
  // Use the policy management hook
  const {
    policies: apiPolicies,
    templates: apiTemplates,
    analytics,
    loading,
    error,
    searchPolicies,
    loadTemplates,
    loadAnalytics,
    clearError
  } = usePolicyManagement();

  // Helper function to convert API policy to legacy format
  const convertApiPolicyToLegacy = (apiPolicy: APIPolicyDocument): PolicyDocument => {
    const statusMap: Record<string, PolicyDocument['status']> = {
      'draft': 'draft',
      'review': 'review',
      'approved': 'approved',
      'active': 'published',
      'archived': 'expired',
      'rejected': 'draft'
    };

    const typeMap: Record<string, PolicyDocument['type']> = {
      'privacy_policy': 'privacy_policy',
      'cookie_policy': 'cookie_policy',
      'terms_of_service': 'terms_of_service',
      'data_processing_agreement': 'dpa',
      'consent_form': 'consent_notice',
      'other': 'retention_policy'
    };

    return {
      id: apiPolicy._id || '',
      title: apiPolicy.title,
      type: typeMap[apiPolicy.type] || 'privacy_policy',
      status: statusMap[apiPolicy.status] || 'draft',
      lastModified: new Date(apiPolicy.updated_at),
      author: apiPolicy.created_by,
      version: apiPolicy.version,
      languages: [apiPolicy.language], // API stores single language, convert to array
      regulations: apiPolicy.metadata.compliance_frameworks,
      nextReview: apiPolicy.metadata.next_review_date ? new Date(apiPolicy.metadata.next_review_date) : new Date(),
      aiGenerated: true, // Assume AI generated for now
      complianceScore: 85, // Default score, would need to fetch from compliance report
      wordCount: apiPolicy.metadata.word_count,
      publishedUrl: apiPolicy.status === 'active' ? '#' : undefined
    };
  };

  // Helper function to convert API template to legacy format
  const convertApiTemplateToLegacy = (apiTemplate: APITemplate): PolicyTemplate => {
    return {
      id: apiTemplate._id || '',
      name: apiTemplate.name,
      industry: apiTemplate.category,
      regulations: [apiTemplate.regulation],
      description: apiTemplate.description,
      estimatedTime: '15 minutes' // Default estimation
    };
  };

  // Convert API data to legacy format
  const policies: PolicyDocument[] = apiPolicies.map(convertApiPolicyToLegacy);
  const templates: PolicyTemplate[] = apiTemplates.map(convertApiTemplateToLegacy);

  // Handle search with API
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm || selectedFilter !== 'all') {
        const filters: any = {};
        
        if (searchTerm) {
          filters.search_text = searchTerm;
        }
        
        if (selectedFilter !== 'all') {
          // Map legacy status to API status
          const statusMap: Record<string, string> = {
            'published': 'active',
            'review': 'review',
            'draft': 'draft',
            'expired': 'archived'
          };
          filters.status = statusMap[selectedFilter] || selectedFilter;
        }
        
        searchPolicies(filters);
      } else {
        searchPolicies();
      }
    }, 300); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedFilter, searchPolicies]);

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
                    <p className="text-2xl font-bold text-green-600">
                      {analytics?.overview.compliance_score || 0}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Policies</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics?.overview.total_policies || 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Policies</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {analytics?.overview.active_policies || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
            </div>
            
            {analytics?.gap_analysis && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Gap Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{analytics.gap_analysis.critical_gaps}</p>
                    <p className="text-sm text-gray-600">Critical Gaps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{analytics.gap_analysis.high_gaps}</p>
                    <p className="text-sm text-gray-600">High Priority</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{analytics.gap_analysis.medium_gaps}</p>
                    <p className="text-sm text-gray-600">Medium Priority</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{analytics.gap_analysis.low_gaps}</p>
                    <p className="text-sm text-gray-600">Low Priority</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading state
  if (loading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading policy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
          <p className="text-gray-600 mt-1">AI-powered policy generation and compliance management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowGenerator(true)} disabled={loading}>
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