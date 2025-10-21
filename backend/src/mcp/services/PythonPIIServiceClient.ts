/**
 * MCP Privacy Connectors - Python PII Service Client
 * HTTP client for communicating with the Python PII detection service
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';

/**
 * Python PII Service health status
 */
interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  lastCheck: Date;
  availableEngines: string[];
  version?: string;
}

/**
 * Connection pool configuration
 */
interface PoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Analysis request to Python service
 */
interface AnalysisRequest {
  text: string;
  language?: string;
  engines?: string[];
}

/**
 * Analysis response from Python service
 */
interface AnalysisResponse {
  entities: Array<{
    entity_type: string;
    start: number;
    end: number;
    score: number;
    text: string;
  }>;
  processing_time: number;
  engine: string;
  confidence: number;
}

/**
 * Cached analysis result
 */
interface CachedResult {
  response: AnalysisResponse;
  timestamp: Date;
  ttl: number;
}

/**
 * Python PII Service Client with connection pooling and caching
 */
export class PythonPIIServiceClient extends EventEmitter {
  private client: AxiosInstance;
  private serviceUrl: string;
  private poolConfig: PoolConfig;
  private healthStatus: ServiceHealth;
  private cache: Map<string, CachedResult> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionPool: Map<string, AxiosInstance> = new Map();
  private activeConnections: number = 0;

  constructor(serviceUrl: string = 'http://localhost:8000', poolConfig?: Partial<PoolConfig>) {
    super();
    
    this.serviceUrl = serviceUrl;
    this.poolConfig = {
      maxConnections: 10,
      connectionTimeout: 5000,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...poolConfig
    };

    this.healthStatus = {
      status: 'offline',
      responseTime: 0,
      lastCheck: new Date(),
      availableEngines: []
    };

    this.initializeClient();
    this.startHealthMonitoring();
  }

  /**
   * Initialize HTTP client with configuration
   */
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: this.poolConfig.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Privacy-Connectors/1.0'
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 500 // Retry on 5xx errors
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        this.activeConnections++;
        
        this.emit('requestStarted', {
          url: config.url,
          method: config.method,
          activeConnections: this.activeConnections
        });
        
        return config;
      },
      (error) => {
        this.emit('requestError', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        
        this.emit('requestCompleted', {
          url: response.config.url,
          status: response.status,
          duration,
          activeConnections: this.activeConnections
        });
        
        return response;
      },
      async (error) => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        
        // Implement retry logic
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < this.poolConfig.retryAttempts && this.shouldRetry(error)) {
          config.retry++;
          
          this.emit('requestRetry', {
            url: config.url,
            attempt: config.retry,
            error: error.message
          });
          
          // Wait before retry
          await this.delay(this.poolConfig.retryDelay * config.retry);
          
          return this.client(config);
        }

        this.emit('requestFailed', {
          url: config?.url,
          error: error.message,
          attempts: config?.retry || 0
        });
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Analyze text using hybrid detection
   */
  async analyzeHybrid(text: string, options?: { language?: string }): Promise<AnalysisResponse> {
    const cacheKey = this.generateCacheKey('hybrid', text, options);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.emit('cacheHit', { cacheKey });
      return cached;
    }

    const request: AnalysisRequest = {
      text,
      language: options?.language || 'en'
    };

    try {
      const response = await this.client.post<AnalysisResponse>('/analyze/hybrid', request);
      
      // Cache successful response
      this.setCachedResult(cacheKey, response.data, 300000); // 5 minutes TTL
      
      this.emit('analysisCompleted', {
        method: 'hybrid',
        textLength: text.length,
        entitiesFound: response.data.entities.length,
        processingTime: response.data.processing_time
      });
      
      return response.data;
    } catch (error) {
      this.emit('analysisError', {
        method: 'hybrid',
        error: error.message,
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Analyze text using specific engine
   */
  async analyzeWithEngine(
    engine: 'presidio' | 'spacy' | 'transformers',
    text: string,
    options?: { language?: string }
  ): Promise<AnalysisResponse> {
    const cacheKey = this.generateCacheKey(engine, text, options);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.emit('cacheHit', { cacheKey });
      return cached;
    }

    const request: AnalysisRequest = {
      text,
      language: options?.language || 'en'
    };

    try {
      const response = await this.client.post<AnalysisResponse>(`/analyze/${engine}`, request);
      
      // Cache successful response
      this.setCachedResult(cacheKey, response.data, 300000); // 5 minutes TTL
      
      this.emit('analysisCompleted', {
        method: engine,
        textLength: text.length,
        entitiesFound: response.data.entities.length,
        processingTime: response.data.processing_time
      });
      
      return response.data;
    } catch (error) {
      this.emit('analysisError', {
        method: engine,
        error: error.message,
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Benchmark all available engines
   */
  async benchmark(text: string): Promise<any> {
    try {
      const response = await this.client.post('/benchmark', { text });
      
      this.emit('benchmarkCompleted', {
        textLength: text.length,
        results: response.data
      });
      
      return response.data;
    } catch (error) {
      this.emit('benchmarkError', {
        error: error.message,
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.get('/health', {
        timeout: 5000 // Shorter timeout for health checks
      });
      
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date(),
        availableEngines: response.data.engines || [],
        version: response.data.version
      };
      
      this.emit('healthCheckCompleted', this.healthStatus);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.healthStatus = {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        availableEngines: []
      };
      
      this.emit('healthCheckFailed', {
        error: error.message,
        responseTime
      });
    }
    
    return this.healthStatus;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ServiceHealth {
    return { ...this.healthStatus };
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    // Initial health check
    this.checkHealth();
    
    // Schedule periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 60000); // Check every minute
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
   * Generate cache key for request
   */
  private generateCacheKey(method: string, text: string, options?: any): string {
    const textHash = this.simpleHash(text);
    const optionsHash = options ? this.simpleHash(JSON.stringify(options)) : '';
    return `${method}_${textHash}_${optionsHash}`;
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(cacheKey: string): AnalysisResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp.getTime();
    
    if (age > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.response;
  }

  /**
   * Set cached result with TTL
   */
  private setCachedResult(cacheKey: string, response: AnalysisResponse, ttl: number): void {
    this.cache.set(cacheKey, {
      response,
      timestamp: new Date(),
      ttl
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors and 5xx status codes
    return !error.response || 
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           (error.response && error.response.status >= 500);
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client statistics
   */
  getStatistics() {
    return {
      serviceUrl: this.serviceUrl,
      healthStatus: this.healthStatus,
      activeConnections: this.activeConnections,
      cacheSize: this.cache.size,
      poolConfig: this.poolConfig
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Update service URL
   */
  updateServiceUrl(newUrl: string): void {
    this.serviceUrl = newUrl;
    this.client.defaults.baseURL = newUrl;
    this.emit('serviceUrlUpdated', { newUrl });
  }

  /**
   * Shutdown client and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.stopHealthMonitoring();
    this.clearCache();
    this.connectionPool.clear();
    
    this.emit('shutdown');
    console.log('Python PII Service Client shutdown complete');
  }
}