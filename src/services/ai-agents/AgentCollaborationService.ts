import { 
  AgentCollaboration, 
  CollaborationWorkflow, 
  AIAgent,
  AgentTask,
  CollaborationStep
} from '../../types/ai-agents';
import { AgentCommunication } from './AgentCommunication';
import { agentOrchestrationService } from './AgentOrchestrationService';

/**
 * Service for managing agent collaborations and workflows
 */
class AgentCollaborationService {
  private communication: AgentCommunication;
  private collaborations: Map<string, AgentCollaboration> = new Map();

  constructor() {
    this.communication = AgentCommunication.getInstance();
  }

  /**
   * Get all collaborations
   */
  async getAllCollaborations(): Promise<AgentCollaboration[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return Array.from(this.collaborations.values());
  }

  /**
   * Get available agents for collaboration
   */
  async getAvailableAgents(): Promise<AIAgent[]> {
    try {
      return await agentOrchestrationService.getAllAgents();
    } catch (error) {
      console.error('Error getting available agents:', error);
      return [];
    }
  }

  /**
   * Create a new collaboration
   */
  async createCollaboration(
    name: string,
    description: string,
    participantIds: string[],
    coordinatorId: string,
    workflow: CollaborationWorkflow
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const collaborationId = this.generateCollaborationId();
    
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      name,
      description,
      participantAgents: participantIds,
      coordinatorAgentId: coordinatorId,
      workflow,
      status: 'active',
      createdAt: new Date()
    };

    this.collaborations.set(collaborationId, collaboration);

    // Start workflow execution
    this.executeWorkflow(collaboration);

