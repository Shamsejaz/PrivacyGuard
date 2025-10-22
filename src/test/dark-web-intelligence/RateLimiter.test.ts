import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../../services/dark-web-intelligence/utils/RateLimiter';
import { RateLimit } from '../../services/dark-web-intelligence/types';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockConfig: RateLimit;

  beforeEach(() => {
    mockConfig = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10
    };
    rateLimiter = new RateLimiter(mockConfig);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(rateLimiter).toBeDefined();
      
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBe(mockConfig.burstLimit);
    });

    it('should start with full token bucket', () => {
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBe(mockConfig.burstLimit);
      expect(status.requestsInLastMinute).toBe(0);
      expect(status.requestsInLastHour).toBe(0);
      expect(status.requestsInLastDay).toBe(0);
    });
  });

  describe('token consumption', () => {
    it('should allow requests when tokens are available', async () => {
      expect(rateLimiter.canMakeRequest()).toBe(true);
      
      await rateLimiter.waitForToken();
      
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBe(mockConfig.burstLimit - 1);
      expect(status.requestsInLastMinute).toBe(1);
    });

    it('should consume tokens correctly', async () => {
      const initialTokens = rateLimiter.getStatus().availableTokens;
      
      await rateLimiter.waitForToken();
      await rateLimiter.waitForToken();
      
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBe(initialTokens - 2);
      expect(status.requestsInLastMinute).toBe(2);
    });

    it('should track requests in different time windows', async () => {
      await rateLimiter.waitForToken();
      await rateLimiter.waitForToken();
      await rateLimiter.waitForToken();
      
      const status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(3);
      expect(status.requestsInLastHour).toBe(3);
      expect(status.requestsInLastDay).toBe(3);
    });
  });

  describe('rate limiting', () => {
    it('should prevent requests when burst limit is exceeded', async () => {
      // Consume all tokens
      for (let i = 0; i < mockConfig.burstLimit; i++) {
        await rateLimiter.waitForToken();
      }
      
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });

    it('should handle minute-based rate limiting', async () => {
      // Create a rate limiter with very low minute limit for testing
      const restrictiveConfig: RateLimit = {
        requestsPerMinute: 2,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 10
      };
      
      const restrictiveLimiter = new RateLimiter(restrictiveConfig);
      
      // Make requests up to the minute limit
      await restrictiveLimiter.waitForToken();
      await restrictiveLimiter.waitForToken();
      
      // Should be blocked by minute limit even though burst tokens are available
      expect(restrictiveLimiter.canMakeRequest()).toBe(false);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', async () => {
      // Consume all tokens
      for (let i = 0; i < mockConfig.burstLimit; i++) {
        await rateLimiter.waitForToken();
      }
      
      expect(rateLimiter.getStatus().availableTokens).toBe(0);
      
      // Mock time passage for token refill
      vi.useFakeTimers();
      
      // Advance time by refill interval
      const refillInterval = 60000 / mockConfig.requestsPerMinute; // 1 second for 60 req/min
      vi.advanceTimersByTime(refillInterval);
      
      // Check if tokens were refilled
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });
  });

  describe('configuration updates', () => {
    it('should update rate limit configuration', () => {
      const newConfig: RateLimit = {
        requestsPerMinute: 120,
        requestsPerHour: 2000,
        requestsPerDay: 20000,
        burstLimit: 20
      };
      
      rateLimiter.updateConfig(newConfig);
      
      // Should preserve token ratio when updating
      const status = rateLimiter.getStatus();
      expect(status.availableTokens).toBeLessThanOrEqual(newConfig.burstLimit);
    });
  });

  describe('reset functionality', () => {
    it('should reset rate limiter state', async () => {
      // Make some requests
      await rateLimiter.waitForToken();
      await rateLimiter.waitForToken();
      
      let status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(2);
      expect(status.availableTokens).toBe(mockConfig.burstLimit - 2);
      
      // Reset the rate limiter
      rateLimiter.reset();
      
      status = rateLimiter.getStatus();
      expect(status.requestsInLastMinute).toBe(0);
      expect(status.requestsInLastHour).toBe(0);
      expect(status.requestsInLastDay).toBe(0);
      expect(status.availableTokens).toBe(mockConfig.burstLimit);
    });
  });

  describe('status reporting', () => {
    it('should provide accurate status information', async () => {
      await rateLimiter.waitForToken();
      
      const status = rateLimiter.getStatus();
      
      expect(status).toHaveProperty('availableTokens');
      expect(status).toHaveProperty('requestsInLastMinute');
      expect(status).toHaveProperty('requestsInLastHour');
      expect(status).toHaveProperty('requestsInLastDay');
      expect(status).toHaveProperty('nextTokenAvailable');
      
      expect(status.nextTokenAvailable).toBeInstanceOf(Date);
      expect(status.availableTokens).toBeGreaterThanOrEqual(0);
      expect(status.requestsInLastMinute).toBeGreaterThanOrEqual(0);
    });
  });
});