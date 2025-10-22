import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecretsManagerService } from '../../services/dark-web-intelligence/utils/SecretsManagerService';
import { APICredentials } from '../../services/dark-web-intelligence/types';

describe('SecretsManagerService', () => {
  let secretsService: SecretsManagerService;
  let mockCredentials: APICredentials;

  beforeEach(() => {
    secretsService = new SecretsManagerService();
    mockCredentials = {
      apiKey: 'test-api-key-12345',
      secretKey: 'test-secret-key-67890',
      additionalHeaders: {
        'User-Agent': 'PrivacyGuard-Test/1.0'
      }
    };
  });

  afterEach(() => {
    secretsService.clearCache();
    vi.clearAllMocks();
  });

  describe('credential retrieval', () => {
    it('should retrieve credentials from AWS', async () => {
      const secretId = 'constella-api-key';
      
      const credentials = await secretsService.getCredentials(secretId);
      
      expect(credentials).toHaveProperty('apiKey');
      expect(credentials.apiKey).toBe('mock-constella-api-key');
    });

    it('should cache credentials to reduce AWS calls', async () => {
      const secretId = 'constella-api-key';
      
      // Mock the private method to track calls
      const fetchSpy = vi.spyOn(secretsService as any, 'fetchCredentialsFromAWS');
      
      // First call should fetch from AWS
      await secretsService.getCredentials(secretId);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await secretsService.getCredentials(secretId);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle non-existent secrets', async () => {
      const secretId = 'non-existent-secret';
      
      await expect(secretsService.getCredentials(secretId))
        .rejects.toThrow('No credentials found for secret: non-existent-secret');
    });

    it('should refresh expired cache entries', async () => {
      const secretId = 'constella-api-key';
      
      // Get credentials to populate cache
      await secretsService.getCredentials(secretId);
      
      // Manually expire the cache entry
      const cacheEntry = secretsService['credentialCache'].get(secretId);
      if (cacheEntry) {
        cacheEntry.expiry = new Date(Date.now() - 1000); // Expired 1 second ago
      }
      
      const fetchSpy = vi.spyOn(secretsService as any, 'fetchCredentialsFromAWS');
      
      // Should fetch again due to expired cache
      await secretsService.getCredentials(secretId);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('credential validation', () => {
    it('should validate properly formatted credentials', () => {
      const validCredentials: APICredentials = {
        apiKey: 'valid-api-key'
      };
      
      expect(secretsService.validateCredentials(validCredentials)).toBe(true);
    });

    it('should reject credentials without API key', () => {
      const invalidCredentials = {} as APICredentials;
      
      expect(secretsService.validateCredentials(invalidCredentials)).toBe(false);
    });
  });

  describe('credential storage', () => {
    it('should store valid credentials', async () => {
      const secretId = 'test-secret';
      
      await expect(secretsService.storeCredentials(secretId, mockCredentials))
        .resolves.not.toThrow();
    });

    it('should reject invalid credentials', async () => {
      const secretId = 'test-secret';
      const invalidCredentials = {} as APICredentials;
      
      await expect(secretsService.storeCredentials(secretId, invalidCredentials))
        .rejects.toThrow('Invalid credentials format');
    });

    it('should update cache after storing', async () => {
      const secretId = 'test-secret';
      
      await secretsService.storeCredentials(secretId, mockCredentials);
      
      // Cache should be updated
      const cached = secretsService['credentialCache'].get(secretId);
      expect(cached).toBeDefined();
      expect(cached?.credentials).toEqual(mockCredentials);
    });
  });

  describe('credential rotation', () => {
    it('should rotate credentials successfully', async () => {
      const secretId = 'constella-api-key';
      
      const rotatedCredentials = await secretsService.rotateCredentials(secretId);
      
      expect(rotatedCredentials).toHaveProperty('apiKey');
      expect(rotatedCredentials.apiKey).toContain('rotated-');
    });

    it('should clear cache after rotation', async () => {
      const secretId = 'constella-api-key';
      
      // Populate cache
      await secretsService.getCredentials(secretId);
      expect(secretsService['credentialCache'].has(secretId)).toBe(true);
      
      // Rotate credentials
      await secretsService.rotateCredentials(secretId);
      
      // Cache should be cleared
      expect(secretsService['credentialCache'].has(secretId)).toBe(false);
    });
  });

  describe('credential testing', () => {
    it('should test credentials successfully', async () => {
      const secretId = 'constella-api-key';
      const testEndpoint = 'https://api.test.com/health';
      
      const result = await secretsService.testCredentials(secretId, testEndpoint);
      
      expect(result).toBe(true);
    });

    it('should handle test failures gracefully', async () => {
      const secretId = 'non-existent-secret';
      const testEndpoint = 'https://api.test.com/health';
      
      const result = await secretsService.testCredentials(secretId, testEndpoint);
      
      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should provide accurate cache statistics', async () => {
      // Add some credentials to cache
      await secretsService.getCredentials('constella-api-key');
      await secretsService.getCredentials('intsights-api-key');
      
      const stats = secretsService.getCacheStats();
      
      expect(stats.totalCached).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });

    it('should clean up expired cache entries', async () => {
      const secretId = 'constella-api-key';
      
      // Add credential to cache
      await secretsService.getCredentials(secretId);
      
      // Manually expire the entry
      const cacheEntry = secretsService['credentialCache'].get(secretId);
      if (cacheEntry) {
        cacheEntry.expiry = new Date(Date.now() - 1000);
      }
      
      secretsService.cleanupExpiredCache();
      
      expect(secretsService['credentialCache'].has(secretId)).toBe(false);
    });

    it('should clear specific or all cache entries', async () => {
      await secretsService.getCredentials('constella-api-key');
      await secretsService.getCredentials('intsights-api-key');
      
      // Clear specific entry
      secretsService.clearCache('constella-api-key');
      expect(secretsService['credentialCache'].has('constella-api-key')).toBe(false);
      expect(secretsService['credentialCache'].has('intsights-api-key')).toBe(true);
      
      // Clear all entries
      secretsService.clearCache();
      expect(secretsService['credentialCache'].size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle AWS service errors gracefully', async () => {
      // Mock AWS error
      vi.spyOn(secretsService as any, 'fetchCredentialsFromAWS')
        .mockRejectedValue(new Error('AWS service unavailable'));
      
      await expect(secretsService.getCredentials('test-secret'))
        .rejects.toThrow('Failed to retrieve credentials for test-secret: Error: AWS service unavailable');
    });

    it('should handle storage errors gracefully', async () => {
      // Mock AWS storage error
      vi.spyOn(secretsService as any, 'storeCredentialsInAWS')
        .mockRejectedValue(new Error('AWS storage error'));
      
      await expect(secretsService.storeCredentials('test-secret', mockCredentials))
        .rejects.toThrow('Failed to store credentials for test-secret: Error: AWS storage error');
    });

    it('should handle rotation errors gracefully', async () => {
      // Mock rotation error
      vi.spyOn(secretsService as any, 'triggerCredentialRotation')
        .mockRejectedValue(new Error('Rotation failed'));
      
      await expect(secretsService.rotateCredentials('test-secret'))
        .rejects.toThrow('Failed to rotate credentials for test-secret: Error: Rotation failed');
    });
  });
});