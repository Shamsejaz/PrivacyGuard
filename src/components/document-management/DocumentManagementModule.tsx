import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Grid, 
  List,
  Settings,
  Archive,
  Bell,
  Users,
  Edit,
  Eye
} from 'lucide-react';
import { Document, DocumentSearchFilters, DocumentStats } from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';
import { DocumentTemplateLibrary } from './DocumentTemplateLibrary';
import { DocumentTemplateEditor } from './DocumentTemplateEditor';
import { DocumentGenerator } from './DocumentGenerator';
import { DocumentVersionControl } from './DocumentVersionControl';
import { DocumentApprovalWorkflow } from './DocumentApprovalWorkflow';
import { DocumentPublicationControl } from './DocumentPublicationControl';
import { DocumentLifecycleManager } from './DocumentLifecycleManager';
import { DocumentNotificationCenter } from './DocumentNotificationCenter';
import { CollaborativeEditor } from './CollaborativeEditor';
import { DocumentAcknowledgmentTracker } from './DocumentAcknowledgmentTracker';

type ViewMode = 'documents' | 'templates' | 'notifications' | 'analytics';
type DocumentView = 'list' | 'grid';

export const DocumentManagementModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('documents');
  const [documentView, setDocumentView] = useState<DocumentView>('list');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  
  const [filters, setFilters] = useState<DocumentSearchFilters>({
    query: '',
    status: undefined,
    type: undefined,
    category: undefined
  });

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const documentsData = await documentManagementService.getDocuments(filters);
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await documentManagementService.getDocumentStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (filters.query) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(filters.query!.toLowerCase()) ||
        doc.content.toLowerCase().includes(filters.query!.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(doc => doc.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(doc => doc.type === filters.type);
    }

    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }

    setFilteredDocuments(filtered);
  };

  const handleCreateDocument = () => {
    setSelectedDocument(null);
    setShowEditor(true);
  };

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowEditor(true);
  };

  const handleDocumentUpdate = () => {
    loadDocuments();
    loadStats();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDocumentCard = (document: Document) => (
    <div key={document.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {document.title}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                {document.status}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            v{document.version}
          </div>
        </div>

        <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
          <span>{document.type}</span>
          <span>{document.category}</span>
          <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditDocument(document)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </button>
            
            <button
              onClick={() => setSelectedDocument(document)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </button>
          </div>

          <div className="flex items-center text-xs text-gray-500">
            <Users className="w-3 h-3 mr-1" />
            {document.permissions?.length || 0} users
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentRow = (document: Document) => (
    <tr key={document.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-blue-500 mr-3" />
          <div>
            <div className="text-sm font-medium text-gray-900">{document.title}</div>
            <div className="text-sm text-gray-500">{document.type} • {document.category}</div>
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
          {document.status}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        v{document.version}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {document.lastModifiedBy}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(document.updatedAt).toLocaleDateString()}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditDocument(document)}
            className="text-blue-600 hover:text-blue-900"
          >
            Edit
          </button>
          <button
            onClick={() => setSelectedDocument(document)}
            className="text-gray-600 hover:text-gray-900"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  );

  if (showEditor) {
    return (
      <CollaborativeEditor
        document={selectedDocument!}
        onDocumentUpdate={handleDocumentUpdate}
        readOnly={false}
      />
    );
  }

  if (showTemplateEditor) {
    return (
      <DocumentTemplateEditor
        template={selectedTemplate}
        onSave={() => {
          setShowTemplateEditor(false);
          setSelectedTemplate(null);
        }}
        onCancel={() => {
          setShowTemplateEditor(false);
          setSelectedTemplate(null);
        }}
      />
    );
  }

  if (showGenerator && selectedTemplate) {
    return (
      <DocumentGenerator
        template={selectedTemplate}
        onDocumentGenerated={() => {
          setShowGenerator(false);
          setSelectedTemplate(null);
          handleDocumentUpdate();
        }}
        onCancel={() => {
          setShowGenerator(false);
          setSelectedTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-1">
            Manage documents, templates, and collaborative workflows
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleCreateDocument}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </button>
          
          <button
            onClick={() => setShowTemplateEditor(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <Bell className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.upcomingReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <Archive className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.expiringSoon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.recentActivity.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'templates', label: 'Templates', icon: Settings },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'analytics', label: 'Analytics', icon: Archive }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as ViewMode)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                currentView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      {currentView === 'documents' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={filters.query || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: (e.target.value || undefined) as any }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDocumentView('list')}
                    className={`p-2 rounded ${documentView === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDocumentView('grid')}
                    className={`p-2 rounded ${documentView === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List/Grid */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documentView === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map(renderDocumentCard)}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(renderDocumentRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {currentView === 'templates' && (
        <DocumentTemplateLibrary
          onTemplateSelect={(template) => {
            setSelectedTemplate(template);
            setShowGenerator(true);
          }}
          onCreateNew={() => setShowTemplateEditor(true)}
        />
      )}

      {currentView === 'notifications' && (
        <DocumentNotificationCenter />
      )}

      {currentView === 'analytics' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Document Analytics</h3>
          <p className="text-gray-500">Analytics dashboard coming soon...</p>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && !showEditor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedDocument.title}
                </h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <DocumentVersionControl
                    document={selectedDocument}
                    onVersionSelect={() => {}}
                    onRevert={() => handleDocumentUpdate()}
                  />
                  
                  <DocumentApprovalWorkflow
                    document={selectedDocument}
                    onApprovalUpdate={handleDocumentUpdate}
                  />
                  
                  <DocumentPublicationControl
                    document={selectedDocument}
                    onPublicationUpdate={handleDocumentUpdate}
                  />
                </div>

                <div className="space-y-6">
                  <DocumentLifecycleManager
                    document={selectedDocument}
                    onLifecycleUpdate={handleDocumentUpdate}
                  />
                  
                  <DocumentAcknowledgmentTracker
                    document={selectedDocument}
                    onAcknowledgmentUpdate={handleDocumentUpdate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};