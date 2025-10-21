import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowRight, Users, Settings, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  CollaborationWorkflow, 
  CollaborationStep, 
  WorkflowDependency, 
  RetryPolicy,
  AIAgent 
} from '../../types/ai-agents';

interface CreateCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    participantIds: string[],
    coordinatorId: string,
    workflow: CollaborationWorkflow
  ) => Promise<void>;
  availableAgents: AIAgent[];
}

export const CreateCollaborationModal: React.FC<CreateCollaborationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableAgents
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<CollaborationStep[]>([]);
  const [dependencies, setDependencies] = useState<WorkflowDependency[]>([]);
  const [retryPolicy, setRetryPolicy] = useState<RetryPolicy>({
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000
  });
  const [workflowTimeout, setWorkflowTimeout] = useState(300000); // 5 minutes
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addStep = () => {
    const newStep: CollaborationStep = {
      id: `step_${Date.now()}`,
      agentId: '',
      taskType: '',
      input: {},
      expectedOutput: [],
      timeout: 60000,
      order: steps.length + 1
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<CollaborationStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
    setDependencies(dependencies.filter(dep => 
      dep.stepId !== stepId && !dep.dependsOn.includes(stepId)
    ));
    
    // Reorder remaining steps
    const remainingSteps = steps.filter(step => step.id !== stepId);
    remainingSteps.forEach((step, index) => {
      step.order = index + 1;
    });
  };

  const addDependency = (stepId: string) => {
    const newDependency: WorkflowDependency = {
      stepId,
      dependsOn: [],
      condition: ''
    };
    setDependencies([...dependencies, newDependency]);
  };

  const updateDependency = (stepId: string, updates: Partial<WorkflowDependency>) => {
    setDependencies(dependencies.map(dep =>
      dep.stepId === stepId ? { ...dep, ...updates } : dep
    ));
  };

  const removeDependency = (stepId: string) => {
    setDependencies(dependencies.filter(dep => dep.stepId !== stepId));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Collaboration name is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!coordinatorId) {
      newErrors.coordinatorId = 'Coordinator agent is required';
    }

    if (participantIds.length === 0) {
      newErrors.participantIds = 'At least one participant agent is required';
    }

    if (steps.length === 0) {
      newErrors.steps = 'At least one workflow step is required';
    }

    // Validate steps
    steps.forEach((step, index) => {
      if (!step.agentId) {
        newErrors[`step_${index}_agent`] = `Step ${index + 1} requires an agent`;
      }
      if (!step.taskType.trim()) {
        newErrors[`step_${index}_task`] = `Step ${index + 1} requires a task type`;
      }
      if (step.timeout < 1000) {
        newErrors[`step_${index}_timeout`] = `Step ${index + 1} timeout must be at least 1000ms`;
      }
    });

    // Validate dependencies don't create cycles
    const hasCycle = checkForCycles();
    if (hasCycle) {
      newErrors.dependencies = 'Workflow dependencies contain a cycle';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForCycles = (): boolean => {
    const graph: Record<string, string[]> = {};
    
    // Build dependency graph
    dependencies.forEach(dep => {
      if (!graph[dep.stepId]) {
        graph[dep.stepId] = [];
      }
      graph[dep.stepId] = dep.dependsOn;
    });

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const dependencies = graph[stepId] || [];
      for (const dep of dependencies) {
        if (hasCycleDFS(dep)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of Object.keys(graph)) {
      if (hasCycleDFS(stepId)) {
        return true;
      }
    }

    return false;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const workflow: CollaborationWorkflow = {
        steps,
        dependencies,
        timeout: workflowTimeout,
        retryPolicy
      };

      await onSave(name, description, participantIds, coordinatorId, workflow);
    } catch (error) {
      console.error('Error saving collaboration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailableStepsForDependency = (currentStepId: string): CollaborationStep[] => {
    const currentStep = steps.find(s => s.id === currentStepId);
    if (!currentStep) return [];
    
    return steps.filter(s => s.id !== currentStepId && s.order < currentStep.order);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Agent Collaboration</h2>
            <p className="text-sm text-gray-600">Design a multi-agent workflow</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collaboration Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter collaboration name"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinator Agent
                  </label>
                  <select
                    value={coordinatorId}
                    onChange={(e) => setCoordinatorId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.coordinatorId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select coordinator agent</option>
                    {availableAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.type})
                      </option>
                    ))}
                  </select>
                  {errors.coordinatorId && (
                    <p className="mt-1 text-sm text-red-600">{errors.coordinatorId}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the collaboration purpose and goals"
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Participant Agents */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Agents</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableAgents.map(agent => (
                    <div
                      key={agent.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        participantIds.includes(agent.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        if (participantIds.includes(agent.id)) {
                          setParticipantIds(participantIds.filter(id => id !== agent.id));
                        } else {
                          setParticipantIds([...participantIds, agent.id]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{agent.name}</h4>
                          <p className="text-sm text-gray-600">{agent.type}</p>
                        </div>
                        {participantIds.includes(agent.id) && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.participantIds && (
                  <p className="text-sm text-red-600">{errors.participantIds}</p>
                )}
              </div>
            </Card>

            {/* Workflow Steps */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Workflow Steps</h3>
                <Button onClick={addStep} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Step</span>
                </Button>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Step {step.order}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Agent
                        </label>
                        <select
                          value={step.agentId}
                          onChange={(e) => updateStep(step.id, { agentId: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`step_${index}_agent`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select agent</option>
                          {participantIds.map(agentId => {
                            const agent = availableAgents.find(a => a.id === agentId);
                            return agent ? (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ) : null;
                          })}
                        </select>
                        {errors[`step_${index}_agent`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`step_${index}_agent`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Task Type
                        </label>
                        <input
                          type="text"
                          value={step.taskType}
                          onChange={(e) => updateStep(step.id, { taskType: e.target.value })}
                          placeholder="e.g., analyze_compliance"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`step_${index}_task`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`step_${index}_task`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`step_${index}_task`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeout (ms)
                        </label>
                        <input
                          type="number"
                          value={step.timeout}
                          onChange={(e) => updateStep(step.id, { timeout: parseInt(e.target.value) })}
                          min="1000"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`step_${index}_timeout`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`step_${index}_timeout`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`step_${index}_timeout`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Input Parameters (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(step.input, null, 2)}
                          onChange={(e) => {
                            try {
                              const input = JSON.parse(e.target.value);
                              updateStep(step.id, { input });
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{"key": "value"}'
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Dependencies</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDependency(step.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Dependency
                        </Button>
                      </div>

                      {dependencies.filter(dep => dep.stepId === step.id).map(dependency => (
                        <div key={dependency.stepId} className="flex items-center space-x-2 mb-2">
                          <select
                            multiple
                            value={dependency.dependsOn}
                            onChange={(e) => {
                              const values = Array.from(e.target.selectedOptions, option => option.value);
                              updateDependency(step.id, { dependsOn: values });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {getAvailableStepsForDependency(step.id).map(availableStep => (
                              <option key={availableStep.id} value={availableStep.id}>
                                Step {availableStep.order}: {availableStep.taskType}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDependency(step.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {steps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No workflow steps defined. Click "Add Step" to get started.</p>
                  </div>
                )}

                {errors.steps && (
                  <p className="text-sm text-red-600">{errors.steps}</p>
                )}
              </div>
            </Card>

            {/* Workflow Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={workflowTimeout}
                    onChange={(e) => setWorkflowTimeout(parseInt(e.target.value))}
                    min="60000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Retry Attempts
                  </label>
                  <input
                    type="number"
                    value={retryPolicy.maxAttempts}
                    onChange={(e) => setRetryPolicy({
                      ...retryPolicy,
                      maxAttempts: parseInt(e.target.value)
                    })}
                    min="0"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backoff Strategy
                  </label>
                  <select
                    value={retryPolicy.backoffStrategy}
                    onChange={(e) => setRetryPolicy({
                      ...retryPolicy,
                      backoffStrategy: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="linear">Linear</option>
                    <option value="exponential">Exponential</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={retryPolicy.baseDelay}
                    onChange={(e) => setRetryPolicy({
                      ...retryPolicy,
                      baseDelay: parseInt(e.target.value)
                    })}
                    min="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {errors.dependencies && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{errors.dependencies}</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Create Collaboration</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};