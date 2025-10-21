/**
 * MCP Privacy Connectors - Key Management Service Tests
 * Comprehensive tests for key rotation, versioning, and secure storage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyManagementService } from '../security/KeyManagementService.js';
import crypto from 'crypto';

describe('KeyManagementService', () => {
  let keyManagementService: KeyManagementService;

  beforeEach(() => {
    keyManagementService = new KeyManagementService({
      automaticRotation: false, // Disable for testing
      rotationIntervalDays: 1,
      maxKeyAge: 7,
      retainOldVersions: 2
    });
  });

  afterEach(async () => {
    await keyManagementService.shutdown();
  });

  describe('Key Generation', () => {
    test('should generate initial master key on initialization', async () => {
      const activeKey = keyManagementService.getActiveKey();
      
      expect(activeKey).not.toBeNull();
      expect(activeKey!.keyId).toBeDefined();
      expect(activeKey!.key).toBeInstanceOf(Buffer);
      expect(activeKey!.key.length).toBe(32); // 256-bit key
      expect(activeKey!.metadata.algorithm).toBe('aes-256-gcm');
      expect(activeKey!.metadata.isActive).toBe(true);
      expect(activeKey!.metadata.version).toBe(1);
    });

    test('should generate new key with incremented version', async () => {
      const firstKey = keyManagementService.getActiveKey();
      const newKeyId = await keyManagementService.generateNewKey();
      const secondKey = keyManagementService.getActiveKey();
      
      expect(secondKey!.keyId).toBe(newKeyId);
      expect(secondKey!.metadata.version).toBe(2);
      expect(secondKey!.metadata.isActive).toBe(true);
      
      // Previous key should be deactivated
      const previousKey = keyManagementService.getKey(firstKey!.keyId);
      expect(previousKey!.metadata.isActive).toBe(false);
    });

    test('should emit keyGenerated event', async () => {
      const eventSpy = vi.fn();
      keyManagementService.on('keyGenerated', eventSpy);
      
      const newKeyId = await keyManagementService.generateNewKey();
      
      expect(eventSpy).toHaveBeenCalledWith({
        keyId: newKeyId,
        version: expect.any(Number)
      });
    });

    test('should generate unique key IDs', async () => {
      const keyId1 = await keyManagementService.generateNewKey();
      const keyId2 = await keyManagementService.generateNewKey();
      const keyId3 = await keyManagementService.generateNewKey();
      
      expect(keyId1).not.toBe(keyId2);
      expect(keyId2).not.toBe(keyId3);
      expect(keyId1).not.toBe(keyId3);
    });
  });

  describe('Key Retrieval', () => {
    let testKeyId: string;

    beforeEach(async () => {
      testKeyId = await keyManagementService.generateNewKey();
    });

    test('should retrieve active key', () => {
      const activeKey = keyManagementService.getActiveKey();
      
      expect(activeKey).not.toBeNull();
      expect(activeKey!.keyId).toBe(testKeyId);
      expect(activeKey!.metadata.isActive).toBe(true);
    });

    test('should retrieve specific key by ID', () => {
      const specificKey = keyManagementService.getKey(testKeyId);
      
      expect(specificKey).not.toBeNull();
      expect(specificKey!.key).toBeInstanceOf(Buffer);
      expect(specificKey!.metadata.keyId).toBe(testKeyId);
    });

    test('should return null for non-existent key', () => {
      const nonExistentKey = keyManagementService.getKey('non-existent-key-id');
      expect(nonExistentKey).toBeNull();
    });
  });

  describe('Key Derivation', () => {
    test('should derive key from master key with salt', () => {
      const activeKey = keyManagementService.getActiveKey();
      const params = keyManagementService.createDerivationParams(32);
      
      const derivedKey = keyManagementService.deriveKey(activeKey!.key, params);
      
      expect(derivedKey).toBeInstanceOf(Buffer);
      expect(derivedKey.length).toBe(32);
      expect(params.salt).toBeInstanceOf(Buffer);
      expect(params.iterations).toBe(100000);
      expect(params.digest).toBe('sha256');
    });

    test('should create consistent derivation parameters', () => {
      const params1 = keyManagementService.createDerivationParams(32);
      const params2 = keyManagementService.createDerivationParams(32);
      
      expect(params1.keyLength).toBe(params2.keyLength);
      expect(params1.iterations).toBe(params2.iterations);
      expect(params1.digest).toBe(params2.digest);
      expect(params1.salt).not.toEqual(params2.salt); // Salts should be different
    });

    test('should derive same key with same parameters', () => {
      const activeKey = keyManagementService.getActiveKey();
      const params = keyManagementService.createDerivationParams(32);
      
      const derivedKey1 = keyManagementService.deriveKey(activeKey!.key, params);
      const derivedKey2 = keyManagementService.deriveKey(activeKey!.key, params);
      
      expect(derivedKey1).toEqual(derivedKey2);
    });
  });

  describe('Key Rotation', () => {
    test('should rotate keys successfully', async () => {
      const originalKey = keyManagementService.getActiveKey();
      const eventSpy = vi.fn();
      keyManagementService.on('keyRotated', eventSpy);
      
      const newKeyId = await keyManagementService.rotateKeys();
      const newActiveKey = keyManagementService.getActiveKey();
      
      expect(newActiveKey!.keyId).toBe(newKeyId);
      expect(newActiveKey!.keyId).not.toBe(originalKey!.keyId);
      expect(newActiveKey!.metadata.version).toBe(originalKey!.metadata.version + 1);
      
      expect(eventSpy).toHaveBeenCalledWith({
        newKeyId,
        previousKeyId: originalKey!.keyId,
        rotationTime: expect.any(Date)
      });
    });

    test('should increment rotation count for old keys', async () => {
      const originalKey = keyManagementService.getActiveKey();
      
      await keyManagementService.rotateKeys();
      
      const oldKey = keyManagementService.getKey(originalKey!.keyId);
      expect(oldKey!.metadata.rotationCount).toBe(1);
    });

    test('should handle rotation failure gracefully', async () => {
      const eventSpy = vi.fn();
      keyManagementService.on('keyRotationFailed', eventSpy);
      
      // Mock a failure scenario by corrupting internal state
      const originalGenerateNewKey = keyManagementService.generateNewKey;
      keyManagementService.generateNewKey = vi.fn().mockRejectedValue(new Error('Test rotation failure'));
      
      await expect(keyManagementService.rotateKeys()).rejects.toThrow('Test rotation failure');
      
      expect(eventSpy).toHaveBeenCalledWith({
        error: expect.any(Error)
      });
      
      // Restore original method
      keyManagementService.generateNewKey = originalGenerateNewKey;
    });
  });

  describe('Key Cleanup', () => {
    test('should clean up old keys based on retention policy', async () => {
      // Generate multiple keys to exceed retention limit
      await keyManagementService.generateNewKey(); // Version 2
      await keyManagementService.generateNewKey(); // Version 3
      await keyManagementService.generateNewKey(); // Version 4
      await keyManagementService.generateNewKey(); // Version 5
      
      const stats = keyManagementService.getKeyStatistics();
      
      // Should retain only 2 old versions plus the active key (3 total)
      expect(stats.totalKeys).toBeLessThanOrEqual(3);
    });

    test('should emit keyDeleted events during cleanup', async () => {
      const eventSpy = vi.fn();
      keyManagementService.on('keyDeleted', eventSpy);
      
      // Generate enough keys to trigger cleanup
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Automatic Key Rotation', () => {
    test('should schedule automatic rotation when enabled', () => {
      const autoRotationService = new KeyManagementService({
        automaticRotation: true,
        rotationIntervalDays: 1
      });
      
      // Check that rotation is scheduled (we can't easily test the actual rotation without waiting)
      const stats = autoRotationService.getKeyStatistics();
      expect(stats.rotationPolicy.automaticRotation).toBe(true);
      
      autoRotationService.shutdown();
    });

    test('should check if key rotation is needed', () => {
      const needsRotation = keyManagementService.checkKeyRotationNeeded();
      expect(needsRotation).toBe(false); // Fresh key shouldn't need rotation
      
      // Test with a service that has a very short rotation interval
      const shortIntervalService = new KeyManagementService({
        automaticRotation: false,
        rotationIntervalDays: 0 // Immediate rotation needed
      });
      
      const needsImmediateRotation = shortIntervalService.checkKeyRotationNeeded();
      expect(needsImmediateRotation).toBe(true);
      
      shortIntervalService.shutdown();
    });
  });

  describe('Key Statistics', () => {
    beforeEach(async () => {
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
    });

    test('should provide comprehensive key statistics', () => {
      const stats = keyManagementService.getKeyStatistics();
      
      expect(stats.totalKeys).toBeGreaterThan(0);
      expect(stats.activeKeyId).toBeDefined();
      expect(stats.oldestKey).toBeInstanceOf(Date);
      expect(stats.newestKey).toBeInstanceOf(Date);
      expect(stats.expiredKeys).toBe(0); // No keys should be expired in test
      expect(stats.rotationPolicy).toBeDefined();
      expect(stats.nextRotationDue).toBe(false);
    });

    test('should export key metadata without actual keys', () => {
      const metadata = keyManagementService.exportKeyMetadata();
      
      expect(metadata).toBeInstanceOf(Array);
      expect(metadata.length).toBeGreaterThan(0);
      
      for (const meta of metadata) {
        expect(meta.keyId).toBeDefined();
        expect(meta.version).toBeGreaterThan(0);
        expect(meta.algorithm).toBe('aes-256-gcm');
        expect(meta.createdAt).toBeInstanceOf(Date);
        expect(meta.expiresAt).toBeInstanceOf(Date);
        expect(typeof meta.isActive).toBe('boolean');
        expect(typeof meta.rotationCount).toBe('number');
      }
    });
  });

  describe('Key Integrity Validation', () => {
    test('should validate key integrity successfully', async () => {
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      
      const integrityResults = await keyManagementService.validateKeyIntegrity();
      
      expect(integrityResults.size).toBeGreaterThan(0);
      
      for (const [keyId, isValid] of integrityResults) {
        expect(typeof keyId).toBe('string');
        expect(typeof isValid).toBe('boolean');
        expect(isValid).toBe(true); // All keys should be valid in normal test
      }
    });

    test('should detect corrupted keys', async () => {
      const keyId = await keyManagementService.generateNewKey();
      
      // Corrupt the key by replacing it with invalid data
      const keyData = keyManagementService.getKey(keyId);
      if (keyData) {
        // Replace the key with invalid data
        (keyData as any).key = Buffer.from('invalid-key-data');
      }
      
      const integrityResults = await keyManagementService.validateKeyIntegrity();
      const corruptedKeyResult = integrityResults.get(keyId);
      
      expect(corruptedKeyResult).toBe(false);
    });
  });

  describe('Rotation Policy Management', () => {
    test('should update rotation policy', () => {
      const eventSpy = vi.fn();
      keyManagementService.on('rotationPolicyUpdated', eventSpy);
      
      const newPolicy = {
        automaticRotation: true,
        rotationIntervalDays: 60,
        maxKeyAge: 180,
        retainOldVersions: 5
      };
      
      keyManagementService.updateRotationPolicy(newPolicy);
      
      const stats = keyManagementService.getKeyStatistics();
      expect(stats.rotationPolicy.automaticRotation).toBe(true);
      expect(stats.rotationPolicy.rotationIntervalDays).toBe(60);
      expect(stats.rotationPolicy.maxKeyAge).toBe(180);
      expect(stats.rotationPolicy.retainOldVersions).toBe(5);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining(newPolicy));
    });

    test('should handle partial policy updates', () => {
      const originalStats = keyManagementService.getKeyStatistics();
      
      keyManagementService.updateRotationPolicy({
        rotationIntervalDays: 45
      });
      
      const updatedStats = keyManagementService.getKeyStatistics();
      expect(updatedStats.rotationPolicy.rotationIntervalDays).toBe(45);
      expect(updatedStats.rotationPolicy.maxKeyAge).toBe(originalStats.rotationPolicy.maxKeyAge);
      expect(updatedStats.rotationPolicy.retainOldVersions).toBe(originalStats.rotationPolicy.retainOldVersions);
    });
  });

  describe('Service Lifecycle', () => {
    test('should shutdown gracefully', async () => {
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      
      const statsBefore = keyManagementService.getKeyStatistics();
      expect(statsBefore.totalKeys).toBeGreaterThan(0);
      
      await keyManagementService.shutdown();
      
      // After shutdown, keys should be cleared
      const activeKey = keyManagementService.getActiveKey();
      expect(activeKey).toBeNull();
    });

    test('should handle multiple shutdown calls gracefully', async () => {
      await keyManagementService.shutdown();
      await keyManagementService.shutdown(); // Second call should not throw
      
      expect(keyManagementService.getActiveKey()).toBeNull();
    });
  });

  describe('Event Handling', () => {
    test('should emit all expected events during key lifecycle', async () => {
      const events: string[] = [];
      
      keyManagementService.on('keyGenerated', () => events.push('keyGenerated'));
      keyManagementService.on('keyRotated', () => events.push('keyRotated'));
      keyManagementService.on('keyDeleted', () => events.push('keyDeleted'));
      keyManagementService.on('rotationPolicyUpdated', () => events.push('rotationPolicyUpdated'));
      
      await keyManagementService.generateNewKey();
      await keyManagementService.rotateKeys();
      keyManagementService.updateRotationPolicy({ rotationIntervalDays: 30 });
      
      // Generate enough keys to trigger cleanup/deletion
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      await keyManagementService.generateNewKey();
      
      expect(events).toContain('keyGenerated');
      expect(events).toContain('keyRotated');
      expect(events).toContain('rotationPolicyUpdated');
      expect(events).toContain('keyDeleted');
    });
  });

  describe('Error Handling', () => {
    test('should handle crypto operations gracefully', async () => {
      // Test with various key lengths
      const params16 = keyManagementService.createDerivationParams(16);
      const params32 = keyManagementService.createDerivationParams(32);
      const params64 = keyManagementService.createDerivationParams(64);
      
      const activeKey = keyManagementService.getActiveKey();
      
      const derived16 = keyManagementService.deriveKey(activeKey!.key, params16);
      const derived32 = keyManagementService.deriveKey(activeKey!.key, params32);
      const derived64 = keyManagementService.deriveKey(activeKey!.key, params64);
      
      expect(derived16.length).toBe(16);
      expect(derived32.length).toBe(32);
      expect(derived64.length).toBe(64);
    });

    test('should handle invalid derivation parameters', () => {
      const activeKey = keyManagementService.getActiveKey();
      const invalidParams = {
        salt: Buffer.from('invalid'),
        iterations: -1, // Invalid iteration count
        keyLength: 32,
        digest: 'invalid-digest'
      };
      
      expect(() => {
        keyManagementService.deriveKey(activeKey!.key, invalidParams as any);
      }).toThrow();
    });
  });
});