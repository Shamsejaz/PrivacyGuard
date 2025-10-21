import React, { useState, useEffect } from 'react';
import { Upload, Download, Plus, Play, Pause, Trash2, FileText, AlertCircle } from 'lucide-react';
import { externalSystemService, type ImportJob, type ExportJob } from '../../services/externalSystemService';

export const DataImportExportManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const [importData, exportData] = await Promise.all([
        externalSystemService.getImportJobs(),
        externalSystemService.getExportJobs()
      ]);
      setImportJobs(importData);
      setExportJobs(exportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImportJob = async (jobId: string) => {
    try {
      await externalSystemService.executeImportJob(jobId);
      loadJobs(); // Refresh to get updated status
    } catch (err) {
      console.error('Failed to execute import job:', err);
    }
  };

  const handleExecuteExportJob = async (jobId: string) => {
    try {
      await externalSystemService.executeExportJob(jobId);
      loadJobs(); // Refresh to get updated status
    } catch (err) {
      console.error('Failed to execute export job:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Import/Export</h2>
          <p className="text-gray-600">Manage data import and export jobs</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Jobs ({importJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Jobs ({exportJobs.length})
          </button>
        </nav>
      </div>

      {/* Import Jobs */}
      {activeTab === 'import' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {importJobs.length === 0 ? (
              <li className="px-6 py-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No import jobs</h3>
                <p className="mt-1 text-sm text-gray-500">Create your first import job to get started.</p>
              </li>
            ) : (
              importJobs.map((job) => (
                <li key={job.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Source: {job.sourceType}</span>
                            <span>Target: {job.targetTable}</span>
                            <span>Records: {job.recordsProcessed}</span>
                          </div>
                          {job.progress > 0 && (
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          {job.status === 'pending' && (
                            <button
                              onClick={() => handleExecuteImportJob(job.id)}
                              className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Export Jobs */}
      {activeTab === 'export' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {exportJobs.length === 0 ? (
              <li className="px-6 py-8 text-center">
                <Download className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No export jobs</h3>
                <p className="mt-1 text-sm text-gray-500">Create your first export job to get started.</p>
              </li>
            ) : (
              exportJobs.map((job) => (
                <li key={job.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Download className="h-8 w-8 text-gray-400" />
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Source: {job.sourceTable}</span>
                            <span>Format: {job.format}</span>
                            <span>Records: {job.recordsProcessed}</span>
                          </div>
                          {job.progress > 0 && (
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          {job.status === 'pending' && (
                            <button
                              onClick={() => handleExecuteExportJob(job.id)}
                              className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};