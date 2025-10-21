/**
 * MCP Privacy Connectors - Secure Credential Retrieval
 * Utility functions for secure credential access by connectors
 */

import { CredentialManager } from './CredentialManager.js';
import { KeyManagementService } from './KeyManagementService.js';
import type { ConnectorCredentials, ConnectorType, AuthToken } from '../types/index.js';

/**
 * Credential access result with security metadata
 */
interface CredentialAccessResult {
  credentials: ConnectorCredentials | null;
  accessTime: Date;
  keyVersion: number;
  isExpired: boolean;
  securityWarnings: string[];
}

/**
 * Credential refresh configuration
 */
interface CredentialRefreshConfig {
  autoRefresh: boolean;
  refreshThresholdMinutes: number;
  maxRefreshAttempts: number;
  refreshCallback?: (credentials: ConnectorCredentials) => Promise<AuthToken>;
}

/**
 * Secure credential retrieval service for MCP connectors
 */
export class SecureCredentialRetrieval {
  private credentialManager: CredentialManager;
  private keyManagementService: KeyManagementService;
  private accessLog: Map<string, Date[]> = new Map();
  private refreshConfig: CredentialRefreshConfig;

  constructor(
    credentialManager: CredentialManager,
    keyManagementService: KeyManagementService,
    refreshConfig?: Partial<CredentialRefreshConfig>
  ) {
    this.credentialManager = credentialManager;
    this.keyManagementService = keyManagementService;
    this.refreshConfig = {
      autoRefresh: true,
      refreshThresholdMinutes: 30,
      maxRefreshAttempts: 3,
      ...refreshConfig
    };
  }

  /**
   * Securely retrieve credentials with access logging and validation
   */
  async getCredentials(credentialId: string, connectorId?: string): Promise<CredentialAccessResult> {
    const accessTime = new Date();
    const securityWarnings: string[] = [];

    try {
      // Log access attempt
      this.logCredentialAccess(credentialId, accessTime);

      // Check for suspicious access patterns
      const suspiciousActivity = this.detectSuspiciousAccess(credentialId);
      if (suspiciousActivity.length > 0) {
        securityWarnings.push(...suspiciousActivity);
      }

      // Retrieve credentials
      const credentials = await this.credentialManager.retrieveCredentials(credentialId);
      
      if (!credentials) {
        return {
          credentials: null,
          accessTime,
          keyVersion: 0,
          isExpired: false,
          securityWarnings: ['Credentials not found']
        };
      }

      // Check expiration
      const isExpired = credentials.expiresAt ? credentials.expiresAt < accessTime : false;
      if (isExpired) {
        securityWarnings.push('Credentials have expired');
      }

      // Get current key version for audit trail
      const activeKey = this.keyManagementService.getActiveKey();
      const keyVersion = activeKey?.metadata.version || 0;

      // Attempt auto-refresh if needed and configured
      let finalCredentials = credentials;
      if (this.shouldRefreshCredentials(credentials) && this.refreshConfig.autoRefresh) {
        try {
          finalCredentials = await this.attemptCredentialRefresh(credentials);
          if (finalCredentials !== credentials) {
            securityWarnings.push('Credentials were automatically refreshed');
          }
        } catch (refreshError) {
          securityWarnings.push(`Credential refresh failed: ${refreshError}`);
        }
      }

      // Validate connector type match if provided
      if (connectorId && finalCredentials.connectorType) {
        // This is a basic validation - in production, you might have a registry
        // that maps connector IDs to types
        console.log(`Credential access for connector ${connectorId} with type ${finalCredentials.connectorType}`);
      }

      return {
        credentials: finalCredentials,
        accessTime,
        keyVersion,
        isExpired,
        securityWarnings
      };
    } catch (error) {
      console.error(`Secure credential retrieval failed for ${credentialId}:`, error);
      return {
        credentials: null,
        accessTime,
        keyVersion: 0,
        isExpired: false,
        securityWarnings: [`Retrieval error: ${error}`]
      };
    }
  }

