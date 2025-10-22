import { MCPConnector } from './MCPConnector';
import {
  ThreatIntelSource,
  SourceHealthStatus,
  ConnectorRegistry as IConnectorRegistry,
  CredentialQuery,
  MarketplaceQuery,
  BreachQuery,
  CredentialResult,
  MarketplaceResult,
  BreachResult,
  KeywordMonitorResult
} from '../types';

/**
 * Registry for managing multiple MCP threat intelligence connectors
 * Provides centralized access to all configured threat intelligence sources
 */
export class ConnectorRegistry implements IConnectorRegistry {
  public connectors: Map<string, MCPConnector> = new Map();
  public healthStatuses: Map<string, SourceHealthStatus> = new Map();
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly defaultHealthCheckInterval = 300000; // 5 minutes

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Register a new MCP connector
   */
  async registerConnector(sourceId: string, connector: MCPConnector): Promise<void> {
    try {
      await connector.initialize();
      this.connectors.set(sourceId, connector);
      this.healthStatuses.set(sourceId, connector.getSourceHealth());
      
      console.log(`Successfully registered connector for source: ${sourceId}`);
    } catch (error) {
      console.error(`Failed to register connector for source ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a connector
   */
  unregisterConnector(sourceId: string): boolean {
    const removed = this.connectors.delete(sourceId);
    this.healthStatuses.delete(sourceId);
    
    if (removed) {
      console.log(`Unregistered connector for source: ${sourceId}`);
    }
    
    return removed;
  }

  /**
   * Get a specific connector by source ID
   */
  getConnector(sourceId: string): MCPConnector | undefined {
    return this.connectors.get(sourceId);
  }

  /**
   * Get all registered connectors
   */
  getAllConnectors(): MCPConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get connectors by type
   */
  getConnectorsByType(type: ThreatIntelSource['type']): MCPConnector[] {
    // Note: This would require storing source metadata in the registry
    // For now, return all connectors - this can be enhanced later
    return this.getAllConnectors();
  }

  /**
   * Get health status for all connectors
   */
  getAllHealthStatuses(): SourceHealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * Get health status for a specific connector
   */
  getHealthStatus(sourceId: string): SourceHealthStatus | undefined {
    return this.healthStatuses.get(sourceId);
  }

  /**
   * Get only healthy connectors
   */
  getHealthyConnectors(): MCPConnector[] {
    return Array.from(this.connectors.entries())
      .filter(([sourceId]) => {
        const health = this.healthStatuses.get(sourceId);
        return health?.isHealthy === true;
      })
      .map(([, connector]) => connector);
  }

  /**
   * Search credentials across all healthy connectors
   */
  async searchCredentialsAcrossAll(query: CredentialQuery): Promise<CredentialResult[]> {
    const healthyConnectors = this.getHealthyConnectors();
    const results: CredentialResult[] = [];

    const searchPromises = healthyConnectors.map(async (connector) => {
      try {
        const connectorResults = await connector.searchCredentials(query);
        return connectorResults;
      } catch (error) {
        console.error(`Credential search failed for connector:`, error);
        return [];
      }
    });

    const allResults = await Promise.allSettled(searchPromises);
    
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    return this.deduplicateCredentialResults(results);
  }

  /**
   * Search marketplaces across all healthy connectors
   */
  async searchMarketplacesAcrossAll(query: MarketplaceQuery): Promise<MarketplaceResult[]> {
    const healthyConnectors = this.getHealthyConnectors();
    const results: MarketplaceResult[] = [];

    const searchPromises = healthyConnectors.map(async (connector) => {
      try {
        const connectorResults = await connector.searchMarketplaces(query);
        return connectorResults;
      } catch (error) {
        console.error(`Marketplace search failed for connector:`, error);
        return [];
      }
    });

    const allResults = await Promise.allSettled(searchPromises);
    
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    return this.deduplicateMarketplaceResults(results);
  }

  /**
   * Search breach databases across all healthy connectors
   */
  async searchBreachDatabasesAcrossAll(query: BreachQuery): Promise<BreachResult[]> {
    const healthyConnectors = this.getHealthyConnectors();
    const results: BreachResult[] = [];

    const searchPromises = healthyConnectors.map(async (connector) => {
      try {
        const connectorResults = await connector.searchBreachDatabases(query);
        return connectorResults;
      } catch (error) {
        console.error(`Breach database search failed for connector:`, error);
        return [];
      }
    });

    const allResults = await Promise.allSettled(searchPromises);
    
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    return this.deduplicateBreachResults(results);
  }

  /**
   * Monitor keywords across all healthy connectors
   */
  async monitorKeywordsAcrossAll(keywords: string[]): Promise<KeywordMonitorResult[]> {
    const healthyConnectors = this.getHealthyConnectors();
    const results: KeywordMonitorResult[] = [];

    const monitorPromises = healthyConnectors.map(async (connector) => {
      try {
        const connectorResult = await connector.monitorKeywords(keywords);
        return connectorResult;
      } catch (error) {
        console.error(`Keyword monitoring failed for connector:`, error);
        return null;
      }
    });

    const allResults = await Promise.allSettled(monitorPromises);
    
    allResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });

    return results;
  }

  /**
   * Perform health checks on all connectors
   */
  async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.connectors.entries()).map(
      async ([sourceId, connector]) => {
        try {
          await connector.performHealthCheck();
          this.healthStatuses.set(sourceId, connector.getSourceHealth());
        } catch (error) {
          console.error(`Health check failed for connector ${sourceId}:`, error);
        }
      }
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.defaultHealthCheckInterval
    );
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalConnectors: number;
    healthyConnectors: number;
    unhealthyConnectors: number;
    lastHealthCheck: Date;
  } {
    const totalConnectors = this.connectors.size;
    const healthyCount = Array.from(this.healthStatuses.values())
      .filter(status => status.isHealthy).length;
    
    const lastHealthCheck = Array.from(this.healthStatuses.values())
      .reduce((latest, status) => {
        return status.lastCheck > latest ? status.lastCheck : latest;
      }, new Date(0));

    return {
      totalConnectors,
      healthyConnectors: healthyCount,
      unhealthyConnectors: totalConnectors - healthyCount,
      lastHealthCheck
    };
  }

  /**
   * Deduplicate credential results based on email and username
   */
  private deduplicateCredentialResults(results: CredentialResult[]): CredentialResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.email}:${result.username || ''}:${result.domain}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate marketplace results based on URL and title
   */
  private deduplicateMarketplaceResults(results: MarketplaceResult[]): MarketplaceResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.url}:${result.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate breach results based on breach name and affected domains
   */
  private deduplicateBreachResults(results: BreachResult[]): BreachResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.breachName}:${result.affectedDomains.join(',')}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.connectors.clear();
    this.healthStatuses.clear();
  }
}