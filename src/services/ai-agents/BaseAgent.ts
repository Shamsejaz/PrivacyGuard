import { 
  AIAgent, 
  AgentTask, 
  AgentEvent, 
  AgentMessage, 
  AgentConfig, 
  AgentMetrics, 
  AgentStatus,
  AgentType,
  AgentCapability,
  AgentError
} from '../../types/ai-agents';

/**
 * Abstract base class for all AI agents
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseAgent {
  protected agent: AIAgent;
  protected eventListeners: Map<string, ((event: AgentEvent) => void)[]> = new Map();
  protected messageHandlers: Map<string, (message: AgentMessage) => Promise<any>> = new Map();
  
  constructor(agent: AIAgent) {
    this.agent = agent;
    this.initializeAgent();
  }

  // Abstract methods that must be implemented by concrete agents
  abstract initialize(): Promise<void>;
  abstract executeTask(task: AgentTask): Promise<any>;
  abstract healthCheck(): Promise<boolean>;
  abstract cleanup(): Promise<void>;

  // Concrete methods available to all agents
  public getId(): string {
    return this.agent.id;
  }

  public getName(): string {
    return this.agent.name;
  }

  public getType(): AgentType {
    return this.agent.type;
  }

  public getStatus(): AgentStatus {
    return this.agent.status;
  }

  public getCapabilities(): AgentCapability[] {
    return this.agent.capabilities;
  }

  public getConfiguration(): AgentConfig {
    return this.agent.configuration;
  }

  public getMetrics(): AgentMetrics {
    return this.agent.metrics;
  }

  public updateStatus(status: AgentStatus): void {
    const previousStatus = this.agent.status;
    this.agent.status = status;
    this.agent.updatedAt = new Date();
    
    if (status === 'active') {
      this.agent.lastActiveAt = new Date();
    }

    // Emit status change event
    this.emitEvent({
      id: this.generateId(),
      type: 'agent_status_changed',
      agentId: this.agent.id,
      payload: {
        previousStatus,
        newStatus: status,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  public updateConfiguration(config: Partial<AgentConfig>): void {
    this.agent.configuration = { ...this.agent.configuration, ...config };
    this.agent.updatedAt = new Date();
  }

  public updateMetrics(metrics: Partial<AgentMetrics>): void {
    this.agent.metrics = { ...this.agent.metrics, ...metrics };
    this.agent.updatedAt = new Date();
  }

  // Event handling
  public addEventListener(eventType: string, listener: (event: AgentEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  public removeEventListener(eventType: string, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  protected emitEvent(event: AgentEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  // Message handling
  public registerMessageHandler(messageType: string, handler: (message: AgentMessage) => Promise<any>): void {
    this.messageHandlers.set(messageType, handler);
  }

  public async handleMessage(message: AgentMessage): Promise<any> {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        return await handler(message);
      } catch (error) {
        console.error(`Error handling message type ${message.type}:`, error);
        throw error;
      }
    } else {
      throw new Error(`No handler registered for message type: ${message.type}`);
    }
  }

  // Task execution wrapper with metrics and error handling
  public async executeTaskWithMetrics(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Update task status
      task.status = 'running';
      task.startedAt = new Date();
      
      // Emit task started event
      this.emitEvent({
        id: this.generateId(),
        type: 'task_created',
        agentId: this.agent.id,
        payload: { taskId: task.id, taskType: task.type },
        timestamp: new Date()
      });

      // Execute the actual task
      const result = await this.executeTask(task);
      
      // Update metrics
      const duration = Date.now() - startTime;
      task.actualDuration = duration;
      task.status = 'completed';
      task.completedAt = new Date();
      task.output = result;

      this.updateTaskMetrics(true, duration);
      
      // Emit task completed event
      this.emitEvent({
        id: this.generateId(),
        type: 'task_completed',
        agentId: this.agent.id,
        payload: { 
          taskId: task.id, 
          taskType: task.type, 
          duration,
          result 
        },
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      task.actualDuration = duration;
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error: error instanceof Error ? error.stack : error },
        timestamp: new Date(),
        recoverable: this.isRecoverableError(error)
      };

      this.updateTaskMetrics(false, duration);
      
      // Emit task failed event
      this.emitEvent({
        id: this.generateId(),
        type: 'task_failed',
        agentId: this.agent.id,
        payload: { 
          taskId: task.id, 
          taskType: task.type, 
          error: task.error,
          duration 
        },
        timestamp: new Date()
      });

      throw error;
    }
  }

  // Utility methods
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected isRecoverableError(error: any): boolean {
    // Default implementation - can be overridden by specific agents
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('network') || 
             message.includes('rate limit') ||
             message.includes('temporary');
    }
    return false;
  }

  private updateTaskMetrics(success: boolean, duration: number): void {
    const metrics = this.agent.metrics;
    
    if (success) {
      metrics.tasksCompleted++;
      if (metrics.tasksInProgress > 0) {
        metrics.tasksInProgress--;
      }
      metrics.lastTaskCompletedAt = new Date();
    } else {
      metrics.tasksFailed++;
      if (metrics.tasksInProgress > 0) {
        metrics.tasksInProgress--;
      }
    }

    // Update average response time
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    if (totalTasks > 0) {
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (totalTasks - 1) + duration) / totalTasks;
      
      metrics.successRate = (metrics.tasksCompleted / totalTasks) * 100;
      metrics.errorRate = (metrics.tasksFailed / totalTasks) * 100;
    }

    this.agent.metrics = metrics;
    this.agent.updatedAt = new Date();
  }

  private initializeAgent(): void {
    // Set initial status if not set
    if (!this.agent.status) {
      this.agent.status = 'inactive';
    }

    // Initialize metrics if not set
    if (!this.agent.metrics) {
      this.agent.metrics = {
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksFailed: 0,
        averageResponseTime: 0,
        successRate: 0,
        uptime: 0,
        errorRate: 0
      };
    }

    // Set timestamps
    if (!this.agent.createdAt) {
      this.agent.createdAt = new Date();
    }
    this.agent.updatedAt = new Date();
  }

  // Validation methods
  protected validateTask(task: AgentTask): void {
    if (!task.id) {
      throw new Error('Task ID is required');
    }
    if (!task.type) {
      throw new Error('Task type is required');
    }
    if (!task.agentId || task.agentId !== this.agent.id) {
      throw new Error('Task agent ID must match this agent');
    }
  }

  protected validateConfiguration(): void {
    const config = this.agent.configuration;
    if (!config) {
      throw new Error('Agent configuration is required');
    }
    if (typeof config.enabled !== 'boolean') {
      throw new Error('Agent enabled flag must be boolean');
    }
    if (!config.maxConcurrentTasks || config.maxConcurrentTasks < 1) {
      throw new Error('Max concurrent tasks must be a positive number');
    }
    if (!config.timeout || config.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
  }

  // Lifecycle methods
  public async start(): Promise<void> {
    try {
      this.validateConfiguration();
      this.updateStatus('initializing');
      await this.initialize();
      this.updateStatus('active');
    } catch (error) {
      this.updateStatus('error');
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.updateStatus('inactive');
      await this.cleanup();
    } catch (error) {
      this.updateStatus('error');
      throw error;
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}