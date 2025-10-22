import { APICredentials } from '../types';

/**
 * Service for validating API credentials and performing health checks
 */
export class CredentialValidator {
  private validationEndpoints: Map<string, string> = new Map();
  private validationCache: Map<string, { isValid: boolean; timestamp: Date }> = new Map();
  private readonly cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.initializeValidationEndpoints();
  }

  /**
   * Validate credentials for a specific API
   */
  async validateCredentials(
    apiType: string, 
    credentials: APICredentials
  ): Promise<ValidationResult> {
    const cacheKey = `${apiType}:${credentials.apiKey}`;
    
    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return {
        isValid: cached.isValid,
        apiType,
        timestamp: cached.timestamp,
        fromCache: true
      };
    }

    try {
      const isValid = await this.performValidation(apiType, credentials);
      const result: ValidationResult = {
        isValid,
        apiType,
        timestamp: new Date(),
        fromCache: false
      };

      // Cache the result
      this.validationCache.set(cacheKey, {
        isValid,
        timestamp: result.timestamp
      });

      return result;
    } catch (error) {
      return {
        isValid: false,
        apiType,
        timestamp: new Date(),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate multiple credentials concurrently
   */
  async validateMultipleCredentials(
    credentialSets: Array<{ apiType: string; credentials: APICredentials }>
  ): Promise<ValidationResult[]> {
    const validationPromises = credentialSets.map(({ apiType, credentials }) =>
      this.validateCredentials(apiType, credentials)
    );

    return Promise.all(validationPromises);
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): ValidationStats {
    const now = Date.now();
    const validEntries = Array.from(this.validationCache.values()).filter(
      entry => (now - entry.timestamp.getTime()) < this.cacheTimeout
    );

    const validCredentials = validEntries.filter(entry => entry.isValid).length;
    const invalidCredentials = validEntries.filter(entry => !entry.isValid).length;

    return {
      totalCached: validEntries.length,
      validCredentials,
      invalidCredentials,
      cacheHitRate: this.calculateCacheHitRate(),
      lastValidation: validEntries.length > 0 
        ? new Date(Math.max(...validEntries.map(e => e.timestamp.getTime())))
        : null
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(apiType?: string): void {
    if (apiType) {
      const keysToDelete = Array.from(this.validationCache.keys())
        .filter(key => key.startsWith(`${apiType}:`));
      keysToDelete.forEach(key => this.validationCache.delete(key));
    } else {
      this.validationCache.clear();
    }
  }

  /**
   * Add custom validation endpoint
   */
  addValidationEndpoint(apiType: string, endpoint: string): void {
    this.validationEndpoints.set(apiType, endpoint);
  }

  /**
   * Remove validation endpoint
   */
  removeValidationEndpoint(apiType: string): void {
    this.validationEndpoints.delete(apiType);
  }

  /**
   * Initialize default validation endpoints
   */
  private initializeValidationEndpoints(): void {
    this.validationEndpoints.set('constella', 'https://api.constella.ai/v1/health');
    this.validationEndpoints.set('intsights', 'https://api.intsights.com/public/v1/test-credentials');
    this.validationEndpoints.set('dehashed', 'https://api.dehashed.com/search?query=test');
  }

  /**
   * Perform actual credential validation
   */
  private async performValidation(
    apiType: string, 
    credentials: APICredentials
  ): Promise<boolean> {
    const endpoint = this.validationEndpoints.get(apiType);
    if (!endpoint) {
      throw new Error(`No validation endpoint configured for API type: ${apiType}`);
    }

    try {
      // In production, this would make actual HTTP requests
      // For now, simulate validation based on credential format
      return await this.simulateValidation(apiType, credentials, endpoint);
    } catch (error) {
      console.error(`Validation failed for ${apiType}:`, error);
      return false;
    }
  }

  /**
   * Simulate credential validation (replace with actual HTTP calls in production)
   */
  private async simulateValidation(
    apiType: string,
    credentials: APICredentials,
    endpoint: string
  ): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Basic validation checks
    if (!credentials.apiKey || credentials.apiKey.length < 10) {
      return false;
    }

    // API-specific validation logic
    switch (apiType) {
      case 'constella':
        return this.validateConstellaCredentials(credentials);
      
      case 'intsights':
        return this.validateIntSightsCredentials(credentials);
      
      case 'dehashed':
        return this.validateDeHashedCredentials(credentials);
      
      default:
        // Generic validation - check if API key exists and has reasonable length
        return credentials.apiKey.length >= 20;
    }
  }

  /**
   * Validate Constella Intelligence credentials
   */
  private validateConstellaCredentials(credentials: APICredentials): boolean {
    // Constella typically uses API keys with specific format
    return Boolean(
      credentials.apiKey &&
      credentials.apiKey.startsWith('constella_') &&
      credentials.apiKey.length >= 32
    );
  }

  /**
   * Validate IntSights credentials
   */
  private validateIntSightsCredentials(credentials: APICredentials): boolean {
    // IntSights uses both API key and secret key
    return Boolean(
      credentials.apiKey &&
      credentials.secretKey &&
      credentials.apiKey.length >= 24 &&
      credentials.secretKey.length >= 24
    );
  }

  /**
   * Validate DeHashed credentials
   */
  private validateDeHashedCredentials(credentials: APICredentials): boolean {
    // DeHashed uses API key and token
    return Boolean(
      credentials.apiKey &&
      credentials.token &&
      credentials.apiKey.length >= 16 &&
      credentials.token.length >= 32
    );
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This would be implemented with actual metrics in production
    // For now, return a simulated value
    return 0.85; // 85% cache hit rate
  }
}

/**
 * Result of credential validation
 */
export interface ValidationResult {
  isValid: boolean;
  apiType: string;
  timestamp: Date;
  fromCache: boolean;
  error?: string;
  responseTime?: number;
}

/**
 * Validation statistics
 */
export interface ValidationStats {
  totalCached: number;
  validCredentials: number;
  invalidCredentials: number;
  cacheHitRate: number;
  lastValidation: Date | null;
}