    return collaborationId;
  }

  /**
   * Get collaboration details
   */
  async getCollaborationDetails(collaborationId: string): Promise<AgentCollaboration | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.collaborations.get(collaborationId) || null;
  }

  /**
   * Cancel a collaboration
   */
  async cancelCollaboration(collaborationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error(`Collaboration ${collaborationId} not found`);
    }

    collaboration.status = 'failed';
    collaboration.completedAt = new Date();

    // Notify all participants
    await this.notifyParticipants(collaboration, 'collaboration_cancelled');
  }

  /**
   * Pause a collaboration
   */
  async pauseCollaboration(collaborationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error(`Collaboration ${collaborationId} not found`);
    }

    if (collaboration.status !== 'active') {
      throw new Error(`Cannot pause collaboration in ${collaboration.status} state`);
    }

    collaboration.status = 'paused';
    
    await this.notifyParticipants(collaboration, 'collaboration_paused');
  }

  /**
   * Resume a collaboration
   */
  async resumeCollaboration(collaborationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error(`Collaboration ${collaborationId} not found`);
    }

    if (collaboration.status !== 'paused') {
      throw new Error(`Cannot resume collaboration in ${collaboration.status} state`);
    }

    collaboration.status = 'active';
    
    await this.notifyParticipants(collaboration, 'collaboration_resumed');
    
    // Resume workflow execution
    this.executeWorkflow(collaboration);
  }

  /**
   * Get collaborations for a specific agent
   */
  async getAgentCollaborations(agentId: string): Promise<AgentCollaboration[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return Array.from(this.collaborations.values()).filter(
      collab => collab.participantAgents.includes(agentId) || 
                collab.coordinatorAgentId === agentId
    );
  }

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
    averageDuration: number;
    successRate: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const collaborations = Array.from(this.collaborations.values());
    const total = collaborations.length;
    const active = collaborations.filter(c => c.status === 'active').length;
    const completed = collaborations.filter(c => c.status === 'completed').length;
    const failed = collaborations.filter(c => c.status === 'failed').length;
    const paused = collaborations.filter(c => c.status === 'paused').length;
    
    const completedCollabs = collaborations.filter(c => c.completedAt);
    const totalDuration = completedCollabs.reduce((sum, c) => {
      if (c.completedAt) {
        return sum + (c.completedAt.getTime() - c.createdAt.getTime());
      }
      return sum;
    }, 0);
    
    const averageDuration = completedCollabs.length > 0 ? totalDuration / completedCollabs.length : 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      active,
      completed,
      failed,
      paused,
      averageDuration,
      successRate
    };
  }

  /**
   * Execute a collaboration workflow
   */
  private async executeWorkflow(collaboration: AgentCollaboration): Promise<void> {
    try {
      const workflow = collaboration.workflow;
      const results: Record<string, any> = {};

      // Sort steps by order
      const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);

      for (const step of sortedSteps) {
        if (collaboration.status !== 'active') {
          break; // Stop execution if collaboration is paused or cancelled
        }

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
        try {
          const stepResult = await this.executeStep(step, results, collaboration);
          results[step.id] = stepResult;
        } catch (error) {
          // Handle step failure with retry policy
          const retryResult = await this.handleStepFailure(step, error, workflow.retryPolicy);
          if (retryResult.success) {
            results[step.id] = retryResult.result;
          } else {
            throw error;
          }
        }
      }

      // Mark collaboration as completed
      collaboration.status = 'completed';
      collaboration.completedAt = new Date();
      collaboration.results = results;

      await this.notifyParticipants(collaboration, 'collaboration_completed');

    } catch (error) {
      collaboration.status = 'failed';
      collaboration.completedAt = new Date();
      
      await this.notifyParticipants(collaboration, 'collaboration_failed');
      
      console.error(`Collaboration ${collaboration.id} failed:`, error);
    }
  }

  /**
   * Execute a single collaboration step
   */
  private async executeStep(
    step: CollaborationStep, 
    previousResults: Record<string, any>,
    collaboration: AgentCollaboration
  ): Promise<any> {
    // Create task for the step
    const task: Omit<AgentTask, 'id' | 'agentId' | 'createdAt' | 'retryCount'> = {
      type: step.taskType,
      priority: 'medium',
      status: 'pending',
      input: {
        ...step.input,
        previousResults,
        collaborationId: collaboration.id,
        stepId: step.id
      }
    };

    // Execute task with timeout
    return Promise.race([
      agentOrchestrationService.executeTask(step.agentId, task),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Step timeout')), step.timeout)
      )
    ]);
  }

  /**
   * Handle step failure with retry policy
   */
  private async handleStepFailure(
    step: CollaborationStep,
    error: any,
    retryPolicy: any
  ): Promise<{ success: boolean; result?: any }> {
    // Simplified retry logic
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        // Calculate delay based on backoff strategy
        const delay = this.calculateRetryDelay(attempt, retryPolicy);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry the step (simplified)
        console.log(`Retrying step ${step.id}, attempt ${attempt}`);
        
        // In a real implementation, this would re-execute the step
        if (Math.random() > 0.5) { // 50% chance of success on retry
          return { success: true, result: { retried: true, attempt } };
        }
      } catch (retryError) {
        console.error(`Retry attempt ${attempt} failed:`, retryError);
      }
    }

    return { success: false };
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(attempt: number, retryPolicy: any): number {
    const { backoffStrategy, baseDelay, maxDelay } = retryPolicy;
    
    let delay = baseDelay;
    
    switch (backoffStrategy) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = baseDelay;
        break;
    }
    
    return Math.min(delay, maxDelay);
  }

  /**
   * Notify all participants about collaboration events
   */
  private async notifyParticipants(
    collaboration: AgentCollaboration, 
    eventType: string
  ): Promise<void> {
    const allParticipants = [
      ...collaboration.participantAgents,
      collaboration.coordinatorAgentId
    ];

    const notifications = allParticipants.map(agentId => 
      this.communication.sendMessage({
        id: this.generateMessageId(),
        fromAgentId: 'system',
        toAgentId: agentId,
        type: 'notification',
        payload: {
          event: eventType,
          collaborationId: collaboration.id,
          collaboration: {
            name: collaboration.name,
            status: collaboration.status
          }
        },
        timestamp: new Date(),
        priority: 'medium'
      })
    );

    await Promise.all(notifications);
  }

  /**
   * Create a collaboration template
   */
  async createCollaborationTemplate(
    name: string,
    description: string,
    workflow: CollaborationWorkflow,
    tags: string[] = []
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const templateId = this.generateTemplateId();
    
    // In a real implementation, this would save the template
    console.log(`Created collaboration template: ${name}`);
    
    return templateId;
  }

  /**
   * Get collaboration templates
   */
  async getCollaborationTemplates(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock templates
    return [
      {
        id: 'template-1',
        name: 'Privacy Impact Assessment',
        description: 'Multi-agent workflow for comprehensive privacy impact assessment',
        tags: ['privacy', 'assessment', 'compliance'],
        workflow: {
          steps: [
            { order: 1, taskType: 'analyze_data_flow', agentId: 'placeholder' },
            { order: 2, taskType: 'assess_privacy_risks', agentId: 'placeholder' },
            { order: 3, taskType: 'generate_pia_report', agentId: 'placeholder' }
          ]
        }
      },
      {
        id: 'template-2',
        name: 'Incident Response',
        description: 'Coordinated incident response workflow across security and compliance agents',
        tags: ['security', 'incident', 'response'],
        workflow: {
          steps: [
            { order: 1, taskType: 'detect_incident', agentId: 'placeholder' },
            { order: 2, taskType: 'assess_impact', agentId: 'placeholder' },
            { order: 3, taskType: 'coordinate_response', agentId: 'placeholder' }
          ]
        }
      }
    ];
  }

  private generateCollaborationId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const agentCollaborationService = new AgentCollaborationService();