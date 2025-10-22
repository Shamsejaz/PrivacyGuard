import {
  ThreatIntelSource,
  CredentialQuery,
  MarketplaceQuery,
  BreachQuery,
  CredentialResult,
  MarketplaceResult,
  BreachResult,
  KeywordMonitorResult,
  SourceHealthStatus,
  MCPConnectorConfig,
  APICredentials,
  ConnectorError,
  RetryConfig
} from '../types';
import { SecretsManagerService } from '../utils/SecretsManagerService';
import { RateLimiter } from '../utils/RateLimiter';

/**
 * Abstract base class for MCP (Model Context Protocol) connectors
 * Provides common functionality for threat intelligence API integrations
 */
export abstract class MCPConnector {
  protected config: MCPConnectorConfig;
  protected rateLimiter: RateLimiter;
  protected secretsManager: SecretsManagerService;
  protected healthStatus: SourceHealthStatus;
  private credentials: APICredentials | null = null;
  private lastCredentialRefresh: Date = new Date(0);
  private readonly credentialRefreshInterval = 3600000; // 1 hour in milliseconds

  constructor(config: MCPConnectorConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimits);
    this.secretsManager = new SecretsManagerService();
    this.healthStatus = {
      sourceId: config.sourceId,
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0
    };
  }

  /**
   * Initialize the connector and validate credentials
   */
  async initialize(): Promise<void> {
    try {
      await this.refreshCredentials();
      await this.performHealthCheck();
    } catch (error) {
      this.updateHealthStatus(false, error as Error);
      throw new ConnectorError(
        `Failed to initialize connector for ${this.config.sourceId}: ${error}`,
        this.config.sourceId,
        'INIT_FAILED',
        false,
        false
      );
    }
  }

  /**
   * Search for exposed credentials
   */
  abstract searchCredentials(query: CredentialQuery): Promise<CredentialResult[]>;

  /**
   * Search dark web marketplaces
   */
  abstract searchMarketplaces(query: MarketplaceQuery): Promise<MarketplaceResult[]>;

  /**
   * Search breach databases
   */
  abstract searchBreachDatabases(query: BreachQuery): Promise<BreachResult[]>;

  /**
   * Monitor keywords across all sources
   */
  abstract monitorKeywords(keywords: string[]): Promise<KeywordMonitorResult>;

  /**
   * Get current health status
   */
  getSourceHealth(): SourceHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Perform health check against the API
   */
  async performHealthCheck(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.rateLimiter.waitForToken();
      const isHealthy = await this.checkAPIHealth();
      const responseTime = Date.now() - startTime;
      
      this.updateHealthStatus(isHealthy, undefined, responseTime);
      return isHealthy;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthStatus(false, error as Error, responseTime);
      return false;
    }
  }

  /**
   * Abstract method for API-specific health checks
   */
  protected abstract checkAPIHealth(): Promise<boolean>;

  /**
   * Execute API request with rate limiting, retry logic, and error handling
   */
  protected async executeRequest<T>(
    requestFn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    await this.ensureValidCredentials();
    await this.rateLimiter.waitForToken();

    const retryConfig = this.config.retryConfig;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await requestFn();
        const responseTime = Date.now() - startTime;
        
        // Update health status on successful request
        this.updateHealthStatus(true, undefined, responseTime);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is rate limiting
        if (this.isRateLimitError(error)) {
          const delay = this.calculateBackoffDelay(attempt, retryConfig);
          await this.sleep(delay);
          continue;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === retryConfig.maxRetries) {
          this.updateHealthStatus(false, lastError);
          throw new ConnectorError(
            `${operation} failed after ${attempt + 1} attempts: ${lastError.message}`,
            this.config.sourceId,
            this.getErrorCode(error),
            this.isRetryableError(error),
            this.isRateLimitError(error)
          );
        }

        // Wait before retry
        const delay = this.calculateBackoffDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new ConnectorError(
      `${operation} failed after all retry attempts`,
      this.config.sourceId,
      'MAX_RETRIES_EXCEEDED',
      false,
      false
    );
  }

  /**
   * Refresh API credentials from AWS Secrets Manager
   */
  private async refreshCredentials(): Promise<void> {
    const now = new Date();
    
    if (this.credentials && 
        (now.getTime() - this.lastCredentialRefresh.getTime()) < this.credentialRefreshInterval) {
      return; // Credentials are still fresh
    }

    try {
      this.credentials = await this.secretsManager.getCredentials(this.config.credentialId);
      this.lastCredentialRefresh = now;
    } catch (error) {
      throw new ConnectorError(
        `Failed to refresh credentials for ${this.config.sourceId}: ${error}`,
        this.config.sourceId,
        'CREDENTIAL_REFRESH_FAILED',
        true,
        false
      );
    }
  }

  /**
   * Ensure credentials are valid and refresh if needed
   */
  private async ensureValidCredentials(): Promise<void> {
    if (!this.credentials) {
      await this.refreshCredentials();
    }
  }

  /**
   * Get current API credentials
   */
  protected getCredentials(): APICredentials {
    if (!this.credentials) {
      throw new ConnectorError(
        `No credentials available for ${this.config.sourceId}`,
        this.config.sourceId,
        'NO_CREDENTIALS',
        false,
        false
      );
    }
    return this.credentials;
  }

  /**
   * Update health status
   */
  private updateHealthStatus(
    isHealthy: boolean, 
    error?: Error, 
    responseTime?: number
  ): void {
    this.healthStatus = {
      ...this.healthStatus,
      isHealthy,
      lastCheck: new Date(),
      responseTime: responseTime || this.healthStatus.responseTime,
      errorCount: isHealthy ? 0 : this.healthStatus.errorCount + 1,
      lastError: error?.message
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, retryConfig: RetryConfig): number {
    const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error indicates rate limiting
   */
  protected isRateLimitError(error: any): boolean {
    if (error.response?.status === 429) return true;
    if (error.code === 'RATE_LIMITED') return true;
    if (error.message?.toLowerCase().includes('rate limit')) return true;
    return false;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    // Network errors are generally retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    // HTTP 5xx errors are retryable
    if (error.response?.status >= 500) return true;
    
    // Rate limiting is retryable
    if (this.isRateLimitError(error)) return true;
    
    // Authentication errors are not retryable
    if (error.response?.status === 401 || error.response?.status === 403) return false;
    
    // Client errors (4xx except 429) are generally not retryable
    if (error.response?.status >= 400 && error.response?.status < 500) return false;
    
    return true;
  }

  /**
   * Get error code from error object
   */
  protected getErrorCode(error: any): string {
    if (error.response?.status) {
      return `HTTP_${error.response.status}`;
    }
    if (error.code) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }
}

/**
 * Custom error class for MCP connector errors
 */
class ConnectorError extends Error {
  constructor(
    message: string,
    public sourceId: string,
    public errorCode: string,
    public retryable: boolean,
    public rateLimited: boolean
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}