import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Wand2, 
  Download, 
  Save, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Loader,
  ArrowRight
} from 'lucide-react';
import { 
  DocumentTemplate, 
  Document, 
  TemplateVariable 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentGeneratorProps {
  template: DocumentTemplate;
  onDocumentGenerated?: (document: Document) => void;
  onCancel?: () => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  template,
  onDocumentGenerated,
  onCancel
}) => {
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'variables' | 'preview' | 'save'>('variables');

  useEffect(() => {
    // Initialize variable values with defaults
    const initialValues: Record<string, any> = {};
    template.variables.forEach(variable => {
      initialValues[variable.name] = variable.defaultValue || '';
    });
    setVariableValues(initialValues);
    
    // Set default document title
    setDocumentTitle(`${template.name} - ${new Date().toLocaleDateString()}`);
  }, [template]);

  useEffect(() => {
    if (currentStep === 'preview') {
      generateDocument();
    }
  }, [currentStep, variableValues]);

  const validateVariables = (): boolean => {
    const errors: Record<string, string> = {};
    
    template.variables.forEach(variable => {
      const value = variableValues[variable.name];
      
      // Check required fields
      if (variable.required && (!value || value.toString().trim() === '')) {
        errors[variable.name] = `${variable.label} is required`;
        return;
      }
      
      // Check validation rules
      if (variable.validation && value) {
        variable.validation.forEach(rule => {
          switch (rule.type) {
            case 'minLength':
              if (value.toString().length < (rule.value || 0)) {
                errors[variable.name] = rule.message;
              }
              break;
            case 'maxLength':
              if (value.toString().length > (rule.value || 0)) {
                errors[variable.name] = rule.message;
              }
              break;
            case 'pattern':
              if (rule.value && !new RegExp(rule.value).test(value.toString())) {
                errors[variable.name] = rule.message;
              }
              break;
          }
        });
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateDocument = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      let content = template.content;
      
      // Replace template variables with actual values
      Object.entries(variableValues).forEach(([name, value]) => {
        const regex = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
        content = content.replace(regex, value || `[${name}]`);
      });
      
      setGeneratedContent(content);
    } catch (err) {
      setError('Failed to generate document');
      console.error('Error generating document:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleVariableChange = (variableName: string, value: any) => {
    setVariableValues(prev => ({
      ...prev,
      [variableName]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[variableName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[variableName];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    if (currentStep === 'variables') {
      if (validateVariables()) {
        setCurrentStep('preview');
      }
    } else if (currentStep === 'preview') {
      setCurrentStep('save');
    }
  };

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('variables');
    } else if (currentStep === 'save') {
      setCurrentStep('preview');
    }
  };

  const handleSaveDocument = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!documentTitle.trim()) {
        throw new Error('Document title is required');
      }
      
      const documentData = {
        title: documentTitle,
        content: generatedContent,
        type: 'other' as const,
        category: template.category,
        status: 'draft' as const,
        templateId: template.id,
        metadata: {
          author: 'current-user', // This would come from auth context
          subject: documentTitle,
          keywords: [],
          language: 'en',
          classification: 'internal' as const,
          complianceFrameworks: [],
          relatedDocuments: [],
          customFields: {
            generatedFrom: template.id,
            generatedAt: new Date().toISOString(),
            templateVariables: variableValues
          }
        },
        tags: [template.category, 'generated'],
        permissions: [],
        createdBy: 'current-user',
        lastModifiedBy: 'current-user'
      };
      
      const savedDocument = await documentManagementService.createDocument(documentData);
      
      setSuccess('Document created successfully');
      onDocumentGenerated?.(savedDocument);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = variableValues[variable.name];
    const hasError = validationErrors[variable.name];
    
    const baseClasses = `w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
      hasError ? 'border-red-300' : 'border-gray-300'
    }`;
    
    switch (variable.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className={baseClasses}
          >
            <option value="">Select an option...</option>
            {(variable.options || []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'boolean':
        return (
          <select
            value={value || 'false'}
            onChange={(e) => handleVariableChange(variable.name, e.target.value === 'true')}
            className={baseClasses}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className={baseClasses}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className={baseClasses}
          />
        );
        
      default:
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            rows={variable.name.toLowerCase().includes('description') || variable.name.toLowerCase().includes('content') ? 4 : 1}
            className={baseClasses}
            placeholder={variable.description || `Enter ${variable.label.toLowerCase()}`}
          />
        );
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Generate Document</h2>
          <p className="text-sm text-gray-600 mt-1">
            Using template: <span className="font-medium">{template.name}</span>
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          {[
            { id: 'variables', label: 'Fill Variables', icon: FileText },
            { id: 'preview', label: 'Preview', icon: Eye },
            { id: 'save', label: 'Save Document', icon: Save }
          ].map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep === step.id 
                    ? 'bg-blue-600 text-white' 
                    : index < ['variables', 'preview', 'save'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {index < ['variables', 'preview', 'save'].indexOf(currentStep) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < 2 && (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Variables Step */}
        {currentStep === 'variables' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Fill Template Variables</h3>
            
            {template.variables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>This template has no variables to fill.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {template.variables.map((variable) => (
                  <div key={variable.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {variable.label}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {variable.description && (
                      <p className="text-xs text-gray-500 mb-2">{variable.description}</p>
                    )}
                    
                    {renderVariableInput(variable)}
                    
                    {validationErrors[variable.name] && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors[variable.name]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Step */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
            
            {generating ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin h-8 w-8 text-blue-600" />
                <span className="ml-2 text-gray-600">Generating document...</span>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 max-h-96 overflow-y-auto">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: generatedContent.replace(/\n/g, '<br>') 
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Step */}
        {currentStep === 'save' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Save Document</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Title *
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter document title"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Document Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Template:</span> {template.name}</p>
                <p><span className="font-medium">Category:</span> {template.category}</p>
                <p><span className="font-medium">Variables filled:</span> {template.variables.length}</p>
                <p><span className="font-medium">Content length:</span> {generatedContent.length} characters</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={currentStep === 'variables'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex space-x-3">
            {currentStep === 'save' ? (
              <button
                onClick={handleSaveDocument}
                disabled={saving || !documentTitle.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Document'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentStep === 'variables' && Object.keys(validationErrors).length > 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {currentStep === 'variables' ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Preview
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};