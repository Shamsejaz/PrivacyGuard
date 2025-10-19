/**
 * Natural Language Query API
 * REST endpoints for processing natural language queries about compliance
 */

import { AgentController } from '../orchestration/agent-controller';
import {
  APIResponse,
  PaginatedResponse,
  NaturalLanguageQueryRequest,
  QuerySuggestion,
  ConversationHistoryParams,
  ConversationEntry
} from './types';
import {
  QueryResponse,
  ConversationContext
} from '../types';

export class QueryAPI {
  private agentController: AgentController;
  private conversationHistory: Map<string, ConversationEntry[]> = new Map();
  private queryCache: Map<string, QueryResponse> = new Map();

  constructor(agentController: AgentController) {
    this.agentController = agentController;
  }

  /**
   * POST /api/query
   * Process a natural language query about compliance
   */
  async processQuery(request: NaturalLanguageQueryRequest): Promise<APIResponse<QueryResponse>> {
    try {
      // Validate request
      if (!request.query || request.query.trim().length === 0) {
        return {
          success: false,
          error: 'Query cannot be empty',
          timestamp: new Date().toISOString()
        };
      }

      // Check cache for similar queries
      const cacheKey = this.generateCacheKey(request.query, request.conversationId);
      const cachedResponse = this.queryCache.get(cacheKey);
      
      if (cachedResponse && this.isCacheValid(cachedResponse)) {
        return {
          success: true,
          data: cachedResponse,
          message: 'Response from cache',
          timestamp: new Date().toISOString()
        };
      }

      // Build conversation context
      const context = await this.buildConversationContext(request);

      // Process query through the agent's natural language interface
      const response = await this.agentController.processQuery(request.query, context);

      // Cache the response
      this.queryCache.set(cacheKey, response);

      // Store in conversation history
      await this.storeConversationEntry(request, response);

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query processing failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/query/suggestions
   * Get query suggestions based on current compliance state
   */
  async getQuerySuggestions(): Promise<APIResponse<QuerySuggestion[]>> {
    try {
      const suggestions: QuerySuggestion[] = [
        {
          text: "What are my current critical compliance issues?",
          category: "Status",
          description: "Get an overview of critical compliance findings that need immediate attention"
        },
        {
          text: "Show me all GDPR violations in the last 30 days",
          category: "Compliance",
          description: "Filter findings by regulation and time period"
        },
        {
          text: "What S3 buckets have encryption issues?",
          category: "Security",
          description: "Find specific resource types with security problems"
        },
        {
          text: "Generate a DPIA report for our data processing activities",
          category: "Reporting",
          description: "Create compliance reports for regulatory requirements"
        },
        {
          text: "How can I fix the IAM overprivileged access issues?",
          category: "Remediation",
          description: "Get guidance on resolving specific compliance issues"
        },
        {
          text: "What is our overall compliance score?",
          category: "Metrics",
          description: "Get high-level compliance health metrics"
        },
        {
          text: "Show me remediation history for finding ID xyz-123",
          category: "History",
          description: "Track remediation actions for specific findings"
        },
        {
          text: "What are the legal implications of our current PII exposure?",
          category: "Legal",
          description: "Understand regulatory impact of compliance issues"
        }
      ];

      // Add dynamic suggestions based on current state
      const dynamicSuggestions = await this.generateDynamicSuggestions();
      suggestions.push(...dynamicSuggestions);

      return {
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get query suggestions',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/query/conversations
   * Get paginated conversation history
   */
  async getConversationHistory(params: ConversationHistoryParams = {}): Promise<PaginatedResponse<ConversationEntry>> {
    try {
      let allEntries: ConversationEntry[] = [];

      // Collect entries from all conversations or specific conversation
      if (params.conversationId) {
        const entries = this.conversationHistory.get(params.conversationId) || [];
        allEntries = entries;
      } else {
        for (const entries of this.conversationHistory.values()) {
          allEntries.push(...entries);
        }
      }

      // Apply filters
      if (params.userId) {
        allEntries = allEntries.filter(entry => entry.userId === params.userId);
      }

      if (params.dateFrom) {
        const fromDate = new Date(params.dateFrom);
        allEntries = allEntries.filter(entry => new Date(entry.timestamp) >= fromDate);
      }

      if (params.dateTo) {
        const toDate = new Date(params.dateTo);
        allEntries = allEntries.filter(entry => new Date(entry.timestamp) <= toDate);
      }

      // Sort by timestamp (newest first)
      allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedEntries = allEntries.slice(startIndex, endIndex);
      const totalPages = Math.ceil(allEntries.length / limit);

      return {
        success: true,
        data: paginatedEntries,
        pagination: {
          page,
          limit,
          total: allEntries.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get conversation history',
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/query/conversations/:id
   * Get specific conversation thread
   */
  async getConversation(conversationId: string): Promise<APIResponse<ConversationEntry[]>> {
    try {
      const entries = this.conversationHistory.get(conversationId);
      
      if (!entries) {
        return {
          success: false,
          error: `Conversation with ID ${conversationId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      // Sort by timestamp (oldest first for conversation flow)
      const sortedEntries = entries.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        success: true,
        data: sortedEntries,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * DELETE /api/query/conversations/:id
   * Delete a conversation thread
   */
  async deleteConversation(conversationId: string): Promise<APIResponse<{ message: string }>> {
    try {
      const entries = this.conversationHistory.get(conversationId);
      
      if (!entries) {
        return {
          success: false,
          error: `Conversation with ID ${conversationId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      this.conversationHistory.delete(conversationId);

      return {
        success: true,
        data: { message: 'Conversation deleted successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/query/explain/:findingId
   * Get natural language explanation of a specific finding
   */
  async explainFinding(findingId: string): Promise<APIResponse<{
    explanation: string;
    legalContext: string;
    recommendations: string[];
    confidence: number;
  }>> {
    try {
      // Create a query to explain the finding
      const query = `Explain finding ${findingId} in detail, including legal implications and recommended actions`;
      
      const response = await this.agentController.processQuery(query);

      // Parse the response to extract structured information
      const explanation = response.answer;
      const legalContext = this.extractLegalContext(response);
      const recommendations = response.suggestedActions;
      const confidence = response.confidence;

      return {
        success: true,
        data: {
          explanation,
          legalContext,
          recommendations,
          confidence
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to explain finding',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * DELETE /api/query/cache
   * Clear query cache
   */
  async clearQueryCache(): Promise<APIResponse<{ message: string }>> {
    try {
      this.queryCache.clear();

      return {
        success: true,
        data: { message: 'Query cache cleared successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear query cache',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private generateCacheKey(query: string, conversationId?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `${normalizedQuery}:${conversationId || 'default'}`;
  }

  private isCacheValid(response: QueryResponse): boolean {
    // Cache is valid for 5 minutes
    const cacheValidityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    
    // Assuming we store a timestamp in the response (would need to add this)
    // For now, we'll consider cache always valid for this implementation
    return true;
  }

  private async buildConversationContext(request: NaturalLanguageQueryRequest): Promise<ConversationContext | undefined> {
    if (!request.conversationId) {
      return undefined;
    }

    const entries = this.conversationHistory.get(request.conversationId) || [];
    const previousQueries = entries.map(entry => entry.query);

    return {
      conversationId: request.conversationId,
      userId: 'default-user', // In a real implementation, this would come from authentication
      previousQueries,
      context: request.context || {}
    };
  }

  private async storeConversationEntry(
    request: NaturalLanguageQueryRequest,
    response: QueryResponse
  ): Promise<void> {
    const conversationId = request.conversationId || response.conversationId;
    
    if (!conversationId) {
      return; // No conversation to store
    }

    const entry: ConversationEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      query: request.query,
      response,
      timestamp: new Date().toISOString(),
      userId: 'default-user' // In a real implementation, this would come from authentication
    };

    const entries = this.conversationHistory.get(conversationId) || [];
    entries.push(entry);
    this.conversationHistory.set(conversationId, entries);

    // Limit conversation history to last 50 entries per conversation
    if (entries.length > 50) {
      entries.splice(0, entries.length - 50);
    }
  }

  private async generateDynamicSuggestions(): Promise<QuerySuggestion[]> {
    try {
      // Get current system status to generate relevant suggestions
      const systemStatus = await this.agentController.getSystemStatus();
      const suggestions: QuerySuggestion[] = [];

      // Add suggestions based on active workflows
      if (systemStatus.activeWorkflows > 0) {
        suggestions.push({
          text: "What workflows are currently running?",
          category: "Status",
          description: `Check status of ${systemStatus.activeWorkflows} active workflows`
        });
      }

      // Add suggestions based on system health
      if (systemStatus.status !== 'HEALTHY') {
        suggestions.push({
          text: "What services are currently unhealthy?",
          category: "System",
          description: "Check which services need attention"
        });
      }

      // Add time-based suggestions
      const now = new Date();
      const lastScan = systemStatus.lastScan;
      const timeSinceLastScan = now.getTime() - lastScan.getTime();
      
      if (timeSinceLastScan > 24 * 60 * 60 * 1000) { // More than 24 hours
        suggestions.push({
          text: "Run a new compliance scan",
          category: "Action",
          description: "Last scan was more than 24 hours ago"
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate dynamic suggestions:', error);
      return [];
    }
  }

  private extractLegalContext(response: QueryResponse): string {
    // Extract legal context from sources and related findings
    const legalSources = response.sources.filter(source => 
      source.includes('GDPR') || 
      source.includes('PDPL') || 
      source.includes('CCPA') ||
      source.includes('Article')
    );

    if (legalSources.length > 0) {
      return `Legal context based on: ${legalSources.join(', ')}`;
    }

    // Check related findings for legal mappings
    const legalFindings = response.relatedFindings.filter(finding => 
      finding.description.includes('GDPR') ||
      finding.description.includes('PDPL') ||
      finding.description.includes('CCPA')
    );

    if (legalFindings.length > 0) {
      return `Related legal compliance issues found in ${legalFindings.length} findings`;
    }

    return 'No specific legal context identified';
  }
}