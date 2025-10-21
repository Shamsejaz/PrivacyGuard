import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationService } from '../services/ConfigurationService';
import type { ExternalSystemConfig, ConfigTemplate } from '../services/ConfigurationService';

// Mock database
vi.mock('../config/database', () => ({
  pgPool: {
    query: vi.fn()
  }
}));

// Mock file system
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}));

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    service = new ConfigurationService();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Configuration Management', () => {
    it('should create a new configuration', async () => {
      const config = {
        name: 'Test PostgreSQL Config',
        type: 'database' as const,
        category: 'source' as const,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          ssl: false
        },
        credentials: {
          username: 'testuser',
          password: 'testpass'
        },
        metadata: {
          description: 'Test configuration',
          environment: 'development' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        validation: {
          required: ['host', 'port', 'database'],
          optional: ['ssl'],
          encrypted: ['password']
        }
      };

      // Mock database save
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const configId = await service.createConfig(config);
      
      expect(configId).toBeDefined();
      expect(configId).toMatch(/^config_/);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO external_system_configs'),
        expect.arrayContaining([configId])
      );
    });

    it('should validate configuration against template', async () => {
      const config: ExternalSystemConfig = {
        id: 'test-config',
        name: 'Test Config',
        type: 'database',
        category: 'source',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb'
        },
        credentials: {
          username: 'testuser',
          password: 'testpass'
        },
        metadata: {
          environment: 'development',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        status: 'inactive',
        validation: {
          required: ['host', 'port', 'database'],
          optional: ['ssl'],
          encrypted: ['password']
        }
      };

      const validation = await service.validateConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', async () => {
      const config: ExternalSystemConfig = {
        id: 'test-config-invalid',
        name: 'Invalid Config',
        type: 'database',
        category: 'source',
        config: {
          host: 'localhost'
          // Missing required port and database
        },
        credentials: {
          // Missing required username and password
        },
        metadata: {
          environment: 'development',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        status: 'inactive',
        validation: {
          required: ['host', 'port', 'database'],
          optional: ['ssl'],
          encrypted: ['password']
        }
      };

      const validation = await service.validateConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      const missingFields = validation.errors.map(e => e.field);
      expect(missingFields).toContain('port');
      expect(missingFields).toContain('database');
      expect(missingFields).toContain('username');
      expect(missingFields).toContain('password');
    });

    it('should fail validation for invalid field types', async () => {
      const config: ExternalSystemConfig = {
        id: 'test-config-types',
        name: 'Type Test Config',
        type: 'database',
        category: 'source',
        config: {
          host: 'localhost',
          port: 'invalid-port', // Should be number
          database: 'testdb',
          ssl: 'yes' // Should be boolean
        },
        credentials: {
          username: 'testuser',
          password: 'testpass'
        },
        metadata: {
          environment: 'development',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        status: 'inactive',
        validation: {
          required: ['host', 'port', 'database'],
          optional: ['ssl'],
          encrypted: ['password']
        }
      };

      const validation = await service.validateConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      const typeErrors = validation.errors.filter(e => e.type === 'invalid');
      expect(typeErrors.length).toBeGreaterThan(0);
    });

    it('should update existing configuration', async () => {
      // Mock existing config in database
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Create
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Update

      const config = {
        name: 'Test Config',
        type: 'database' as const,
        category: 'source' as const,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb'
        },
        credentials: {
          username: 'testuser',
          password: 'testpass'
        },
        metadata: {
          description: 'Test configuration',
          environment: 'development' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        validation: {
          required: ['host', 'port', 'database'],
          optional: [],
          encrypted: ['password']
        }
      };

      const configId = await service.createConfig(config);
      
      await service.updateConfig(configId, {
        name: 'Updated Config Name',
        config: {
          ...config.config,
          port: 5433
        }
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should delete configuration', async () => {
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Create
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Delete

      const config = {
        name: 'Test Config',
        type: 'database' as const,
        category: 'source' as const,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb'
        },
        credentials: {
          username: 'testuser',
          password: 'testpass'
        },
        metadata: {
          description: 'Test configuration',
          environment: 'development' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        validation: {
          required: ['host', 'port', 'database'],
          optional: [],
          encrypted: ['password']
        }
      };

      const configId = await service.createConfig(config);
      await service.deleteConfig(configId);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM external_system_configs WHERE id = $1',
        [configId]
      );
    });

    it('should get configuration by ID', async () => {
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      
      const mockConfigData = {
        id: 'test-config-123',
        name: 'Test Config',
        type: 'database',
        category: 'source',
        config: JSON.stringify({ host: 'localhost', port: 5432 }),
        credentials: JSON.stringify({ username: 'testuser', password: 'dGVzdHBhc3M=' }), // base64 encoded
        metadata: JSON.stringify({ environment: 'development', createdAt: new Date(), updatedAt: new Date() }),
        status: 'active',
        validation: JSON.stringify({ required: ['host'], optional: [], encrypted: ['password'] })
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConfigData] });

      const config = await service.getConfig('test-config-123');
      
      expect(config).toBeDefined();
      expect(config?.id).toBe('test-config-123');
      expect(config?.name).toBe('Test Config');
      expect(config?.credentials.password).toBe('testpass'); // Should be decrypted
    });

    it('should get configurations by type', async () => {
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Load all configs

      const configs = await service.getConfigsByType('database');
      
      expect(Array.isArray(configs)).toBe(true);
    });

    it('should get configurations by category', async () => {
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Load all configs

      const configs = await service.getConfigsByCategory('source');
      
      expect(Array.isArray(configs)).toBe(true);
    });
  });

  describe('Template Management', () => {
    it('should return available templates', () => {
      const templates = service.getTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected templates
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('postgresql');
      expect(templateIds).toContain('mongodb');
      expect(templateIds).toContain('mysql');
      expect(templateIds).toContain('rest_api');
    });

    it('should get specific template by ID', () => {
      const template = service.getTemplate('postgresql');
      
      expect(template).toBeDefined();
      expect(template?.id).toBe('postgresql');
      expect(template?.name).toBe('PostgreSQL Database');
      expect(template?.type).toBe('database');
      expect(template?.configSchema).toBeDefined();
      expect(template?.credentialSchema).toBeDefined();
    });

    it('should return undefined for non-existent template', () => {
      const template = service.getTemplate('non-existent-template');
      expect(template).toBeUndefined();
    });

    it('should have proper PostgreSQL template schema', () => {
      const template = service.getTemplate('postgresql');
      
      expect(template?.configSchema.host).toBeDefined();
      expect(template?.configSchema.host.type).toBe('string');
      expect(template?.configSchema.host.required).toBe(true);
      
      expect(template?.configSchema.port).toBeDefined();
      expect(template?.configSchema.port.type).toBe('number');
      expect(template?.configSchema.port.default).toBe(5432);
      
      expect(template?.credentialSchema.username).toBeDefined();
      expect(template?.credentialSchema.password).toBeDefined();
      expect(template?.credentialSchema.password.encrypted).toBe(true);
    });

    it('should have proper MongoDB template schema', () => {
      const template = service.getTemplate('mongodb');
      
      expect(template?.configSchema.host).toBeDefined();
      expect(template?.configSchema.port.default).toBe(27017);
      expect(template?.configSchema.authSource).toBeDefined();
      expect(template?.configSchema.replicaSet).toBeDefined();
    });

    it('should have proper MySQL template schema', () => {
      const template = service.getTemplate('mysql');
      
      expect(template?.configSchema.host).toBeDefined();
      expect(template?.configSchema.port.default).toBe(3306);
      expect(template?.configSchema.charset).toBeDefined();
      expect(template?.configSchema.timezone).toBeDefined();
    });

    it('should have proper REST API template schema', () => {
      const template = service.getTemplate('rest_api');
      
      expect(template?.configSchema.baseUrl).toBeDefined();
      expect(template?.configSchema.timeout).toBeDefined();
      expect(template?.credentialSchema.apiKey).toBeDefined();
      expect(template?.credentialSchema.bearerToken).toBeDefined();
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt sensitive fields', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
        apiKey: 'secret-key'
      };
      const encryptedFields = ['password', 'apiKey'];

      const encrypted = await service['encryptCredentials'](credentials, encryptedFields);
      
      expect(encrypted.username).toBe('testuser'); // Not encrypted
      expect(encrypted.password).not.toBe('testpass'); // Encrypted
      expect(encrypted.apiKey).not.toBe('secret-key'); // Encrypted
      
      // Should be base64 encoded
      expect(encrypted.password).toBe(Buffer.from('testpass').toString('base64'));
      expect(encrypted.apiKey).toBe(Buffer.from('secret-key').toString('base64'));
    });

    it('should decrypt sensitive fields', async () => {
      const encryptedCredentials = {
        username: 'testuser',
        password: Buffer.from('testpass').toString('base64'),
        apiKey: Buffer.from('secret-key').toString('base64')
      };
      const encryptedFields = ['password', 'apiKey'];

      const decrypted = await service['decryptCredentials'](encryptedCredentials, encryptedFields);
      
      expect(decrypted.username).toBe('testuser'); // Not encrypted
      expect(decrypted.password).toBe('testpass'); // Decrypted
      expect(decrypted.apiKey).toBe('secret-key'); // Decrypted
    });

    it('should handle decryption errors gracefully', async () => {
      const invalidCredentials = {
        password: 'invalid-base64-!@#$%'
      };
      const encryptedFields = ['password'];

      // Mock console.warn to verify error handling
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const decrypted = await service['decryptCredentials'](invalidCredentials, encryptedFields);
      
      expect(decrypted.password).toBe('invalid-base64-!@#$%'); // Should remain unchanged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decrypt field'),
        expect.any(Error)
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('Import/Export', () => {
    it('should export configurations to file', async () => {
      const mockWriteFile = vi.mocked(require('fs').promises.writeFile);
      mockWriteFile.mockResolvedValueOnce(undefined);

      // Mock getAllConfigs to return test data
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const exportPath = await service.exportConfigs();
      
      expect(exportPath).toBeDefined();
      expect(exportPath).toMatch(/external-systems-export-\d+\.json$/);
      expect(mockWriteFile).toHaveBeenCalledWith(
        exportPath,
        expect.stringContaining('"name"')
      );
    });

    it('should import configurations from file', async () => {
      const mockReadFile = vi.mocked(require('fs').promises.readFile);
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      
      const testConfigs = [
        {
          name: 'Imported Config 1',
          type: 'database',
          category: 'source',
          config: { host: 'localhost' },
          credentials: {},
          validation: { required: [], optional: [], encrypted: [] }
        },
        {
          name: 'Imported Config 2',
          type: 'api',
          category: 'target',
          config: { baseUrl: 'https://api.example.com' },
          credentials: {},
          validation: { required: [], optional: [], encrypted: [] }
        }
      ];

      mockReadFile.mockResolvedValueOnce(JSON.stringify(testConfigs));
      mockQuery.mockResolvedValue({ rows: [] }); // Mock database operations

      const importedCount = await service.importConfigs('/path/to/configs.json');
      
      expect(importedCount).toBe(2);
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/configs.json', 'utf-8');
    });

    it('should handle import errors gracefully', async () => {
      const mockReadFile = vi.mocked(require('fs').promises.readFile);
      mockReadFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(service.importConfigs('/non/existent/file.json')).rejects.toThrow('File not found');
    });

    it('should skip invalid configurations during import', async () => {
      const mockReadFile = vi.mocked(require('fs').promises.readFile);
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      
      const testConfigs = [
        {
          name: 'Valid Config',
          type: 'database',
          category: 'source',
          config: { host: 'localhost', port: 5432, database: 'test' },
          credentials: { username: 'test', password: 'test' },
          validation: { required: ['host', 'port', 'database'], optional: [], encrypted: ['password'] }
        },
        {
          name: 'Invalid Config',
          type: 'invalid-type', // Invalid type
          category: 'source',
          config: {},
          credentials: {},
          validation: { required: [], optional: [], encrypted: [] }
        }
      ];

      mockReadFile.mockResolvedValueOnce(JSON.stringify(testConfigs));
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Valid config creation
      // Invalid config will fail validation and not reach database

      const importedCount = await service.importConfigs('/path/to/configs.json');
      
      expect(importedCount).toBe(1); // Only valid config imported
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockQuery = vi.mocked(require('../config/database').pgPool.query);
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const config = {
        name: 'Test Config',
        type: 'database' as const,
        category: 'source' as const,
        config: { host: 'localhost' },
        credentials: {},
        metadata: {
          description: 'Test configuration',
          environment: 'development' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        validation: { required: [], optional: [], encrypted: [] }
      };

      await expect(service.createConfig(config)).rejects.toThrow('Database connection failed');
    });

    it('should handle validation errors during config creation', async () => {
      const invalidConfig = {
        name: 'Invalid Config',
        type: 'unknown-type' as any,
        category: 'source' as const,
        config: {},
        credentials: {},
        metadata: {
          description: 'Test configuration',
          environment: 'development' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        validation: { required: [], optional: [], encrypted: [] }
      };

      await expect(service.createConfig(invalidConfig)).rejects.toThrow('Configuration validation failed');
    });

    it('should handle missing configuration during update', async () => {
      await expect(service.updateConfig('non-existent-id', {})).rejects.toThrow('Configuration not found');
    });

    it('should handle missing configuration during deletion', async () => {
      await expect(service.deleteConfig('non-existent-id')).rejects.toThrow('Configuration not found');
    });
  });
});
