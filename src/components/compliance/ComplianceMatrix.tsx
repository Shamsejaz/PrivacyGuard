import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Upload, FileText, Eye, Edit, Filter, Search, Download, BarChart3 } from 'lucide-react';
import { ComplianceFramework, ComplianceRequirement, Evidence, GapAnalysis as GapAnalysisType } from '../../types/compliance';
import { cn } from '../../utils/cn';
import EvidenceManager from './EvidenceManager';
import GapAnalysis from './GapAnalysis';
import RequirementEditForm from './RequirementEditForm';

interface ComplianceMatrixProps {
  framework: ComplianceFramework;
  requirements: ComplianceRequirement[];
  onStatusUpdate: (requirementId: string, status: ComplianceRequirement['status']) => void;
  onEvidenceUpload: (requirementId: string, evidence: Evidence) => void;
  onGapUpdate: (requirementId: string, gaps: GapAnalysisType[]) => void;
  onRequirementUpdate?: (requirementId: string, updates: Partial<ComplianceRequirement>) => void;
}

const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({
  framework,
  requirements,
  onStatusUpdate,
  onEvidenceUpload,
  onGapUpdate,
  onRequirementUpdate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'evidence' | 'gap' | 'edit' | null>(null);
  const [sortBy, setSortBy] = useState<'article' | 'priority' | 'status' | 'dueDate'>('article');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const categories = Array.from(new Set(requirements.map(req => req.category)));
  const priorities = ['high', 'medium', 'low'];

  const filteredRequirements = requirements.filter(req => {
    const categoryMatch = selectedCategory === 'all' || req.category === selectedCategory;
    const statusMatch = selectedStatus === 'all' || req.status === selectedStatus;
    const priorityMatch = selectedPriority === 'all' || req.priority === selectedPriority;
    const searchMatch = searchTerm === '' || 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.article.toLowerCase().includes(searchTerm.toLowerCase());
    
    return categoryMatch && statusMatch && priorityMatch && searchMatch;
  }).sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'article':
        aValue = a.article;
        bValue = b.article;
        break;
      case 'priority':
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'status':
        const statusOrder = { 'non_compliant': 4, 'partial': 3, 'compliant': 2, 'not_applicable': 1 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      case 'dueDate':
        aValue = a.dueDate.getTime();
        bValue = b.dueDate.getTime();
        break;
      default:
        aValue = a.article;
        bValue = b.article;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusIcon = (status: ComplianceRequirement['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'not_applicable':
        return <Clock className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ComplianceRequirement['status']) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant':
        return 'bg-red-100 text-red-800';
      case 'not_applicable':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ComplianceRequirement['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStats = () => {
    const total = requirements.length;
    const compliant = requirements.filter(req => req.status === 'compliant').length;
    const partial = requirements.filter(req => req.status === 'partial').length;
    const nonCompliant = requirements.filter(req => req.status === 'non_compliant').length;
    const notApplicable = requirements.filter(req => req.status === 'not_applicable').length;
    
    return {
      total,
      compliant,
      partial,
      nonCompliant,
      notApplicable,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
    };
  };

  const stats = getComplianceStats();

  const handleEvidenceUpload = (requirementId: string) => {
    setSelectedRequirement(requirementId);
    setActiveModal('evidence');
  };

  const handleGapAnalysis = (requirementId: string) => {
    setSelectedRequirement(requirementId);
    setActiveModal('gap');
  };

  const handleEditRequirement = (requirementId: string) => {
    setSelectedRequirement(requirementId);
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedRequirement(null);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Article', 'Title', 'Category', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Evidence Count'].join(','),
      ...filteredRequirements.map(req => [
        req.article,
        `"${req.title}"`,
        req.category,
        req.status,
        req.priority,
        req.assignedTo,
        req.dueDate.toLocaleDateString(),
        req.evidence.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${framework}_compliance_matrix.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedReq = selectedRequirement ? requirements.find(r => r.id === selectedRequirement) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{framework} Compliance Matrix</h2>
          <p className="text-gray-600 mt-1">
            Track compliance status and manage evidence for {framework} requirements
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Overall Score</p>
              <p className="text-2xl font-bold text-blue-600">{stats.complianceRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Partial</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Non-Compliant</p>
              <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Not Applicable</p>
              <p className="text-2xl font-bold text-gray-600">{stats.notApplicable}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Requirements</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, description, or article..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
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
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partially Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="not_applicable">Not Applicable</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || searchTerm) && (
          <div className="flex items-center space-x-2 mb-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Category: {selectedCategory.replace('_', ' ')}
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Status: {selectedStatus.replace('_', ' ')}
              </span>
            )}
            {selectedPriority !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Priority: {selectedPriority}
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                Search: "{searchTerm}"
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSearchTerm('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Requirements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Requirements ({filteredRequirements.length} of {requirements.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('article')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Requirement</span>
                    {sortBy === 'article' && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortBy === 'status' && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority</span>
                    {sortBy === 'priority' && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Due Date</span>
                    {sortBy === 'dueDate' && (
                      <span className="text-blue-600">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequirements.map((requirement) => (
                <tr key={requirement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-600">{requirement.article}</span>
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {requirement.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{requirement.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{requirement.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(requirement.status)}
                      <select
                        value={requirement.status}
                        onChange={(e) => onStatusUpdate(requirement.id, e.target.value as ComplianceRequirement['status'])}
                        className={cn(
                          'text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500',
                          getStatusColor(requirement.status)
                        )}
                      >
                        <option value="compliant">Compliant</option>
                        <option value="partial">Partial</option>
                        <option value="non_compliant">Non-Compliant</option>
                        <option value="not_applicable">Not Applicable</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      getPriorityColor(requirement.priority)
                    )}>
                      {requirement.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {requirement.assignedTo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {requirement.dueDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {requirement.evidence.slice(0, 2).map((evidence, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          <FileText className="h-3 w-3 mr-1" />
                          {evidence.name}
                        </span>
                      ))}
                      {requirement.evidence.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          +{requirement.evidence.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEvidenceUpload(requirement.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Upload Evidence"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGapAnalysis(requirement.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Gap Analysis"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditRequirement(requirement.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Requirement"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress by Category */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Progress by Category</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {categories.map(category => {
              const categoryRequirements = requirements.filter(req => req.category === category);
              const compliantRequirements = categoryRequirements.filter(req => req.status === 'compliant');
              const progress = categoryRequirements.length > 0 ? (compliantRequirements.length / categoryRequirements.length) * 100 : 0;
              
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-600">
                      {compliantRequirements.length}/{categoryRequirements.length} ({Math.round(progress)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={cn(
                        'h-2 rounded-full',
                        progress >= 80 ? 'bg-green-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'evidence' && selectedReq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Evidence Management - {selectedReq.article}: {selectedReq.title}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <EvidenceManager
                requirementId={selectedReq.id}
                evidence={selectedReq.evidence}
                onEvidenceAdd={(evidence) => {
                  onEvidenceUpload(selectedReq.id, evidence);
                  if (onRequirementUpdate) {
                    onRequirementUpdate(selectedReq.id, {
                      evidence: [...selectedReq.evidence, evidence]
                    });
                  }
                }}
                onEvidenceRemove={(evidenceId) => {
                  if (onRequirementUpdate) {
                    onRequirementUpdate(selectedReq.id, {
                      evidence: selectedReq.evidence.filter(e => e.id !== evidenceId)
                    });
                  }
                }}
                onEvidenceView={(evidence) => {
                  if (evidence.url) {
                    window.open(evidence.url, '_blank');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeModal === 'gap' && selectedReq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Gap Analysis - {selectedReq.article}: {selectedReq.title}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <GapAnalysis
                requirementId={selectedReq.id}
                gaps={[]} // This would come from props or state
                onGapAdd={(gap: GapAnalysisType) => {
                  onGapUpdate(selectedReq.id, [gap]);
                }}
                onGapUpdate={(gapId: string, updates: Partial<GapAnalysisType>) => {
                  // Handle gap updates
                  console.log('Gap update:', gapId, updates);
                }}
                onGapRemove={(gapId: string) => {
                  // Handle gap removal
                  console.log('Gap remove:', gapId);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeModal === 'edit' && selectedReq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Requirement - {selectedReq.article}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <RequirementEditForm
                requirement={selectedReq}
                onSave={(updates) => {
                  if (onRequirementUpdate) {
                    onRequirementUpdate(selectedReq.id, updates);
                  }
                  closeModal();
                }}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceMatrix;