import { useState, useCallback } from 'react';
import { AgentCollaboration, CollaborationWorkflow, AIAgent } from '../types/ai-agents';
import { agentCollaborationService } from '../services/ai-agents/AgentCollaborationService';

export const useAgentCollaboration = () => {
  const [collaborations, setCollaborations] = useState<AgentCollaboration[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCollaborations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [collaborationsData, agentsData] = await Promise.all([
        agentCollaborationService.getAllCollaborations(),
        agentCollaborationService.getAvailableAgents()
      ]);
      
      setCollaborations(collaborationsData);
      setAvailableAgents(agentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collaborations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCollaboration = useCallback(async (
    name: string,
    description: string,
    participantIds: string[],
    coordinatorId: string,
    workflow: CollaborationWorkflow
  ) => {
    try {
      const collaborationId = await agentCollaborationService.createCollaboration(
        name,
        description,
        participantIds,
        coordinatorId,
        workflow
      );
      return collaborationId;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create collaboration');
    }
  }, []);

  const cancelCollaboration = useCallback(async (collaborationId: string) => {
    try {
      await agentCollaborationService.cancelCollaboration(collaborationId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to cancel collaboration');
    }
  }, []);

  const getCollaborationDetails = useCallback(async (collaborationId: string) => {
    try {
      return await agentCollaborationService.getCollaborationDetails(collaborationId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get collaboration details');
    }
  }, []);

  const pauseCollaboration = useCallback(async (collaborationId: string) => {
    try {
      await agentCollaborationService.pauseCollaboration(collaborationId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to pause collaboration');
    }
  }, []);

  const resumeCollaboration = useCallback(async (collaborationId: string) => {
    try {
      await agentCollaborationService.resumeCollaboration(collaborationId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to resume collaboration');
    }
  }, []);

  return {
    collaborations,
    availableAgents,
    isLoading,
    error,
    refreshCollaborations,
    createCollaboration,
    cancelCollaboration,
    getCollaborationDetails,
    pauseCollaboration,
    resumeCollaboration
  };
};