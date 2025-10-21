/**
 * MCP Privacy Connectors - Main Export Module
 * Central export point for all MCP connector infrastructure components
 */

// Core Types
export * from './types/index.js';

// Base Connector Classes
export { MCPConnector } from './connectors/MCPConnector.js';

// Interfaces
export * from './interfaces/ConnectorInterfaces.js';

// Registry and Management
export { ConnectorRegistry } from './registry/ConnectorRegistry.js';
export { ConnectorLifecycleService } from './services/ConnectorLifecycleService.js';

// Security and Credentials
export { CredentialManager } from './security/CredentialManager.js';
export { KeyManagementService } from './security/KeyManagementService.js';

// Configuration
export { ConfigurationManager } from './config/ConfigurationManager.js';

// Import classes for local use
import { CredentialManager } from './security/CredentialManager.js';
import { KeyManagementService } from './security/KeyManagementService.js';
import { ConfigurationManager } from './config/ConfigurationManager.js';
import { ConnectorRegistry } from './registry/ConnectorRegistry.js';
import { ConnectorLifecycleService } from './services/ConnectorLifecycleService.js';

/**
 * MCP Infrastructure Factory
 * Factory class for creating and configuring MCP infrastructure components
 */
export class MCPInfrastructureFactory {
  /**
   * Create a complete MCP infrastructure setup
   */
  static async createInfrastructure(config?: {
    masterKey?: string;
    keyRotationDays?: number;
    systemConfig?: any;
  }) {
    // Initialize key management
    const keyManagementService = new KeyManagementService({
      rotationIntervalDays: config?.keyRotationDays || 90
    });

    // Initialize credential manager
    const credentialManager = new CredentialManager(config?.masterKey);

    // Initialize configuration manager
    const configurationManager = new ConfigurationManager(
      credentialManager,
      config?.systemConfig
    );

    // Initialize connector registry
    const connectorRegistry = new ConnectorRegistry();

    // Initialize lifecycle service
    const lifecycleService = new ConnectorLifecycleService(connectorRegistry);

    return {
      keyManagementService,
      credentialManager,
      configurationManager,
      connectorRegistry,
      lifecycleService
    };
  }

  /**
   * Create a minimal MCP setup for development/testing
   */
  static async createMinimalSetup() {
    const credentialManager = new CredentialManager();
    const configurationManager = new ConfigurationManager(credentialManager);
    const connectorRegistry = new ConnectorRegistry();

    return {
      credentialManager,
      configurationManager,
      connectorRegistry
    };
  }
}

/**
 * MCP Infrastructure Manager
 * High-level manager for coordinating all MCP infrastructure components
 */
export class MCPInfrastructureManager {
  private keyManagementService: KeyManagementService;
  private credentialManager: CredentialManager;
  private configurationManager: ConfigurationManager;
  private connectorRegistry: ConnectorRegistry;
  private lifecycleService: ConnectorLifecycleService;
  private isInitialized: boolean = false;

  constructor(components: {
    keyManagementService: KeyManagementService;
    credentialManager: CredentialManager;
    configurationManager: ConfigurationManager;
    connectorRegistry: ConnectorRegistry;
    lifecycleService: ConnectorLifecycleService;
  }) {
    this.keyManagementService = components.keyManagementService;
    this.credentialManager = components.credentialManager;
    this.configurationManager = components.configurationManager;
    this.connectorRegistry = components.connectorRegistry;
    this.lifecycleService = components.lifecycleService;
  }

  /**
   * Initialize the MCP infrastructure
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('MCP infrastructure already initialized');
      return;
    }

    try {
      console.log('Initializing MCP infrastructure...');

      // Start lifecycle service
      await this.lifecycleService.startAllConnectors();

      this.isInitialized = true;
      console.log('MCP infrastructure initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP infrastructure:', error);
      throw error;
    }
  }

  /**
   * Shutdown the MCP infrastructure
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down MCP infrastructure...');

      // Stop all connectors
      await this.lifecycleService.stopAllConnectors();

      // Shutdown key management
      await this.keyManagementService.shutdown();

      this.isInitialized = false;
      console.log('MCP infrastructure shutdown complete');
    } catch (error) {
      console.error('Error during MCP infrastructure shutdown:', error);
      throw error;
    }
  }

  /**
   * Get infrastructure status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      registryStats: this.connectorRegistry.getRegistryStats(),
      lifecycleStats: this.lifecycleService.getLifecycleStats(),
      keyStats: this.keyManagementService.getKeyStatistics(),
      credentialStats: this.credentialManager.getStatistics(),
      configStats: this.configurationManager.getConfigurationStats()
    };
  }

  /**
   * Get individual components for advanced usage
   */
  getComponents() {
    return {
      keyManagementService: this.keyManagementService,
      credentialManager: this.credentialManager,
      configurationManager: this.configurationManager,
      connectorRegistry: this.connectorRegistry,
      lifecycleService: this.lifecycleService
    };
  }
}