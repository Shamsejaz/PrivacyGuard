/**
 * MCP Privacy Connectors - Configuration Manager
 * Centralized configuration management for MCP connectors and settings
 */

import { EventEmitter } from 'events';
import { ConnectorType, ConnectorCredentials } from '../types/index.js';
import { CredentialManager } from '../security/CredentialManager.js';

/**
 * Connector configuration schema
 */
interface ConnectorConfig {
  id: string;
  type: ConnectorType;
  name: string;
  description?: string;
  isEnabled: boolean;
  autoStart: boolean;
  credentialId: string;
  settings: ConnectorSettings;
  scanConfig: ScanConfigSettings;
  healthCheck: HealthCheckConfig;
  retryPolicy: RetryPolicyConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Connector-specific settings
 */
interface ConnectorSettings {
  endpoint?: string;
  apiVersion?: string;
  timeout: number;
  rateLimit: RateLimitConfig;
  customHeaders?: Record<string, string>;
  additionalConfig?: Record<string, any>;
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit: number;
  backoffMultiplier: number;
}

/**
 * Scan configuration settings
 */
interface ScanConfigSettings {
  defaultScanDepth: 'shallow' | 'deep';
  batchSize: number;
  maxConcurrentScans: number;
  scanTimeout: number;
  includeArchived: boolean;
  customRules: string[]; // Rule IDs
}

/**
 * Health check configuration
 */
interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  failureThreshold: number;
}

/**
 * Retry policy configuration
 */
interface RetryPolicyConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Global MCP system configuration
 */
interface SystemConfig {
  encryption: {
    algorithm: string;
    keyRotationDays: number;
    keyRetentionVersions: number;
  };
  logging: {
    level: string;
    auditEnabled: boolean;
    retentionDays: number;
  };
  security: {
    sessionTimeout: number;
    maxFailedAttempts: number;
    lockoutDuration: number;
  };
  performance: {
    maxConcurrentConnectors: number;
    memoryLimit: number;
    cpuThreshold: number;
  };
}

/**
 * Configuration validation result
 */
interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Centralized configuration manager for MCP connectors
 */
export class ConfigurationManager extends EventEmitter {
  private connectorConfigs: Map<string, ConnectorConfig> = new Map();
  private systemConfig: SystemConfig;
  private credentialManager: CredentialManager;
  private configVersion: number = 1;

