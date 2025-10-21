import { 
  AIAgent, 
  AgentRegistryEntry, 
  AgentLifecycleEvent, 
  AgentStatus, 
  AgentType 
} from '../../types/ai-agents';
import { BaseAgent } from './BaseAgent';

/**
 * Central registry for managing AI agent lifecycle and discovery
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private registry: Map<string, AgentRegistryEntry> = new Map();
  private lifecycleEvents: AgentLifecycleEvent[] = [];
  private eventListeners: Map<string, ((event: AgentLifecycleEvent) => void)[]> = new Map();

  private constructor() {
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register a new agent in the registry
   */
  public async registerAgent(agent: BaseAgent): Promise<void> {
    const agentId = agent.getId();
    
    if (this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} is already registered`);
    }

    try {
      // Add to agents map
      this.agents.set(agentId, agent);

      // Create registry entry
      const registryEntry: AgentRegistryEntry = {
        agentId,
        type: agent.getType(),
        version: agent.getConfiguration().settings?.version || '1.0.0',
        status: agent.getStatus(),
        capabilities: agent.getCapabilities(),
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        healthStatus: 'healthy'
      };

      this.registry.set(agentId, registryEntry);

      // Record lifecycle event
      await this.recordLifecycleEvent({
        agentId,
        event: 'install',
        status: 'success',
        timestamp: new Date(),
        performedBy: 'system'
      });

      console.log(`Agent ${agentId} registered successfully`);
    } catch (error) {
      // Clean up on failure
      this.agents.delete(agentId);
      this.registry.delete(agentId);
      
      await this.recordLifecycleEvent({
        agentId,
        event: 'install',
        status: 'failure',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        performedBy: 'system'
      });

      throw error;
    }
  }

  /**
   * Unregister an agent from the registry
   */
  public async unregisterAgent(agentId: string, performedBy: string = 'system'): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    try {
      // Stop the agent if it's running
      if (agent.getStatus() === 'active') {
        await this.stopAgent(agentId, performedBy);
      }

      // Remove from registry
      this.agents.delete(agentId);
      this.registry.delete(agentId);

      await this.recordLifecycleEvent({
        agentId,
        event: 'uninstall',
        status: 'success',
        timestamp: new Date(),
        performedBy
      });

      console.log(`Agent ${agentId} unregistered successfully`);
    } catch (error) {
      await this.recordLifecycleEvent({
        agentId,
        event: 'uninstall',
        status: 'failure',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        performedBy
      });

      throw error;
    }
  }

  /**
   * Start an agent
   */
  public async startAgent(agentId: string, performedBy: string = 'system'): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    try {
      await agent.start();
      
      // Update registry entry
      const registryEntry = this.registry.get(agentId);
      if (registryEntry) {
        registryEntry.status = 'active';
        registryEntry.lastHeartbeat = new Date();
        registryEntry.healthStatus = 'healthy';
      }

      await this.recordLifecycleEvent({
        agentId,
        event: 'start',
        status: 'success',
        timestamp: new Date(),
        performedBy
      });

      console.log(`Agent ${agentId} started successfully`);
    } catch (error) {
      await this.recordLifecycleEvent({
        agentId,
        event: 'start',
        status: 'failure',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        performedBy
      });

      throw error;
    }
  }

  /**
   * Stop an agent
   */
  public async stopAgent(agentId: string, performedBy: string = 'system'): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    try {
      await agent.stop();
      
      // Update registry entry
      const registryEntry = this.registry.get(agentId);
      if (registryEntry) {
        registryEntry.status = 'inactive';
        registryEntry.lastHeartbeat = new Date();
      }

      await this.recordLifecycleEvent({
        agentId,
        event: 'stop',
        status: 'success',
        timestamp: new Date(),
        performedBy
      });

      console.log(`Agent ${agentId} stopped successfully`);
    } catch (error) {
      await this.recordLifecycleEvent({
        agentId,
        event: 'stop',
        status: 'failure',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        performedBy
      });

      throw error;
    }
  }

  /**
   * Restart an agent
   */
  public async restartAgent(agentId: string, performedBy: string = 'system'): Promise<void> {
    await this.stopAgent(agentId, performedBy);
    await this.startAgent(agentId, performedBy);
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  public getAgentsByType(type: AgentType): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.getType() === type);
  }

  /**
   * Get agents by status
   */
  public getAgentsByStatus(status: AgentStatus): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.getStatus() === status);
  }

  /**
   * Get registry entries
   */
  public getRegistryEntries(): AgentRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get registry entry by agent ID
   */
  public getRegistryEntry(agentId: string): AgentRegistryEntry | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Check if agent is registered
   */
  public isAgentRegistered(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get lifecycle events
   */
  public getLifecycleEvents(agentId?: string): AgentLifecycleEvent[] {
    if (agentId) {
      return this.lifecycleEvents.filter(event => event.agentId === agentId);
    }
    return [...this.lifecycleEvents];
  }

  /**
   * Add lifecycle event listener
   */
  public addLifecycleEventListener(
    eventType: string, 
    listener: (event: AgentLifecycleEvent) => void
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove lifecycle event listener
   */
  public removeLifecycleEventListener(
    eventType: string, 
    listener: (event: AgentLifecycleEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Perform health check on all agents
   */
  public async performHealthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [agentId, agent] of this.agents) {
      try {
        const isHealthy = await agent.healthCheck();
        results.set(agentId, isHealthy);
        
        // Update registry entry
        const registryEntry = this.registry.get(agentId);
        if (registryEntry) {
          registryEntry.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
          registryEntry.lastHeartbeat = new Date();
        }
      } catch (error) {
        results.set(agentId, false);
        
        // Update registry entry
        const registryEntry = this.registry.get(agentId);
        if (registryEntry) {
          registryEntry.healthStatus = 'unhealthy';
          registryEntry.lastHeartbeat = new Date();
        }
        
        console.error(`Health check failed for agent ${agentId}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get registry statistics
   */
  public getRegistryStats(): {
    totalAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    errorAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    agentsByType: Record<AgentType, number>;
  } {
    const entries = Array.from(this.registry.values());
    
    const stats = {
      totalAgents: entries.length,
      activeAgents: entries.filter(e => e.status === 'active').length,
      inactiveAgents: entries.filter(e => e.status === 'inactive').length,
      errorAgents: entries.filter(e => e.status === 'error').length,
      healthyAgents: entries.filter(e => e.healthStatus === 'healthy').length,
      unhealthyAgents: entries.filter(e => e.healthStatus === 'unhealthy').length,
      agentsByType: {} as Record<AgentType, number>
    };

    // Count by type
    const types: AgentType[] = ['AWS_PRIVACY', 'AICRA', 'GOOGLE_AI', 'AZURE_AI'];
    types.forEach(type => {
      stats.agentsByType[type] = entries.filter(e => e.type === type).length;
    });

    return stats;
  }

  private async recordLifecycleEvent(event: AgentLifecycleEvent): Promise<void> {
    this.lifecycleEvents.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.lifecycleEvents.length > 1000) {
      this.lifecycleEvents = this.lifecycleEvents.slice(-1000);
    }

    // Emit event to listeners
    const listeners = this.eventListeners.get(event.event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in lifecycle event listener:`, error);
        }
      });
    }
  }

  private startHeartbeatMonitoring(): void {
    // Check agent health every 30 seconds
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Error during heartbeat monitoring:', error);
      }
    }, 30000);
  }
}