  /**
   * Get credentials with automatic token refresh
   */
  async getCredentialsWithRefresh(
    credentialId: string,
    refreshCallback: (credentials: ConnectorCredentials) => Promise<AuthToken>
  ): Promise<CredentialAccessResult> {
    const result = await this.getCredentials(credentialId);
    
    if (!result.credentials) {
      return result;
    }

    // Check if token refresh is needed
    if (this.shouldRefreshCredentials(result.credentials)) {
      try {
        const newToken = await refreshCallback(result.credentials);
        
        // Update credentials with new token
        const updatedCredentials: ConnectorCredentials = {
          ...result.credentials,
          accessToken: newToken.accessToken,
          refreshToken: newToken.refreshToken,
          expiresAt: newToken.expiresAt,
          updatedAt: new Date()
        };

        // Store updated credentials
        await this.credentialManager.updateCredentials(credentialId, updatedCredentials);
        
        result.credentials = updatedCredentials;
        result.securityWarnings.push('Access token refreshed successfully');
      } catch (refreshError) {
        result.securityWarnings.push(`Token refresh failed: ${refreshError}`);
      }
    }

    return result;
  }

  /**
   * Validate credentials before use
   */
  async validateCredentials(credentialId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const result = await this.getCredentials(credentialId);
      
      if (!result.credentials) {
        errors.push('Credentials not found or inaccessible');
        return { isValid: false, errors, warnings };
      }

      const credentials = result.credentials;

      // Check required fields
      if (!credentials.id) {
        errors.push('Credential ID is missing');
      }

      if (!credentials.connectorType) {
        errors.push('Connector type is missing');
      }

      // Check authentication methods
      const hasApiKey = !!credentials.apiKey;
      const hasOAuth = !!(credentials.clientId && credentials.clientSecret);
      const hasToken = !!credentials.accessToken;

      if (!hasApiKey && !hasOAuth && !hasToken) {
        errors.push('No valid authentication method found');
      }

      // Check expiration
      if (result.isExpired) {
        errors.push('Credentials have expired');
      } else if (credentials.expiresAt) {
        const timeToExpiry = credentials.expiresAt.getTime() - Date.now();
        const hoursToExpiry = timeToExpiry / (1000 * 60 * 60);
        
        if (hoursToExpiry < 24) {
          warnings.push(`Credentials expire in ${Math.round(hoursToExpiry)} hours`);
        }
      }

      // Check endpoint validity
      if (credentials.endpoint) {
        try {
          new URL(credentials.endpoint);
        } catch {
          errors.push('Invalid endpoint URL format');
        }
      }

      // Add security warnings from retrieval
      warnings.push(...result.securityWarnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Get credentials for a specific connector type
   */
  async getCredentialsByType(connectorType: ConnectorType): Promise<CredentialAccessResult[]> {
    const allCredentials = this.credentialManager.listCredentials();
    const typeCredentials = allCredentials.filter(cred => cred.connectorType === connectorType);
    
    const results: CredentialAccessResult[] = [];
    
    for (const credInfo of typeCredentials) {
      const result = await this.getCredentials(credInfo.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Test credential connectivity
   */
  async testCredentialConnectivity(credentialId: string): Promise<{
    canAccess: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.getCredentials(credentialId);
      const responseTime = Date.now() - startTime;
      
      if (!result.credentials) {
        return {
          canAccess: false,
          responseTime,
          error: 'Credentials not accessible'
        };
      }

      if (result.isExpired) {
        return {
          canAccess: false,
          responseTime,
          error: 'Credentials have expired'
        };
      }

      return {
        canAccess: true,
        responseTime
      };
    } catch (error) {
      return {
        canAccess: false,
        responseTime: Date.now() - startTime,
        error: `Connectivity test failed: ${error}`
      };
    }
  }

  /**
   * Get credential access statistics
   */
  getAccessStatistics(): {
    totalCredentials: number;
    accessCounts: Map<string, number>;
    recentAccesses: Map<string, Date>;
    suspiciousActivity: string[];
  } {
    const totalCredentials = this.credentialManager.listCredentials().length;
    const accessCounts = new Map<string, number>();
    const recentAccesses = new Map<string, Date>();
    const suspiciousActivity: string[] = [];

    for (const [credentialId, accessTimes] of this.accessLog) {
      accessCounts.set(credentialId, accessTimes.length);
      
      if (accessTimes.length > 0) {
        recentAccesses.set(credentialId, accessTimes[accessTimes.length - 1]);
      }

      // Check for suspicious patterns
      const suspicious = this.detectSuspiciousAccess(credentialId);
      if (suspicious.length > 0) {
        suspiciousActivity.push(`${credentialId}: ${suspicious.join(', ')}`);
      }
    }

    return {
      totalCredentials,
      accessCounts,
      recentAccesses,
      suspiciousActivity
    };
  }

  /**
   * Clear access logs (for maintenance)
   */
  clearAccessLogs(olderThanDays?: number): void {
    if (!olderThanDays) {
      this.accessLog.clear();
      return;
    }

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [credentialId, accessTimes] of this.accessLog) {
      const recentAccesses = accessTimes.filter(time => time > cutoffDate);
      
      if (recentAccesses.length === 0) {
        this.accessLog.delete(credentialId);
      } else {
        this.accessLog.set(credentialId, recentAccesses);
      }
    }
  }

  /**
   * Log credential access for audit trail
   */
  private logCredentialAccess(credentialId: string, accessTime: Date): void {
    const existingAccesses = this.accessLog.get(credentialId) || [];
    existingAccesses.push(accessTime);
    
    // Keep only last 100 accesses per credential
    if (existingAccesses.length > 100) {
      existingAccesses.splice(0, existingAccesses.length - 100);
    }
    
    this.accessLog.set(credentialId, existingAccesses);
  }

  /**
   * Detect suspicious access patterns
   */
  private detectSuspiciousAccess(credentialId: string): string[] {
    const warnings: string[] = [];
    const accessTimes = this.accessLog.get(credentialId) || [];
    
    if (accessTimes.length === 0) {
      return warnings;
    }

    const now = Date.now();
    const recentAccesses = accessTimes.filter(time => now - time.getTime() < 60000); // Last minute
    const hourlyAccesses = accessTimes.filter(time => now - time.getTime() < 3600000); // Last hour

    // Check for rapid successive accesses
    if (recentAccesses.length > 10) {
      warnings.push('High frequency access detected (>10 in last minute)');
    }

    // Check for unusual access volume
    if (hourlyAccesses.length > 100) {
      warnings.push('Unusual access volume detected (>100 in last hour)');
    }

    // Check for access pattern anomalies
    if (accessTimes.length > 10) {
      const intervals: number[] = [];
      for (let i = 1; i < accessTimes.length; i++) {
        intervals.push(accessTimes[i].getTime() - accessTimes[i - 1].getTime());
      }
      
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const recentInterval = intervals[intervals.length - 1];
      
      // If recent access is much faster than average, flag it
      if (recentInterval < avgInterval * 0.1 && avgInterval > 10000) {
        warnings.push('Unusual access pattern detected');
      }
    }

    return warnings;
  }

  /**
   * Check if credentials should be refreshed
   */
  private shouldRefreshCredentials(credentials: ConnectorCredentials): boolean {
    if (!credentials.expiresAt || !this.refreshConfig.autoRefresh) {
      return false;
    }

    const timeToExpiry = credentials.expiresAt.getTime() - Date.now();
    const thresholdMs = this.refreshConfig.refreshThresholdMinutes * 60 * 1000;

    return timeToExpiry < thresholdMs;
  }

  /**
   * Attempt to refresh credentials
   */
  private async attemptCredentialRefresh(credentials: ConnectorCredentials): Promise<ConnectorCredentials> {
    if (!this.refreshConfig.refreshCallback) {
      throw new Error('No refresh callback configured');
    }

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.refreshConfig.maxRefreshAttempts) {
      try {
        const newToken = await this.refreshConfig.refreshCallback(credentials);
        
        const updatedCredentials: ConnectorCredentials = {
          ...credentials,
          accessToken: newToken.accessToken,
          refreshToken: newToken.refreshToken,
          expiresAt: newToken.expiresAt,
          updatedAt: new Date()
        };

        await this.credentialManager.updateCredentials(credentials.id, updatedCredentials);
        return updatedCredentials;
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < this.refreshConfig.maxRefreshAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    throw new Error(`Credential refresh failed after ${attempts} attempts: ${lastError?.message}`);
  }
}