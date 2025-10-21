import { 
  AIAgent, 
  AgentConfig, 
  AgentMetrics, 
  AgentRegistryEntry,
  AgentTask,
  AgentLifecycleEvent
} from '../../types/ai-agents';
import { AgentRegistry } from './AgentRegistry';
import { AgentCommunication } from './AgentCommunication';

/**
 * Service for orchestrating AI agents - provides high-level management interface
 */
class AgentOrchestrationService {
  private registry: AgentRegistry;
  private communication: AgentCommunication;

  constructor() {
    this.registry = AgentRegistry.getInstance();
    this.communication = AgentCommunication.getInstance();
  }

  /**
   * Get all registered agents
   */
  async getAllAgents(): Promise<AIAgent[]> {
    try {
      const agents = this.registry.getAllAgents();
      return agents.map(agent => ({
        id: agent.getId(),
        name: agent.getName(),
        type: agent.getType(),
        version: agent.getConfiguration().settings?.version || '1.0.0',
        status: agent.getStatus(),
        capabilities: agent.getCapabilities(),
        configuration: agent.getConfiguration(),
        metrics: agent.getMetrics(),
        metadata: {
          description: agent.getConfiguration().settings?.description || '',
          vendor: agent.getConfiguration().settings?.vendor || 'Unknown',
          documentation: agent.getConfiguration().settings?.documentation || '',
          supportContact: agent.getConfiguration().settings?.supportContact || '',
          tags: agent.getConfiguration().settings?.tags || [],
          category: agent.getConfiguration().settings?.category || 'automation'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Error getting all agents:', error);
      throw error;
    }
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    errorAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    agentsByType: Record<string, number>;
  }> {
    try {
      return this.registry.getRegistryStats();
    } catch (error) {
      console.error('Error getting registry stats:', error);
      throw error;
    }
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<void> {
    try {
      await this.registry.startAgent(agentId, 'user');
    } catch (error) {
      console.error(`Error starting agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      await this.registry.stopAgent(agentId, 'user');
    } catch (error) {
      console.error(`Error stopping agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<void> {
    try {
      await this.registry.restartAgent(agentId, 'user');
    } catch (error) {
      console.error(`Error restarting agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(agentId: string, config: AgentConfig): Promise<void> {
    try {
      const agent = this.registry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      agent.updateConfiguration(config);
    } catch (error) {
      console.error(`Error updating agent configuration for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    try {
      const agent = this.registry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      return agent.getMetrics();
    } catch (error) {
      console.error(`Error getting metrics for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a task on a specific agent
   */
  async executeTask(agentId: string, task: Omit<AgentTask, 'id' | 'agentId' | 'createdAt' | 'retryCount'>): Promise<any> {
    try {
      const agent = this.registry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const fullTask: AgentTask = {
        ...task,
        id: this.generateTaskId(),
        agentId,
        createdAt: new Date(),
        retryCount: 0
      };

      return await agent.executeTaskWithMetrics(fullTask);
    } catch (error) {
      console.error(`Error executing task on agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AIAgent | null> {
    try {
      const agent = this.registry.getAgent(agentId);
      if (!agent) {
        return null;
      }

      return {
        id: agent.getId(),
        name: agent.getName(),
        type: agent.getType(),
        version: agent.getConfiguration().settings?.version || '1.0.0',
        status: agent.getStatus(),
        capabilities: agent.getCapabilities(),
        configuration: agent.getConfiguration(),
        metrics: agent.getMetrics(),
        metadata: {
          description: agent.getConfiguration().settings?.description || '',
          vendor: agent.getConfiguration().settings?.vendor || 'Unknown',
          documentation: agent.getConfiguration().settings?.documentation || '',
          supportContact: agent.getConfiguration().settings?.supportContact || '',
          tags: agent.getConfiguration().settings?.tags || [],
          category: agent.getConfiguration().settings?.category || 'automation'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error getting agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(type: string): Promise<AIAgent[]> {
    try {
      const agents = this.registry.getAgentsByType(type as any);
      return agents.map(agent => ({
        id: agent.getId(),
        name: agent.getName(),
        type: agent.getType(),
        version: agent.getConfiguration().settings?.version || '1.0.0',
        status: agent.getStatus(),
        capabilities: agent.getCapabilities(),
        configuration: agent.getConfiguration(),
        metrics: agent.getMetrics(),
        metadata: {
          description: agent.getConfiguration().settings?.description || '',
          vendor: agent.getConfiguration().settings?.vendor || 'Unknown',
          documentation: agent.getConfiguration().settings?.documentation || '',
          supportContact: agent.getConfiguration().settings?.supportContact || '',
          tags: agent.getConfiguration().settings?.tags || [],
          category: agent.getConfiguration().settings?.category || 'automation'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error(`Error getting agents by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Perform health check on all agents
   */
  async performHealthCheck(): Promise<Map<string, boolean>> {
    try {
      return await this.registry.performHealthCheck();
    } catch (error) {
      console.error('Error performing health check:', error);
      throw error;
    }
  }

  /**
   * Get lifecycle events
   */
  async getLifecycleEvents(agentId?: string): Promise<AgentLifecycleEvent[]> {
    try {
      return this.registry.getLifecycleEvents(agentId);
    } catch (error) {
      console.error('Error getting lifecycle events:', error);
      throw error;
    }
  }

  /**
   * Send message between agents
   */
  async sendMessage(fromAgentId: string, toAgentId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    try {
      const message = {
        id: this.generateMessageId(),
        fromAgentId,
        toAgentId,
        type: messageType,
        payload,
        timestamp: new Date(),
        priority: 'medium' as const
      };

      await this.communication.sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Broadcast message to agents of a specific type
   */
  async broadcastMessage(fromAgentId: string, targetType: string, messageType: string, payload: Record<string, any>): Promise<void> {
    try {
      await this.communication.broadcastMessage(fromAgentId, targetType, messageType, payload);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to agent events
   */
  subscribeToEvents(eventType: string, callback: (event: any) => void): void {
    this.communication.subscribeToEvents(eventType, callback);
  }

  /**
   * Unsubscribe from agent events
   */
  unsubscribeFromEvents(eventType: string, callback: (event: any) => void): void {
    this.communication.unsubscribeFromEvents(eventType, callback);
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const agentOrchestrationService = new AgentOrchestrationService();