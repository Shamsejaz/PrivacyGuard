import { useState, useCallback } from 'react';
import { AIAgent, AgentConfig, AgentRegistryEntry } from '../types/ai-agents';
import { agentOrchestrationService } from '../services/ai-agents/AgentOrchestrationService';

interface RegistryStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  errorAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  agentsByType: Record<string, number>;
}

export const useAgentOrchestration = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [registryStats, setRegistryStats] = useState<RegistryStats>({
    totalAgents: 0,
    activeAgents: 0,
    inactiveAgents: 0,
    errorAgents: 0,
    healthyAgents: 0,
    unhealthyAgents: 0,
    agentsByType: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [agentsData, statsData] = await Promise.all([
        agentOrchestrationService.getAllAgents(),
        agentOrchestrationService.getRegistryStats()
      ]);
      
      setAgents(agentsData);
      setRegistryStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAgent = useCallback(async (agentId: string) => {
    try {
      await agentOrchestrationService.startAgent(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to start agent');
    }
  }, []);

  const stopAgent = useCallback(async (agentId: string) => {
    try {
      await agentOrchestrationService.stopAgent(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to stop agent');
    }
  }, []);

  const restartAgent = useCallback(async (agentId: string) => {
    try {
      await agentOrchestrationService.restartAgent(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to restart agent');
    }
  }, []);

  const updateAgentConfiguration = useCallback(async (agentId: string, config: AgentConfig) => {
    try {
      await agentOrchestrationService.updateAgentConfiguration(agentId, config);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update agent configuration');
    }
  }, []);

  const getAgentMetrics = useCallback(async (agentId: string) => {
    try {
      return await agentOrchestrationService.getAgentMetrics(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get agent metrics');
    }
  }, []);

  return {
    agents,
    registryStats,
    isLoading,
    error,
    refreshAgents,
    startAgent,
    stopAgent,
    restartAgent,
    updateAgentConfiguration,
    getAgentMetrics
  };
};