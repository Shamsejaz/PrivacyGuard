import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Globe, 
  Upload, 
  Download, 
  Settings, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Plus,
  RefreshCw
} from 'lucide-react';
import { externalSystemService, type DatabaseConnection, type ApiConnection, type ImportJob, type ExportJob, type ConnectionHealth } from '../../services/externalSystemService';
import { DatabaseConnectionManager } from './DatabaseConnectionManager';
import { ApiConnectionManager } from './ApiConnectionManager';
import { DataImportExportManager } from './DataImportExportManager';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { ConfigurationManager } from './ConfigurationManager';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

export const ExternalSystemsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportJobs, setExportJob] = useState<ExportJob[]>([]);
  const [systemHealth, setSystemHealth] = useState<ConnectionHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      component: () => <OverviewTab />
    },
    {
      id: 'database',
      label: 'Database Connections',
      icon: Database,
      component: () => <DatabaseConnectionManager />
    },
    {
      id: 'api',
      label: 'API Connections',
      icon: Globe,
      component: () => <ApiConnectionManager />
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      icon: Upload,
      component: () => <DataImportExportManager />
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Activity,
      component: () => <SystemHealthMonitor />
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: Settings,
      component: () => <ConfigurationManager />
    }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dbConnectionsData,
        apiConnectionsData,
        importJobsData,
        exportJobsData,
        healthData
      ] = await Promise.all([
        externalSystemService.getDatabaseConnections(),
        externalSystemService.getApiConnections(),
        externalSystemService.getImportJobs(),
        externalSystemService.getExportJobs(),
        externalSystemService.getSystemHealth()
      ]);

      setDbConnections(dbConnectionsData);
      setApiConnections(apiConnectionsData);
      setImportJobs(importJobsData);
      setExportJob(exportJobsData);
      setSystemHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Database Connections</p>
              <p className="text-2xl font-semibold text-gray-900">{dbConnections.length}</p>
              <p className="text-sm text-gray-500">
                {dbConnections.filter(c => c.status === 'connected').length} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">API Connections</p>
              <p className="text-2xl font-semibold text-gray-900">{apiConnections.length}</p>
              <p className="text-sm text-gray-500">
                {apiConnections.filter(c => c.status === 'active').length} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Import Jobs</p>
              <p className="text-2xl font-semibold text-gray-900">{importJobs.length}</p>
              <p className="text-sm text-gray-500">
                {importJobs.filter(j => j.status === 'running').length} running
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Download className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Export Jobs</p>
              <p className="text-2xl font-semibold text-gray-900">{exportJobs.length}</p>
              <p className="text-sm text-gray-500">
                {exportJobs.filter(j => j.status === 'running').length} running
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* Recent Import Jobs */}
            {importJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-400' :
                  job.status === 'running' ? 'bg-blue-400' :
                  job.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Import: {job.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.recordsProcessed} records processed
                  </p>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}

            {/* Recent Export Jobs */}
            {exportJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-400' :
                  job.status === 'running' ? 'bg-blue-400' :
                  job.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Export: {job.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.recordsProcessed} records processed
                  </p>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Database Connections</h4>
                <div className="space-y-2">
                  {Object.entries(systemHealth.database).map(([id, healthy]) => (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{id}</span>
                      <div className="flex items-center">
                        {healthy ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">API Connections</h4>
                <div className="space-y-2">
                  {Object.entries(systemHealth.api).map(([id, healthy]) => (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{id}</span>
                      <div className="flex items-center">
                        {healthy ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;

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
          <h1 className="text-2xl font-bold text-gray-900">External Systems</h1>
          <p className="text-gray-600">Manage database connections, API integrations, and data synchronization</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <ActiveTabComponent />
      </div>
    </div>
  );
};