import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  Square,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  Database,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';
import { DataSyncConfig, SyncMetrics } from '../../types/api-integration';

interface SyncJob extends DataSyncConfig {
  jobStatus?: {
    id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    metrics: SyncMetrics;
    errors?: string[];
    conflicts?: Array<{
      id: string;
      sourceData: any;
      targetData: any;
      resolution?: string;
    }>;
    startTime: Date;
    endTime?: Date;
  };
}

interface DataSynchronizationManagerProps {
  integrationId?: string;
}

export const DataSynchronizationManager: React.FC<DataSynchronizationManagerProps> = ({
  integrationId
}) => {
  const [syncConfigs, setSyncConfigs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSync, setSelectedSync] = useState<SyncJob | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSyncConfigs();
    const interval = setInterval(updateJobStatuses, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSyncConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const configs = await apiIntegrationService.getSyncConfigs();
      setSyncConfigs(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync configurations');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatuses = async () => {
    if (runningJobs.size === 0) return;

    try {
      const updatedConfigs = await Promise.all(
        syncConfigs.map(async (config) => {
          if (runningJobs.has(config.id) && config.jobStatus) {
            try {
              const jobStatus = await apiIntegrationService.getSyncJobStatus(config.jobStatus.id);
              return { ...config, jobStatus };
            } catch {
              return config;
            }
          }
          return config;
        })
      );

      setSyncConfigs(updatedConfigs);

      // Remove completed jobs from running set
      const completedJobs = updatedConfigs
        .filter(config => 
          config.jobStatus && 
          ['completed', 'failed', 'cancelled'].includes(config.jobStatus.status)
        )
        .map(config => config.id);

      if (completedJobs.length > 0) {
        setRunningJobs(prev => {
          const newSet = new Set(prev);
          completedJobs.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
    } catch (err) {
      console.error('Failed to update job statuses:', err);
    }
  };

  const handleCreateSync = async (syncData: Omit<DataSyncConfig, 'id' | 'lastSync' | 'nextSync' | 'metrics'>) => {
    try {
      await apiIntegrationService.createSyncConfig(syncData);
      await loadSyncConfigs();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sync configuration');
    }
  };

  const handleUpdateSync = async (id: string, updates: Partial<DataSyncConfig>) => {
    try {
      await apiIntegrationService.updateSyncConfig(id, updates);
      await loadSyncConfigs();
      setShowEditModal(false);
      setSelectedSync(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sync configuration');
    }
  };

  const handleDeleteSync = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sync configuration?')) return;

    try {
      await apiIntegrationService.deleteSyncConfig(id);
      await loadSyncConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sync configuration');
    }
  };

  const handleExecuteSync = async (syncConfig: SyncJob, dryRun: boolean = false) => {
    try {
      const result = await apiIntegrationService.executeSyncJob(syncConfig.id, { dryRun });
      
      // Update the sync config with job status
      const updatedConfigs = syncConfigs.map(config => 
        config.id === syncConfig.id 
          ? { 
              ...config, 
              jobStatus: {
                id: result.jobId,
                status: 'running' as const,
                progress: 0,
                metrics: {
                  totalRecords: 0,
                  successfulRecords: 0,
                  failedRecords: 0,
                  conflictedRecords: 0,
                  lastSyncDuration: 0,
                  averageSyncDuration: 0,
                  errorRate: 0
                },
                startTime: new Date()
              }
            }
          : config
      );
      
      setSyncConfigs(updatedConfigs);
      setRunningJobs(prev => new Set(prev).add(syncConfig.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute sync job');
    }
  };

  const handleResolveConflicts = async (jobId: string, resolutions: Array<{
    conflictId: string;
    resolution: 'source' | 'target' | 'merge' | 'skip';
    mergedData?: any;
  }>) => {
    try {
      await apiIntegrationService.resolveSyncConflicts(jobId, resolutions);
      await updateJobStatuses();
      setShowConflictsModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflicts');
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Synchronization</h2>
          <p className="text-gray-600">Configure and manage bidirectional data synchronization</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadSyncConfigs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sync
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Configurations */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {syncConfigs.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sync configurations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new data synchronization.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Sync
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {syncConfigs.map((sync) => (
              <SyncConfigItem
                key={sync.id}
                sync={sync}
                onExecute={handleExecuteSync}
                onEdit={(sync) => {
                  setSelectedSync(sync);
                  setShowEditModal(true);
                }}
                onDelete={handleDeleteSync}
                onViewConflicts={(sync) => {
                  setSelectedSync(sync);
                  setShowConflictsModal(true);
                }}
                onToggleStatus={(sync) => {
                  const newStatus = sync.status === 'active' ? 'inactive' : 'active';
                  handleUpdateSync(sync.id, { status: newStatus });
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Create Sync Modal */}
      {showCreateModal && (
        <SyncConfigModal
          onSave={handleCreateSync}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Sync Modal */}
      {showEditModal && selectedSync && (
        <SyncConfigModal
          sync={selectedSync}
          onSave={(data) => handleUpdateSync(selectedSync.id, data)}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedSync(null);
          }}
        />
      )}

      {/* Conflicts Modal */}
      {showConflictsModal && selectedSync?.jobStatus?.conflicts && (
        <ConflictsResolutionModal
          conflicts={selectedSync.jobStatus.conflicts}
          onResolve={(resolutions) => handleResolveConflicts(selectedSync.jobStatus!.id, resolutions)}
          onCancel={() => {
            setShowConflictsModal(false);
            setSelectedSync(null);
          }}
        />
      )}
    </div>
  );
};

interface SyncConfigItemProps {
  sync: SyncJob;
  onExecute: (sync: SyncJob, dryRun?: boolean) => void;
  onEdit: (sync: SyncJob) => void;
  onDelete: (id: string) => void;
  onViewConflicts: (sync: SyncJob) => void;
  onToggleStatus: (sync: SyncJob) => void;
}

const SyncConfigItem: React.FC<SyncConfigItemProps> = ({
  sync,
  onExecute,
  onEdit,
  onDelete,
  onViewConflicts,
  onToggleStatus
}) => {
  const isRunning = sync.jobStatus?.status === 'running';
  const hasConflicts = sync.jobStatus?.conflicts && sync.jobStatus.conflicts.length > 0;

  return (
    <li className="px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
              sync.status === 'active' ? 'bg-green-400' :
              sync.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
            }`} />
            <div className="ml-4">
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-900">{sync.name}</p>
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  sync.status === 'active' ? 'bg-green-100 text-green-800' :
                  sync.status === 'error' ? 'bg-red-100 text-red-800' :
                  sync.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {sync.status}
                </span>
                {sync.syncType && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {sync.syncType}
                  </span>
                )}
              </div>
              
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <Database className="h-4 w-4 mr-1" />
                <span>{sync.sourceIntegration}</span>
                <ArrowRight className="h-4 w-4 mx-2" />
                <span>{sync.targetIntegration}</span>
              </div>

              {sync.lastSync && (
                <p className="text-xs text-gray-500 mt-1">
                  Last sync: {new Date(sync.lastSync).toLocaleString()}
                </p>
              )}

              {sync.nextSync && sync.status === 'active' && (
                <p className="text-xs text-gray-500">
                  Next sync: {new Date(sync.nextSync).toLocaleString()}
                </p>
              )}

              {/* Job Status */}
              {sync.jobStatus && (
                <div className="mt-2">
                  <div className="flex items-center space-x-4 text-xs">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                      sync.jobStatus.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      sync.jobStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sync.jobStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sync.jobStatus.status}
                    </span>
                    
                    {isRunning && (
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${sync.jobStatus.progress}%` }}
                          />
                        </div>
                        <span>{sync.jobStatus.progress}%</span>
                      </div>
                    )}

                    {sync.jobStatus.metrics && (
                      <div className="flex space-x-3 text-gray-600">
                        <span>Total: {sync.jobStatus.metrics.totalRecords}</span>
                        <span>Success: {sync.jobStatus.metrics.successfulRecords}</span>
                        <span>Failed: {sync.jobStatus.metrics.failedRecords}</span>
                        {sync.jobStatus.metrics.conflictedRecords > 0 && (
                          <span className="text-yellow-600">
                            Conflicts: {sync.jobStatus.metrics.conflictedRecords}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {sync.jobStatus.errors && sync.jobStatus.errors.length > 0 && (
                    <div className="mt-1 text-xs text-red-600">
                      Errors: {sync.jobStatus.errors.slice(0, 2).join(', ')}
                      {sync.jobStatus.errors.length > 2 && ` (+${sync.jobStatus.errors.length - 2} more)`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasConflicts && (
            <button
              onClick={() => onViewConflicts(sync)}
              className="p-2 text-yellow-600 hover:text-yellow-800"
              title="View conflicts"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => onExecute(sync, true)}
            disabled={isRunning}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Dry run"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onExecute(sync)}
            disabled={isRunning || sync.status !== 'active'}
            className="p-2 text-gray-400 hover:text-green-600 disabled:opacity-50"
            title="Execute sync"
          >
            <Play className="h-4 w-4" />
          </button>

          <button
            onClick={() => onToggleStatus(sync)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title={sync.status === 'active' ? 'Pause sync' : 'Activate sync'}
          >
            {sync.status === 'active' ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => onEdit(sync)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Edit sync"
          >
            <Edit className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDelete(sync.id)}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Delete sync"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
};

interface SyncConfigModalProps {
  sync?: DataSyncConfig;
  onSave: (data: Omit<DataSyncConfig, 'id' | 'lastSync' | 'nextSync' | 'metrics'>) => void;
  onCancel: () => void;
}

const SyncConfigModal: React.FC<SyncConfigModalProps> = ({ sync, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<DataSyncConfig>>({
    name: sync?.name || '',
    sourceIntegration: sync?.sourceIntegration || '',
    targetIntegration: sync?.targetIntegration || '',
    syncType: sync?.syncType || 'incremental',
    schedule: sync?.schedule || {
      type: 'interval',
      expression: '60',
      timezone: 'UTC',
      enabled: true
    },
    mapping: sync?.mapping || [],
    filters: sync?.filters || [],
    conflictResolution: sync?.conflictResolution || {
      strategy: 'timestamp_wins',
      notifyOnConflict: true,
      notifications: []
    },
    validation: sync?.validation || {
      enabled: true,
      rules: [],
      onValidationFailure: 'skip',
      notifications: []
    },
    status: sync?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {sync ? 'Edit Sync Configuration' : 'Create Sync Configuration'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sync configuration name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sync Type
                </label>
                <select
                  value={formData.syncType || 'incremental'}
                  onChange={(e) => setFormData({ ...formData, syncType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Full Sync</option>
                  <option value="incremental">Incremental</option>
                  <option value="real_time">Real-time</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Integration
                </label>
                <input
                  type="text"
                  required
                  value={formData.sourceIntegration || ''}
                  onChange={(e) => setFormData({ ...formData, sourceIntegration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Source integration ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Integration
                </label>
                <input
                  type="text"
                  required
                  value={formData.targetIntegration || ''}
                  onChange={(e) => setFormData({ ...formData, targetIntegration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Target integration ID"
                />
              </div>
            </div>

            {/* Schedule Configuration */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Schedule</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.schedule?.type || 'interval'}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: { ...formData.schedule!, type: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cron">Cron</option>
                    <option value="interval">Interval</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.schedule?.type === 'cron' ? 'Cron Expression' : 'Interval (minutes)'}
                  </label>
                  <input
                    type="text"
                    value={formData.schedule?.expression || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: { ...formData.schedule!, expression: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.schedule?.type === 'cron' ? '0 */6 * * *' : '60'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.schedule?.timezone || 'UTC'}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: { ...formData.schedule!, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={formData.schedule?.enabled || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule!, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable scheduled sync</span>
              </label>
            </div>

            {/* Conflict Resolution */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Conflict Resolution</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strategy
                  </label>
                  <select
                    value={formData.conflictResolution?.strategy || 'timestamp_wins'}
                    onChange={(e) => setFormData({
                      ...formData,
                      conflictResolution: {
                        ...formData.conflictResolution!,
                        strategy: e.target.value as any
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="source_wins">Source Wins</option>
                    <option value="target_wins">Target Wins</option>
                    <option value="timestamp_wins">Timestamp Wins</option>
                    <option value="manual">Manual Resolution</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.conflictResolution?.notifyOnConflict || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        conflictResolution: {
                          ...formData.conflictResolution!,
                          notifyOnConflict: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Notify on conflicts</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {sync ? 'Update Sync' : 'Create Sync'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface ConflictsResolutionModalProps {
  conflicts: Array<{
    id: string;
    sourceData: any;
    targetData: any;
    resolution?: string;
  }>;
  onResolve: (resolutions: Array<{
    conflictId: string;
    resolution: 'source' | 'target' | 'merge' | 'skip';
    mergedData?: any;
  }>) => void;
  onCancel: () => void;
}

const ConflictsResolutionModal: React.FC<ConflictsResolutionModalProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, {
    resolution: 'source' | 'target' | 'merge' | 'skip';
    mergedData?: any;
  }>>({});

  const handleResolutionChange = (conflictId: string, resolution: 'source' | 'target' | 'merge' | 'skip') => {
    setResolutions(prev => ({
      ...prev,
      [conflictId]: { resolution }
    }));
  };

  const handleResolveAll = () => {
    const resolutionArray = conflicts.map(conflict => ({
      conflictId: conflict.id,
      resolution: resolutions[conflict.id]?.resolution || 'skip',
      mergedData: resolutions[conflict.id]?.mergedData
    }));
    onResolve(resolutionArray);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resolve Data Conflicts ({conflicts.length})
          </h3>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Conflict {index + 1}
                  </h4>
                  <select
                    value={resolutions[conflict.id]?.resolution || 'skip'}
                    onChange={(e) => handleResolutionChange(conflict.id, e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="skip">Skip</option>
                    <option value="source">Use Source</option>
                    <option value="target">Use Target</option>
                    <option value="merge">Merge</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Source Data</h5>
                    <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                      {JSON.stringify(conflict.sourceData, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Target Data</h5>
                    <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                      {JSON.stringify(conflict.targetData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveAll}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Resolve All Conflicts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};