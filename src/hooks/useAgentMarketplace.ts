import { useState, useCallback } from 'react';
import { AgentMarketplaceEntry, AgentType } from '../types/ai-agents';
import { agentMarketplaceService } from '../services/ai-agents/AgentMarketplaceService';

interface SearchFilters {
  category?: string;
  type?: AgentType | 'all';
  priceFilter?: 'all' | 'free' | 'paid';
  sortBy?: 'popularity' | 'rating' | 'newest' | 'price';
}

export const useAgentMarketplace = () => {
  const [agents, setAgents] = useState<AgentMarketplaceEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMarketplace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [agentsData, categoriesData] = await Promise.all([
        agentMarketplaceService.getAllAgents(),
        agentMarketplaceService.getCategories()
      ]);
      
      setAgents(agentsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchAgents = useCallback(async (query: string, filters: SearchFilters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await agentMarketplaceService.searchAgents(query, filters);
      setAgents(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const installAgent = useCallback(async (agentId: string, config?: any) => {
    try {
      await agentMarketplaceService.installAgent(agentId, config);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to install agent');
    }
  }, []);

  const getAgentDetails = useCallback(async (agentId: string) => {
    try {
      return await agentMarketplaceService.getAgentDetails(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get agent details');
    }
  }, []);

  const addToWishlist = useCallback(async (agentId: string) => {
    try {
      await agentMarketplaceService.addToWishlist(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add to wishlist');
    }
  }, []);

  const removeFromWishlist = useCallback(async (agentId: string) => {
    try {
      await agentMarketplaceService.removeFromWishlist(agentId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove from wishlist');
    }
  }, []);

  return {
    agents,
    categories,
    isLoading,
    error,
    refreshMarketplace,
    searchAgents,
    installAgent,
    getAgentDetails,
    addToWishlist,
    removeFromWishlist
  };
};