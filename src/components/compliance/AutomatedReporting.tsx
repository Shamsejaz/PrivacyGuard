import React, { useState } from 'react';
import { Calendar, Clock, FileText, Download, Settings, Play, Pause, Edit, Trash2, Plus } from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface ReportTemplate {
  id: string;
  name: string;
  framework: ComplianceFramework;
  type: 'regulatory' | 'internal' | 'audit' | 'executive';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  format: 'pdf' | 'excel' | 'word' | 'html';
  sections: string[];
  recipients: string[];
  isActive: boolean;
  lastGenerated?: Date;
  nextScheduled: Date;
  createdBy: string;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  templateName: string;
  framework: ComplianceFramework;
  scheduledDate: Date;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generatedDate?: Date;
  fileSize?: string;
  downloadUrl?: string;
}

const AutomatedReporting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'scheduled' | 'history'>('templates');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    framework: 'GDPR' as ComplianceFramework,
    type: 'regulatory' as ReportTemplate['type'],
    frequency: 'monthly' as ReportTemplate['frequency'],
    format: 'pdf' as ReportTemplate['format'],
    recipients: [''],
    sections: ['compliance_status', 'risk_assessment', 'gap_analysis']
  });

  const reportTemplates: ReportTemplate[] = [
    {
      id: '1',
      name: 'GDPR Quarterly Compliance Report',
      framework: 'GDPR',
      type: 'regulatory',
      frequency: 'quarterly',
      format: 'pdf',
      sections: ['Executive Summary', 'Compliance Status', 'Risk Assessment', 'Action Items'],
      recipients: ['dpo@company.com', 'legal@company.com'],
      isActive: true,
      lastGenerated: new Date('2024-01-15'),
      nextScheduled: new Date('2024-04-15'),
      createdBy: 'Sarah Johnson'
    },
    {
      id: '2',
      name: 'HIPAA Security Assessment',
      framework: 'HIPAA',
      type: 'audit',
      frequency: 'annually',
      format: 'excel',
      sections: ['Security Controls', 'Risk Analysis', 'Breach Incidents', 'Recommendations'],
      recipients: ['security@company.com', 'compliance@company.com'],
      isActive: true,
      lastGenerated: new Date('2024-01-01'),
      nextScheduled: new Date('2025-01-01'),
      createdBy: 'Security Team'
    },
    {
      id: '3',
      name: 'PDPL Monthly Status',
      framework: 'PDPL',
      type: 'internal',
      frequency: 'monthly',
      format: 'html',
      sections: ['Consent Management', 'Data Processing', 'Cross-border Transfers'],
      recipients: ['privacy@company.com'],
      isActive: false,
      lastGenerated: new Date('2023-12-30'),
      nextScheduled: new Date('2024-02-01'),
      createdBy: 'Privacy Team'
    }
  ];

  const scheduledReports: ScheduledReport[] = [
    {
      id: '1',
      templateId: '1',
      templateName: 'GDPR Quarterly Compliance Report',
      framework: 'GDPR',
      scheduledDate: new Date('2024-02-15'),
      status: 'pending'
    },
    {
      id: '2',
      templateId: '2',
      templateName: 'HIPAA Security Assessment',
      framework: 'HIPAA',
      scheduledDate: new Date('2024-02-20'),
      status: 'generating'
    },
    {
      id: '3',
      templateId: '1',
      templateName: 'GDPR Quarterly Compliance Report',
      framework: 'GDPR',
      scheduledDate: new Date('2024-01-15'),
      status: 'completed',
      generatedDate: new Date('2024-01-15'),
      fileSize: '2.4 MB',
      downloadUrl: '/reports/gdpr-q4-2023.pdf'
    }
  ];

  const getStatusColor = (status: ScheduledReport['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: ReportTemplate['type']) => {
    switch (type) {
      case 'regulatory':
        return 'bg-red-100 text-red-800';
      case 'audit':
        return 'bg-purple-100 text-purple-800';
      case 'internal':
        return 'bg-blue-100 text-blue-800';
      case 'executive':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle template creation
    console.log('Creating template:', templateForm);
    setShowCreateTemplate(false);
    setTemplateForm({
      name: '',
      framework: 'GDPR',
      type: 'regulatory',
      frequency: 'monthly',
      format: 'pdf',
      recipients: [''],
      sections: ['compliance_status', 'risk_assessment', 'gap_analysis']
    });
  };

  const addRecipient = () => {
    setTemplateForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const updateRecipient = (index: number, value: string) => {
    setTemplateForm(prev => ({
      ...prev,
      recipients: prev.recipients.map((recipient, i) => i === index ? value : recipient)
    }));
  };

  const removeRecipient = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automated Reporting</h2>
          <p className="text-gray-600 mt-1">Manage report templates and automated generation schedules</p>
        </div>
        <button
          onClick={() => setShowCreateTemplate(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'templates', label: 'Report Templates', count: reportTemplates.length },
            { id: 'scheduled', label: 'Scheduled Reports', count: scheduledReports.filter(r => r.status === 'pending').length },
            { id: 'history', label: 'Report History', count: scheduledReports.filter(r => r.status === 'completed').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Report Template</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter template name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
                    <select
                      value={templateForm.framework}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, framework: e.target.value as ComplianceFramework }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GDPR">GDPR</option>
                      <option value="PDPL">PDPL</option>
                      <option value="HIPAA">HIPAA</option>
                      <option value="CCPA">CCPA</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, type: e.target.value as ReportTemplate['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="regulatory">Regulatory</option>
                      <option value="audit">Audit</option>
                      <option value="internal">Internal</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={templateForm.frequency}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, frequency: e.target.value as ReportTemplate['frequency'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={templateForm.format}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, format: e.target.value as ReportTemplate['format'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="word">Word</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                  {templateForm.recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="email"
                        value={recipient}
                        onChange={(e) => updateRecipient(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                      {templateForm.recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecipient(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRecipient}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Recipient
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateTemplate(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Report Templates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {reportTemplates.map((template) => (
              <div key={template.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                      <span className="text-sm text-blue-600">{template.framework}</span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getTypeColor(template.type)
                      )}>
                        {template.type}
                      </span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Every {template.frequency}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{template.format.toUpperCase()} format</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Next: {template.nextScheduled.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <span>Recipients: {template.recipients.join(', ')}</span>
                    </div>
                    
                    {template.lastGenerated && (
                      <div className="text-xs text-gray-500 mt-2">
                        Last generated: {template.lastGenerated.toLocaleDateString()} by {template.createdBy}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Generate Now"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit Template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-yellow-600"
                      title={template.isActive ? 'Pause' : 'Resume'}
                    >
                      {template.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {scheduledReports.filter(report => report.status !== 'completed').map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{report.templateName}</h4>
                        <span className="text-sm text-blue-600">{report.framework}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Scheduled: {report.scheduledDate.toLocaleDateString()} at {report.scheduledDate.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(report.status)
                  )}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Report History</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {scheduledReports.filter(report => report.status === 'completed').map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{report.templateName}</h4>
                        <span className="text-sm text-blue-600">{report.framework}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Generated: {report.generatedDate?.toLocaleDateString()}</span>
                        <span>Size: {report.fileSize}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(report.status)
                    )}>
                      {report.status}
                    </span>
                    <button className="p-2 text-gray-400 hover:text-blue-600">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedReporting;