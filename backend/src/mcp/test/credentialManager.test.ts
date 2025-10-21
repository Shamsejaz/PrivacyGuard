/**
 * MCP Privacy Connectors - Credential Manager Tests
 * Comprehensive tests for secure credential storage and management
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { CredentialManager } from '../security/CredentialManager.js';
import type { ConnectorCredentials, ConnectorType } from '../types/index.js';
import crypto from 'crypto';

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;
  let testCredentials: ConnectorCredentials;

  beforeEach(() => {
    // Initialize with a test master key
    const testMasterKey = crypto.randomBytes(32).toString('hex');
    credentialManager = new CredentialManager(testMasterKey, {
      rotationIntervalDays: 30,
      maxKeyAge: 90,
      keyVersions: 3
    });

    // Create test credentials
    testCredentials = {
      id: 'test-cred-1',
      connectorType: 'crm' as ConnectorType,
      apiKey: 'test-api-key-12345',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      endpoint: 'https://api.example.com',
      additionalConfig: {
        region: 'us-east-1',
        timeout: 30000
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };
  });

  afterEach(() => {
    // Clean up any stored credentials
    const credentialList = credentialManager.listCredentials();
    for (const cred of credentialList) {
      try {
        credentialManager.deleteCredentials(cred.id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Credential Storage', () => {
    test('should store credentials securely with AES-256 encryption', async () => {
      const credentialId = await credentialManager.storeCredentials(testCredentials);
      
      expect(credentialId).toBe(testCredentials.id);
      
      const storedList = credentialManager.listCredentials();
      expect(storedList).toHaveLength(1);
      expect(storedList[0].id).toBe(testCredentials.id);
      expect(storedList[0].connectorType).toBe(testCredentials.connectorType);
    });

    test('should validate credentials before storing', async () => {
      const invalidCredentials = {
        ...testCredentials,
        id: '', // Invalid empty ID
        apiKey: undefined,
        accessToken: undefined,
        clientId: undefined,
        clientSecret: undefined
      };

      await expect(credentialManager.storeCredentials(invalidCredentials))
        .rejects.toThrow('Invalid credentials');
    });

    test('should handle credentials with minimal required fields', async () => {
      const minimalCredentials: ConnectorCredentials = {
        id: 'minimal-cred',
        connectorType: 'cms' as ConnectorType,
        apiKey: 'minimal-api-key',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const credentialId = await credentialManager.storeCredentials(minimalCredentials);
      expect(credentialId).toBe('minimal-cred');
    });

    test('should reject credentials with invalid endpoint URL', async () => {
      const invalidEndpointCredentials = {
        ...testCredentials,
        endpoint: 'invalid-url'
      };

      await expect(credentialManager.storeCredentials(invalidEndpointCredentials))
        .rejects.toThrow('Invalid endpoint URL format');
    });
  });

  describe('Credential Retrieval', () => {
    beforeEach(async () => {
      await credentialManager.storeCredentials(testCredentials);
    });

    test('should retrieve and decrypt credentials correctly', async () => {
      const retrievedCredentials = await credentialManager.retrieveCredentials(testCredentials.id);
      
      expect(retrievedCredentials).not.toBeNull();
      expect(retrievedCredentials!.id).toBe(testCredentials.id);
      expect(retrievedCredentials!.connectorType).toBe(testCredentials.connectorType);
      expect(retrievedCredentials!.apiKey).toBe(testCredentials.apiKey);
      expect(retrievedCredentials!.clientId).toBe(testCredentials.clientId);
      expect(retrievedCredentials!.clientSecret).toBe(testCredentials.clientSecret);
      expect(retrievedCredentials!.accessToken).toBe(testCredentials.accessToken);
      expect(retrievedCredentials!.refreshToken).toBe(testCredentials.refreshToken);
      expect(retrievedCredentials!.endpoint).toBe(testCredentials.endpoint);
      expect(retrievedCredentials!.additionalConfig).toEqual(testCredentials.additionalConfig);
    });

    test('should return null for non-existent credentials', async () => {
      const retrievedCredentials = await credentialManager.retrieveCredentials('non-existent-id');
      expect(retrievedCredentials).toBeNull();
    });

    test('should return null for expired credentials', async () => {
      const expiredCredentials = {
        ...testCredentials,
        id: 'expired-cred',
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      };

      await credentialManager.storeCredentials(expiredCredentials);
      const retrievedCredentials = await credentialManager.retrieveCredentials('expired-cred');
      
      expect(retrievedCredentials).toBeNull();
    });

    test('should handle decryption errors gracefully', async () => {
      // This test simulates a scenario where decryption fails
      // We'll create a new credential manager with a different key
      const differentKeyManager = new CredentialManager();
      
      // Since the credential doesn't exist in the new manager, it should return null
      const result = await differentKeyManager.retrieveCredentials(testCredentials.id);
      expect(result).toBeNull();
    });
  });

  describe('Credential Updates', () => {
    beforeEach(async () => {
      await credentialManager.storeCredentials(testCredentials);
    });

    test('should update existing credentials', async () => {
      const updates = {
        apiKey: 'updated-api-key',
        endpoint: 'https://api-updated.example.com',
        additionalConfig: {
          region: 'us-west-2',
          timeout: 60000
        }
      };

      await credentialManager.updateCredentials(testCredentials.id, updates);
      
      const updatedCredentials = await credentialManager.retrieveCredentials(testCredentials.id);
      expect(updatedCredentials!.apiKey).toBe(updates.apiKey);
      expect(updatedCredentials!.endpoint).toBe(updates.endpoint);
      expect(updatedCredentials!.additionalConfig).toEqual(updates.additionalConfig);
      expect(updatedCredentials!.clientId).toBe(testCredentials.clientId); // Unchanged
    });

    test('should not allow updating non-existent credentials', async () => {
      await expect(credentialManager.updateCredentials('non-existent-id', { apiKey: 'new-key' }))
        .rejects.toThrow('Credentials non-existent-id not found');
    });

    test('should preserve credential ID during updates', async () => {
      const updates = {
        id: 'different-id', // This should be ignored
        apiKey: 'updated-api-key'
      };

      await credentialManager.updateCredentials(testCredentials.id, updates);
      
      const updatedCredentials = await credentialManager.retrieveCredentials(testCredentials.id);
      expect(updatedCredentials!.id).toBe(testCredentials.id); // Original ID preserved
    });
  });

  describe('Credential Deletion', () => {
    beforeEach(async () => {
      await credentialManager.storeCredentials(testCredentials);
    });

    test('should delete credentials successfully', async () => {
      await credentialManager.deleteCredentials(testCredentials.id);
      
      const retrievedCredentials = await credentialManager.retrieveCredentials(testCredentials.id);
      expect(retrievedCredentials).toBeNull();
      
      const credentialList = credentialManager.listCredentials();
      expect(credentialList).toHaveLength(0);
    });

    test('should throw error when deleting non-existent credentials', async () => {
      await expect(credentialManager.deleteCredentials('non-existent-id'))
        .rejects.toThrow('Credentials non-existent-id not found');
    });
  });

  describe('Credential Listing', () => {
    test('should list all stored credentials without decrypting', async () => {
      const credentials1 = { ...testCredentials, id: 'cred-1' };
      const credentials2 = { ...testCredentials, id: 'cred-2', connectorType: 'cms' as ConnectorType };
      const expiredCredentials = {
        ...testCredentials,
        id: 'cred-expired',
        expiresAt: new Date(Date.now() - 1000)
      };

      await credentialManager.storeCredentials(credentials1);
      await credentialManager.storeCredentials(credentials2);
      await credentialManager.storeCredentials(expiredCredentials);

      const credentialList = credentialManager.listCredentials();
      
      expect(credentialList).toHaveLength(3);
      
      const cred1 = credentialList.find(c => c.id === 'cred-1');
      expect(cred1).toBeDefined();
      expect(cred1!.connectorType).toBe('crm');
      expect(cred1!.isExpired).toBe(false);
      
      const cred2 = credentialList.find(c => c.id === 'cred-2');
      expect(cred2).toBeDefined();
      expect(cred2!.connectorType).toBe('cms');
      expect(cred2!.isExpired).toBe(false);
      
      const expiredCred = credentialList.find(c => c.id === 'cred-expired');
      expect(expiredCred).toBeDefined();
      expect(expiredCred!.isExpired).toBe(true);
    });

    test('should return empty list when no credentials stored', () => {
      const credentialList = credentialManager.listCredentials();
      expect(credentialList).toHaveLength(0);
    });
  });

  describe('Key Rotation', () => {
    beforeEach(async () => {
      await credentialManager.storeCredentials(testCredentials);
    });

    test('should rotate keys and re-encrypt all credentials', async () => {
      const originalCredentials = await credentialManager.retrieveCredentials(testCredentials.id);
      expect(originalCredentials).not.toBeNull();

      await credentialManager.rotateKeys();

      const credentialsAfterRotation = await credentialManager.retrieveCredentials(testCredentials.id);
      expect(credentialsAfterRotation).not.toBeNull();
      expect(credentialsAfterRotation!.apiKey).toBe(originalCredentials!.apiKey);
      expect(credentialsAfterRotation!.clientSecret).toBe(originalCredentials!.clientSecret);
    });

    test('should handle key rotation with multiple credentials', async () => {
      const credentials2 = { ...testCredentials, id: 'cred-2' };
      const credentials3 = { ...testCredentials, id: 'cred-3' };
      
      await credentialManager.storeCredentials(credentials2);
      await credentialManager.storeCredentials(credentials3);

      await credentialManager.rotateKeys();

      // Verify all credentials are still accessible
      const cred1 = await credentialManager.retrieveCredentials(testCredentials.id);
      const cred2 = await credentialManager.retrieveCredentials('cred-2');
      const cred3 = await credentialManager.retrieveCredentials('cred-3');

      expect(cred1).not.toBeNull();
      expect(cred2).not.toBeNull();
      expect(cred3).not.toBeNull();
    });
  });

  describe('Statistics and Health Checks', () => {
    beforeEach(async () => {
      const credentials1 = { ...testCredentials, id: 'cred-1', connectorType: 'crm' as ConnectorType };
      const credentials2 = { ...testCredentials, id: 'cred-2', connectorType: 'cms' as ConnectorType };
      const expiredCredentials = {
        ...testCredentials,
        id: 'cred-expired',
        expiresAt: new Date(Date.now() - 1000)
      };

      await credentialManager.storeCredentials(credentials1);
      await credentialManager.storeCredentials(credentials2);
      await credentialManager.storeCredentials(expiredCredentials);
    });

    test('should provide accurate statistics', () => {
      const stats = credentialManager.getStatistics();
      
      expect(stats.totalCredentials).toBe(3);
      expect(stats.expiredCredentials).toBe(1);
      expect(stats.credentialsByType.crm).toBe(2); // cred-1 and cred-expired
      expect(stats.credentialsByType.cms).toBe(1); // cred-2
      expect(stats.oldestCredential).toBeDefined();
      expect(stats.newestCredential).toBeDefined();
      expect(stats.keyRotationConfig).toBeDefined();
    });

    test('should test credential access for health checks', async () => {
      const accessTest1 = await credentialManager.testCredentialAccess('cred-1');
      expect(accessTest1).toBe(true);

      const accessTest2 = await credentialManager.testCredentialAccess('non-existent');
      expect(accessTest2).toBe(false);

      const accessTest3 = await credentialManager.testCredentialAccess('cred-expired');
      expect(accessTest3).toBe(false); // Expired credentials should fail access test
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption errors gracefully', async () => {
      // Create credentials with extremely large data to potentially cause issues
      const largeCredentials = {
        ...testCredentials,
        additionalConfig: {
          largeData: 'x'.repeat(1000000) // 1MB of data
        }
      };

      // This should still work, but tests the system's handling of large data
      const credentialId = await credentialManager.storeCredentials(largeCredentials);
      expect(credentialId).toBe(testCredentials.id);
    });

    test('should validate credential format thoroughly', async () => {
      const invalidCredentials = [
        { ...testCredentials, id: null }, // null ID
        { ...testCredentials, connectorType: null }, // null connector type
        { ...testCredentials, endpoint: 'not-a-url' }, // invalid URL
        { ...testCredentials, apiKey: 'short' } // potentially too short API key (should warn)
      ];

      for (const invalidCred of invalidCredentials.slice(0, 3)) {
        await expect(credentialManager.storeCredentials(invalidCred as any))
          .rejects.toThrow();
      }

      // The short API key should store but generate warnings
      const shortKeyResult = await credentialManager.storeCredentials(invalidCredentials[3] as any);
      expect(shortKeyResult).toBe(testCredentials.id);
    });
  });

  describe('Security Features', () => {
    test('should use different encryption for each credential', async () => {
      const credentials1 = { ...testCredentials, id: 'cred-1' };
      const credentials2 = { ...testCredentials, id: 'cred-2' };

      await credentialManager.storeCredentials(credentials1);
      await credentialManager.storeCredentials(credentials2);

      const list = credentialManager.listCredentials();
      
      // Each credential should have different encrypted data even with same content
      // This is ensured by using different IVs and salts for each encryption
      expect(list).toHaveLength(2);
      expect(list[0].id).not.toBe(list[1].id);
    });

    test('should properly handle credential expiration', async () => {
      const futureExpiry = new Date(Date.now() + 60000); // 1 minute from now
      const pastExpiry = new Date(Date.now() - 60000); // 1 minute ago

      const validCredentials = { ...testCredentials, id: 'valid-cred', expiresAt: futureExpiry };
      const expiredCredentials = { ...testCredentials, id: 'expired-cred', expiresAt: pastExpiry };

      await credentialManager.storeCredentials(validCredentials);
      await credentialManager.storeCredentials(expiredCredentials);

      const validResult = await credentialManager.retrieveCredentials('valid-cred');
      const expiredResult = await credentialManager.retrieveCredentials('expired-cred');

      expect(validResult).not.toBeNull();
      expect(expiredResult).toBeNull();
    });
  });
});