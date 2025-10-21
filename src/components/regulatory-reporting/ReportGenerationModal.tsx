import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Settings, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  ReportTemplate,
  ReportGenerationRequest,
  ReportParameters,
  ReportFormat,
  ComplianceFramework,
  RegulatoryReportType
} from '../../types/regulatory-reporting';
import { regulatoryReportingService } from '../../services/regulatoryReportingService';
import { useAuditLogger } from '../../hooks/useAuditLogger';

interface ReportGenerationModalProps {
  templates: ReportTemplate[];
  onClose: () => void;
  onReportGenerated: () => void;
}

const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  templates,
  onClose,
  onReportGenerated
}) => {
  const [step, setStep] = useState<'template' | 'parameters' | 'generating' | 'completed'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [parameters, setParameters] = useState<ReportParameters>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date()
    },
    filters: {},
    customFields: {},
    includeCharts: true,
    includeRawData: false,
    format: ReportFormat.PDF,
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [generationStatus, setGenerationStatus] = useState<{
    progress: number;
    currentStep: string;
    reportId?: string;
    statusId?: string;
  }>({ progress: 0, currentStep: '' });
  const [error, setError] = useState<string | null>(null);

  const { logButtonClick, logFormSubmit } = useAuditLogger({
    component: 'ReportGenerationModal'
  });

  useEffect(() => {
    if (selectedTemplate) {
      // Set default parameters based on template type
      const defaultParams = regulatoryReportingService.getDefaultParameters(selectedTemplate.type);
      setParameters(prev => ({ ...prev, ...defaultParams }));
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    logButtonClick('select_report_template', { templateId: template.id, templateType: template.type });
  };

  const handleParameterChange = (key: keyof ReportParameters, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldId]: value }
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    try {
      setStep('generating');
      setError(null);

      const request: ReportGenerationRequest = {
        templateId: selectedTemplate.id,
        parameters,
        priority: 'normal',
        notifyOnCompletion: true
      };

      const { reportId, statusId } = await regulatoryReportingService.generateReport(request);
      
      setGenerationStatus(prev => ({ ...prev, reportId, statusId }));

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const status = await regulatoryReportingService.getGenerationStatus(statusId);
          
          setGenerationStatus(prev => ({
            ...prev,
            progress: status.progress,
            currentStep: status.currentStep
          }));

          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setStep('completed');
            await logFormSubmit('report_generation', true);
            onReportGenerated();
          } else if (status.status === 'FAILED') {
            clearInterval(pollInterval);
            setError(status.error || 'Report generation failed');
            await logFormSubmit('report_generation', false, [status.error || 'Unknown error']);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError('Failed to check generation status');
        }
      }, 2000);

      // Cleanup interval after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      await logFormSubmit('report_generation', false, [err instanceof Error ? err.message : 'Unknown error']);
    }
  };

  const handleDownloadReport = async () => {
    if (!generationStatus.reportId) return;

    try {
      const blob = await regulatoryReportingService.downloadReport(generationStatus.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate?.name || 'report'}.${parameters.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logButtonClick('download_generated_report', { 
        reportId: generationStatus.reportId,
        format: parameters.format
      });
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const renderTemplateSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select Report Template</h3>
      
      {/* Framework Filter */}
      <div className="flex space-x-2 mb-4">
        {Object.values(ComplianceFramework).map(framework => {
          const frameworkTemplates = templates.filter(t => t.framework === framework);
          if (frameworkTemplates.length === 0) return null;
          
          return (
            <button
              key={framework}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {framework} ({frameworkTemplates.length})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {templates.map(template => (
          <Card
            key={template.id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{template.framework}</span>
                  <span>v{template.version}</span>
                  <span>{template.sections.length} sections</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderParameterConfiguration = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Configure Report Parameters</h3>
      
      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={parameters.dateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => handleParameterChange('dateRange', {
                ...parameters.dateRange,
                startDate: new Date(e.target.value)
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={parameters.dateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => handleParameterChange('dateRange', {
                ...parameters.dateRange,
                endDate: new Date(e.target.value)
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Format and Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <select
            value={parameters.format}
            onChange={(e) => handleParameterChange('format', e.target.value as ReportFormat)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={ReportFormat.PDF}>PDF</option>
            <option value={ReportFormat.HTML}>HTML</option>
            <option value={ReportFormat.DOCX}>Word Document</option>
            <option value={ReportFormat.XLSX}>Excel</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={parameters.language}
            onChange={(e) => handleParameterChange('language', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
      </div>

      {/* Include Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Include Options</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={parameters.includeCharts}
              onChange={(e) => handleParameterChange('includeCharts', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Include charts and visualizations</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={parameters.includeRawData}
              onChange={(e) => handleParameterChange('includeRawData', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Include raw data tables</span>
          </label>
        </div>
      </div>

      {/* Custom Fields */}
      {selectedTemplate && selectedTemplate.customFields.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
          <div className="space-y-3">
            {selectedTemplate.customFields.map(field => (
              <div key={field.id}>
                <label className="block text-xs text-gray-500 mb-1">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={parameters.customFields[field.id] || field.defaultValue || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required={field.required}
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={parameters.customFields[field.id] || field.defaultValue || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                {field.type === 'boolean' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={parameters.customFields[field.id] || field.defaultValue || false}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yes</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderGenerationProgress = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
        <Settings className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Generating Report</h3>
        <p className="text-gray-500 mt-1">{generationStatus.currentStep}</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${generationStatus.progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-500">{generationStatus.progress}% complete</p>
    </div>
  );

  const renderCompleted = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <FileText className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Report Generated Successfully</h3>
        <p className="text-gray-500 mt-1">Your {selectedTemplate?.name} report is ready for download.</p>
      </div>
      <div className="flex justify-center space-x-3">
        <Button onClick={handleDownloadReport} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Download Report</span>
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Generate Regulatory Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {step === 'template' && renderTemplateSelection()}
          {step === 'parameters' && renderParameterConfiguration()}
          {step === 'generating' && renderGenerationProgress()}
          {step === 'completed' && renderCompleted()}
        </div>

        {/* Footer */}
        {(step === 'template' || step === 'parameters') && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex space-x-2">
              <div className={`w-2 h-2 rounded-full ${step === 'template' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${step === 'parameters' ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
            <div className="flex space-x-3">
              {step === 'parameters' && (
                <Button
                  variant="outline"
                  onClick={() => setStep('template')}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (step === 'template' && selectedTemplate) {
                    setStep('parameters');
                  } else if (step === 'parameters') {
                    handleGenerateReport();
                  }
                }}
                disabled={step === 'template' && !selectedTemplate}
              >
                {step === 'template' ? 'Next' : 'Generate Report'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerationModal;