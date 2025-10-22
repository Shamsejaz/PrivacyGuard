import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CredentialValidator, ValidationResult } from '../../services/dark-web-intelligence/aws/CredentialValidator';
import { APICredentials } from '../../services/dark-web-intelligence/types';

describe('CredentialValidator', () => {
  let validator: CredentialValidator;
  let mockCredentials: Record<string, APICredentials>;

  beforeEach(() => {
    validator = new CredentialValidator();
    mockCredentials = {
      constella: {
        apiKey: 'constella_valid_api_key_12345678901234567890',
        additionalHeaders: {
          'User-Agent': 'PrivacyGuard-Test/1.0'
        }
      },
      intsights: {
        apiKey: 'intsights_valid_api_key_123456',
        secretKey: 'intsights_valid_secret_key_123456'
      },
      dehashed: {
        apiKey: 'dehashed_valid_key',
        token: 'dehashed_valid_token_12345678901234567890'
      }
    };
  });

  afterEach(() => {
    validator.clearCache();
    vi.clearAllMocks();
  });

  describe('single credential validation', () => {
    it('should validate Constella credentials successfully', async () => {
      const result = await validator.validateCredentials('constella', mockCredentials.constella);
      
      expect(result.isValid).toBe(true);
      expect(result.apiType).toBe('constella');
      expect(result.fromCache).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should validate IntSights credentials successfully', async () => {
      const result = await validator.validateCredentials('intsights', mockCredentials.intsights);
      
      expect(result.isValid).toBe(true);
      expect(result.apiType).toBe('intsights');
      expect(result.fromCache).toBe(false);
    });

    it('should validate DeHashed credentials successfully', async () => {
      const result = await validator.validateCredentials('dehashed', mockCredentials.dehashed);
      
      expect(result.isValid).toBe(true);
      expect(result.apiType).toBe('dehashed');
      expect(result.fromCache).toBe(false);
    });

    it('should reject invalid Constella credentials', async () => {
      const invalidCredentials: APICredentials = {
        apiKey: 'invalid_key' // Too short and wrong format
      };
      
      const result = await validator.validateCredentials('constella', invalidCredentials);
      
      expect(result.isValid).toBe(false);
      expect(result.apiType).toBe('constella');
    });

    it('should reject IntSights credentials without secret key', async () => {
      const invalidCredentials: APICredentials = {
        apiKey: 'intsights_valid_api_key_123456'
        // Missing secretKey
      };
      
      const result = await validator.validateCredentials('intsights', invalidCredentials);
      
      expect(result.isValid).toBe(false);
    });

    it('should reject DeHashed credentials without token', async () => {
      const invalidCredentials: APICredentials = {
        apiKey: 'dehashed_valid_key'
        // Missing token
      };
      
      const result = await validator.validateCredentials('dehashed', invalidCredentials);
      
      expect(result.isValid).toBe(false);
    });

    it('should handle unknown API types with generic validation', async () => {
      const genericCredentials: APICredentials = {
        apiKey: 'generic_api_key_with_sufficient_length_over_20_chars'
      };
      
      // Add a validation endpoint for the unknown API type
      validator.addValidationEndpoint('unknown_api', 'https://api.unknown.com/validate');
      
      const result = await validator.validateCredentials('unknown_api', genericCredentials);
      
      expect(result.isValid).toBe(true);
      expect(result.apiType).toBe('unknown_api');
    });

    it('should reject credentials with short API keys', async () => {
      const shortKeyCredentials: APICredentials = {
        apiKey: 'short' // Too short for generic validation
      };
      
      const result = await validator.validateCredentials('unknown_api', shortKeyCredentials);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('caching behavior', () => {
    it('should cache validation results', async () => {
      const performValidationSpy = vi.spyOn(validator as any, 'performValidation');
      
      // First validation should call performValidation
      const result1 = await validator.validateCredentials('constella', mockCredentials.constella);
      expect(performValidationSpy).toHaveBeenCalledTimes(1);
      expect(result1.fromCache).toBe(false);
      
      // Second validation should use cache
      const result2 = await validator.validateCredentials('constella', mockCredentials.constella);
      expect(performValidationSpy).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(result2.fromCache).toBe(true);
      expect(result2.isValid).toBe(result1.isValid);
    });

    it('should expire cache entries after timeout', async () => {
      // Validate credentials to populate cache
      await validator.validateCredentials('constella', mockCredentials.constella);
      
      // Manually expire cache entry
      const cacheKey = `constella:${mockCredentials.constella.apiKey}`;
      const cacheEntry = validator['validationCache'].get(cacheKey);
      if (cacheEntry) {
        cacheEntry.timestamp = new Date(Date.now() - 400000); // 6+ minutes ago
      }
      
      const performValidationSpy = vi.spyOn(validator as any, 'performValidation');
      
      // Should perform validation again due to expired cache
      const result = await validator.validateCredentials('constella', mockCredentials.constella);
      expect(performValidationSpy).toHaveBeenCalledTimes(1);
      expect(result.fromCache).toBe(false);
    });

    it('should clear cache for specific API type', async () => {
      // Populate cache with multiple API types
      await validator.validateCredentials('constella', mockCredentials.constella);
      await validator.validateCredentials('intsights', mockCredentials.intsights);
      
      // Clear cache for specific API type
      validator.clearCache('constella');
      
      const performValidationSpy = vi.spyOn(validator as any, 'performValidation');
      
      // Constella should be revalidated (cache cleared)
      await validator.validateCredentials('constella', mockCredentials.constella);
      expect(performValidationSpy).toHaveBeenCalledTimes(1);
      
      // IntSights should use cache (not cleared)
      await validator.validateCredentials('intsights', mockCredentials.intsights);
      expect(performValidationSpy).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should clear all cache entries', async () => {
      // Populate cache
      await validator.validateCredentials('constella', mockCredentials.constella);
      await validator.validateCredentials('intsights', mockCredentials.intsights);
      
      // Clear all cache
      validator.clearCache();
      
      const performValidationSpy = vi.spyOn(validator as any, 'performValidation');
      
      // Both should be revalidated
      await validator.validateCredentials('constella', mockCredentials.constella);
      await validator.validateCredentials('intsights', mockCredentials.intsights);
      expect(performValidationSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple credential validation', () => {
    it('should validate multiple credentials concurrently', async () => {
      const credentialSets = [
        { apiType: 'constella', credentials: mockCredentials.constella },
        { apiType: 'intsights', credentials: mockCredentials.intsights },
        { apiType: 'dehashed', credentials: mockCredentials.dehashed }
      ];
      
      const results = await validator.validateMultipleCredentials(credentialSets);
      
      expect(results).toHaveLength(3);
      expect(results.every(result => result.isValid)).toBe(true);
      expect(results.map(r => r.apiType)).toEqual(['constella', 'intsights', 'dehashed']);
    });

    it('should handle mixed valid and invalid credentials', async () => {
      const credentialSets = [
        { apiType: 'constella', credentials: mockCredentials.constella },
        { apiType: 'intsights', credentials: { apiKey: 'invalid' } as APICredentials },
        { apiType: 'dehashed', credentials: mockCredentials.dehashed }
      ];
      
      const results = await validator.validateMultipleCredentials(credentialSets);
      
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);  // constella valid
      expect(results[1].isValid).toBe(false); // intsights invalid
      expect(results[2].isValid).toBe(true);  // dehashed valid
    });
  });

  describe('validation statistics', () => {
    it('should provide accurate validation statistics', async () => {
      // Perform some validations
      await validator.validateCredentials('constella', mockCredentials.constella);
      await validator.validateCredentials('intsights', { apiKey: 'invalid' } as APICredentials);
      await validator.validateCredentials('dehashed', mockCredentials.dehashed);
      
      const stats = validator.getValidationStats();
      
      expect(stats.totalCached).toBe(3);
      expect(stats.validCredentials).toBe(2);
      expect(stats.invalidCredentials).toBe(1);
      expect(stats.cacheHitRate).toBe(0.85); // Mocked value
      expect(stats.lastValidation).toBeInstanceOf(Date);
    });

    it('should handle empty cache in statistics', () => {
      const stats = validator.getValidationStats();
      
      expect(stats.totalCached).toBe(0);
      expect(stats.validCredentials).toBe(0);
      expect(stats.invalidCredentials).toBe(0);
      expect(stats.lastValidation).toBeNull();
    });
  });

  describe('validation endpoint management', () => {
    it('should add custom validation endpoints', () => {
      const customEndpoint = 'https://api.custom.com/validate';
      
      validator.addValidationEndpoint('custom_api', customEndpoint);
      
      expect(validator['validationEndpoints'].get('custom_api')).toBe(customEndpoint);
    });

    it('should remove validation endpoints', () => {
      validator.addValidationEndpoint('custom_api', 'https://api.custom.com/validate');
      expect(validator['validationEndpoints'].has('custom_api')).toBe(true);
      
      validator.removeValidationEndpoint('custom_api');
      expect(validator['validationEndpoints'].has('custom_api')).toBe(false);
    });

    it('should handle validation for API without endpoint', async () => {
      const result = await validator.validateCredentials('no_endpoint_api', mockCredentials.constella);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No validation endpoint configured');
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock performValidation to throw error
      vi.spyOn(validator as any, 'performValidation')
        .mockRejectedValue(new Error('Network error'));
      
      const result = await validator.validateCredentials('constella', mockCredentials.constella);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle simulation errors', async () => {
      // Mock simulateValidation to throw error
      vi.spyOn(validator as any, 'simulateValidation')
        .mockRejectedValue(new Error('Simulation error'));
      
      const result = await validator.validateCredentials('constella', mockCredentials.constella);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('API-specific validation logic', () => {
    it('should validate Constella format requirements', () => {
      const validConstella = validator['validateConstellaCredentials']({
        apiKey: 'constella_valid_key_with_sufficient_length'
      });
      expect(validConstella).toBe(true);
      
      const invalidConstella = validator['validateConstellaCredentials']({
        apiKey: 'invalid_key'
      });
      expect(invalidConstella).toBe(false);
    });

    it('should validate IntSights format requirements', () => {
      const validIntSights = validator['validateIntSightsCredentials']({
        apiKey: 'intsights_valid_api_key_123456',
        secretKey: 'intsights_valid_secret_key_123456'
      });
      expect(validIntSights).toBe(true);
      
      const invalidIntSights = validator['validateIntSightsCredentials']({
        apiKey: 'short'
      });
      expect(invalidIntSights).toBe(false);
    });

    it('should validate DeHashed format requirements', () => {
      const validDeHashed = validator['validateDeHashedCredentials']({
        apiKey: 'dehashed_valid_key',
        token: 'dehashed_valid_token_12345678901234567890'
      });
      expect(validDeHashed).toBe(true);
      
      const invalidDeHashed = validator['validateDeHashedCredentials']({
        apiKey: 'dehashed_key'
        // Missing token
      });
      expect(invalidDeHashed).toBe(false);
    });
  });
});