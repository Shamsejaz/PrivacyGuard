/**
 * MCP Privacy Connectors - Connector Registry
 * Central registry for managing MCP connector instances and lifecycle
 */

import { EventEmitter } from 'events';
import { MCPConnector } from '../connectors/MCPConnector.js';
import type { 
  ConnectorType, 
  ConnectorHealth, 
  ConnectorCredentials,
  ScanConfiguration,
  ScanResult 
} from '../types/index.js';

/**
 * Registry entry for tracking connector instances
 */
interface ConnectorRegistryEntry {
  connector: MCPConnector;
  config: ConnectorConfiguration;
  status: ConnectorStatus;
  registeredAt: Date;
  lastActivity: Date;
  healthHistory: ConnectorHealth[];
}

/**
 * Connector configuration for registry management
 */
interface ConnectorConfiguration {
  id: string;
  type: ConnectorType;
  name: string;
  description?: string;
  isEnabled: boolean;
  autoStart: boolean;
  healthCheckInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}

/**
 * Connector status enumeration
 */
type ConnectorStatus = 'registered' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

/**
 * Central registry for managing MCP connector instances
 */
export class ConnectorRegistry extends EventEmitter {
  private connectors: Map<string, ConnectorRegistryEntry> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: boolean = false;

  constructor() {
    super();
    this.setupGracefulShutdown();
  }

  /**
   * Register a new connector instance
   */
  async registerConnector(
    connector: MCPConnector, 
    config: ConnectorConfiguration
  ): Promise<void> {
    if (this.connectors.has(config.id)) {
      throw new Error(`Connector with ID ${config.id} is already registered`);
    }

    const entry: ConnectorRegistryEntry = {
      connector,
      config,
      status: 'registered',
      registeredAt: new Date(),
      lastActivity: new Date(),
      healthHistory: []
    };

    this.connectors.set(config.id, entry);
    
    // Start health monitoring
    this.startHealthMonitoring(config.id);
    
    // Auto-start if configured
    if (config.autoStart && config.isEnabled) {
      await this.startConnector(config.id);
    }

    this.emit('connectorRegistered', { connectorId: config.id, config });
    console.log(`Connector ${config.id} (${config.type}) registered successfully`);
  }

  /**
   * Unregister a connector instance
   */
  async unregisterConnector(connectorId: string): Promise<void> {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    // Stop the connector if running
    if (entry.status === 'running') {
      await this.stopConnector(connectorId);
    }

    // Stop health monitoring
    this.stopHealthMonitoring(connectorId);

    // Remove from registry
    this.connectors.delete(connectorId);

    this.emit('connectorUnregistered', { connectorId });
    console.log(`Connector ${connectorId} unregistered successfully`);
  }

  /**
   * Start a registered connector
   */
  async startConnector(connectorId: string): Promise<void> {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    if (!entry.config.isEnabled) {
      throw new Error(`Connector ${connectorId} is disabled`);
    }

    if (entry.status === 'running') {
      console.log(`Connector ${connectorId} is already running`);
      return;
    }

    try {
      entry.status = 'starting';
      this.emit('connectorStarting', { connectorId });

      // Connect the connector with stored credentials
      const credentials = await this.getConnectorCredentials(connectorId);
      await entry.connector.connect(credentials);
      
      entry.status = 'running';
      entry.lastActivity = new Date();
      
      this.emit('connectorStarted', { connectorId });
      console.log(`Connector ${connectorId} started successfully`);
    } catch (error) {
      entry.status = 'error';
      this.emit('connectorError', { connectorId, error });
      throw new Error(`Failed to start connector ${connectorId}: ${error}`);
    }
  }

  /**
   * Stop a running connector
   */
  async stopConnector(connectorId: string): Promise<void> {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    if (entry.status !== 'running') {
      console.log(`Connector ${connectorId} is not running`);
      return;
    }

    try {
      entry.status = 'stopping';
      this.emit('connectorStopping', { connectorId });

      // Disconnect the connector
      await entry.connector.disconnect();
      
      entry.status = 'stopped';
      entry.lastActivity = new Date();
      
      this.emit('connectorStopped', { connectorId });
      console.log(`Connector ${connectorId} stopped successfully`);
    } catch (error) {
      entry.status = 'error';
      this.emit('connectorError', { connectorId, error });
      throw new Error(`Failed to stop connector ${connectorId}: ${error}`);
    }
  }

  /**
   * Restart a connector
   */
  async restartConnector(connectorId: string): Promise<void> {
    await this.stopConnector(connectorId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await this.startConnector(connectorId);
  }

  /**
   * Get connector health status
   */
  getConnectorHealth(connectorId: string): ConnectorHealth | null {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      return null;
    }

    return entry.connector.getHealth();
  }

  /**
   * Get health status for all connectors
   */
  getAllConnectorHealth(): ConnectorHealth[] {
    const healthStatuses: ConnectorHealth[] = [];
    
    for (const [connectorId, entry] of this.connectors) {
      const health = entry.connector.getHealth();
      healthStatuses.push(health);
    }

    return healthStatuses;
  }

