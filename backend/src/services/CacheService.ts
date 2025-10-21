import { redisClient } from '../config/database';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export class CacheService {
  private defaultTTL = 3600; // 1 hour default
  private defaultPrefix = 'privacyguard:';

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const value = await redisClient.get(fullKey);
      
      if (!value) {
        return null;
      }

      if (options.serialize !== false) {
        return JSON.parse(value) as T;
      }
      
      return value as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      const serializedValue = options.serialize !== false 
        ? JSON.stringify(value) 
        : value;

      await redisClient.setEx(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await redisClient.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      const keys = await redisClient.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      return result;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await redisClient.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern - get from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fetchFunction();
      await this.set(key, result, options);
      return result;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      // If cache fails, still return the function result
      return await fetchFunction();
    }
  }

  /**
   * Increment counter in cache
   */
  async increment(key: string, amount = 1, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await redisClient.incrBy(fullKey, amount);
      
      // Set TTL if it's a new key
      if (result === amount) {
        const ttl = options.ttl || this.defaultTTL;
        await redisClient.expire(fullKey, ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set multiple values at once
   */
  async setMultiple(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    try {
      const pipeline = redisClient.multi();
      const ttl = options.ttl || this.defaultTTL;

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key, options.prefix);
        const serializedValue = options.serialize !== false 
          ? JSON.stringify(value) 
          : value;
        
        pipeline.setEx(fullKey, ttl, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache setMultiple error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[], options: CacheOptions = {}): Promise<Record<string, T | null>> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.prefix));
      const values = await redisClient.mGet(fullKeys);
      
      const result: Record<string, T | null> = {};
      
      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          result[key] = options.serialize !== false 
            ? JSON.parse(value) as T 
            : value as T;
        } else {
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      logger.error('Cache getMultiple error:', error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  /**
   * Clear all cache with optional pattern
   */
  async clear(pattern = '*', options: CacheOptions = {}): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      return await this.deletePattern(fullPattern, { prefix: '' });
    } catch (error) {
      logger.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memory: string;
    keys: number;
    hits: string;
    misses: string;
    hitRate: string;
  }> {
    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      const stats = await redisClient.info('stats');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
      
      // Parse key count
      const keyMatch = keyspace.match(/keys=(\d+)/);
      const keys = keyMatch ? parseInt(keyMatch[1]) : 0;
      
      // Parse hit/miss stats
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? hitsMatch[1] : '0';
      const misses = missesMatch ? missesMatch[1] : '0';
      
      const hitRate = parseInt(hits) + parseInt(misses) > 0 
        ? ((parseInt(hits) / (parseInt(hits) + parseInt(misses))) * 100).toFixed(2) + '%'
        : '0%';

      return { memory, keys, hits, misses, hitRate };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { memory: 'Unknown', keys: 0, hits: '0', misses: '0', hitRate: '0%' };
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const actualPrefix = prefix !== undefined ? prefix : this.defaultPrefix;
    return actualPrefix + key;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key builders for different domains
export const CacheKeys = {
  // User cache keys
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `user:${id}:permissions`,
  userSessions: (id: string) => `user:${id}:sessions`,
  
  // DSAR cache keys
  dsarRequest: (id: string) => `dsar:${id}`,
  dsarList: (filters: string) => `dsar:list:${filters}`,
  dsarStats: () => 'dsar:stats',
  
  // Risk assessment cache keys
  riskAssessment: (id: string) => `risk:${id}`,
  riskList: (filters: string) => `risk:list:${filters}`,
  riskMetrics: () => 'risk:metrics',
  
  // GDPR cache keys
  gdprRecord: (id: string) => `gdpr:${id}`,
  gdprCompliance: () => 'gdpr:compliance',
  
  // Policy cache keys
  policy: (id: string) => `policy:${id}`,
  policyList: (filters: string) => `policy:list:${filters}`,
  
  // Analytics cache keys
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  dashboardMetrics: () => 'dashboard:metrics',
  
  // Rate limiting keys
  rateLimit: (ip: string, endpoint: string) => `rate_limit:${ip}:${endpoint}`,
  
  // Session keys
  session: (token: string) => `session:${token}`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_SESSION: 7200, // 2 hours
  RATE_LIMIT: 3600,   // 1 hour
};