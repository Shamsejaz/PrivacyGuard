import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface ApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
    credentials: Record<string, string>;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date;
  lastError?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  expectedResponseTime: number; // milliseconds
}

export interface ApiRequest {
  id: string;
  connectionId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryOverride?: Partial<RetryConfig>;
}

export interface ApiResponse {
  requestId: string;
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  responseTime: number;
  retryCount: number;
  timestamp: Date;
}

export interface CircuitBreakerState {
  connectionId: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
  totalRequests: number;
}

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private successCount = 0;
  private totalRequests = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < (this.nextAttemptTime?.getTime() || 0)) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    this.totalRequests++;
    const startTime = Date.now();

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(responseTime: number): void {
    this.successCount++;
    
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
    }

    // Monitor response time
    if (responseTime > this.config.expectedResponseTime) {
      logger.warn(`Slow response detected: ${responseTime}ms`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
      logger.warn(`Circuit breaker opened due to ${this.failureCount} failures`);
    }
  }

  getState(): CircuitBreakerState {
    return {
      connectionId: '', // Will be set by the service
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      successCount: this.successCount,
      totalRequests: this.totalRequests
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }
}

export class ExternalApiService extends EventEmitter {
  private connections: Map<string, ApiConnection> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestHistory: Map<string, ApiResponse[]> = new Map();

  constructor() {
    super();
  }

  // Connection Management
  async createConnection(connection: ApiConnection): Promise<void> {
    try {
      // Create axios instance
      const client = this.createAxiosClient(connection);
      
      // Test connection
      await this.testConnection(connection, client);
      
      // Store connection and client
      this.connections.set(connection.id, {
        ...connection,
        status: 'active',
        lastUsed: new Date()
      });
      
      this.clients.set(connection.id, client);
      
      // Create circuit breaker if configured
      if (connection.circuitBreakerConfig) {
        const circuitBreaker = new CircuitBreaker(connection.circuitBreakerConfig);
        this.circuitBreakers.set(connection.id, circuitBreaker);
      }
      
      this.emit('connection:created', connection);
      logger.info(`External API connection created: ${connection.name}`);
      
    } catch (error) {
      const failedConnection = {
        ...connection,
        status: 'error' as const,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.connections.set(connection.id, failedConnection);
      this.emit('connection:error', failedConnection);
      
      logger.error(`Failed to create external API connection: ${connection.name}`, error);
      throw error;
    }
  }

  private createAxiosClient(connection: ApiConnection): AxiosInstance {
    const config: AxiosRequestConfig = {
      baseURL: connection.baseUrl,
      timeout: connection.timeout || 30000,
      headers: connection.headers || {}
    };

    // Setup authentication
    if (connection.authentication) {
      switch (connection.authentication.type) {
        case 'basic':
          const { username, password } = connection.authentication.credentials;
          config.auth = { username, password };
          break;
          
        case 'bearer':
          config.headers!['Authorization'] = `Bearer ${connection.authentication.credentials.token}`;
          break;
          
        case 'api_key':
          const { headerName, apiKey } = connection.authentication.credentials;
          config.headers![headerName || 'X-API-Key'] = apiKey;
          break;
          
        case 'oauth2':
          // OAuth2 would require more complex implementation
          config.headers!['Authorization'] = `Bearer ${connection.authentication.credentials.accessToken}`;
          break;
      }
    }

    const client = axios.create(config);

    // Add request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );

    return client;
  }

  private async testConnection(connection: ApiConnection, client: AxiosInstance): Promise<void> {
    try {
      // Try a simple GET request to test connectivity
      await client.get('/health', { timeout: 5000 });
    } catch (error) {
      // If /health doesn't exist, try the base URL
      try {
        await client.get('/', { timeout: 5000 });
      } catch (secondError) {
        // If both fail, throw the original error
        throw error;
      }
    }
  }

  // API Request Execution
  async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    const startTime = Date.now();
    const requestId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection = this.connections.get(request.connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${request.connectionId}`);
    }

    const client = this.clients.get(request.connectionId);
    if (!client) {
      throw new Error(`Client not found: ${request.connectionId}`);
    }

    const circuitBreaker = this.circuitBreakers.get(request.connectionId);
    const retryConfig = this.getRetryConfig(connection, request.retryOverride);

    let lastError: Error | null = null;
    let retryCount = 0;

    // Execute with circuit breaker if available
    const executeOperation = async (): Promise<ApiResponse> => {
      const operation = async () => {
        const axiosConfig: AxiosRequestConfig = {
          method: request.method,
          url: request.endpoint,
          data: request.data,
          headers: request.headers,
          timeout: request.timeout || connection.timeout
        };

        const response = await client.request(axiosConfig);
        
        return {
          requestId,
          success: true,
          statusCode: response.status,
          data: response.data,
          responseTime: Date.now() - startTime,
          retryCount,
          timestamp: new Date()
        };
      };

      if (circuitBreaker) {
        return await circuitBreaker.execute(operation);
      } else {
        return await operation();
      }
    };

    // Retry logic
    while (retryCount <= retryConfig.maxRetries) {
      try {
        const result = await executeOperation();
        
        // Update connection status
        connection.status = 'active';
        connection.lastUsed = new Date();
        this.connections.set(request.connectionId, connection);
        
        // Store in history
        this.addToHistory(request.connectionId, result);
        
        this.emit('request:success', result);
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        // Check if error is retryable
        if (retryCount <= retryConfig.maxRetries && this.isRetryableError(lastError, retryConfig)) {
          const delay = this.calculateDelay(retryCount, retryConfig);
          logger.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount}/${retryConfig.maxRetries}):`, lastError.message);
          
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    // All retries failed
    const errorResponse: ApiResponse = {
      requestId,
      success: false,
      error: lastError?.message || 'Unknown error',
      responseTime: Date.now() - startTime,
      retryCount: retryCount - 1,
      timestamp: new Date()
    };

    // Update connection status
    connection.status = 'error';
    connection.lastError = lastError?.message;
    this.connections.set(request.connectionId, connection);
    
    // Store in history
    this.addToHistory(request.connectionId, errorResponse);
    
    this.emit('request:failed', errorResponse);
    logger.error(`Request failed after ${retryCount - 1} retries:`, lastError);
    
    return errorResponse;
  }

