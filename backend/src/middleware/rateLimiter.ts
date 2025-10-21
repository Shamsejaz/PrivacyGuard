import express from 'express';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
import { redisClient } from '../config/database';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyGenerator: (req: Request) => string;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
  }

  private defaultKeyGenerator(req: Request): string {
    return `rate_limit:${req.ip}`;
  }

  async middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Use Redis for distributed rate limiting
      if (redisClient && redisClient.isOpen) {
        await this.handleRedisRateLimit(key, now, windowStart, req, res, next);
      } else {
        // Fallback to in-memory rate limiting
        await this.handleMemoryRateLimit(key, now, windowStart, req, res, next);
      }
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  }

  private async handleRedisRateLimit(
    key: string,
    now: number,
    windowStart: number,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const multi = redisClient.multi();
    
    // Remove old entries
    multi.zRemRangeByScore(key, 0, windowStart);
    
    // Count current requests in window
    multi.zCard(key);
    
    // Add current request
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Set expiration
    multi.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const requestCount = results[1] as number;
    
    if (requestCount >= this.maxRequests) {
      this.sendRateLimitResponse(res, requestCount, windowStart + this.windowMs);
      return;
    }

    // Add rate limit headers
    this.addRateLimitHeaders(res, requestCount, windowStart + this.windowMs);
    next();
  }

  private memoryStore = new Map<string, number[]>();

  private async handleMemoryRateLimit(
    key: string,
    now: number,
    windowStart: number,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get existing requests for this key
    let requests = this.memoryStore.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      this.sendRateLimitResponse(res, requests.length, windowStart + this.windowMs);
      return;
    }
    
    // Add current request
    requests.push(now);
    this.memoryStore.set(key, requests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupMemoryStore();
    }
    
    // Add rate limit headers
    this.addRateLimitHeaders(res, requests.length, windowStart + this.windowMs);
    next();
  }

  private cleanupMemoryStore(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [key, requests] of this.memoryStore.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > cutoff);
      
      if (validRequests.length === 0) {
        this.memoryStore.delete(key);
      } else {
        this.memoryStore.set(key, validRequests);
      }
    }
  }

  private addRateLimitHeaders(res: Response, requestCount: number, resetTime: number): void {
    res.set({
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, this.maxRequests - requestCount).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'X-RateLimit-Window': Math.ceil(this.windowMs / 1000).toString(),
    });
  }

  private sendRateLimitResponse(res: Response, requestCount: number, resetTime: number): void {
    this.addRateLimitHeaders(res, requestCount, resetTime);
    
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Default rate limiter configuration
const defaultRateLimiter = new RateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});

// Export middleware function
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  return defaultRateLimiter.middleware(req, res, next);
};

// Export class for custom rate limiters
export { RateLimiter };

// Specific rate limiters for different endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req: Request) => `auth_rate_limit:${req.ip}`,
});

export const dsarRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 DSAR requests per hour per IP
  keyGenerator: (req: Request) => `dsar_rate_limit:${req.ip}`,
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 API calls per 15 minutes
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    return userId ? `api_rate_limit:user:${userId}` : `api_rate_limit:ip:${req.ip}`;
  },
});