  constructor(credentialManager: CredentialManager, initialSystemConfig?: Partial<SystemConfig>) {
    super();
    this.credentialManager = credentialManager;
    
    // Initialize system configuration with defaults
    this.systemConfig = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyRotationDays: 90,
        keyRetentionVersions: 3
      },
      logging: {
        level: 'info',
        auditEnabled: true,
        retentionDays: 365
      },
      security: {
        sessionTimeout: 3600000, // 1 hour
        maxFailedAttempts: 5,
        lockoutDuration: 900000 // 15 minutes
      },
      performance: {
        maxConcurrentConnectors: 10,
        memoryLimit: 1024, // MB
        cpuThreshold: 80 // percentage
      },
      ...initialSystemConfig
    };

    console.log('Configuration manager initialized');
  }

  /**
   * Create a new connector configuration
   */
  async createConnectorConfig(
    type: ConnectorType,
    name: string,
    credentials: ConnectorCredentials,
    settings?: Partial<ConnectorSettings>
  ): Promise<string> {
    const configId = this.generateConfigId();
    
    // Store credentials securely
    const credentialId = await this.credentialManager.storeCredentials({
      ...credentials,
      id: `cred_${configId}`
    });

    // Create default configuration
    const config: ConnectorConfig = {
      id: configId,
      type,
      name,
      description: `${type} connector configuration`,
      isEnabled: true,
      autoStart: false,
      credentialId,
      settings: this.getDefaultConnectorSettings(type, settings),
      scanConfig: this.getDefaultScanConfig(type),
      healthCheck: this.getDefaultHealthCheckConfig(),
      retryPolicy: this.getDefaultRetryPolicy(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate configuration
    const validation = this.validateConnectorConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid connector configuration: ${validation.errors.join(', ')}`);
    }

    // Store configuration
    this.connectorConfigs.set(configId, config);
    this.configVersion++;

    this.emit('connectorConfigCreated', { configId, type, name });
    console.log(`Connector configuration created: ${configId} (${type})`);

    return configId;
  }

  /**
   * Get connector configuration
   */
  getConnectorConfig(configId: string): ConnectorConfig | null {
    return this.connectorConfigs.get(configId) || null;
  }

  /**
   * Update connector configuration
   */
  async updateConnectorConfig(
    configId: string,
    updates: Partial<ConnectorConfig>
  ): Promise<void> {
    const existingConfig = this.connectorConfigs.get(configId);
    if (!existingConfig) {
      throw new Error(`Connector configuration ${configId} not found`);
    }

    // Create updated configuration
    const updatedConfig: ConnectorConfig = {
      ...existingConfig,
      ...updates,
      id: configId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    // Validate updated configuration
    const validation = this.validateConnectorConfig(updatedConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
    }

    // Store updated configuration
    this.connectorConfigs.set(configId, updatedConfig);
    this.configVersion++;

    this.emit('connectorConfigUpdated', { configId, updates });
    console.log(`Connector configuration updated: ${configId}`);
  }

  /**
   * Delete connector configuration
   */
  async deleteConnectorConfig(configId: string): Promise<void> {
    const config = this.connectorConfigs.get(configId);
    if (!config) {
      throw new Error(`Connector configuration ${configId} not found`);
    }

    // Delete associated credentials
    try {
      await this.credentialManager.deleteCredentials(config.credentialId);
    } catch (error) {
      console.warn(`Failed to delete credentials for config ${configId}:`, error);
    }

    // Delete configuration
    this.connectorConfigs.delete(configId);
    this.configVersion++;

    this.emit('connectorConfigDeleted', { configId });
    console.log(`Connector configuration deleted: ${configId}`);
  }

  /**
   * List all connector configurations
   */
  listConnectorConfigs(): Array<{
    id: string;
    type: ConnectorType;
    name: string;
    isEnabled: boolean;
    autoStart: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return Array.from(this.connectorConfigs.values()).map(config => ({
      id: config.id,
      type: config.type,
      name: config.name,
      isEnabled: config.isEnabled,
      autoStart: config.autoStart,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));
  }

  /**
   * Get connector credentials
   */
  async getConnectorCredentials(configId: string): Promise<ConnectorCredentials | null> {
    const config = this.connectorConfigs.get(configId);
    if (!config) {
      return null;
    }

    return await this.credentialManager.retrieveCredentials(config.credentialId);
  }

  /**
   * Update system configuration
   */
  updateSystemConfig(updates: Partial<SystemConfig>): void {
    this.systemConfig = {
      ...this.systemConfig,
      ...updates
    };
    this.configVersion++;

    this.emit('systemConfigUpdated', updates);
    console.log('System configuration updated');
  }

  /**
   * Get system configuration
   */
  getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  /**
   * Validate connector configuration
   */
  private validateConnectorConfig(config: ConnectorConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.id) errors.push('Configuration ID is required');
    if (!config.type) errors.push('Connector type is required');
    if (!config.name) errors.push('Connector name is required');
    if (!config.credentialId) errors.push('Credential ID is required');

    // Settings validation
    if (config.settings.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    if (config.settings.rateLimit.requestsPerSecond <= 0) {
      errors.push('Rate limit requests per second must be greater than 0');
    }

    // Scan configuration validation
    if (config.scanConfig.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (config.scanConfig.maxConcurrentScans <= 0) {
      errors.push('Max concurrent scans must be greater than 0');
    }

    // Health check validation
    if (config.healthCheck.enabled) {
      if (config.healthCheck.interval <= 0) {
        errors.push('Health check interval must be greater than 0');
      }
      if (config.healthCheck.timeout <= 0) {
        errors.push('Health check timeout must be greater than 0');
      }
    }

    // Retry policy validation
    if (config.retryPolicy.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }

    // Warnings
    if (config.settings.timeout > 300000) { // 5 minutes
      warnings.push('Timeout is very high, consider reducing it');
    }

    if (config.scanConfig.batchSize > 1000) {
      warnings.push('Large batch size may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default connector settings
   */
  private getDefaultConnectorSettings(
    type: ConnectorType,
    overrides?: Partial<ConnectorSettings>
  ): ConnectorSettings {
    const defaults: ConnectorSettings = {
      timeout: 30000, // 30 seconds
      rateLimit: {
        requestsPerSecond: 10,
        burstLimit: 50,
        backoffMultiplier: 2
      }
    };

    // Type-specific defaults
    switch (type) {
      case 'crm':
        defaults.timeout = 60000; // CRM operations can be slower
        defaults.rateLimit.requestsPerSecond = 5;
        break;
      case 'cms':
        defaults.timeout = 45000;
        defaults.rateLimit.requestsPerSecond = 8;
        break;
      case 'email_chat':
        defaults.timeout = 30000;
        defaults.rateLimit.requestsPerSecond = 15;
        break;
      case 'cloud_storage':
        defaults.timeout = 120000; // Cloud operations can be very slow
        defaults.rateLimit.requestsPerSecond = 3;
        break;
    }

    return { ...defaults, ...overrides };
  }

  /**
   * Get default scan configuration
   */
  private getDefaultScanConfig(type: ConnectorType): ScanConfigSettings {
    return {
      defaultScanDepth: 'shallow',
      batchSize: type === 'cloud_storage' ? 100 : 500,
      maxConcurrentScans: 3,
      scanTimeout: 300000, // 5 minutes
      includeArchived: false,
      customRules: []
    };
  }

  /**
   * Get default health check configuration
   */
  private getDefaultHealthCheckConfig(): HealthCheckConfig {
    return {
      enabled: true,
      interval: 60000, // 1 minute
      timeout: 10000, // 10 seconds
      retries: 3,
      failureThreshold: 3
    };
  }

  /**
   * Get default retry policy
   */
  private getDefaultRetryPolicy(): RetryPolicyConfig {
    return {
      maxRetries: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'RATE_LIMITED']
    };
  }

  /**
   * Generate unique configuration ID
   */
  private generateConfigId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export configuration (without sensitive data)
   */
  exportConfiguration(): any {
    const configs = Array.from(this.connectorConfigs.values()).map(config => ({
      ...config,
      credentialId: '[REDACTED]' // Don't export credential references
    }));

    return {
      version: this.configVersion,
      systemConfig: this.systemConfig,
      connectorConfigs: configs,
      exportedAt: new Date()
    };
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats() {
    const configs = Array.from(this.connectorConfigs.values());
    
    return {
      totalConfigurations: configs.length,
      enabledConfigurations: configs.filter(c => c.isEnabled).length,
      autoStartConfigurations: configs.filter(c => c.autoStart).length,
      configurationsByType: configs.reduce((acc, config) => {
        acc[config.type] = (acc[config.type] || 0) + 1;
        return acc;
      }, {} as Record<ConnectorType, number>),
      configVersion: this.configVersion,
      systemConfig: this.systemConfig
    };
  }
}