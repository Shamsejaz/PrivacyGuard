import { 
  AgentEvent, 
  AgentMessage, 
  AgentCollaboration, 
  CollaborationWorkflow,
  CollaborationStep,
  AgentTask
} from '../../types/ai-agents';
import { BaseAgent } from './BaseAgent';
import { AgentRegistry } from './AgentRegistry';

/**
 * Handles communication and collaboration between AI agents
 */
export class AgentCommunication {
  private static instance: AgentCommunication;
  private registry: AgentRegistry;
  private eventBus: Map<string, ((event: AgentEvent) => void)[]> = new Map();
  private messageQueue: AgentMessage[] = [];
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private isProcessingMessages = false;

  private constructor() {
    this.registry = AgentRegistry.getInstance();
    this.startMessageProcessing();
  }

  public static getInstance(): AgentCommunication {
    if (!AgentCommunication.instance) {
      AgentCommunication.instance = new AgentCommunication();
    }
    return AgentCommunication.instance;
  }

  /**
   * Subscribe to agent events
   */
  public subscribeToEvents(
    eventType: string, 
    callback: (event: AgentEvent) => void
  ): void {
    if (!this.eventBus.has(eventType)) {
      this.eventBus.set(eventType, []);
    }
    this.eventBus.get(eventType)!.push(callback);
  }

