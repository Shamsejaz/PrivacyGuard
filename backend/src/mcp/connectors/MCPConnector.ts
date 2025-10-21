/**
 * MCP Privacy Connectors - Base Connector Class
 * Abstract base class for all MCP privacy scanning connectors
 */

import type {
  ConnectorCredentials,
  ScanConfiguration,
  ScanResult,
  RemediationAction,
  RemediationResult,
  ConnectorHealth,
  AuthToken,
  ConnectorActivity,
  ConnectorType
} from '../types/index.js';

/**
 * Abstract base class for MCP connectors
 * Provides common functionality and enforces standard interface
 */
export abstract class MCPConnector {
  protected connectorId: string;
  protected connectorType: ConnectorType;
  protected credentials: ConnectorCredentials;
  protected isConnected: boolean = false;
  protected lastHealthCheck: Date = new Date();
  protected activityLog: ConnectorActivity[] = [];

  constructor(connectorId: string, connectorType: ConnectorType, credentials: ConnectorCredentials) {
    this.connectorId = connectorId;
    this.connectorType = connectorType;
    this.credentials = credentials;
  }

  /**
   * Connect to the external system
   * Must be implemented by concrete connector classes
   */
  abstract connect(credentials: ConnectorCredentials): Promise<void>;

  /**
   * Execute privacy scan on the connected system
   * Must be implemented by concrete connector classes
   */
  abstract scan(config: ScanConfiguration): Promise<ScanResult>;

  /**
   * Execute remediation actions on privacy findings
   * Must be implemented by concrete connector classes
   */
  abstract remediate(actions: RemediationAction[]): Promise<RemediationResult>;

  /**
   * Get connector health status
   * Can be overridden by concrete classes for specific health checks
   */
  getHealth(): ConnectorHealth {
    return {
      connectorId: this.connectorId,
      status: this.isConnected ? 'healthy' : 'offline',
      lastHealthCheck: this.lastHealthCheck,
      responseTimeMs: 0,
      errorRate: 0,
      uptime: this.calculateUptime(),
      details: this.isConnected ? 'Connector is operational' : 'Connector is not connected'
    };
  }

  /**
   * Authenticate with the external system
   * Protected method for use by concrete connector classes
   */
  protected async authenticate(): Promise<AuthToken> {
    this.logActivity('Authentication attempt started');
    
    // Default implementation - should be overridden by concrete classes
    if (!this.credentials.accessToken) {
      throw new Error('No access token available for authentication');
    }

    return {
      accessToken: this.credentials.accessToken,
      refreshToken: this.credentials.refreshToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour default
      tokenType: 'Bearer'
    };
  }

  /**
   * Handle rate limiting for API calls
   * Protected method for use by concrete connector classes
   */
  protected async handleRateLimit(): Promise<void> {
    // Default implementation - can be overridden by concrete classes
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  /**
   * Log connector activity
   * Protected method for use by concrete connector classes
   */
  protected logActivity(activity: string, details?: Record<string, any>, userId?: string): void {
    const activityEntry: ConnectorActivity = {
      connectorId: this.connectorId,
      activity,
      timestamp: new Date(),
      details,
      userId
    };

    this.activityLog.push(activityEntry);
    
    // Keep only last 100 activities in memory
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(-100);
    }

    // In a real implementation, this would also persist to database
    console.log(`[${this.connectorType}:${this.connectorId}] ${activity}`, details);
  }

  /**
   * Validate scan configuration
   * Protected method for use by concrete connector classes
   */
  protected validateScanConfiguration(config: ScanConfiguration): void {
    if (!config.connectors || config.connectors.length === 0) {
      throw new Error('Scan configuration must specify at least one connector');
    }

    if (!config.scanDepth || !['shallow', 'deep'].includes(config.scanDepth)) {
      throw new Error('Scan configuration must specify valid scan depth (shallow or deep)');
    }

    if (config.customRules) {
      for (const rule of config.customRules) {
        if (!rule.id || !rule.name || !rule.pattern) {
          throw new Error('Custom privacy rules must have id, name, and pattern');
        }
      }
    }
  }

  /**
   * Generate scan ID for tracking
   * Protected method for use by concrete connector classes
   */
  protected generateScanId(): string {
    return `scan_${this.connectorType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Mask sensitive data for logging
   * Protected method for use by concrete connector classes
   */
  protected maskSensitiveData(data: string): string {
    if (!data || data.length <= 4) {
      return '***';
    }
    
    const visibleChars = Math.min(2, Math.floor(data.length * 0.2));
    const maskedLength = data.length - (visibleChars * 2);
    
    return data.substring(0, visibleChars) + 
           '*'.repeat(maskedLength) + 
           data.substring(data.length - visibleChars);
  }

  /**
   * Calculate connector uptime
   * Private method for internal use
   */
  private calculateUptime(): number {
    // Simplified uptime calculation - in real implementation would track connection time
    return this.isConnected ? 100 : 0;
  }

  /**
   * Get connector information
   */
  getConnectorInfo() {
    return {
      id: this.connectorId,
      type: this.connectorType,
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      activityCount: this.activityLog.length
    };
  }

  /**
   * Get recent activity log
   */
  getRecentActivity(limit: number = 10): ConnectorActivity[] {
    return this.activityLog.slice(-limit);
  }

  /**
   * Disconnect from the external system
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.logActivity('Connector disconnected');
  }

  /**
   * Update connector credentials
   */
  updateCredentials(credentials: ConnectorCredentials): void {
    this.credentials = credentials;
    this.logActivity('Credentials updated');
  }
}