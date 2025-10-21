import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  Code, 
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  DocumentTemplate, 
  TemplateVariable, 
  DocumentCategory,
  ValidationRule 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentTemplateEditorProps {
  template?: DocumentTemplate;
  onSave?: (template: DocumentTemplate) => void;
  onCancel?: () => void;
}

export const DocumentTemplateEditor: React.FC<DocumentTemplateEditorProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other' as DocumentCategory,
    content: '',
    variables: [] as TemplateVariable[],
    isActive: true
  });
  
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'preview'>('content');
  const [previewContent, setPreviewContent] = useState('');
  const [previewVariables, setPreviewVariables] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const variableTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { value: 'select', label: 'Select', icon: List }
  ];

  const categories: DocumentCategory[] = [
    'privacy', 'security', 'compliance', 'legal', 'hr', 'finance', 'operations', 'technical', 'other'
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        variables: template.variables,
        isActive: template.isActive
      });
      
      // Initialize preview variables with default values
      const initialPreviewVars: Record<string, any> = {};
      template.variables.forEach(variable => {
        initialPreviewVars[variable.name] = variable.defaultValue || '';
      });
      setPreviewVariables(initialPreviewVars);
    }
  }, [template]);

  useEffect(() => {
    generatePreview();
  }, [formData.content, previewVariables]);

  const generatePreview = () => {
    let content = formData.content;
    
    // Replace template variables with preview values
    Object.entries(previewVariables).forEach(([name, value]) => {
      const regex = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
      content = content.replace(regex, value || `[${name}]`);
    });
    
    setPreviewContent(content);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: `variable_${formData.variables.length + 1}`,
      type: 'text',
      label: 'New Variable',
      description: '',
      required: false,
      defaultValue: '',
      options: [],
      validation: []
    };
    
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
  };

  const updateVariable = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      )
    }));
  };

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const addValidationRule = (variableIndex: number) => {
    const newRule: ValidationRule = {
      type: 'required',
      message: 'This field is required'
    };
    
    updateVariable(variableIndex, 'validation', [
      ...(formData.variables[variableIndex].validation || []),
      newRule
    ]);
  };

  const updateValidationRule = (variableIndex: number, ruleIndex: number, field: string, value: any) => {
    const variable = formData.variables[variableIndex];
    const updatedRules = (variable.validation || []).map((rule, i) =>
      i === ruleIndex ? { ...rule, [field]: value } : rule
    );
    
    updateVariable(variableIndex, 'validation', updatedRules);
  };

  const removeValidationRule = (variableIndex: number, ruleIndex: number) => {
    const variable = formData.variables[variableIndex];
    const updatedRules = (variable.validation || []).filter((_, i) => i !== ruleIndex);
    
    updateVariable(variableIndex, 'validation', updatedRules);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Template name is required');
      }
      
      if (!formData.content.trim()) {
        throw new Error('Template content is required');
      }

      const templateData = {
        ...formData,
        createdBy: 'current-user' // This would come from auth context
      };

      let savedTemplate: DocumentTemplate;
      if (template?.id) {
        // Update existing template
        savedTemplate = await documentManagementService.updateTemplate(template.id, templateData);
      } else {
        // Create new template
        savedTemplate = await documentManagementService.createTemplate(templateData);
      }
      
      setSuccess('Template saved successfully');
      onSave?.(savedTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variableName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variableName}}}` + after;
      
      handleInputChange('content', newText);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableName.length + 4, start + variableName.length + 4);
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="mt-1 text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {template ? 'Edit Template' : 'Create Template'}
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter template name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what this template is used for"
          />
        </div>

        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active template</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'content', label: 'Content', icon: Code },
              { id: 'variables', label: 'Variables', icon: Type },
              { id: 'preview', label: 'Preview', icon: Eye }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
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

        <div className="p-6">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Template Content</h4>
                <div className="text-xs text-gray-500">
                  Use {'{{'} variable_name {'}}'}  to insert variables
                </div>
              </div>
              
              <textarea
                id="template-content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={20}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your template content here..."
              />
              
              {formData.variables.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Available Variables:</h5>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.name)}
                        className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        {variable.label} ({variable.name})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variables Tab */}
          {activeTab === 'variables' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Template Variables</h4>
                <button
                  onClick={addVariable}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Variable
                </button>
              </div>

              {formData.variables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Type className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No variables defined yet. Add variables to make your template dynamic.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-medium text-gray-900">Variable {index + 1}</h5>
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Variable Name
                          </label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => updateVariable(index, 'name', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Display Label
                          </label>
                          <input
                            type="text"
                            value={variable.label}
                            onChange={(e) => updateVariable(index, 'label', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={variable.type}
                            onChange={(e) => updateVariable(index, 'type', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            {variableTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Default Value
                          </label>
                          <input
                            type="text"
                            value={variable.defaultValue || ''}
                            onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={variable.description}
                          onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>

                      <div className="mt-4 flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-xs text-gray-700">Required field</span>
                        </label>
                      </div>

                      {variable.type === 'select' && (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Options (one per line)
                          </label>
                          <textarea
                            value={(variable.options || []).join('\n')}
                            onChange={(e) => updateVariable(index, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                            rows={3}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-gray-900">Template Preview</h4>
              
              {formData.variables.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Preview Variables:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.variables.map((variable) => (
                      <div key={variable.name}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {variable.label}
                        </label>
                        {variable.type === 'select' ? (
                          <select
                            value={previewVariables[variable.name] || ''}
                            onChange={(e) => setPreviewVariables(prev => ({
                              ...prev,
                              [variable.name]: e.target.value
                            }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select...</option>
                            {(variable.options || []).map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : variable.type === 'boolean' ? (
                          <select
                            value={previewVariables[variable.name] || 'false'}
                            onChange={(e) => setPreviewVariables(prev => ({
                              ...prev,
                              [variable.name]: e.target.value
                            }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        ) : (
                          <input
                            type={variable.type === 'number' ? 'number' : variable.type === 'date' ? 'date' : 'text'}
                            value={previewVariables[variable.name] || ''}
                            onChange={(e) => setPreviewVariables(prev => ({
                              ...prev,
                              [variable.name]: e.target.value
                            }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br>') }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};