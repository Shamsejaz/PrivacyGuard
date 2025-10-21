import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExternalApiService, CircuitBreaker } from '../services/ExternalApiService';
import type { ApiConnection, ApiRequest, RetryConfig, CircuitBreakerConfig } from '../services/ExternalApiService';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('ExternalApiService', () => {
  let service: ExternalApiService;

  beforeEach(() => {
    service = new ExternalApiService();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('API Connection Management', () => {
    it('should create an API connection successfully', async () => {
      const connection: ApiConnection = {
        id: 'test-api-1',
        name: 'Test API',
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'bearer',
          credentials: { token: 'test-token' }
        },
        timeout: 30000,
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await expect(service.createConnection(connection)).resolves.not.toThrow();
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('test-api-1');
      expect(connections[0].status).toBe('active');
    });

    it('should handle connection creation errors', async () => {
      const connection: ApiConnection = {
        id: 'test-api-fail',
        name: 'Failing API',
        baseUrl: 'https://invalid-api.example.com',
        status: 'inactive'
      };

      // Mock connection failure
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(service.createConnection(connection)).rejects.toThrow('Connection failed');
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].status).toBe('error');
    });

    it('should test connection health', async () => {
      const connection: ApiConnection = {
        id: 'test-health',
        name: 'Health Test API',
        baseUrl: 'https://api.example.com',
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await service.createConnection(connection);
      
      // Mock health check
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });
      
      const isHealthy = await service.testConnectionHealth('test-health');
      expect(isHealthy).toBe(true);
    });

    it('should update connection configuration', async () => {
      const connection: ApiConnection = {
        id: 'test-update',
        name: 'Update Test API',
        baseUrl: 'https://api.example.com',
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await service.createConnection(connection);
      
      // Mock update connection test
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });
      
      await service.updateConnection('test-update', {
        name: 'Updated API Name',
        timeout: 60000
      });
      
      const updatedConnection = service.getConnection('test-update');
      expect(updatedConnection?.name).toBe('Updated API Name');
      expect(updatedConnection?.timeout).toBe(60000);
    });

    it('should remove connections', async () => {
      const connection: ApiConnection = {
        id: 'test-remove',
        name: 'Remove Test API',
        baseUrl: 'https://api.example.com',
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await service.createConnection(connection);
      expect(service.getConnections()).toHaveLength(1);
      
      await service.removeConnection('test-remove');
      expect(service.getConnections()).toHaveLength(0);
    });
  });

  describe('API Request Execution', () => {
    beforeEach(async () => {
      const connection: ApiConnection = {
        id: 'test-requests',
        name: 'Request Test API',
        baseUrl: 'https://api.example.com',
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await service.createConnection(connection);
    });

    it('should execute successful API request', async () => {
      const request: ApiRequest = {
        id: 'test-req-1',
        connectionId: 'test-requests',
        method: 'GET',
        endpoint: '/users',
        data: null
      };

      // Mock successful API response
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({
        status: 200,
        data: { users: [] }
      });

      const response = await service.executeRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual({ users: [] });
      expect(response.retryCount).toBe(0);
    });

    it('should handle API request failures', async () => {
      const request: ApiRequest = {
        id: 'test-req-fail',
        connectionId: 'test-requests',
        method: 'GET',
        endpoint: '/users'
      };

      // Mock API failure
      const mockAxios = require('axios').default;
      const error = new Error('API request failed');
      error.response = { status: 500 };
      mockAxios.create().request.mockRejectedValue(error);

      const response = await service.executeRequest(request);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('API request failed');
    });

    it('should retry failed requests', async () => {
      const request: ApiRequest = {
        id: 'test-req-retry',
        connectionId: 'test-requests',
        method: 'GET',
        endpoint: '/users',
        retryOverride: {
          maxRetries: 2,
          baseDelay: 100,
          retryableStatusCodes: [500, 502, 503]
        }
      };

      const mockAxios = require('axios').default;
      const mockRequest = mockAxios.create().request;
      
      // First two calls fail, third succeeds
      mockRequest
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ status: 200, data: { success: true } });

      const response = await service.executeRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.retryCount).toBe(2);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should respect retry limits', async () => {
      const request: ApiRequest = {
        id: 'test-req-retry-limit',
        connectionId: 'test-requests',
        method: 'GET',
        endpoint: '/users',
        retryOverride: {
          maxRetries: 1,
          baseDelay: 10
        }
      };

      const mockAxios = require('axios').default;
      const mockRequest = mockAxios.create().request;
      
      // All calls fail
      mockRequest.mockRejectedValue(new Error('Persistent error'));

      const response = await service.executeRequest(request);
      
      expect(response.success).toBe(false);
      expect(response.retryCount).toBe(1);
      expect(mockRequest).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;
    let config: CircuitBreakerConfig;

    beforeEach(() => {
      config = {
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        expectedResponseTime: 1000
      };
      circuitBreaker = new CircuitBreaker(config);
    });

    it('should start in closed state', () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });

    it('should open circuit after failure threshold', async () => {
      const failingOperation = () => Promise.reject(new Error('Operation failed'));

      // Execute failing operations up to threshold
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe('open');
      expect(state.failureCount).toBe(config.failureThreshold);
    });

    it('should reject requests when circuit is open', async () => {
      const failingOperation = () => Promise.reject(new Error('Operation failed'));

      // Trigger circuit to open
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should be rejected immediately
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const failingOperation = () => Promise.reject(new Error('Operation failed'));

      // Trigger circuit to open
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState().state).toBe('open');

      // Wait for reset timeout (mock time passage)
      const state = circuitBreaker.getState();
      state.nextAttemptTime = new Date(Date.now() - 1000); // Set to past

      const successfulOperation = () => Promise.resolve('success');
      const result = await circuitBreaker.execute(successfulOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('closed');
    });

    it('should reset circuit on successful operation in half-open state', async () => {
      // Manually set to half-open state
      circuitBreaker['state'] = 'half-open';
      circuitBreaker['failureCount'] = 2;

      const successfulOperation = () => Promise.resolve('success');
      const result = await circuitBreaker.execute(successfulOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('closed');
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });

    it('should track response times', async () => {
      const slowOperation = () => new Promise(resolve => {
        setTimeout(() => resolve('slow response'), 1500);
      });

      // Mock console.warn to verify slow response warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await circuitBreaker.execute(slowOperation);
      
      // Should warn about slow response (>1000ms expected)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Slow response detected'));
      
      warnSpy.mockRestore();
    });

    it('should reset circuit breaker state', () => {
      // Set some state
      circuitBreaker['state'] = 'open';
      circuitBreaker['failureCount'] = 5;
      circuitBreaker['successCount'] = 10;
      circuitBreaker['totalRequests'] = 15;

      circuitBreaker.reset();

      const state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
      expect(state.totalRequests).toBe(0);
    });
  });

  describe('Connection Metrics', () => {
    beforeEach(async () => {
      const connection: ApiConnection = {
        id: 'test-metrics',
        name: 'Metrics Test API',
        baseUrl: 'https://api.example.com',
        status: 'inactive'
      };

      // Mock successful connection test
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValueOnce({ status: 200, data: {} });

      await service.createConnection(connection);
    });

    it('should track request metrics', async () => {
      const mockAxios = require('axios').default;
      const mockRequest = mockAxios.create().request;

      // Execute some successful requests
      mockRequest.mockResolvedValue({ status: 200, data: {} });
      
      for (let i = 0; i < 5; i++) {
        await service.executeRequest({
          id: `req-${i}`,
          connectionId: 'test-metrics',
          method: 'GET',
          endpoint: '/test'
        });
      }

      // Execute some failed requests
      mockRequest.mockRejectedValue(new Error('Request failed'));
      
      for (let i = 0; i < 2; i++) {
        await service.executeRequest({
          id: `req-fail-${i}`,
          connectionId: 'test-metrics',
          method: 'GET',
          endpoint: '/test'
        });
      }

      const metrics = service.getConnectionMetrics('test-metrics');
      
      expect(metrics.totalRequests).toBe(7);
      expect(metrics.successRate).toBeCloseTo(71.43, 1); // 5/7 * 100
      expect(metrics.errorRate).toBeCloseTo(28.57, 1); // 2/7 * 100
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should maintain request history', async () => {
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValue({ status: 200, data: {} });

      await service.executeRequest({
        id: 'history-test',
        connectionId: 'test-metrics',
        method: 'GET',
        endpoint: '/test'
      });

      const history = service.getRequestHistory('test-metrics');
      
      expect(history).toHaveLength(1);
      expect(history[0].requestId).toBe('history-test');
      expect(history[0].success).toBe(true);
    });

    it('should limit request history size', async () => {
      const mockAxios = require('axios').default;
      mockAxios.create().request.mockResolvedValue({ status: 200, data: {} });

      // Execute more than 100 requests (history limit)
      for (let i = 0; i < 105; i++) {
        await service.executeRequest({
          id: `req-${i}`,
          connectionId: 'test-metrics',
          method: 'GET',
          endpoint: '/test'
        });
      }

      const history = service.getRequestHistory('test-metrics');
      
      expect(history).toHaveLength(100); // Should be capped at 100
    });
  });

  describe('Authentication Handling', () => {
    it('should handle basic authentication', async () => {
      const connection: ApiConnection = {
        id: 'test-basic-auth',
        name: 'Basic Auth API',
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'basic',
          credentials: {
            username: 'testuser',
            password: 'testpass'
          }
        },
        status: 'inactive'
      };

      const mockAxios = require('axios').default;
      const mockCreate = mockAxios.create;
      const mockClient = {
        request: vi.fn().mockResolvedValue({ status: 200, data: {} }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      };
      mockCreate.mockReturnValue(mockClient);

      await service.createConnection(connection);

      // Verify axios was created with auth config
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            username: 'testuser',
            password: 'testpass'
          }
        })
      );
    });

    it('should handle bearer token authentication', async () => {
      const connection: ApiConnection = {
        id: 'test-bearer-auth',
        name: 'Bearer Auth API',
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'bearer',
          credentials: {
            token: 'test-bearer-token'
          }
        },
        status: 'inactive'
      };

      const mockAxios = require('axios').default;
      const mockCreate = mockAxios.create;
      const mockClient = {
        request: vi.fn().mockResolvedValue({ status: 200, data: {} }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      };
      mockCreate.mockReturnValue(mockClient);

      await service.createConnection(connection);

      // Verify axios was created with bearer token
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('should handle API key authentication', async () => {
      const connection: ApiConnection = {
        id: 'test-apikey-auth',
        name: 'API Key Auth API',
        baseUrl: 'https://api.example.com',
        authentication: {
          type: 'api_key',
          credentials: {
            headerName: 'X-API-Key',
            apiKey: 'test-api-key'
          }
        },
        status: 'inactive'
      };

      const mockAxios = require('axios').default;
      const mockCreate = mockAxios.create;
      const mockClient = {
        request: vi.fn().mockResolvedValue({ status: 200, data: {} }),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      };
      mockCreate.mockReturnValue(mockClient);

      await service.createConnection(connection);

      // Verify axios was created with API key header
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing connections', async () => {
      const request: ApiRequest = {
        id: 'test-missing-conn',
        connectionId: 'non-existent',
        method: 'GET',
        endpoint: '/test'
      };

      await expect(service.executeRequest(request)).rejects.toThrow('Connection not found: non-existent');
    });

    it('should handle retryable vs non-retryable errors', () => {
      const retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        retryableStatusCodes: [500, 502, 503],
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
      };

      // Test retryable status code error
      const retryableError = new Error('Request failed with status code 500');
      expect(service['isRetryableError'](retryableError, retryConfig)).toBe(true);

      // Test non-retryable status code error
      const nonRetryableError = new Error('Request failed with status code 404');
      expect(service['isRetryableError'](nonRetryableError, retryConfig)).toBe(false);

      // Test retryable connection error
      const connectionError = new Error('ECONNRESET');
      expect(service['isRetryableError'](connectionError, retryConfig)).toBe(true);
    });

    it('should calculate exponential backoff delays', () => {
      const retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [],
        retryableErrors: []
      };

      expect(service['calculateDelay'](1, retryConfig)).toBe(1000);
      expect(service['calculateDelay'](2, retryConfig)).toBe(2000);
      expect(service['calculateDelay'](3, retryConfig)).toBe(4000);
      expect(service['calculateDelay'](10, retryConfig)).toBe(10000); // Capped at maxDelay
    });
  });
});