import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPConnector } from '../../services/dark-web-intelligence/connectors/MCPConnector';
import {
  MCPConnectorConfig,
  APICredentials
} from '../../services/dark-web-intelligence/types';

// Mock implementation of MCPConnector for testing
class TestMCPConnector extends MCPConnector {
  async searchCredentials() {
    return [];
  }

  async searchMarketplaces() {
    return [];
  }

  async searchBreachDatabases() {
    return [];
  }

  async monitorKeywords() {
    return { id: 'test', keyword: 'test', matches: [], lastScanned: new Date(), nextScan: new Date() };
  }

  protected async checkAPIHealth(): Promise<boolean> {
    return true;
  }
}

describe('MCPConnector', () => {
  let connector: TestMCPConnector;
  let mockConfig: MCPConnectorConfig;

  beforeEach(() => {
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

    connector = new TestMCPConnector(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeDefined();
      expect(connector.getSourceHealth().sourceId).toBe('test-source');
    });

    it('should start with healthy status', () => {
      const health = connector.getSourceHealth();
      expect(health.isHealthy).toBe(true);
      expect(health.errorCount).toBe(0);
    });
  });

  describe('health monitoring', () => {
    it('should perform health check successfully', async () => {
      const result = await connector.performHealthCheck();
      expect(result).toBe(true);
      
      const health = connector.getSourceHealth();
      expect(health.isHealthy).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should update health status on check', async () => {
      const initialHealth = connector.getSourceHealth();
      const initialTime = initialHealth.lastCheck;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await connector.performHealthCheck();
      
      const updatedHealth = connector.getSourceHealth();
      expect(updatedHealth.lastCheck.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors correctly', () => {
      const rateLimitError = { response: { status: 429 } };
      expect(connector['isRateLimitError'](rateLimitError)).toBe(true);
    });

    it('should identify retryable errors', () => {
      const networkError = { code: 'ECONNRESET' };
      const serverError = { response: { status: 500 } };
      const clientError = { response: { status: 400 } };
      
      expect(connector['isRetryableError'](networkError)).toBe(true);
      expect(connector['isRetryableError'](serverError)).toBe(true);
      expect(connector['isRetryableError'](clientError)).toBe(false);
    });

    it('should generate correct error codes', () => {
      const httpError = { response: { status: 404 } };
      const codeError = { code: 'TIMEOUT' };
      const unknownError = { message: 'Unknown error' };
      
      expect(connector['getErrorCode'](httpError)).toBe('HTTP_404');
      expect(connector['getErrorCode'](codeError)).toBe('TIMEOUT');
      expect(connector['getErrorCode'](unknownError)).toBe('UNKNOWN_ERROR');
    });

    it('should handle executeRequest with retry logic', async () => {
      const mockRequestFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      // Mock rate limiter
      vi.spyOn(connector['rateLimiter'], 'waitForToken').mockResolvedValue();
      
      // Mock credentials and secrets manager
      vi.spyOn(connector['secretsManager'], 'getCredentials')
        .mockResolvedValue({ apiKey: 'test-key' });

      const result = await connector['executeRequest'](mockRequestFn, 'test operation');
      
      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('credential management', () => {
    it('should handle missing credentials gracefully', () => {
      expect(() => connector['getCredentials']()).toThrow('No credentials available');
    });

    it('should refresh credentials when needed', async () => {
      // Mock the secrets manager to return credentials
      const mockCredentials: APICredentials = {
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key'
      };

      vi.spyOn(connector['secretsManager'], 'getCredentials')
        .mockResolvedValue(mockCredentials);

      await connector['refreshCredentials']();
      
      const credentials = connector['getCredentials']();
      expect(credentials).toEqual(mockCredentials);
    });

    it('should handle credential refresh failures', async () => {
      vi.spyOn(connector['secretsManager'], 'getCredentials')
        .mockRejectedValue(new Error('Secrets Manager error'));

      await expect(connector['refreshCredentials']()).rejects.toThrow('Failed to refresh credentials');
    });
  });
});