  /**
   * Unsubscribe from agent events
   */
  public unsubscribeFromEvents(
    eventType: string, 
    callback: (event: AgentEvent) => void
  ): void {
    const callbacks = this.eventBus.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Publish an event to all subscribers
   */
  public publishEvent(event: AgentEvent): void {
    const callbacks = this.eventBus.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event callback for ${event.type}:`, error);
        }
      });
    }

    // Also publish to 'all' subscribers
    const allCallbacks = this.eventBus.get('all');
    if (allCallbacks) {
      allCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in 'all' event callback:`, error);
        }
      });
    }
  }

  /**
   * Send a message between agents
   */
  public async sendMessage(message: AgentMessage): Promise<void> {
    // Validate message
    this.validateMessage(message);

    // Add to message queue
    this.messageQueue.push(message);

    // If not already processing, start processing
    if (!this.isProcessingMessages) {
      this.processMessageQueue();
    }
  }

  /**
   * Send a request message and wait for response
   */
  public async sendRequest(
    fromAgentId: string,
    toAgentId: string,
    requestType: string,
    payload: Record<string, any>,
    timeout: number = 30000
  ): Promise<any> {
    const correlationId = this.generateCorrelationId();
    
    const requestMessage: AgentMessage = {
      id: this.generateMessageId(),
      fromAgentId,
      toAgentId,
      type: 'request',
      payload: {
        requestType,
        ...payload
      },
      timestamp: new Date(),
      correlationId,
      priority: 'medium'
    };

    // Send the request
    await this.sendMessage(requestMessage);

    // Wait for response
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribeFromEvents('message_received', responseHandler);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      const responseHandler = (event: AgentEvent) => {
        if (event.type === 'message_received') {
          const message = event.payload.message as AgentMessage;
          if (message.type === 'response' && 
              message.correlationId === correlationId &&
              message.fromAgentId === toAgentId) {
            clearTimeout(timeoutId);
            this.unsubscribeFromEvents('message_received', responseHandler);
            
            if (message.payload.error) {
              reject(new Error(message.payload.error));
            } else {
              resolve(message.payload.result);
            }
          }
        }
      };

      this.subscribeToEvents('message_received', responseHandler);
    });
  }

  /**
   * Broadcast a message to all agents of a specific type
   */
  public async broadcastMessage(
    fromAgentId: string,
    targetType: string,
    messageType: string,
    payload: Record<string, any>
  ): Promise<void> {
    const agents = this.registry.getAllAgents();
    const targetAgents = agents.filter(agent => 
      agent.getType() === targetType && agent.getId() !== fromAgentId
    );

    const promises = targetAgents.map(agent => {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        fromAgentId,
        toAgentId: agent.getId(),
        type: messageType,
        payload,
        timestamp: new Date(),
        priority: 'medium'
      };
      return this.sendMessage(message);
    });

    await Promise.all(promises);
  }

  /**
   * Create a collaboration between multiple agents
   */
  public async createCollaboration(
    name: string,
    description: string,
    participantAgentIds: string[],
    coordinatorAgentId: string,
    workflow: CollaborationWorkflow
  ): Promise<string> {
    // Validate participants
    for (const agentId of participantAgentIds) {
      if (!this.registry.isAgentRegistered(agentId)) {
        throw new Error(`Agent ${agentId} is not registered`);
      }
    }

    if (!this.registry.isAgentRegistered(coordinatorAgentId)) {
      throw new Error(`Coordinator agent ${coordinatorAgentId} is not registered`);
    }

    const collaborationId = this.generateCollaborationId();
    
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      name,
      description,
      participantAgents: participantAgentIds,
      coordinatorAgentId,
      workflow,
      status: 'active',
      createdAt: new Date()
    };

    this.collaborations.set(collaborationId, collaboration);

    // Notify all participants about the collaboration
    const notificationPromises = participantAgentIds.map(agentId => {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        fromAgentId: 'system',
        toAgentId: agentId,
        type: 'collaboration',
        payload: {
          action: 'collaboration_created',
          collaborationId,
          collaboration
        },
        timestamp: new Date(),
        priority: 'high'
      };
      return this.sendMessage(message);
    });

    await Promise.all(notificationPromises);

    // Start workflow execution
    this.executeCollaborationWorkflow(collaborationId);

    return collaborationId;
  }

  /**
   * Get collaboration by ID
   */
  public getCollaboration(collaborationId: string): AgentCollaboration | undefined {
    return this.collaborations.get(collaborationId);
  }

  /**
   * Get all collaborations
   */
  public getAllCollaborations(): AgentCollaboration[] {
    return Array.from(this.collaborations.values());
  }

  /**
   * Get active collaborations for an agent
   */
  public getAgentCollaborations(agentId: string): AgentCollaboration[] {
    return Array.from(this.collaborations.values()).filter(
      collab => collab.participantAgents.includes(agentId) || 
                collab.coordinatorAgentId === agentId
    );
  }

  /**
   * Cancel a collaboration
   */
  public async cancelCollaboration(collaborationId: string): Promise<void> {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error(`Collaboration ${collaborationId} not found`);
    }

    collaboration.status = 'failed';
    collaboration.completedAt = new Date();

    // Notify all participants
    const notificationPromises = collaboration.participantAgents.map(agentId => {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        fromAgentId: 'system',
        toAgentId: agentId,
        type: 'collaboration',
        payload: {
          action: 'collaboration_cancelled',
          collaborationId
        },
        timestamp: new Date(),
        priority: 'high'
      };
      return this.sendMessage(message);
    });

    await Promise.all(notificationPromises);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingMessages) {
      return;
    }

    this.isProcessingMessages = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.deliverMessage(message);
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessingMessages = false;
    }
  }

  private async deliverMessage(message: AgentMessage): Promise<void> {
    try {
      const targetAgent = this.registry.getAgent(message.toAgentId);
      
      if (!targetAgent) {
        console.warn(`Target agent ${message.toAgentId} not found for message ${message.id}`);
        return;
      }

      // Deliver message to agent
      await targetAgent.handleMessage(message);

      // Publish message received event
      this.publishEvent({
        id: this.generateEventId(),
        type: 'message_received',
        agentId: message.toAgentId,
        payload: { message },
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`Error delivering message ${message.id}:`, error);
      
      // Publish message delivery failed event
      this.publishEvent({
        id: this.generateEventId(),
        type: 'message_delivery_failed',
        agentId: message.toAgentId,
        payload: { 
          message, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date()
      });
    }
  }

  private async executeCollaborationWorkflow(collaborationId: string): Promise<void> {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      return;
    }

    try {
      const workflow = collaboration.workflow;
      const results: Record<string, any> = {};

      // Sort steps by order
      const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);

      for (const step of sortedSteps) {
        // Check dependencies
        const dependencies = workflow.dependencies.filter(dep => dep.stepId === step.id);
        for (const dependency of dependencies) {
          for (const depStepId of dependency.dependsOn) {
            if (!results[depStepId]) {
              throw new Error(`Dependency ${depStepId} not completed for step ${step.id}`);
            }
          }
        }

        // Execute step
        const stepResult = await this.executeCollaborationStep(step, results);
        results[step.id] = stepResult;
      }

      // Mark collaboration as completed
      collaboration.status = 'completed';
      collaboration.completedAt = new Date();
      collaboration.results = results;

    } catch (error) {
      collaboration.status = 'failed';
      collaboration.completedAt = new Date();
      console.error(`Collaboration ${collaborationId} failed:`, error);
    }
  }

  private async executeCollaborationStep(
    step: CollaborationStep, 
    previousResults: Record<string, any>
  ): Promise<any> {
    const agent = this.registry.getAgent(step.agentId);
    if (!agent) {
      throw new Error(`Agent ${step.agentId} not found for step ${step.id}`);
    }

    // Create task for the step
    const task: AgentTask = {
      id: this.generateTaskId(),
      agentId: step.agentId,
      type: step.taskType,
      priority: 'medium',
      status: 'pending',
      input: {
        ...step.input,
        previousResults
      },
      createdAt: new Date(),
      retryCount: 0
    };

    // Execute task with timeout
    return Promise.race([
      agent.executeTaskWithMetrics(task),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Step timeout')), step.timeout)
      )
    ]);
  }

  private validateMessage(message: AgentMessage): void {
    if (!message.id) {
      throw new Error('Message ID is required');
    }
    if (!message.fromAgentId) {
      throw new Error('From agent ID is required');
    }
    if (!message.toAgentId) {
      throw new Error('To agent ID is required');
    }
    if (!message.type) {
      throw new Error('Message type is required');
    }
  }

  private startMessageProcessing(): void {
    // Process message queue every 100ms
    setInterval(() => {
      if (this.messageQueue.length > 0 && !this.isProcessingMessages) {
        this.processMessageQueue();
      }
    }, 100);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCollaborationId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}