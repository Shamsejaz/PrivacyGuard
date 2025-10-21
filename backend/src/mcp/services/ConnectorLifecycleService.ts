/**
 * MCP Privacy Connectors - Connector Lifecycle Service
 * Service for managing connector lifecycle operations and health monitoring
 */

import { EventEmitter } from 'events';
import { ConnectorRegistry } from '../registry/ConnectorRegistry.js';
import type { 
  ConnectorHealth
} from '../types/index.js';

/**
 * Connector lifecycle configuration
 */
interface LifecycleConfig {
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
  autoRestart: boolean;
  gracefulShutdownTimeout: number;
}

/**
 * Connector lifecycle event types
 */
export type LifecycleEvent = 
  | 'connector_started'
  | 'connector_stopped' 
  | 'connector_failed'
  | 'connector_recovered'
  | 'health_degraded'
  | 'health_restored';

/**
 * Service for managing connector lifecycle and health monitoring
 */
export class ConnectorLifecycleService extends EventEmitter {
  private registry: ConnectorRegistry;
  private config: LifecycleConfig;
  private retryAttempts: Map<string, number> = new Map();
  private healthHistory: Map<string, ConnectorHealth[]> = new Map();
  private isShuttingDown: boolean = false;

  constructor(registry: ConnectorRegistry, config?: Partial<LifecycleConfig>) {
    super();
    this.registry = registry;
    this.config = {
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      autoRestart: true,
      gracefulShutdownTimeout: 30000, // 30 seconds
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Start a connector with retry logic
   */
  async startConnector(connectorId: string): Promise<void> {
    const maxRetries = this.config.maxRetries;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.registry.startConnector(connectorId);
        this.retryAttempts.delete(connectorId);
        this.emit('connector_started', { connectorId, attempt });
        return;
      } catch (error) {
        attempt++;
        this.retryAttempts.set(connectorId, attempt);
        
        if (attempt >= maxRetries) {
          this.emit('connector_failed', { connectorId, error, attempts: attempt });
          throw new Error(`Failed to start connector ${connectorId} after ${maxRetries} attempts: ${error}`);
        }

        console.warn(`Connector ${connectorId} start attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms...`);
        await this.delay(this.config.retryDelay);
      }
    }
  }

  /**
   * Stop a connector gracefully
   */
  async stopConnector(connectorId: string): Promise<void> {
    try {
      await this.registry.stopConnector(connectorId);
      this.retryAttempts.delete(connectorId);
      this.emit('connector_stopped', { connectorId });
    } catch (error) {
      this.emit('connector_failed', { connectorId, error, operation: 'stop' });
      throw error;
    }
  }

