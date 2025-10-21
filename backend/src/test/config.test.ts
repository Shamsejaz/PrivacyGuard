import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

describe('Configuration Tests', () => {
  describe('Environment Variables', () => {
    it('should load test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.POSTGRES_DB).toBe('privacyguard_test');
      expect(process.env.JWT_SECRET).toBe('test_jwt_secret_key_for_testing_only');
    });

    it('should have required database configuration', () => {
      expect(process.env.POSTGRES_HOST).toBeDefined();
      expect(process.env.POSTGRES_PORT).toBeDefined();
      expect(process.env.POSTGRES_USER).toBeDefined();
      expect(process.env.MONGODB_URI).toBeDefined();
      expect(process.env.REDIS_HOST).toBeDefined();
    });

    it('should have JWT configuration', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_EXPIRES_IN).toBeDefined();
      expect(process.env.JWT_REFRESH_EXPIRES_IN).toBeDefined();
    });

    it('should have CORS configuration', () => {
      expect(process.env.CORS_ORIGIN).toBeDefined();
      expect(process.env.CORS_CREDENTIALS).toBeDefined();
    });
  });

  describe('Database Configuration Parsing', () => {
    it('should parse PostgreSQL configuration correctly', () => {
      const port = parseInt(process.env.POSTGRES_PORT || '5432');
      const maxConnections = parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '5');
      
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
      expect(maxConnections).toBeGreaterThan(0);
    });

    it('should parse MongoDB URI correctly', () => {
      const uri = process.env.MONGODB_URI;
      expect(uri).toMatch(/^mongodb:\/\//);
    });

    it('should parse Redis configuration correctly', () => {
      const port = parseInt(process.env.REDIS_PORT || '6379');
      const db = parseInt(process.env.REDIS_DB || '1');
      
      expect(port).toBeGreaterThan(0);
      expect(db).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Configuration', () => {
    it('should have secure JWT secret in test environment', () => {
      const secret = process.env.JWT_SECRET;
      expect(secret).toBeDefined();
      expect(secret!.length).toBeGreaterThan(10);
    });

    it('should have appropriate log level for testing', () => {
      const logLevel = process.env.LOG_LEVEL;
      expect(logLevel).toBe('error'); // Quiet logging for tests
    });
  });
});
