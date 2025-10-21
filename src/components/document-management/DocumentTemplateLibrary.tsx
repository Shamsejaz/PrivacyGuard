import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2,
  Eye,
  Download,
  Tag,
  Calendar,
  User
} from 'lucide-react';
import { 
  DocumentTemplate, 
  DocumentCategory, 
  TemplateVariable 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentTemplateLibraryProps {
  onTemplateSelect?: (template: DocumentTemplate) => void;
  onCreateNew?: () => void;
}

export const DocumentTemplateLibrary: React.FC<DocumentTemplateLibraryProps> = ({
  onTemplateSelect,
  onCreateNew
}) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const categories: (DocumentCategory | 'all')[] = [
    'all', 'privacy', 'security', 'compliance', 'legal', 'hr', 'finance', 'operations', 'technical', 'other'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await documentManagementService.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        // await documentManagementService.deleteTemplate(templateId);
        await loadTemplates();
      } catch (err) {
        setError('Failed to delete template');
        console.error('Error deleting template:', err);
      }
    }
  };

  const handleDuplicateTemplate = async (template: DocumentTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };
      
      await documentManagementService.createTemplate(duplicatedTemplate);
      await loadTemplates();
    } catch (err) {
      setError('Failed to duplicate template');
      console.error('Error duplicating template:', err);
    }
  };

  const getCategoryColor = (category: DocumentCategory) => {
    const colors = {
      privacy: 'bg-blue-100 text-blue-800',
      security: 'bg-red-100 text-red-800',
      compliance: 'bg-green-100 text-green-800',
      legal: 'bg-purple-100 text-purple-800',
      hr: 'bg-yellow-100 text-yellow-800',
      finance: 'bg-indigo-100 text-indigo-800',
      operations: 'bg-gray-100 text-gray-800',
      technical: 'bg-cyan-100 text-cyan-800',
      other: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
        <button
          onClick={() => {
            setShowCreateModal(true);
            onCreateNew?.();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | 'all')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {template.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {template.createdBy}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>

              {template.variables && template.variables.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Tag className="w-3 h-3 mr-1" />
                    Variables ({template.variables.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map((variable) => (
                      <span key={variable.name} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {variable.name}
                      </span>
                    ))}
                    {template.variables.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        +{template.variables.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreviewModal(true);
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </button>
                  
                  <button
                    onClick={() => onTemplateSelect?.(template)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    Use Template
                  </button>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {/* Handle edit */}}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first template.'
            }
          </p>
          {(!searchQuery && selectedCategory === 'all') && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Template Preview: {selectedTemplate.name}
                </h3>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Content Preview</h4>
                  <div className="border border-gray-200 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Template Variables</h4>
                  <div className="space-y-3">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable.name} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{variable.label}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            variable.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {variable.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{variable.description}</p>
                        <div className="text-xs text-gray-400">
                          Type: {variable.type}
                          {variable.defaultValue && ` • Default: ${variable.defaultValue}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onTemplateSelect?.(selectedTemplate);
                    setShowPreviewModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};