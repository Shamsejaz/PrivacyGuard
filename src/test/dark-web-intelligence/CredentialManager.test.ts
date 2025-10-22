import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CredentialManager } from '../../services/dark-web-intelligence/aws/CredentialManager';
import { APICredentials } from '../../services/dark-web-intelligence/types';

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;
  let mockCredentials: APICredentials;

  beforeEach(async () => {
    credentialManager = new CredentialManager();
    mockCredentials = {
      apiKey: 'test-api-key-12345',
      secretKey: 'test-secret-key-67890',
      additionalHeaders: {
        'User-Agent': 'PrivacyGuard-Test/1.0'
      }
    };
    
    await credentialManager.initialize();
  });

  afterEach(() => {
    credentialManager.destroy();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const manager = new CredentialManager();
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe('credential storage and retrieval', () => {
    it('should store credentials successfully', async () => {
      const secretId = 'test-secret';
      
      await expect(
        credentialManager.storeCredentials(secretId, mockCredentials)
      ).resolves.not.toThrow();
    });

    it('should retrieve validated credentials', async () => {
      const secretId = 'test-secret';
      
      // Mock the private methods
      vi.spyOn(credentialManager as any, 'fetchCredentialsFromSecrets')
        .mockResolvedValue(mockCredentials);
      vi.spyOn(credentialManager as any, 'validateCredentials')
        .mockResolvedValue(true);
      
      const result = await credentialManager.getValidatedCredentials(secretId);
      
      expect(result).toEqual(mockCredentials);
    });

    it('should handle credential validation failure with rotation', async () => {
      const secretId = 'test-secret';
      const rotatedCredentials: APICredentials = {
        apiKey: 'rotated-api-key',
        secretKey: 'rotated-secret-key'
      };
      
      // Mock validation to fail first, then succeed after rotation
      vi.spyOn(credentialManager as any, 'fetchCredentialsFromSecrets')
        .mockResolvedValueOnce(mockCredentials)
        .mockResolvedValueOnce(rotatedCredentials);
      vi.spyOn(credentialManager as any, 'validateCredentials')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.spyOn(credentialManager, 'rotateCredentials')
        .mockResolvedValue(rotatedCredentials);
      
      const result = await credentialManager.getValidatedCredentials(secretId);
      
      expect(result).toEqual(rotatedCredentials);
      expect(credentialManager.rotateCredentials).toHaveBeenCalledWith(secretId);
    });

    it('should throw error when credentials remain invalid after rotation', async () => {
      const secretId = 'test-secret';
      
      vi.spyOn(credentialManager as any, 'fetchCredentialsFromSecrets')
        .mockResolvedValue(mockCredentials);
      vi.spyOn(credentialManager as any, 'validateCredentials')
        .mockResolvedValue(false);
      vi.spyOn(credentialManager, 'rotateCredentials')
        .mockResolvedValue(mockCredentials);
      
      await expect(credentialManager.getValidatedCredentials(secretId))
        .rejects.toThrow('Credentials for test-secret are invalid even after rotation');
    });
  });

  describe('health monitoring', () => {
    it('should return credential health status', () => {
      const secretId = 'test-secret';
      
      const health = credentialManager.getCredentialHealth(secretId);
      
      expect(health).toHaveProperty('isValid');
      expect(health).toHaveProperty('lastChecked');
      expect(health).toHaveProperty('nextRotation');
      expect(health).toHaveProperty('rotationEnabled');
      
      expect(health.nextRotation).toBeInstanceOf(Date);
    });

    it('should enable and disable auto rotation', () => {
      const secretId = 'test-secret';
      
      credentialManager.enableAutoRotation(secretId);
      let health = credentialManager.getCredentialHealth(secretId);
      expect(health.rotationEnabled).toBe(true);
      
      credentialManager.disableAutoRotation(secretId);
      health = credentialManager.getCredentialHealth(secretId);
      expect(health.rotationEnabled).toBe(false);
    });

    it('should get all credential status', () => {
      const secretId1 = 'test-secret-1';
      const secretId2 = 'test-secret-2';
      
      credentialManager.enableAutoRotation(secretId1);
      credentialManager.enableAutoRotation(secretId2);
      
      const allStatus = credentialManager.getAllCredentialStatus();
      
      expect(allStatus).toHaveLength(2);
      expect(allStatus.every(status => status.rotationEnabled)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      expect(() => credentialManager.destroy()).not.toThrow();
    });
  });
});