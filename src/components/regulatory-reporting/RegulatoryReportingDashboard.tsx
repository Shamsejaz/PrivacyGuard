import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Download, 
  Plus, 
  Filter, 
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  RegulatoryReport, 
  ReportTemplate, 
  ReportSchedule,
  ReportAnalytics,
  ComplianceFramework,
  RegulatoryReportType,
  ReportStatus
} from '../../types/regulatory-reporting';
import { regulatoryReportingService } from '../../services/regulatoryReportingService';
import { useAuditLogger } from '../../hooks/useAuditLogger';
import ReportGenerationModal from './ReportGenerationModal';
import ReportTemplateManager from './ReportTemplateManager';
import ReportScheduleManager from './ReportScheduleManager';

const RegulatoryReportingDashboard: React.FC = () => {
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'templates' | 'schedules' | 'analytics'>('reports');
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [filters, setFilters] = useState({
    framework: '' as ComplianceFramework | '',
    type: '' as RegulatoryReportType | '',
    status: '' as ReportStatus | '',
    searchTerm: ''
  });

  const { logPageView, logButtonClick, logDataDownload } = useAuditLogger({
    component: 'RegulatoryReportingDashboard'
  });

  useEffect(() => {
    loadData();
    logPageView('regulatory_reporting_dashboard');
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportsData, templatesData, schedulesData, analyticsData] = await Promise.all([
        regulatoryReportingService.getReports(),
        regulatoryReportingService.getTemplates(),
        regulatoryReportingService.getSchedules(),
        regulatoryReportingService.getAnalytics()
      ]);

      setReports(reportsData.reports);
      setTemplates(templatesData);
      setSchedules(schedulesData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (report: RegulatoryReport) => {
    try {
      await logButtonClick('download_report', { reportId: report.id, reportType: report.type });
      
      const blob = await regulatoryReportingService.downloadReport(report.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${report.parameters.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDataDownload('regulatory_report', a.download, report.parameters.format, 1);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case ReportStatus.GENERATING:
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case ReportStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case ReportStatus.SCHEDULED:
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ReportStatus.GENERATING:
        return 'bg-blue-100 text-blue-800';
      case ReportStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case ReportStatus.SCHEDULED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReports = reports.filter(report => {
    if (filters.framework && report.framework !== filters.framework) return false;
    if (filters.type && report.type !== filters.type) return false;
    if (filters.status && report.status !== filters.status) return false;
    if (filters.searchTerm && !report.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regulatory Reporting</h1>
          <p className="text-gray-600">Generate and manage compliance reports</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              setShowGenerationModal(true);
              logButtonClick('open_report_generation_modal');
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Report</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowTemplateManager(true);
              logButtonClick('open_template_manager');
            }}
          >
            Manage Templates
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowScheduleManager(true);
              logButtonClick('open_schedule_manager');
            }}
          >
            Manage Schedules
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalReports}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled Reports</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.scheduledReports}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Generation Time</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.averageGenerationTime / 1000)}s</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round((1 - analytics.failureRate) * 100)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'reports', label: 'Reports', count: reports.length },
            { key: 'templates', label: 'Templates', count: templates.length },
            { key: 'schedules', label: 'Schedules', count: schedules.length },
            { key: 'analytics', label: 'Analytics' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
                <select
                  value={filters.framework}
                  onChange={(e) => setFilters(prev => ({ ...prev, framework: e.target.value as ComplianceFramework }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Frameworks</option>
                  <option value={ComplianceFramework.GDPR}>GDPR</option>
                  <option value={ComplianceFramework.CCPA}>CCPA</option>
                  <option value={ComplianceFramework.HIPAA}>HIPAA</option>
                  <option value={ComplianceFramework.PDPL}>PDPL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ReportStatus }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value={ReportStatus.COMPLETED}>Completed</option>
                  <option value={ReportStatus.GENERATING}>Generating</option>
                  <option value={ReportStatus.SCHEDULED}>Scheduled</option>
                  <option value={ReportStatus.FAILED}>Failed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">{report.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">{report.status}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span>Framework: {report.framework}</span>
                      <span>Type: {report.type.replace(/_/g, ' ')}</span>
                      <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                      {report.generatedAt && (
                        <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {report.status === ReportStatus.COMPLETED && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report)}
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            
            {filteredReports.length === 0 && (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500 mb-4">
                  {reports.length === 0 
                    ? "You haven't generated any reports yet."
                    : "No reports match your current filters."
                  }
                </p>
                <Button onClick={() => setShowGenerationModal(true)}>
                  Generate Your First Report
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <ReportTemplateManager 
          templates={templates}
          onTemplatesChange={setTemplates}
        />
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <ReportScheduleManager 
          schedules={schedules}
          templates={templates}
          onSchedulesChange={setSchedules}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Framework Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reports by Framework</h3>
            <div className="space-y-3">
              {Object.entries(analytics.reportsByFramework).map(([framework, count]) => (
                <div key={framework} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{framework}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / analytics.totalReports) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Most Used Templates */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Used Templates</h3>
            <div className="space-y-3">
              {analytics.mostUsedTemplates.map((template, index) => (
                <div key={template.templateId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-gray-900">{template.templateName}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{template.usageCount} uses</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      {showGenerationModal && (
        <ReportGenerationModal
          templates={templates}
          onClose={() => setShowGenerationModal(false)}
          onReportGenerated={loadData}
        />
      )}

      {showTemplateManager && (
        <ReportTemplateManager
          templates={templates}
          onTemplatesChange={setTemplates}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {showScheduleManager && (
        <ReportScheduleManager
          schedules={schedules}
          templates={templates}
          onSchedulesChange={setSchedules}
          onClose={() => setShowScheduleManager(false)}
        />
      )}
    </div>
  );
};

export default RegulatoryReportingDashboard;