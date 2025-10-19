import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  RefreshCw
} from 'lucide-react';

interface RemediationWorkflow {
  id: string;
  findingId: string;
  findingDescription: string;
  action: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  progress: number;
  startTime: string;
  endTime?: string;
  message: string;
  rollbackAvailable: boolean;
  estimatedDuration?: number;
  logs: string[];
}

interface RemediationStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  successRate: number;
}

export const RemediationWorkflowPanel: React.FC = () => {
  const [workflows, setWorkflows] = useState<RemediationWorkflow[]>([]);
  const [stats, setStats] = useState<RemediationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);

  useEffect(() => {
    loadRemediationData();
    const interval = setInterval(loadRemediationData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRemediationData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call the remediation API
      // For now, we'll simulate the data
      const mockWorkflows: RemediationWorkflow[] = [
        {
          id: 'rem-001',
          findingId: 'finding-001',
          findingDescription: 'S3 bucket is not encrypted at rest',
          action: 'ENABLE_ENCRYPTION',
          status: 'IN_PROGRESS',
          progress: 65,
          startTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          message: 'Enabling S3 bucket encryption...',
          rollbackAvailable: false,
          estimatedDuration: 600000, // 10 minutes
          logs: [
            'Remediation started',
            'Validating S3 bucket permissions',
            'Creating encryption configuration',
            'Applying encryption settings...'
          ]
        },
        {
          id: 'rem-002',
          findingId: 'finding-002',
          findingDescription: 'IAM role has excessive permissions',
          action: 'UPDATE_POLICY',
          status: 'COMPLETED',
          progress: 100,
          startTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          endTime: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
          message: 'IAM policy updated successfully',
          rollbackAvailable: true,
          logs: [
            'Remediation started',
            'Analyzing current IAM policy',
            'Generating least-privilege policy',
            'Updating IAM role policy',
            'Remediation completed successfully'
          ]
        },
        {
          id: 'rem-003',
          findingId: 'finding-003',
          findingDescription: 'S3 bucket is publicly accessible',
          action: 'RESTRICT_ACCESS',
          status: 'FAILED',
          progress: 30,
          startTime: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          endTime: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          message: 'Failed to update bucket policy: Access denied',
          rollbackAvailable: false,
          logs: [
            'Remediation started',
            'Checking bucket policy',
            'Attempting to restrict public access',
            'Error: Insufficient permissions to modify bucket policy',
            'Remediation failed'
          ]
        },
        {
          id: 'rem-004',
          findingId: 'finding-004',
          findingDescription: 'CloudTrail logging not enabled',
          action: 'ENABLE_LOGGING',
          status: 'PENDING',
          progress: 0,
          startTime: new Date().toISOString(),
          message: 'Waiting for approval',
          rollbackAvailable: false,
          estimatedDuration: 300000, // 5 minutes
          logs: [
            'Remediation queued',
            'Waiting for manual approval'
          ]
        }
      ];

      const mockStats: RemediationStats = {
        total: mockWorkflows.length,
        pending: mockWorkflows.filter(w => w.status === 'PENDING').length,
        inProgress: mockWorkflows.filter(w => w.status === 'IN_PROGRESS').length,
        completed: mockWorkflows.filter(w => w.status === 'COMPLETED').length,
        failed: mockWorkflows.filter(w => w.status === 'FAILED').length,
        successRate: 0.75 // 75% success rate
      };

      setWorkflows(mockWorkflows);
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load remediation data');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowAction = async (workflowId: string, action: 'cancel' | 'retry' | 'rollback') => {
    try {
      // In a real implementation, this would call the remediation API
      console.log(`${action} workflow:`, workflowId);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload data after action
      await loadRemediationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} workflow`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'IN_PROGRESS': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ROLLED_BACK': return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'ROLLED_BACK': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading && !workflows.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading remediation workflows...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Remediation Workflows</h2>
          <p className="text-gray-600">Automated remediation status and management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={loadRemediationData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-2" />
            New Remediation
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(stats.successRate * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(workflow.status)}
                    <h3 className="text-lg font-medium text-gray-900">
                      {workflow.action.replace('_', ' ')}
                    </h3>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{workflow.findingDescription}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Workflow ID</div>
                      <div className="text-sm text-gray-600 font-mono">{workflow.id}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Finding ID</div>
                      <div className="text-sm text-gray-600 font-mono">{workflow.findingId}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Duration</div>
                      <div className="text-sm text-gray-600">
                        {formatDuration(workflow.startTime, workflow.endTime)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {workflow.status === 'IN_PROGRESS' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{workflow.progress}%</span>
                      </div>
                      <ProgressBar value={workflow.progress} className="h-2" />
                      {workflow.estimatedDuration && (
                        <div className="text-xs text-gray-500 mt-1">
                          Estimated completion: {Math.round((workflow.estimatedDuration * (100 - workflow.progress)) / 100 / 60000)} minutes remaining
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-4">
                    <strong>Status:</strong> {workflow.message}
                  </div>

                  <div className="text-xs text-gray-500">
                    Started: {formatDateTime(workflow.startTime)}
                    {workflow.endTime && ` • Ended: ${formatDateTime(workflow.endTime)}`}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLogs(showLogs === workflow.id ? null : workflow.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Logs
                  </Button>

                  {workflow.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWorkflowAction(workflow.id, 'cancel')}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}

                  {workflow.status === 'FAILED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWorkflowAction(workflow.id, 'retry')}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}

                  {workflow.status === 'COMPLETED' && workflow.rollbackAvailable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWorkflowAction(workflow.id, 'rollback')}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Rollback
                    </Button>
                  )}
                </div>
              </div>

              {/* Logs */}
              {showLogs === workflow.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Execution Logs</h4>
                  <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                    {workflow.logs.map((log, index) => (
                      <div key={index} className="text-xs text-gray-600 font-mono mb-1">
                        <span className="text-gray-400">
                          [{new Date(Date.now() - (workflow.logs.length - index) * 60000).toLocaleTimeString()}]
                        </span>{' '}
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}

        {workflows.length === 0 && !loading && (
          <Card>
            <div className="p-12 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Workflows</h3>
              <p className="text-gray-600 mb-4">
                No remediation workflows are currently running. Start a compliance scan to identify issues that can be automatically remediated.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                Start Remediation
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};