  private getRetryConfig(connection: ApiConnection, override?: Partial<RetryConfig>): RetryConfig {
    const defaultConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT']
    };

    return {
      ...defaultConfig,
      ...connection.retryConfig,
      ...override
    };
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // Check for retryable error codes
    if (error.message.includes('status code')) {
      const statusCode = parseInt(error.message.match(/status code (\d+)/)?.[1] || '0');
      return config.retryableStatusCodes.includes(statusCode);
    }

    // Check for retryable error types
    return config.retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || (error as any).code === retryableError
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addToHistory(connectionId: string, response: ApiResponse): void {
    if (!this.requestHistory.has(connectionId)) {
      this.requestHistory.set(connectionId, []);
    }
    
    const history = this.requestHistory.get(connectionId)!;
    history.push(response);
    
    // Keep only last 100 requests
    if (history.length > 100) {
      history.shift();
    }
  }

  // Connection Management
  async updateConnection(connectionId: string, updates: Partial<ApiConnection>): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const updatedConnection = { ...connection, ...updates };
    
    // Recreate client if configuration changed
    if (updates.baseUrl || updates.authentication || updates.headers || updates.timeout) {
      const newClient = this.createAxiosClient(updatedConnection);
      await this.testConnection(updatedConnection, newClient);
      this.clients.set(connectionId, newClient);
    }

    // Update circuit breaker if configuration changed
    if (updates.circuitBreakerConfig) {
      const circuitBreaker = new CircuitBreaker(updates.circuitBreakerConfig);
      this.circuitBreakers.set(connectionId, circuitBreaker);
    }

    this.connections.set(connectionId, updatedConnection);
    this.emit('connection:updated', updatedConnection);
    
    logger.info(`External API connection updated: ${connectionId}`);
  }

  async removeConnection(connectionId: string): Promise<void> {
    this.connections.delete(connectionId);
    this.clients.delete(connectionId);
    this.circuitBreakers.delete(connectionId);
    this.requestHistory.delete(connectionId);
    
    this.emit('connection:removed', connectionId);
    logger.info(`External API connection removed: ${connectionId}`);
  }

  async testConnectionHealth(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      const client = this.clients.get(connectionId);
      
      if (!connection || !client) {
        return false;
      }

      await this.testConnection(connection, client);
      
      // Update connection status
      connection.status = 'active';
      connection.lastUsed = new Date();
      connection.lastError = undefined;
      this.connections.set(connectionId, connection);
      
      return true;
    } catch (error) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.status = 'error';
        connection.lastError = error instanceof Error ? error.message : 'Unknown error';
        this.connections.set(connectionId, connection);
      }
      
      return false;
    }
  }

  // Monitoring and Analytics
  getConnections(): ApiConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(connectionId: string): ApiConnection | undefined {
    return this.connections.get(connectionId);
  }

  getCircuitBreakerState(connectionId: string): CircuitBreakerState | undefined {
    const circuitBreaker = this.circuitBreakers.get(connectionId);
    if (!circuitBreaker) {
      return undefined;
    }

    const state = circuitBreaker.getState();
    state.connectionId = connectionId;
    return state;
  }

  getRequestHistory(connectionId: string): ApiResponse[] {
    return this.requestHistory.get(connectionId) || [];
  }

  getConnectionMetrics(connectionId: string): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    const history = this.getRequestHistory(connectionId);
    
    if (history.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }

    const successfulRequests = history.filter(r => r.success);
    const totalResponseTime = history.reduce((sum, r) => sum + r.responseTime, 0);

    return {
      totalRequests: history.length,
      successRate: (successfulRequests.length / history.length) * 100,
      averageResponseTime: totalResponseTime / history.length,
      errorRate: ((history.length - successfulRequests.length) / history.length) * 100
    };
  }

  async resetCircuitBreaker(connectionId: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(connectionId);
    if (circuitBreaker) {
      circuitBreaker.reset();
      this.emit('circuit_breaker:reset', connectionId);
      logger.info(`Circuit breaker reset for connection: ${connectionId}`);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.connections.clear();
    this.clients.clear();
    this.circuitBreakers.clear();
    this.requestHistory.clear();
    
    logger.info('External API service cleanup completed');
  }
}

export const externalApiService = new ExternalApiService();