  /**
   * Get connector status
   */
  getConnectorStatus(connectorId: string): ConnectorStatus | null {
    const entry = this.connectors.get(connectorId);
    return entry ? entry.status : null;
  }

  /**
   * Get all registered connectors
   */
  getRegisteredConnectors(): Array<{
    id: string;
    type: ConnectorType;
    name: string;
    status: ConnectorStatus;
    isEnabled: boolean;
    registeredAt: Date;
    lastActivity: Date;
  }> {
    const connectors: Array<{
      id: string;
      type: ConnectorType;
      name: string;
      status: ConnectorStatus;
      isEnabled: boolean;
      registeredAt: Date;
      lastActivity: Date;
    }> = [];
    
    for (const [connectorId, entry] of this.connectors) {
      connectors.push({
        id: entry.config.id,
        type: entry.config.type,
        name: entry.config.name,
        status: entry.status,
        isEnabled: entry.config.isEnabled,
        registeredAt: entry.registeredAt,
        lastActivity: entry.lastActivity
      });
    }

    return connectors;
  }

  /**
   * Execute scan across multiple connectors
   */
  async executeMultiConnectorScan(
    connectorIds: string[], 
    scanConfig: ScanConfiguration
  ): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    const scanPromises: Promise<ScanResult>[] = [];

    for (const connectorId of connectorIds) {
      const entry = this.connectors.get(connectorId);
      if (!entry) {
        console.warn(`Connector ${connectorId} not found, skipping scan`);
        continue;
      }

      if (entry.status !== 'running') {
        console.warn(`Connector ${connectorId} is not running, skipping scan`);
        continue;
      }

      // Execute scan asynchronously
      const scanPromise = entry.connector.scan(scanConfig)
        .catch(error => {
          console.error(`Scan failed for connector ${connectorId}:`, error);
          // Return a failed scan result instead of throwing
          return {
            id: `failed_${connectorId}_${Date.now()}`,
            scanId: scanConfig.connectors.join('_'),
            connectorId,
            connectorType: entry.config.type,
            status: 'failed' as const,
            findings: [],
            metrics: {
              recordsScanned: 0,
              piiInstancesFound: 0,
              sensitiveDataVolume: 0,
              complianceScore: 0,
              processingTimeMs: 0,
              errorCount: 1
            },
            remediationActions: [],
            startedAt: new Date(),
            error: error.message
          };
        });

      scanPromises.push(scanPromise);
    }

    // Wait for all scans to complete
    const scanResults = await Promise.all(scanPromises);
    results.push(...scanResults);