  /**
   * Restart a connector with retry logic
   */
  async restartConnector(connectorId: string): Promise<void> {
    console.log(`Restarting connector ${connectorId}...`);
    
    try {
      await this.stopConnector(connectorId);
      await this.delay(1000); // Brief pause between stop and start
      await this.startConnector(connectorId);
      
      this.emit('connector_recovered', { connectorId });
      console.log(`Connector ${connectorId} restarted successfully`);
    } catch (error) {
      console.error(`Failed to restart connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Start all enabled connectors
   */
  async startAllConnectors(): Promise<void> {
    const connectors = this.registry.getRegisteredConnectors();
    const startPromises: Promise<void | null>[] = [];

    for (const connector of connectors) {
      if (connector.isEnabled && connector.status !== 'running') {
        startPromises.push(
          this.startConnector(connector.id).catch(error => {
            console.error(`Failed to start connector ${connector.id}:`, error);
            return null; // Don't fail the entire operation
          })
        );
      }
    }

    await Promise.all(startPromises);
  }

  /**
   * Stop all running connectors
   */
  async stopAllConnectors(): Promise<void> {
    const connectors = this.registry.getRegisteredConnectors();
    const stopPromises: Promise<void | null>[] = [];

    for (const connector of connectors) {
      if (connector.status === 'running') {
        stopPromises.push(
          this.stopConnector(connector.id).catch(error => {
            console.error(`Failed to stop connector ${connector.id}:`, error);
            return null; // Don't fail the entire operation
          })
        );
      }
    }

    await Promise.all(stopPromises);
  }

  /**
   * Perform health check on all connectors
   */
  async performHealthCheck(): Promise<Map<string, ConnectorHealth>> {
    const healthResults = new Map<string, ConnectorHealth>();
    const connectors = this.registry.getRegisteredConnectors();

    for (const connector of connectors) {
      try {
        const health = this.registry.getConnectorHealth(connector.id);
        if (health) {
          healthResults.set(connector.id, health);
          
          // Handle health status changes
          await this.handleHealthStatusChange(connector.id, health);
        }
      } catch (error) {
        console.error(`Health check failed for connector ${connector.id}:`, error);
      }
    }

    return healthResults;
  }

  /**
   * Handle connector health status changes
   */
  private async handleHealthStatusChange(connectorId: string, health: ConnectorHealth): Promise<void> {
    const previousHealth = this.getPreviousHealthStatus(connectorId);
    
    // Detect health degradation
    if (previousHealth === 'healthy' && health.status !== 'healthy') {
      this.emit('health_degraded', { connectorId, health });
      
      if (this.config.autoRestart && health.status === 'unhealthy') {
        console.warn(`Connector ${connectorId} health degraded, attempting restart...`);
        try {
          await this.restartConnector(connectorId);
        } catch (error) {
          console.error(`Auto-restart failed for connector ${connectorId}:`, error);
        }
      }
    }
    
    // Detect health restoration
    if (previousHealth !== 'healthy' && health.status === 'healthy') {
      this.emit('health_restored', { connectorId, health });
      console.log(`Connector ${connectorId} health restored`);
    }
  }

  /**
   * Get previous health status from history
   */
  private getPreviousHealthStatus(connectorId: string): string {
    const history = this.healthHistory.get(connectorId);
    if (!history || history.length < 2) {
      return 'healthy'; // Default to healthy if no history
    }
    
    // Get the second-to-last health status
    return history[history.length - 2].status;
  }

  /**
   * Update health history for a connector
   */
  private updateHealthHistory(connectorId: string, health: ConnectorHealth): void {
    let history = this.healthHistory.get(connectorId) || [];
    
    // Add new health status
    history.push(health);
    
    // Keep only last 100 health checks
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    this.healthHistory.set(connectorId, history);
  }

  /**
   * Setup event handlers for registry events
   */
  private setupEventHandlers(): void {
    this.registry.on('connectorError', async ({ connectorId, error }) => {
      console.error(`Connector ${connectorId} error:`, error);
      
      if (this.config.autoRestart && !this.isShuttingDown) {
        try {
          await this.restartConnector(connectorId);
        } catch (restartError) {
          console.error(`Auto-restart failed for connector ${connectorId}:`, restartError);
        }
      }
    });

    this.registry.on('healthUpdate', ({ connectorId, health }) => {
      // Update health history
      this.updateHealthHistory(connectorId, health);
      
      // Handle health status changes
      this.handleHealthStatusChange(connectorId, health).catch(error => {
        console.error(`Error handling health status change for ${connectorId}:`, error);
      });
    });
  }

  /**
   * Get connector retry statistics
   */
  getRetryStatistics(): Map<string, number> {
    return new Map(this.retryAttempts);
  }

  /**
   * Reset retry count for a connector
   */
  resetRetryCount(connectorId: string): void {
    this.retryAttempts.delete(connectorId);
  }

  /**
   * Get lifecycle service statistics
   */
  getLifecycleStats() {
    const connectors = this.registry.getRegisteredConnectors();
    const stats = {
      totalConnectors: connectors.length,
      runningConnectors: connectors.filter(c => c.status === 'running').length,
      failedConnectors: connectors.filter(c => c.status === 'error').length,
      totalRetryAttempts: Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0),
      connectorsWithRetries: this.retryAttempts.size,
      config: this.config
    };

    return stats;
  }

  /**
   * Update lifecycle configuration
   */
  updateConfig(newConfig: Partial<LifecycleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Lifecycle service configuration updated:', this.config);
  }

  /**
   * Graceful shutdown of lifecycle service
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down connector lifecycle service...');
    this.isShuttingDown = true;

    try {
      // Stop all connectors with timeout
      const shutdownPromise = this.stopAllConnectors();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Shutdown timeout')), this.config.gracefulShutdownTimeout)
      );

      await Promise.race([shutdownPromise, timeoutPromise]);
      console.log('Connector lifecycle service shutdown complete');
    } catch (error) {
      console.error('Error during lifecycle service shutdown:', error);
      throw error;
    }
  }

  /**
   * Get health history for a specific connector
   */
  getConnectorHealthHistory(connectorId: string): ConnectorHealth[] {
    return this.healthHistory.get(connectorId) || [];
  }

  /**
   * Get health trends for all connectors
   */
  getHealthTrends(): Map<string, { current: string, trend: 'improving' | 'degrading' | 'stable' }> {
    const trends = new Map();
    
    for (const [connectorId, history] of this.healthHistory) {
      if (history.length < 2) {
        trends.set(connectorId, { current: history[0]?.status || 'unknown', trend: 'stable' });
        continue;
      }
      
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      
      const statusScore = (status: string) => {
        switch (status) {
          case 'healthy': return 3;
          case 'degraded': return 2;
          case 'unhealthy': return 1;
          case 'offline': return 0;
          default: return 0;
        }
      };
      
      const currentScore = statusScore(current.status);
      const previousScore = statusScore(previous.status);
      
      if (currentScore > previousScore) trend = 'improving';
      else if (currentScore < previousScore) trend = 'degrading';
      
      trends.set(connectorId, { current: current.status, trend });
    }
    
    return trends;
  }

  /**
   * Force health check on all connectors
   */
  async forceHealthCheckAll(): Promise<Map<string, ConnectorHealth>> {
    console.log('Forcing health check on all connectors...');
    return await this.performHealthCheck();
  }

  /**
   * Get connectors that need attention (unhealthy or high retry count)
   */
  getConnectorsNeedingAttention(): Array<{ connectorId: string, reason: string, severity: 'low' | 'medium' | 'high' }> {
    const needsAttention: Array<{ connectorId: string, reason: string, severity: 'low' | 'medium' | 'high' }> = [];
    const connectors = this.registry.getRegisteredConnectors();
    
    for (const connector of connectors) {
      const health = this.registry.getConnectorHealth(connector.id);
      const retryCount = this.retryAttempts.get(connector.id) || 0;
      
      if (health?.status === 'unhealthy') {
        needsAttention.push({
          connectorId: connector.id,
          reason: 'Connector is unhealthy',
          severity: 'high' as const
        });
      } else if (health?.status === 'degraded') {
        needsAttention.push({
          connectorId: connector.id,
          reason: 'Connector performance is degraded',
          severity: 'medium' as const
        });
      } else if (retryCount >= this.config.maxRetries - 1) {
        needsAttention.push({
          connectorId: connector.id,
          reason: `High retry count: ${retryCount}`,
          severity: 'medium' as const
        });
      } else if (health?.status === 'offline' && connector.isEnabled) {
        needsAttention.push({
          connectorId: connector.id,
          reason: 'Enabled connector is offline',
          severity: 'high' as const
        });
      }
    }
    
    return needsAttention;
  }

  /**
   * Clear all health history
   */
  clearAllHealthHistory(): void {
    this.healthHistory.clear();
    console.log('All health history cleared');
  }

  /**
   * Get comprehensive lifecycle status
   */
  getComprehensiveStatus() {
    const connectors = this.registry.getRegisteredConnectors();
    const registryStats = this.registry.getRegistryStats();
    const lifecycleStats = this.getLifecycleStats();
    const healthTrends = this.getHealthTrends();
    const needsAttention = this.getConnectorsNeedingAttention();
    
    return {
      summary: {
        totalConnectors: connectors.length,
        healthyConnectors: connectors.filter(c => {
          const health = this.registry.getConnectorHealth(c.id);
          return health?.status === 'healthy';
        }).length,
        connectorsNeedingAttention: needsAttention.length,
        averageHealthScore: registryStats.averageHealthScore
      },
      registry: registryStats,
      lifecycle: lifecycleStats,
      trends: Object.fromEntries(healthTrends),
      attention: needsAttention,
      config: this.config
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}