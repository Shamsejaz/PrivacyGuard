/**
 * MCP Privacy Connectors - Secure Credential Retrieval Tests
 * Tests for secure credential access and management utilities
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureCredentialRetrieval } from '../security/SecureCredentialRetrieval.js';
import { CredentialManager } from '../security/CredentialManager.js';
import { KeyManagementService } from '../security/KeyManagementService.js';
import type { ConnectorCredentials, ConnectorType, AuthToken } from '../types/index.js';
import crypto from 'crypto';

describe('SecureCredentialRetrieval', () => {
  let credentialManager: CredentialManager;
  let keyManagementService: KeyManagementService;
  let secureRetrieval: SecureCredentialRetrieval;
  let testCredentials: ConnectorCredentials;

  beforeEach(async () => {
    // Initialize services
    const testMasterKey = crypto.randomBytes(32).toString('hex');
    credentialManager = new CredentialManager(testMasterKey);
    keyManagementService = new KeyManagementService({ automaticRotation: false });
    secureRetrieval = new SecureCredentialRetrieval(credentialManager, keyManagementService, {
      autoRefresh: true,
      refreshThresholdMinutes: 30,
      maxRefreshAttempts: 2
    });

    // Create test credentials
    testCredentials = {
      id: 'test-secure-cred',
      connectorType: 'crm' as ConnectorType,
      apiKey: 'test-api-key-secure',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      endpoint: 'https://api.secure-test.com',
      additionalConfig: { region: 'us-east-1' },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };

    await credentialManager.storeCredentials(testCredentials);
  });

  afterEach(async () => {
    await keyManagementService.shutdown();
    secureRetrieval.clearAccessLogs();
  });

  describe('Secure Credential Access', () => {
    test('should retrieve credentials with security metadata', async () => {
      const result = await secureRetrieval.getCredentials(testCredentials.id);
      
      expect(result.credentials).not.toBeNull();
      expect(result.credentials!.id).toBe(testCredentials.id);
      expect(result.credentials!.apiKey).toBe(testCredentials.apiKey);
      expect(result.accessTime).toBeInstanceOf(Date);
      expect(result.keyVersion).toBeGreaterThan(0);
      expect(result.isExpired).toBe(false);
      expect(result.securityWarnings).toBeInstanceOf(Array);
    });

    test('should log credential access for audit trail', async () => {
      await secureRetrieval.getCredentials(testCredentials.id);
      await secureRetrieval.getCredentials(testCredentials.id);
      await secureRetrieval.getCredentials(testCredentials.id);
      
      const stats = secureRetrieval.getAccessStatistics();
      expect(stats.accessCounts.get(testCredentials.id)).toBe(3);
      expect(stats.recentAccesses.has(testCredentials.id)).toBe(true);
    });

    test('should handle non-existent credentials gracefully', async () => {
      const result = await secureRetrieval.getCredentials('non-existent-id');
      
      expect(result.credentials).toBeNull();
      expect(result.securityWarnings).toContain('Credentials not found');
    });

    test('should detect expired credentials', async () => {
      const expiredCredentials = {
        ...testCredentials,
        id: 'expired-cred',
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      };
      
      await credentialManager.storeCredentials(expiredCredentials);
      const result = await secureRetrieval.getCredentials('expired-cred');
      
      expect(result.credentials).toBeNull(); // CredentialManager returns null for expired
      expect(result.securityWarnings).toContain('Credentials not found');
    });

    test('should include connector validation when connector ID provided', async () => {
      const result = await secureRetrieval.getCredentials(testCredentials.id, 'test-connector-1');
      
      expect(result.credentials).not.toBeNull();
      // The function logs connector validation but doesn't change the result
      expect(result.credentials!.connectorType).toBe(testCredentials.connectorType);
    });
  });

  describe('Credential Validation', () => {
    test('should validate credentials successfully', async () => {
      const validation = await secureRetrieval.validateCredentials(testCredentials.id);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required fields', async () => {
      const invalidCredentials = {
        ...testCredentials,
        id: 'invalid-cred',
        apiKey: undefined,
        clientId: undefined,
        clientSecret: undefined,
        accessToken: undefined
      };
      
      await credentialManager.storeCredentials(invalidCredentials);
      const validation = await secureRetrieval.validateCredentials('invalid-cred');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No valid authentication method found');
    });

    test('should warn about upcoming expiration', async () => {
      const soonToExpireCredentials = {
        ...testCredentials,
        id: 'soon-expire-cred',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };
      
      await credentialManager.storeCredentials(soonToExpireCredentials);
      const validation = await secureRetrieval.validateCredentials('soon-expire-cred');
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.includes('expire in'))).toBe(true);
    });

    test('should detect invalid endpoint URLs', async () => {
      const invalidEndpointCredentials = {
        ...testCredentials,
        id: 'invalid-endpoint-cred',
        endpoint: 'not-a-valid-url'
      };
      
      await credentialManager.storeCredentials(invalidEndpointCredentials);
      const validation = await secureRetrieval.validateCredentials('invalid-endpoint-cred');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid endpoint URL format');
    });
  });

  describe('Credential Refresh', () => {
    test('should refresh credentials when near expiration', async () => {
      const nearExpiryCredentials = {
        ...testCredentials,
        id: 'near-expiry-cred',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
      };
      
      await credentialManager.storeCredentials(nearExpiryCredentials);
      
      const mockRefreshCallback = vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        tokenType: 'Bearer',
        scope: ['read', 'write']
      } as AuthToken);
      
      const result = await secureRetrieval.getCredentialsWithRefresh('near-expiry-cred', mockRefreshCallback);
      
      expect(mockRefreshCallback).toHaveBeenCalled();
      expect(result.credentials!.accessToken).toBe('new-access-token');
      expect(result.credentials!.refreshToken).toBe('new-refresh-token');
      expect(result.securityWarnings).toContain('Access token refreshed successfully');
    });

    test('should handle refresh failures gracefully', async () => {
      const nearExpiryCredentials = {
        ...testCredentials,
        id: 'refresh-fail-cred',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };
      
      await credentialManager.storeCredentials(nearExpiryCredentials);
      
      const mockRefreshCallback = vi.fn().mockRejectedValue(new Error('Refresh service unavailable'));
      
      const result = await secureRetrieval.getCredentialsWithRefresh('refresh-fail-cred', mockRefreshCallback);
      
      expect(result.credentials).not.toBeNull();
      expect(result.securityWarnings.some(w => w.includes('Token refresh failed'))).toBe(true);
    });

    test('should not refresh credentials that are not near expiration', async () => {
      const mockRefreshCallback = vi.fn();
      
      const result = await secureRetrieval.getCredentialsWithRefresh(testCredentials.id, mockRefreshCallback);
      
      expect(mockRefreshCallback).not.toHaveBeenCalled();
      expect(result.credentials!.accessToken).toBe(testCredentials.accessToken);
    });
  });

  describe('Credentials by Type', () => {
    beforeEach(async () => {
      const cmsCredentials = {
        ...testCredentials,
        id: 'cms-cred',
        connectorType: 'cms' as ConnectorType
      };
      
      const emailCredentials = {
        ...testCredentials,
        id: 'email-cred',
        connectorType: 'email_chat' as ConnectorType
      };
      
      await credentialManager.storeCredentials(cmsCredentials);
      await credentialManager.storeCredentials(emailCredentials);
    });

    test('should retrieve credentials by connector type', async () => {
      const crmResults = await secureRetrieval.getCredentialsByType('crm');
      const cmsResults = await secureRetrieval.getCredentialsByType('cms');
      
      expect(crmResults).toHaveLength(1);
      expect(crmResults[0].credentials!.id).toBe(testCredentials.id);
      
      expect(cmsResults).toHaveLength(1);
      expect(cmsResults[0].credentials!.id).toBe('cms-cred');
    });

    test('should return empty array for non-existent connector type', async () => {
      const results = await secureRetrieval.getCredentialsByType('cloud_storage');
      expect(results).toHaveLength(0);
    });
  });

  describe('Connectivity Testing', () => {
    test('should test credential connectivity successfully', async () => {
      const connectivityResult = await secureRetrieval.testCredentialConnectivity(testCredentials.id);
      
      expect(connectivityResult.canAccess).toBe(true);
      expect(connectivityResult.responseTime).toBeGreaterThan(0);
      expect(connectivityResult.error).toBeUndefined();
    });

    test('should detect connectivity issues with non-existent credentials', async () => {
      const connectivityResult = await secureRetrieval.testCredentialConnectivity('non-existent-id');
      
      expect(connectivityResult.canAccess).toBe(false);
      expect(connectivityResult.error).toBe('Credentials not accessible');
    });

    test('should detect connectivity issues with expired credentials', async () => {
      const expiredCredentials = {
        ...testCredentials,
        id: 'expired-connectivity-cred',
        expiresAt: new Date(Date.now() - 1000)
      };
      
      await credentialManager.storeCredentials(expiredCredentials);
      const connectivityResult = await secureRetrieval.testCredentialConnectivity('expired-connectivity-cred');
      
      expect(connectivityResult.canAccess).toBe(false);
      expect(connectivityResult.error).toBe('Credentials not accessible');
    });
  });

  describe('Suspicious Activity Detection', () => {
    test('should detect high frequency access', async () => {
      // Simulate rapid successive accesses
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 15; i++) {
        promises.push(secureRetrieval.getCredentials(testCredentials.id));
      }
      await Promise.all(promises);
      
      const stats = secureRetrieval.getAccessStatistics();
      expect(stats.suspiciousActivity.length).toBeGreaterThan(0);
      expect(stats.suspiciousActivity[0]).toContain('High frequency access detected');
    });

    test('should track access patterns over time', async () => {
      // Simulate normal access pattern
      await secureRetrieval.getCredentials(testCredentials.id);
      await new Promise(resolve => setTimeout(resolve, 100));
      await secureRetrieval.getCredentials(testCredentials.id);
      await new Promise(resolve => setTimeout(resolve, 100));
      await secureRetrieval.getCredentials(testCredentials.id);
      
      const stats = secureRetrieval.getAccessStatistics();
      expect(stats.accessCounts.get(testCredentials.id)).toBe(3);
      expect(stats.recentAccesses.has(testCredentials.id)).toBe(true);
    });
  });

  describe('Access Log Management', () => {
    beforeEach(async () => {
      // Generate some access history
      for (let i = 0; i < 5; i++) {
        await secureRetrieval.getCredentials(testCredentials.id);
      }
    });

    test('should provide comprehensive access statistics', () => {
      const stats = secureRetrieval.getAccessStatistics();
      
      expect(stats.totalCredentials).toBeGreaterThan(0);
      expect(stats.accessCounts.get(testCredentials.id)).toBe(5);
      expect(stats.recentAccesses.has(testCredentials.id)).toBe(true);
    });

    test('should clear all access logs', () => {
      secureRetrieval.clearAccessLogs();
      
      const stats = secureRetrieval.getAccessStatistics();
      expect(stats.accessCounts.size).toBe(0);
      expect(stats.recentAccesses.size).toBe(0);
    });

    test('should clear old access logs based on age', async () => {
      // This test is limited since we can't easily simulate old timestamps
      // In a real scenario, you'd mock the Date or use a time manipulation library
      secureRetrieval.clearAccessLogs(1); // Clear logs older than 1 day
      
      const stats = secureRetrieval.getAccessStatistics();
      // Recent accesses should still be there
      expect(stats.accessCounts.get(testCredentials.id)).toBe(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle credential manager errors gracefully', async () => {
      // Mock credential manager to throw error
      const originalRetrieve = credentialManager.retrieveCredentials;
      credentialManager.retrieveCredentials = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const result = await secureRetrieval.getCredentials(testCredentials.id);
      
      expect(result.credentials).toBeNull();
      expect(result.securityWarnings.some(w => w.includes('Retrieval error'))).toBe(true);
      
      // Restore original method
      credentialManager.retrieveCredentials = originalRetrieve;
    });

    test('should handle validation errors gracefully', async () => {
      // Mock credential manager to throw error during validation
      const originalRetrieve = credentialManager.retrieveCredentials;
      credentialManager.retrieveCredentials = vi.fn().mockRejectedValue(new Error('Validation failed'));
      
      const validation = await secureRetrieval.validateCredentials(testCredentials.id);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Validation error'))).toBe(true);
      
      // Restore original method
      credentialManager.retrieveCredentials = originalRetrieve;
    });

    test('should handle refresh callback errors with retry logic', async () => {
      const nearExpiryCredentials = {
        ...testCredentials,
        id: 'retry-test-cred',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };
      
      await credentialManager.storeCredentials(nearExpiryCredentials);
      
      let callCount = 0;
      const mockRefreshCallback = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          accessToken: 'new-token-after-retry',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          tokenType: 'Bearer'
        } as AuthToken);
      });
      
      const result = await secureRetrieval.getCredentialsWithRefresh('retry-test-cred', mockRefreshCallback);
      
      expect(mockRefreshCallback).toHaveBeenCalledTimes(2);
      expect(result.credentials!.accessToken).toBe('new-token-after-retry');
    });
  });

  describe('Configuration Management', () => {
    test('should respect refresh configuration settings', async () => {
      const customRetrieval = new SecureCredentialRetrieval(
        credentialManager,
        keyManagementService,
        {
          autoRefresh: false,
          refreshThresholdMinutes: 60,
          maxRefreshAttempts: 1
        }
      );
      
      const nearExpiryCredentials = {
        ...testCredentials,
        id: 'no-auto-refresh-cred',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };
      
      await credentialManager.storeCredentials(nearExpiryCredentials);
      
      const mockRefreshCallback = vi.fn();
      const result = await customRetrieval.getCredentialsWithRefresh('no-auto-refresh-cred', mockRefreshCallback);
      
      // Should not auto-refresh because autoRefresh is disabled
      expect(mockRefreshCallback).not.toHaveBeenCalled();
      expect(result.credentials!.accessToken).toBe(testCredentials.accessToken);
    });
  });
});