    return results;
  }

  /**
   * Enable or disable a connector
   */
  setConnectorEnabled(connectorId: string, enabled: boolean): void {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    entry.config.isEnabled = enabled;
    
    if (!enabled && entry.status === 'running') {
      this.stopConnector(connectorId).catch(error => {
        console.error(`Failed to stop disabled connector ${connectorId}:`, error);
      });
    }

    this.emit('connectorConfigChanged', { connectorId, enabled });
  }

  /**
   * Start health monitoring for a connector
   */
  private startHealthMonitoring(connectorId: string): void {
    const entry = this.connectors.get(connectorId);
    if (!entry) return;

    const interval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const health = entry.connector.getHealth();
        
        // Store health history (keep last 24 hours)
        entry.healthHistory.push(health);
        if (entry.healthHistory.length > 1440) { // 24 hours at 1-minute intervals
          entry.healthHistory = entry.healthHistory.slice(-1440);
        }

        // Emit health update event
        this.emit('healthUpdate', { connectorId, health });

        // Handle unhealthy connectors
        if (health.status === 'unhealthy' && entry.status === 'running') {
          console.warn(`Connector ${connectorId} is unhealthy, attempting restart`);
          await this.restartConnector(connectorId);
        }
      } catch (error) {
        console.error(`Health check failed for connector ${connectorId}:`, error);
      }
    }, entry.config.healthCheckInterval);

    this.healthCheckIntervals.set(connectorId, interval);
  }

  /**
   * Stop health monitoring for a connector
   */
  private stopHealthMonitoring(connectorId: string): void {
    const interval = this.healthCheckIntervals.get(connectorId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(connectorId);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      console.log('Shutting down connector registry...');
      this.isShuttingDown = true;

      // Stop all health monitoring
      for (const [connectorId] of this.healthCheckIntervals) {
        this.stopHealthMonitoring(connectorId);
      }

      // Stop all running connectors
      const stopPromises: Promise<void>[] = [];
      for (const [connectorId, entry] of this.connectors) {
        if (entry.status === 'running') {
          stopPromises.push(this.stopConnector(connectorId));
        }
      }

      await Promise.all(stopPromises);
      console.log('Connector registry shutdown complete');
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Get connector credentials (placeholder - would integrate with credential manager)
   */
  private async getConnectorCredentials(connectorId: string): Promise<ConnectorCredentials> {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    // In a real implementation, this would retrieve encrypted credentials
    // from the credential manager service
    return {
      id: connectorId,
      connectorType: entry.config.type,
      apiKey: 'placeholder_key',
      endpoint: 'placeholder_endpoint',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update connector configuration
   */
  updateConnectorConfiguration(connectorId: string, updates: Partial<ConnectorConfiguration>): void {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    // Update configuration
    entry.config = { ...entry.config, ...updates };
    
    // Restart health monitoring if interval changed
    if (updates.healthCheckInterval) {
      this.stopHealthMonitoring(connectorId);
      this.startHealthMonitoring(connectorId);
    }

    this.emit('connectorConfigUpdated', { connectorId, updates });
    console.log(`Connector ${connectorId} configuration updated`);
  }

  /**
   * Get connector configuration
   */
  getConnectorConfiguration(connectorId: string): ConnectorConfiguration | null {
    const entry = this.connectors.get(connectorId);
    return entry ? { ...entry.config } : null;
  }

  /**
   * Get connector health history
   */
  getConnectorHealthHistory(connectorId: string): ConnectorHealth[] {
    const entry = this.connectors.get(connectorId);
    return entry ? [...entry.healthHistory] : [];
  }

  /**
   * Clear connector health history
   */
  clearConnectorHealthHistory(connectorId: string): void {
    const entry = this.connectors.get(connectorId);
    if (entry) {
      entry.healthHistory = [];
      console.log(`Health history cleared for connector ${connectorId}`);
    }
  }

  /**
   * Get detailed connector status including metrics
   */
  getDetailedConnectorStatus(connectorId: string) {
    const entry = this.connectors.get(connectorId);
    if (!entry) {
      return null;
    }

    const health = entry.connector.getHealth();
    const recentActivity = entry.connector.getRecentActivity(5);
    
    return {
      id: entry.config.id,
      name: entry.config.name,
      type: entry.config.type,
      status: entry.status,
      isEnabled: entry.config.isEnabled,
      registeredAt: entry.registeredAt,
      lastActivity: entry.lastActivity,
      health,
      recentActivity,
      healthHistoryCount: entry.healthHistory.length,
      configuration: {
        autoStart: entry.config.autoStart,
        healthCheckInterval: entry.config.healthCheckInterval,
        maxRetries: entry.config.maxRetries,
        retryDelay: entry.config.retryDelay
      }
    };
  }

  /**
   * Bulk operations for multiple connectors
   */
  async bulkStartConnectors(connectorIds: string[]): Promise<{ success: string[], failed: Array<{ id: string, error: string }> }> {
    const results: { success: string[], failed: Array<{ id: string, error: string }> } = { 
      success: [], 
      failed: [] 
    };
    
    for (const connectorId of connectorIds) {
      try {
        await this.startConnector(connectorId);
        results.success.push(connectorId);
      } catch (error: any) {
        results.failed.push({ id: connectorId, error: error.message });
      }
    }
    
    return results;
  }

  async bulkStopConnectors(connectorIds: string[]): Promise<{ success: string[], failed: Array<{ id: string, error: string }> }> {
    const results: { success: string[], failed: Array<{ id: string, error: string }> } = { 
      success: [], 
      failed: [] 
    };
    
    for (const connectorId of connectorIds) {
      try {
        await this.stopConnector(connectorId);
        results.success.push(connectorId);
      } catch (error: any) {
        results.failed.push({ id: connectorId, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Get registry statistics
   */
  getRegistryStats() {
    const stats = {
      totalConnectors: this.connectors.size,
      runningConnectors: 0,
      stoppedConnectors: 0,
      errorConnectors: 0,
      enabledConnectors: 0,
      disabledConnectors: 0,
      connectorsByType: {} as Record<ConnectorType, number>,
      averageHealthScore: 0,
      totalHealthChecks: 0
    };

    let totalHealthScore = 0;
    let healthCheckCount = 0;

    for (const [, entry] of this.connectors) {
      // Count by status
      if (entry.status === 'running') stats.runningConnectors++;
      else if (entry.status === 'stopped') stats.stoppedConnectors++;
      else if (entry.status === 'error') stats.errorConnectors++;

      // Count by enabled status
      if (entry.config.isEnabled) stats.enabledConnectors++;
      else stats.disabledConnectors++;

      // Count by type
      stats.connectorsByType[entry.config.type] = 
        (stats.connectorsByType[entry.config.type] || 0) + 1;

      // Calculate average health score
      const health = entry.connector.getHealth();
      if (health.status === 'healthy') totalHealthScore += 100;
      else if (health.status === 'degraded') totalHealthScore += 50;
      else if (health.status === 'unhealthy') totalHealthScore += 25;
      // offline = 0 points
      
      healthCheckCount++;
      stats.totalHealthChecks += entry.healthHistory.length;
    }

    if (healthCheckCount > 0) {
      stats.averageHealthScore = Math.round(totalHealthScore / healthCheckCount);
    }

    return stats;
  }
}