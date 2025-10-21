import { useState, useCallback } from 'react';
import { AgentAnalytics } from '../types/ai-agents';
import { agentAnalyticsService } from '../services/ai-agents/AgentAnalyticsService';

export const useAgentAnalytics = (agentId: string, timeRange: '1h' | '24h' | '7d' | '30d') => {
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAnalytics = useCallback(async () => {
    if (!agentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const analyticsData = await agentAnalyticsService.getAgentAnalytics(agentId, timeRange);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, timeRange]);

  const exportAnalytics = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    if (!agentId || !analytics) return;
    
    try {
      return await agentAnalyticsService.exportAnalytics(agentId, timeRange, format);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to export analytics');
    }
  }, [agentId, timeRange, analytics]);

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics,
    exportAnalytics
  };
};