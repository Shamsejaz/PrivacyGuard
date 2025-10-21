import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Users,
  Zap,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  AIAgent, 
  AgentStatus, 
  AgentType, 
  AgentRegistryEntry,
  AgentMetrics 
} from '../../types/ai-agents';
import { useAgentOrchestration } from '../../hooks/useAgentOrchestration';
import { AgentConfigurationModal } from './AgentConfigurationModal';
import { AgentMetricsPanel } from './AgentMetricsPanel';
import { AgentCollaborationPanel } from './AgentCollaborationPanel';

interface AgentOrchestrationDashboardProps {
  className?: string;
}

export const AgentOrchestrationDashboard: React.FC<AgentOrchestrationDashboardProps> = ({
  className = ''
}) => {
  const {
    agents,
    registryStats,
    isLoading,
    error,
    startAgent,
    stopAgent,
    restartAgent,
    updateAgentConfiguration,
    getAgentMetrics,
    refreshAgents
  } = useAgentOrchestration();

  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<AgentType | 'all'>('all');

  useEffect(() => {
    refreshAgents();
    // Refresh every 30 seconds
    const interval = setInterval(refreshAgents, 30000);
    return () => clearInterval(interval);
  }, [refreshAgents]);

  const filteredAgents = agents.filter(agent => {
    if (filterStatus !== 'all' && agent.status !== filterStatus) return false;
    if (filterType !== 'all' && agent.type !== filterType) return false;
    return true;
  });

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Pause className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'initializing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'updating':
        return <Activity className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'initializing':
      case 'updating':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const handleAgentAction = async (agentId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      switch (action) {
        case 'start':
          await startAgent(agentId);
          break;
        case 'stop':
          await stopAgent(agentId);
          break;
        case 'restart':
          await restartAgent(agentId);
          break;
      }
      await refreshAgents();
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
    }
  };

  const handleConfigureAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowConfigModal(true);
  };

  const handleViewMetrics = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowMetricsPanel(true);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Agents</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refreshAgents}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agent Orchestration</h1>
          <p className="text-gray-600">Manage and monitor your AI agents</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowCollaborationPanel(true)}
            className="flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Collaborations</span>
          </Button>
          <Button onClick={refreshAgents} className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{registryStats.totalAgents}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-green-600">{registryStats.activeAgents}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Healthy Agents</p>
              <p className="text-2xl font-bold text-blue-600">{registryStats.healthyAgents}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Agents</p>
              <p className="text-2xl font-bold text-red-600">{registryStats.errorAgents}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AgentStatus | 'all')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="initializing">Initializing</option>
            <option value="updating">Updating</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AgentType | 'all')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="AWS_PRIVACY">AWS Privacy</option>
            <option value="AICRA">AICRA</option>
            <option value="GOOGLE_AI">Google AI</option>
            <option value="AZURE_AI">Azure AI</option>
          </select>
        </div>
      </div>

      {/* Agents List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(agent.status)}
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">{agent.type}</p>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(agent.status)}>
                {agent.status}
              </Badge>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tasks Completed:</span>
                <span className="font-medium">{agent.metrics.tasksCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">{agent.metrics.successRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Response:</span>
                <span className="font-medium">{agent.metrics.averageResponseTime}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Capabilities:</span>
                <span className="font-medium">{agent.capabilities.length}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {agent.status === 'inactive' && (
                  <Button
                    size="sm"
                    onClick={() => handleAgentAction(agent.id, 'start')}
                    className="flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Start</span>
                  </Button>
                )}
                {agent.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAgentAction(agent.id, 'stop')}
                    className="flex items-center space-x-1"
                  >
                    <Square className="w-3 h-3" />
                    <span>Stop</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAgentAction(agent.id, 'restart')}
                  className="flex items-center space-x-1"
                >
                  <Activity className="w-3 h-3" />
                  <span>Restart</span>
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewMetrics(agent)}
                  className="flex items-center space-x-1"
                >
                  <BarChart3 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleConfigureAgent(agent)}
                  className="flex items-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agents Found</h3>
          <p className="text-gray-600">No agents match the current filters.</p>
        </div>
      )}

      {/* Modals and Panels */}
      {showConfigModal && selectedAgent && (
        <AgentConfigurationModal
          agent={selectedAgent}
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedAgent(null);
          }}
          onSave={async (config) => {
            await updateAgentConfiguration(selectedAgent.id, config);
            await refreshAgents();
            setShowConfigModal(false);
            setSelectedAgent(null);
          }}
        />
      )}

      {showMetricsPanel && selectedAgent && (
        <AgentMetricsPanel
          agent={selectedAgent}
          isOpen={showMetricsPanel}
          onClose={() => {
            setShowMetricsPanel(false);
            setSelectedAgent(null);
          }}
        />
      )}

      {showCollaborationPanel && (
        <AgentCollaborationPanel
          isOpen={showCollaborationPanel}
          onClose={() => setShowCollaborationPanel(false)}
        />
      )}
    </div>
  );
};