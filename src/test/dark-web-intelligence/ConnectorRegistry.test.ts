import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectorRegistry } from '../../services/dark-web-intelligence/connectors/ConnectorRegistry';
import { MCPConnector } from '../../services/dark-web-intelligence/connectors/MCPConnector';
import {
  MCPConnectorConfig,
  CredentialQuery,
  MarketplaceQuery,
  BreachQuery
} from '../../services/dark-web-intelligence/types';

// Mock connector for testing
class MockMCPConnector extends MCPConnector {
  private mockHealthy: boolean = true;

  constructor(config: MCPConnectorConfig, healthy: boolean = true) {
    super(config);
    this.mockHealthy = healthy;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async searchCredentials(query: CredentialQuery) {
    return [
      {
        id: 'test-1',
        source: 'test-source',
        email: 'test@example.com',
        domain: 'example.com',
        exposureDate: new Date(),
        additionalData: {}
      }
    ];
  }

  async searchMarketplaces(query: MarketplaceQuery) {
    return [
      {
        id: 'market-1',
        source: 'test-source',
        title: 'Test Listing',
        description: 'Test description',
        category: 'test',
        seller: 'test-seller',
        postedDate: new Date(),
        url: 'https://test.com',
        keywords: ['test']
      }
    ];
  }

  async searchBreachDatabases(query: BreachQuery) {
    return [
      {
        id: 'breach-1',
        source: 'test-source',
        breachName: 'Test Breach',
        breachDate: new Date(),
        recordCount: 1000,
        dataTypes: ['email', 'password'],
        affectedDomains: ['example.com'],
        description: 'Test breach'
      }
    ];
  }

  async monitorKeywords(keywords: string[]) {
    return {
      id: 'monitor-1',
      keyword: keywords[0],
      matches: [],
      lastScanned: new Date(),
      nextScan: new Date()
    };
  }

  protected async checkAPIHealth(): Promise<boolean> {
    return this.mockHealthy;
  }

  getSourceHealth() {
    return {
      sourceId: this.config.sourceId,
      isHealthy: this.mockHealthy,
      lastCheck: new Date(),
      responseTime: 100,
      errorCount: this.mockHealthy ? 0 : 1
    };
  }
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  let mockConfig: MCPConnectorConfig;

  beforeEach(() => {
    registry = new ConnectorRegistry();
    mockConfig = {
      sourceId: 'test-source',
      apiEndpoint: 'https://api.test.com',
      credentialId: 'test-credentials',
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 10
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      healthCheckInterval: 300000
    };
  });

  afterEach(() => {
    registry.destroy();
    vi.clearAllMocks();
  });

  describe('connector management', () => {
    it('should register a connector successfully', async () => {
      const connector = new MockMCPConnector(mockConfig);
      
      await registry.registerConnector('test-source', connector);
      
      expect(registry.connectors.has('test-source')).toBe(true);
      expect(registry.healthStatuses.has('test-source')).toBe(true);
    });

    it('should unregister a connector', async () => {
      const connector = new MockMCPConnector(mockConfig);
      await registry.registerConnector('test-source', connector);
      
      const removed = registry.unregisterConnector('test-source');
      
      expect(removed).toBe(true);
      expect(registry.connectors.has('test-source')).toBe(false);
      expect(registry.healthStatuses.has('test-source')).toBe(false);
    });

    it('should return false when unregistering non-existent connector', () => {
      const removed = registry.unregisterConnector('non-existent');
      expect(removed).toBe(false);
    });

    it('should get a specific connector', async () => {
      const connector = new MockMCPConnector(mockConfig);
      await registry.registerConnector('test-source', connector);
      
      const retrieved = registry.getConnector('test-source');
      expect(retrieved).toBe(connector);
    });

    it('should return undefined for non-existent connector', () => {
      const retrieved = registry.getConnector('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('health monitoring', () => {
    it('should get healthy connectors only', async () => {
      const healthyConnector = new MockMCPConnector(mockConfig, true);
      const unhealthyConnector = new MockMCPConnector(
        { ...mockConfig, sourceId: 'unhealthy-source' },
        false
      );
      
      await registry.registerConnector('healthy-source', healthyConnector);
      await registry.registerConnector('unhealthy-source', unhealthyConnector);
      
      const healthyConnectors = registry.getHealthyConnectors();
      expect(healthyConnectors).toHaveLength(1);
    });

    it('should get all health statuses', async () => {
      const connector1 = new MockMCPConnector(mockConfig);
      const connector2 = new MockMCPConnector(
        { ...mockConfig, sourceId: 'source-2' }
      );
      
      await registry.registerConnector('source-1', connector1);
      await registry.registerConnector('source-2', connector2);
      
      const statuses = registry.getAllHealthStatuses();
      expect(statuses).toHaveLength(2);
    });

    it('should get registry statistics', async () => {
      const healthyConnector = new MockMCPConnector(mockConfig, true);
      const unhealthyConnector = new MockMCPConnector(
        { ...mockConfig, sourceId: 'unhealthy-source' },
        false
      );
      
      await registry.registerConnector('healthy-source', healthyConnector);
      await registry.registerConnector('unhealthy-source', unhealthyConnector);
      
      const stats = registry.getRegistryStats();
      expect(stats.totalConnectors).toBe(2);
      expect(stats.healthyConnectors).toBe(1);
      expect(stats.unhealthyConnectors).toBe(1);
    });
  });

  describe('search operations', () => {
    beforeEach(async () => {
      const connector = new MockMCPConnector(mockConfig);
      await registry.registerConnector('test-source', connector);
    });

    it('should search credentials across all connectors', async () => {
      const query: CredentialQuery = {
        emails: ['test@example.com'],
        domains: ['example.com'],
        usernames: [],
        apiKeyHashes: [],
        timeRange: {
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date()
        }
      };
      
      const results = await registry.searchCredentialsAcrossAll(query);
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('test@example.com');
    });

    it('should search marketplaces across all connectors', async () => {
      const query: MarketplaceQuery = {
        keywords: ['test'],
        domains: ['example.com'],
        categories: ['test'],
        timeRange: {
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date()
        }
      };
      
      const results = await registry.searchMarketplacesAcrossAll(query);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Listing');
    });

    it('should search breach databases across all connectors', async () => {
      const query: BreachQuery = {
        emails: ['test@example.com'],
        domains: ['example.com'],
        breachNames: [],
        timeRange: {
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date()
        }
      };
      
      const results = await registry.searchBreachDatabasesAcrossAll(query);
      expect(results).toHaveLength(1);
      expect(results[0].breachName).toBe('Test Breach');
    });

    it('should monitor keywords across all connectors', async () => {
      const keywords = ['test', 'example'];
      
      const results = await registry.monitorKeywordsAcrossAll(keywords);
      expect(results).toHaveLength(1);
      expect(results[0].keyword).toBe('test');
    });
  });

  describe('deduplication', () => {
    it('should deduplicate credential results', async () => {
      // Register multiple connectors that return duplicate results
      const connector1 = new MockMCPConnector(mockConfig);
      const connector2 = new MockMCPConnector({
        ...mockConfig,
        sourceId: 'source-2'
      });
      
      await registry.registerConnector('source-1', connector1);
      await registry.registerConnector('source-2', connector2);
      
      const query: CredentialQuery = {
        emails: ['test@example.com'],
        domains: ['example.com'],
        usernames: [],
        apiKeyHashes: [],
        timeRange: {
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date()
        }
      };
      
      const results = await registry.searchCredentialsAcrossAll(query);
      // Should deduplicate identical results from multiple sources
      expect(results).toHaveLength(1);
    });
  });
});