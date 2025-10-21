import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { pgPool, mongoClient } from '../config/database';
import { logger } from '../utils/logger';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowCount?: number;
  cached: boolean;
  timestamp: Date;
}

export interface OptimizationSuggestion {
  query: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
}

export class QueryOptimizationService {
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private slowQueryThreshold = 1000; // 1 second

  /**
   * Execute optimized PostgreSQL query with caching
   */
  async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      enableCache?: boolean;
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const { cacheKey, cacheTTL = CacheTTL.MEDIUM, enableCache = true } = options;

    try {
      // Try cache first if enabled and cache key provided
      if (enableCache && cacheKey) {
        const cached = await cacheService.get<T[]>(cacheKey);
        if (cached) {
          this.recordMetrics(query, Date.now() - startTime, cached.length, true);
          return cached;
        }
      }

      // Execute query
      const result = await pgPool.query(query, params);
      const executionTime = Date.now() - startTime;
      const rows = result.rows as T[];

      // Cache result if enabled
      if (enableCache && cacheKey && rows.length > 0) {
        await cacheService.set(cacheKey, rows, { ttl: cacheTTL });
      }

      // Record metrics
      this.recordMetrics(query, executionTime, rows.length, false);

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected:', {
          query: query.substring(0, 100) + '...',
          executionTime,
          rowCount: rows.length
        });
      }

      return rows;
    } catch (error) {
      logger.error('Query execution error:', error);
      throw error;
    }
  }

  /**
   * Execute optimized MongoDB aggregation with caching
   */
  async executeOptimizedAggregation<T>(
    collection: string,
    pipeline: any[],
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      enableCache?: boolean;
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const { cacheKey, cacheTTL = CacheTTL.MEDIUM, enableCache = true } = options;

    try {
      // Try cache first if enabled and cache key provided
      if (enableCache && cacheKey) {
        const cached = await cacheService.get<T[]>(cacheKey);
        if (cached) {
          this.recordMetrics(`MongoDB:${collection}`, Date.now() - startTime, cached.length, true);
          return cached;
        }
      }

      // Execute aggregation
      const db = mongoClient.db();
      const result = await db.collection(collection).aggregate(pipeline).toArray();
      const executionTime = Date.now() - startTime;

      // Cache result if enabled
      if (enableCache && cacheKey && result.length > 0) {
        await cacheService.set(cacheKey, result, { ttl: cacheTTL });
      }

      // Record metrics
      this.recordMetrics(`MongoDB:${collection}`, executionTime, result.length, false);

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow MongoDB aggregation detected:', {
          collection,
          pipeline: JSON.stringify(pipeline).substring(0, 100) + '...',
          executionTime,
          resultCount: result.length
        });
      }

      return result as T[];
    } catch (error) {
      logger.error('MongoDB aggregation error:', error);
      throw error;
    }
  }

  /**
   * Get paginated results with optimized queries
   */
  async getPaginatedResults<T>(
    baseQuery: string,
    countQuery: string,
    params: any[],
    page: number,
    limit: number,
    cachePrefix?: string
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const paginatedParams = [...params, limit, offset];

    // Create cache keys
    const dataCacheKey = cachePrefix ? `${cachePrefix}:page:${page}:limit:${limit}` : undefined;
    const countCacheKey = cachePrefix ? `${cachePrefix}:count` : undefined;

    // Execute queries in parallel
    const [data, countResult] = await Promise.all([
      this.executeOptimizedQuery<T>(paginatedQuery, paginatedParams, {
        cacheKey: dataCacheKey,
        cacheTTL: CacheTTL.SHORT
      }),
      this.executeOptimizedQuery<{ count: string }>(countQuery, params, {
        cacheKey: countCacheKey,
        cacheTTL: CacheTTL.MEDIUM
      })
    ]);

    const total = parseInt(countResult[0]?.count || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Batch operations for better performance
   */
  async executeBatch<T>(
    queries: Array<{ query: string; params: any[] }>,
    options: { transaction?: boolean } = {}
  ): Promise<T[][]> {
    const { transaction = false } = options;

    if (transaction) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const results: T[][] = [];
        for (const { query, params } of queries) {
          const result = await client.query(query, params);
          results.push(result.rows as T[]);
        }
        
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // Execute in parallel without transaction
      const promises = queries.map(({ query, params }) => 
        this.executeOptimizedQuery<T>(query, params, { enableCache: false })
      );
      return await Promise.all(promises);
    }
  }

  /**
   * Invalidate related cache entries
   */
  async invalidateCache(patterns: string[]): Promise<void> {
    try {
      await Promise.all(
        patterns.map(pattern => cacheService.deletePattern(pattern))
      );
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(): Record<string, {
    totalExecutions: number;
    averageTime: number;
    slowQueries: number;
    cacheHitRate: number;
  }> {
    const metrics: Record<string, any> = {};

    for (const [query, queryMetrics] of this.queryMetrics.entries()) {
      const totalExecutions = queryMetrics.length;
      const averageTime = queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalExecutions;
      const slowQueries = queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
      const cachedQueries = queryMetrics.filter(m => m.cached).length;
      const cacheHitRate = totalExecutions > 0 ? (cachedQueries / totalExecutions) * 100 : 0;

      metrics[query.substring(0, 50) + '...'] = {
        totalExecutions,
        averageTime: Math.round(averageTime),
        slowQueries,
        cacheHitRate: Math.round(cacheHitRate)
      };
    }

    return metrics;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const [query, queryMetrics] of this.queryMetrics.entries()) {
      const averageTime = queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / queryMetrics.length;
      const slowQueries = queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
      const cacheHitRate = queryMetrics.filter(m => m.cached).length / queryMetrics.length * 100;

      // Suggest indexing for slow queries
      if (averageTime > this.slowQueryThreshold) {
        suggestions.push({
          query: query.substring(0, 100) + '...',
          suggestion: 'Consider adding database indexes for frequently queried columns',
          impact: 'high',
          estimatedImprovement: '50-80% faster execution'
        });
      }

      // Suggest caching for frequently executed queries
      if (queryMetrics.length > 10 && cacheHitRate < 30) {
        suggestions.push({
          query: query.substring(0, 100) + '...',
          suggestion: 'Enable caching for this frequently executed query',
          impact: 'medium',
          estimatedImprovement: '30-50% faster response time'
        });
      }

      // Suggest query optimization for queries with many slow executions
      if (slowQueries > queryMetrics.length * 0.5) {
        suggestions.push({
          query: query.substring(0, 100) + '...',
          suggestion: 'Optimize query structure and consider using EXPLAIN ANALYZE',
          impact: 'high',
          estimatedImprovement: '40-70% performance improvement'
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(olderThanHours = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [query, metrics] of this.queryMetrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      
      if (filteredMetrics.length === 0) {
        this.queryMetrics.delete(query);
      } else {
        this.queryMetrics.set(query, filteredMetrics);
      }
    }
  }

  private recordMetrics(query: string, executionTime: number, rowCount?: number, cached = false): void {
    const queryKey = query.substring(0, 200); // Limit key length
    
    if (!this.queryMetrics.has(queryKey)) {
      this.queryMetrics.set(queryKey, []);
    }

    const metrics = this.queryMetrics.get(queryKey)!;
    metrics.push({
      query: queryKey,
      executionTime,
      rowCount,
      cached,
      timestamp: new Date()
    });

    // Keep only last 100 metrics per query to prevent memory issues
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }
}

// Export singleton instance
export const queryOptimizationService = new QueryOptimizationService();

// Optimized query builders
export const OptimizedQueries = {
  // User queries with proper indexing hints
  getUserById: (id: string) => ({
    query: `
      SELECT u.*, array_agg(p.permission) as permissions
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `,
    params: [id],
    cacheKey: CacheKeys.user(id),
    cacheTTL: CacheTTL.LONG
  }),

  // DSAR queries with pagination optimization
  getDSARRequests: (filters: any, page: number, limit: number) => ({
    baseQuery: `
      SELECT d.*, u.name as assigned_to_name
      FROM dsar_requests d
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE ($1::text IS NULL OR d.status = $1)
      AND ($2::text IS NULL OR d.request_type = $2)
      AND ($3::timestamp IS NULL OR d.created_at >= $3)
      ORDER BY d.created_at DESC
    `,
    countQuery: `
      SELECT COUNT(*) as count
      FROM dsar_requests d
      WHERE ($1::text IS NULL OR d.status = $1)
      AND ($2::text IS NULL OR d.request_type = $2)
      AND ($3::timestamp IS NULL OR d.created_at >= $3)
    `,
    params: [filters.status, filters.requestType, filters.fromDate],
    cachePrefix: CacheKeys.dsarList(JSON.stringify(filters))
  }),

  // Risk assessment queries with aggregation
  getRiskMetrics: () => ({
    query: `
      SELECT 
        risk_level,
        COUNT(*) as count,
        AVG(overall_score) as avg_score,
        MAX(updated_at) as last_updated
      FROM risk_assessments
      WHERE status = 'active'
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `,
    params: [],
    cacheKey: CacheKeys.riskMetrics(),
    cacheTTL: CacheTTL.MEDIUM
  })
};