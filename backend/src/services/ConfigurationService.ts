import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { pgPool } from '../config/database';

export interface ExternalSystemConfig {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file_system' | 'cloud_storage';
  category: 'source' | 'target' | 'both';
  config: Record<string, any>;
  credentials: Record<string, string>;
  metadata: {
    description?: string;
    tags?: string[];
    owner?: string;
    environment: 'development' | 'staging' | 'production';
    createdAt: Date;
    updatedAt: Date;
    lastUsed?: Date;
  };
  status: 'active' | 'inactive' | 'error';
  validation: {
    required: string[];
    optional: string[];
    encrypted: string[];
  };
}

export interface ConfigTemplate {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file_system' | 'cloud_storage';
  description: string;
  configSchema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required: boolean;
      default?: any;
      description: string;
      validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        enum?: any[];
      };
    };
  };
  credentialSchema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean';
      required: boolean;
      encrypted: boolean;
      description: string;
    };
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    type: 'missing' | 'invalid' | 'format';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export class ConfigurationService extends EventEmitter {
  private configs: Map<string, ExternalSystemConfig> = new Map();
  private templates: Map<string, ConfigTemplate> = new Map();
  private configFilePath: string;
  private encryptionKey: string;

  constructor() {
    super();
    this.configFilePath = process.env.CONFIG_FILE_PATH || './config/external-systems.json';
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // PostgreSQL template
    this.templates.set('postgresql', {
      id: 'postgresql',
      name: 'PostgreSQL Database',
      type: 'database',
      description: 'PostgreSQL database connection configuration',
      configSchema: {
        host: {
          type: 'string',
          required: true,
          description: 'Database host address'
        },
        port: {
          type: 'number',
          required: true,
          default: 5432,
          description: 'Database port number'
        },
        database: {
          type: 'string',
          required: true,
          description: 'Database name'
        },
        ssl: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Enable SSL connection'
        },
        maxConnections: {
          type: 'number',
          required: false,
          default: 10,
          description: 'Maximum number of connections'
        },
        connectionTimeout: {
          type: 'number',
          required: false,
          default: 5000,
          description: 'Connection timeout in milliseconds'
        }
      },
      credentialSchema: {
        username: {
          type: 'string',
          required: true,
          encrypted: false,
          description: 'Database username'
        },
        password: {
          type: 'string',
          required: true,
          encrypted: true,
          description: 'Database password'
        }
      }
    });

    // MongoDB template
    this.templates.set('mongodb', {
      id: 'mongodb',
      name: 'MongoDB Database',
      type: 'database',
      description: 'MongoDB database connection configuration',
      configSchema: {
        host: {
          type: 'string',
          required: true,
          description: 'Database host address'
        },
        port: {
          type: 'number',
          required: true,
          default: 27017,
          description: 'Database port number'
        },
        database: {
          type: 'string',
          required: true,
          description: 'Database name'
        },
        authSource: {
          type: 'string',
          required: false,
          description: 'Authentication database'
        },
        replicaSet: {
          type: 'string',
          required: false,
          description: 'Replica set name'
        },
        maxPoolSize: {
          type: 'number',
          required: false,
          default: 10,
          description: 'Maximum pool size'
        }
      },
      credentialSchema: {
        username: {
          type: 'string',
          required: true,
          encrypted: false,
          description: 'Database username'
        },
        password: {
          type: 'string',
          required: true,
          encrypted: true,
          description: 'Database password'
        }
      }
    });

    // MySQL template
    this.templates.set('mysql', {
      id: 'mysql',
      name: 'MySQL Database',
      type: 'database',
      description: 'MySQL database connection configuration',
      configSchema: {
        host: {
          type: 'string',
          required: true,
          description: 'Database host address'
        },
        port: {
          type: 'number',
          required: true,
          default: 3306,
          description: 'Database port number'
        },
        database: {
          type: 'string',
          required: true,
          description: 'Database name'
        },
        charset: {
          type: 'string',
          required: false,
          default: 'utf8mb4',
          description: 'Character set'
        },
        timezone: {
          type: 'string',
          required: false,
          default: 'Z',
          description: 'Timezone'
        },
        connectionLimit: {
          type: 'number',
          required: false,
          default: 10,
          description: 'Connection limit'
        }
      },
      credentialSchema: {
        user: {
          type: 'string',
          required: true,
          encrypted: false,
          description: 'Database username'
        },
        password: {
          type: 'string',
          required: true,
          encrypted: true,
          description: 'Database password'
        }
      }
    });

    // REST API template
    this.templates.set('rest_api', {
      id: 'rest_api',
      name: 'REST API',
      type: 'api',
      description: 'REST API connection configuration',
      configSchema: {
        baseUrl: {
          type: 'string',
          required: true,
          description: 'Base URL for the API'
        },
        timeout: {
          type: 'number',
          required: false,
          default: 30000,
          description: 'Request timeout in milliseconds'
        },
        retryAttempts: {
          type: 'number',
          required: false,
          default: 3,
          description: 'Number of retry attempts'
        },
        rateLimit: {
          type: 'number',
          required: false,
          description: 'Rate limit (requests per minute)'
        }
      },
      credentialSchema: {
        apiKey: {
          type: 'string',
          required: false,
          encrypted: true,
          description: 'API key'
        },
        username: {
          type: 'string',
          required: false,
          encrypted: false,
          description: 'Username for basic auth'
        },
        password: {
          type: 'string',
          required: false,
          encrypted: true,
          description: 'Password for basic auth'
        },
        bearerToken: {
          type: 'string',
          required: false,
          encrypted: true,
          description: 'Bearer token'
        }
      }
    });
  }

  // Configuration Management
  async createConfig(config: Omit<ExternalSystemConfig, 'id' | 'status'> & { metadata?: any }): Promise<string> {
    const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newConfig: ExternalSystemConfig = {
      ...config,
      id: configId,
      metadata: {
        ...(config.metadata || {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        environment: config.metadata?.environment || 'development'
      },
      status: 'inactive'
    };

    // Validate configuration
    const validation = await this.validateConfig(newConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Encrypt sensitive fields
    newConfig.credentials = await this.encryptCredentials(newConfig.credentials, newConfig.validation.encrypted);

    // Store in database
    await this.saveConfigToDatabase(newConfig);
    
    // Store in memory
    this.configs.set(configId, newConfig);
    
    this.emit('config:created', newConfig);
    logger.info(`External system configuration created: ${configId}`);
    
    return configId;
  }

  async updateConfig(configId: string, updates: Partial<ExternalSystemConfig>): Promise<void> {
    const existingConfig = this.configs.get(configId);
    if (!existingConfig) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    const updatedConfig: ExternalSystemConfig = {
      ...existingConfig,
      ...updates,
      id: configId, // Ensure ID doesn't change
      metadata: {
        ...existingConfig.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    // Validate updated configuration
    const validation = await this.validateConfig(updatedConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Encrypt sensitive fields if credentials were updated
    if (updates.credentials) {
      updatedConfig.credentials = await this.encryptCredentials(
        updatedConfig.credentials,
        updatedConfig.validation.encrypted
      );
    }

    // Update in database
    await this.saveConfigToDatabase(updatedConfig);
    
    // Update in memory
    this.configs.set(configId, updatedConfig);
    
    this.emit('config:updated', updatedConfig);
    logger.info(`External system configuration updated: ${configId}`);
  }

  async deleteConfig(configId: string): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    // Remove from database
    await this.deleteConfigFromDatabase(configId);
    
    // Remove from memory
    this.configs.delete(configId);
    
    this.emit('config:deleted', configId);
    logger.info(`External system configuration deleted: ${configId}`);
  }

  async getConfig(configId: string): Promise<ExternalSystemConfig | undefined> {
    let config = this.configs.get(configId);
    
    if (!config) {
      // Try to load from database
      config = await this.loadConfigFromDatabase(configId);
      if (config) {
        this.configs.set(configId, config);
      }
    }

    if (config) {
      // Decrypt credentials for use
      const decryptedConfig = { ...config };
      decryptedConfig.credentials = await this.decryptCredentials(
        config.credentials,
        config.validation.encrypted
      );
      return decryptedConfig;
    }

    return undefined;
  }

  async getAllConfigs(): Promise<ExternalSystemConfig[]> {
    // Load all configs from database if not in memory
    await this.loadAllConfigsFromDatabase();
    
    const configs = Array.from(this.configs.values());
    
    // Decrypt credentials for all configs
    const decryptedConfigs = await Promise.all(
      configs.map(async (config) => {
        const decryptedConfig = { ...config };
        decryptedConfig.credentials = await this.decryptCredentials(
          config.credentials,
          config.validation.encrypted
        );
        return decryptedConfig;
      })
    );

    return decryptedConfigs;
  }

  async getConfigsByType(type: ExternalSystemConfig['type']): Promise<ExternalSystemConfig[]> {
    const allConfigs = await this.getAllConfigs();
    return allConfigs.filter(config => config.type === type);
  }

  async getConfigsByCategory(category: ExternalSystemConfig['category']): Promise<ExternalSystemConfig[]> {
    const allConfigs = await this.getAllConfigs();
    return allConfigs.filter(config => config.category === category);
  }

  // Template Management
  getTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(templateId: string): ConfigTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Validation
  async validateConfig(config: ExternalSystemConfig): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const template = this.templates.get(config.type);
    if (!template) {
      result.isValid = false;
      result.errors.push({
        field: 'type',
        message: `Unknown configuration type: ${config.type}`,
        type: 'invalid'
      });
      return result;
    }

    // Validate config fields
    for (const [fieldName, fieldSchema] of Object.entries(template.configSchema)) {
      const value = config.config[fieldName];
      
      if (fieldSchema.required && (value === undefined || value === null)) {
        result.isValid = false;
        result.errors.push({
          field: fieldName,
          message: `Required field '${fieldName}' is missing`,
          type: 'missing'
        });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (typeof value !== fieldSchema.type) {
          result.isValid = false;
          result.errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be of type ${fieldSchema.type}`,
            type: 'invalid'
          });
        }

        // Additional validation
        if (fieldSchema.validation) {
          const validation = fieldSchema.validation;
          
          if (validation.pattern && typeof value === 'string') {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              result.isValid = false;
              result.errors.push({
                field: fieldName,
                message: `Field '${fieldName}' does not match required pattern`,
                type: 'format'
              });
            }
          }
          
          if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
            result.isValid = false;
            result.errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be at least ${validation.min}`,
              type: 'invalid'
            });
          }
          
          if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
            result.isValid = false;
            result.errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be at most ${validation.max}`,
              type: 'invalid'
            });
          }
          
          if (validation.enum && !validation.enum.includes(value)) {
            result.isValid = false;
            result.errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be one of: ${validation.enum.join(', ')}`,
              type: 'invalid'
            });
          }
        }
      }
    }

    // Validate credential fields
    for (const [fieldName, fieldSchema] of Object.entries(template.credentialSchema)) {
      const value = config.credentials[fieldName];
      
      if (fieldSchema.required && (value === undefined || value === null || value === '')) {
        result.isValid = false;
        result.errors.push({
          field: fieldName,
          message: `Required credential '${fieldName}' is missing`,
          type: 'missing'
        });
      }
    }

    return result;
  }

  // Encryption/Decryption
  private async encryptCredentials(credentials: Record<string, string>, encryptedFields: string[]): Promise<Record<string, string>> {
    const encrypted = { ...credentials };
    
    for (const field of encryptedFields) {
      if (encrypted[field]) {
        // Simple encryption - in production, use proper encryption
        encrypted[field] = Buffer.from(encrypted[field]).toString('base64');
      }
    }
    
    return encrypted;
  }

  private async decryptCredentials(credentials: Record<string, string>, encryptedFields: string[]): Promise<Record<string, string>> {
    const decrypted = { ...credentials };
    
    for (const field of encryptedFields) {
      if (decrypted[field]) {
        try {
          // Simple decryption - in production, use proper decryption
          decrypted[field] = Buffer.from(decrypted[field], 'base64').toString();
        } catch (error) {
          logger.warn(`Failed to decrypt field '${field}':`, error);
        }
      }
    }
    
    return decrypted;
  }

  // Database Operations
  private async saveConfigToDatabase(config: ExternalSystemConfig): Promise<void> {
    try {
      const query = `
        INSERT INTO external_system_configs (
          id, name, type, category, config, credentials, metadata, status, validation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          config = EXCLUDED.config,
          credentials = EXCLUDED.credentials,
          metadata = EXCLUDED.metadata,
          status = EXCLUDED.status,
          validation = EXCLUDED.validation
      `;
      
      await pgPool.query(query, [
        config.id,
        config.name,
        config.type,
        config.category,
        JSON.stringify(config.config),
        JSON.stringify(config.credentials),
        JSON.stringify(config.metadata),
        config.status,
        JSON.stringify(config.validation)
      ]);
    } catch (error) {
      logger.error('Failed to save config to database:', error);
      throw error;
    }
  }

  private async loadConfigFromDatabase(configId: string): Promise<ExternalSystemConfig | undefined> {
    try {
      const query = 'SELECT * FROM external_system_configs WHERE id = $1';
      const result = await pgPool.query(query, [configId]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        config: JSON.parse(row.config),
        credentials: JSON.parse(row.credentials),
        metadata: JSON.parse(row.metadata),
        status: row.status,
        validation: JSON.parse(row.validation)
      };
    } catch (error) {
      logger.error('Failed to load config from database:', error);
      return undefined;
    }
  }

  private async loadAllConfigsFromDatabase(): Promise<void> {
    try {
      const query = 'SELECT * FROM external_system_configs';
      const result = await pgPool.query(query);
      
      for (const row of result.rows) {
        const config: ExternalSystemConfig = {
          id: row.id,
          name: row.name,
          type: row.type,
          category: row.category,
          config: JSON.parse(row.config),
          credentials: JSON.parse(row.credentials),
          metadata: JSON.parse(row.metadata),
          status: row.status,
          validation: JSON.parse(row.validation)
        };
        
        this.configs.set(config.id, config);
      }
    } catch (error) {
      logger.error('Failed to load configs from database:', error);
    }
  }

  private async deleteConfigFromDatabase(configId: string): Promise<void> {
    try {
      const query = 'DELETE FROM external_system_configs WHERE id = $1';
      await pgPool.query(query, [configId]);
    } catch (error) {
      logger.error('Failed to delete config from database:', error);
      throw error;
    }
  }

  // File Operations (backup/restore)
  async exportConfigs(filePath?: string): Promise<string> {
    const exportPath = filePath || `./config/external-systems-export-${Date.now()}.json`;
    const configs = await this.getAllConfigs();
    
    // Remove sensitive data for export
    const exportData = configs.map(config => ({
      ...config,
      credentials: {} // Don't export credentials
    }));
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    logger.info(`Configurations exported to: ${exportPath}`);
    return exportPath;
  }

  async importConfigs(filePath: string): Promise<number> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const configs: ExternalSystemConfig[] = JSON.parse(data);
      
      let importedCount = 0;
      
      for (const config of configs) {
        try {
          await this.createConfig(config);
          importedCount++;
        } catch (error) {
          logger.warn(`Failed to import config '${config.name}':`, error);
        }
      }
      
      logger.info(`Imported ${importedCount} configurations from: ${filePath}`);
      return importedCount;
    } catch (error) {
      logger.error('Failed to import configurations:', error);
      throw error;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.configs.clear();
    logger.info('Configuration service cleanup completed');
  }
}

export const configurationService = new ConfigurationService();