import React, { useState, useEffect } from 'react';
import { X, Plus, Users, Play, Pause, Square, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  AgentCollaboration, 
  CollaborationWorkflow, 
  CollaborationStep,
  AIAgent 
} from '../../types/ai-agents';
import { useAgentCollaboration } from '../../hooks/useAgentCollaboration';
import { CreateCollaborationModal } from './CreateCollaborationModal';

interface AgentCollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentCollaborationPanel: React.FC<AgentCollaborationPanelProps> = ({
  isOpen,
  onClose
}) => {
  const {
    collaborations,
    availableAgents,
    isLoading,
    error,
    createCollaboration,
    cancelCollaboration,
    refreshCollaborations
  } = useAgentCollaboration();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<AgentCollaboration | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  useEffect(() => {
    if (isOpen) {
      refreshCollaborations();
    }
  }, [isOpen, refreshCollaborations]);

  const filteredCollaborations = collaborations.filter(collab => {
    if (filterStatus === 'all') return true;
    return collab.status === filterStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDuration = (startDate: Date, endDate?: Date) => {
    const end = endDate || new Date();
    const duration = end.getTime() - startDate.getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleCreateCollaboration = async (
    name: string,
    description: string,
    participantIds: string[],
    coordinatorId: string,
    workflow: CollaborationWorkflow
  ) => {
    try {
      await createCollaboration(name, description, participantIds, coordinatorId, workflow);
      setShowCreateModal(false);
      await refreshCollaborations();
    } catch (error) {
      console.error('Failed to create collaboration:', error);
    }
  };

  const handleCancelCollaboration = async (collaborationId: string) => {
    if (confirm('Are you sure you want to cancel this collaboration?')) {
      try {
        await cancelCollaboration(collaborationId);
        await refreshCollaborations();
      } catch (error) {
        console.error('Failed to cancel collaboration:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Collaborations</h2>
            <p className="text-sm text-gray-600">Manage multi-agent workflows and collaborations</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Collaboration</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Collaborations</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refreshCollaborations}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Collaborations List */}
              {filteredCollaborations.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredCollaborations.map((collaboration) => (
                    <Card key={collaboration.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(collaboration.status)}
                          <div>
                            <h3 className="font-semibold text-gray-900">{collaboration.name}</h3>
                            <p className="text-sm text-gray-600">{collaboration.description}</p>
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(collaboration.status)}>
                          {collaboration.status}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Participants:</span>
                          <span className="font-medium">{collaboration.participantAgents.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Workflow Steps:</span>
                          <span className="font-medium">{collaboration.workflow.steps.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">
                            {formatDuration(collaboration.createdAt, collaboration.completedAt)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Coordinator:</span>
                          <span className="font-medium">
                            {availableAgents.find(a => a.id === collaboration.coordinatorAgentId)?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Participant Agents */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Participating Agents:</p>
                        <div className="flex flex-wrap gap-2">
                          {collaboration.participantAgents.map((agentId) => {
                            const agent = availableAgents.find(a => a.id === agentId);
                            return (
                              <Badge key={agentId} variant="outline">
                                {agent?.name || agentId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Workflow Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Workflow Progress:</p>
                          <span className="text-sm text-gray-600">
                            {collaboration.workflow.steps.length} steps
                          </span>
                        </div>
                        <div className="space-y-2">
                          {collaboration.workflow.steps.slice(0, 3).map((step, index) => (
                            <div key={step.id} className="flex items-center space-x-3 text-sm">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-blue-500' : 
                                index === 1 ? 'bg-yellow-500' : 'bg-gray-300'
                              }`}></div>
                              <span className="text-gray-600">
                                Step {step.order}: {step.taskType}
                              </span>
                            </div>
                          ))}
                          {collaboration.workflow.steps.length > 3 && (
                            <div className="text-sm text-gray-500 ml-5">
                              +{collaboration.workflow.steps.length - 3} more steps
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCollaboration(collaboration)}
                        >
                          View Details
                        </Button>
                        
                        {collaboration.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelCollaboration(collaboration.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Collaborations Found</h3>
                  <p className="text-gray-600 mb-4">
                    {filterStatus === 'all' 
                      ? 'No collaborations have been created yet.'
                      : `No ${filterStatus} collaborations found.`
                    }
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create First Collaboration
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collaboration Details Modal */}
        {selectedCollaboration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCollaboration.name}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCollaboration(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedCollaboration.description}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Workflow Steps</h4>
                    <div className="space-y-3">
                      {selectedCollaboration.workflow.steps.map((step) => (
                        <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">
                              Step {step.order}: {step.taskType}
                            </h5>
                            <Badge variant="outline">
                              {availableAgents.find(a => a.id === step.agentId)?.name || step.agentId}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Timeout: {step.timeout}ms
                          </p>
                          {Object.keys(step.input).length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Input:</p>
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(step.input, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedCollaboration.results && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Results</h4>
                      <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                        {JSON.stringify(selectedCollaboration.results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Collaboration Modal */}
      {showCreateModal && (
        <CreateCollaborationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateCollaboration}
          availableAgents={availableAgents}
        />
      )}
    </div>
  );
};