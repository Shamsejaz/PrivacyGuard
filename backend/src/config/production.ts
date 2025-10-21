import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

export interface ProductionConfig {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
    corsOrigin: string | string[];
    corsCredentials: boolean;
    trustProxy: boolean;
    bodyLimit: string;
  };
  database: {
    postgresql: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      maxConnections: number;
      idleTimeout: number;
      connectionTimeout: number;
      ssl: boolean | object;
    };
    mongodb: {
      uri: string;
      maxPoolSize: number;
      minPoolSize: number;
      maxIdleTime: number;
      serverSelectionTimeout: number;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      database: number;
      maxRetriesPerRequest: number;
      retryDelayOnFailover: number;
    };
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    bcryptRounds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    sessionTimeout: number;
    csrfProtection: boolean;
    helmetConfig: object;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    maxFileSize: string;
    maxFiles: number;
    enableAudit: boolean;
    enablePerformance: boolean;
  };
  monitoring: {
    enableHealthChecks: boolean;
    enableMetrics: boolean;
    enableTracing: boolean;
    metricsInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  cache: {
    defaultTTL: number;
    maxMemory: string;
    evictionPolicy: string;
    enableCompression: boolean;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    compression: boolean;
    encryption: boolean;
    storageLocation: string;
  };
  email: {
    enabled: boolean;
    provider: 'smtp' | 'sendgrid' | 'ses';
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    sendgrid?: {
      apiKey: string;
    };
    ses?: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  storage: {
    provider: 'local' | 's3' | 'gcs';
    local?: {
      uploadPath: string;
      maxFileSize: string;
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}

class ProductionConfigManager {
  private config: ProductionConfig;
  private requiredEnvVars: string[] = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'POSTGRES_HOST',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'MONGODB_URI',
    'REDIS_HOST'
  ];

  constructor() {
    this.validateEnvironment();
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private validateEnvironment(): void {
    const missing: string[] = [];
    
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Environment validation passed');
  }

  private loadConfiguration(): ProductionConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
        corsOrigin: this.parseCorsOrigin(process.env.CORS_ORIGIN || 'http://localhost:5173'),
        corsCredentials: process.env.CORS_CREDENTIALS === 'true',
        trustProxy: process.env.TRUST_PROXY === 'true',
        bodyLimit: process.env.BODY_LIMIT || '10mb'
      },
      database: {
        postgresql: {
          host: process.env.POSTGRES_HOST!,
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB!,
          username: process.env.POSTGRES_USER!,
          password: process.env.POSTGRES_PASSWORD!,
          maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
          idleTimeout: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
          connectionTimeout: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
          ssl: this.parsePostgreSSL()
        },
        mongodb: {
          uri: process.env.MONGODB_URI!,
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
          minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5'),
          maxIdleTime: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '30000'),
          serverSelectionTimeout: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000')
        },
        redis: {
          host: process.env.REDIS_HOST!,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          database: parseInt(process.env.REDIS_DB || '0'),
          maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
          retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100')
        }
      },
      security: {
        jwtSecret: process.env.JWT_SECRET!,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'),
        csrfProtection: process.env.CSRF_PROTECTION !== 'false',
        helmetConfig: this.getHelmetConfig()
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE !== 'false',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        enableAudit: process.env.LOG_AUDIT !== 'false',
        enablePerformance: process.env.LOG_PERFORMANCE !== 'false'
      },
      monitoring: {
        enableHealthChecks: process.env.MONITORING_HEALTH_CHECKS !== 'false',
        enableMetrics: process.env.MONITORING_METRICS !== 'false',
        enableTracing: process.env.MONITORING_TRACING === 'true',
        metricsInterval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '60000'),
        alertThresholds: {
          responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '5000'),
          errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'),
          memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE || '0.85'),
          cpuUsage: parseFloat(process.env.ALERT_CPU_USAGE || '0.80')
        }
      },
      cache: {
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
        maxMemory: process.env.CACHE_MAX_MEMORY || '256mb',
        evictionPolicy: process.env.CACHE_EVICTION_POLICY || 'allkeys-lru',
        enableCompression: process.env.CACHE_COMPRESSION !== 'false'
      },
      backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        retention: {
          daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7'),
          weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4'),
          monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12')
        },
        compression: process.env.BACKUP_COMPRESSION !== 'false',
        encryption: process.env.BACKUP_ENCRYPTION === 'true',
        storageLocation: process.env.BACKUP_STORAGE_LOCATION || './backups'
      },
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid' | 'ses') || 'smtp',
        smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        } : undefined,
        sendgrid: process.env.EMAIL_PROVIDER === 'sendgrid' ? {
          apiKey: process.env.SENDGRID_API_KEY || ''
        } : undefined,
        ses: process.env.EMAIL_PROVIDER === 'ses' ? {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        } : undefined
      },
      storage: {
        provider: (process.env.STORAGE_PROVIDER as 'local' | 's3' | 'gcs') || 'local',
        local: process.env.STORAGE_PROVIDER === 'local' ? {
          uploadPath: process.env.STORAGE_LOCAL_PATH || './uploads',
          maxFileSize: process.env.STORAGE_MAX_FILE_SIZE || '10mb'
        } : undefined,
        s3: process.env.STORAGE_PROVIDER === 's3' ? {
          bucket: process.env.S3_BUCKET || '',
          region: process.env.S3_REGION || 'us-east-1',
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
        } : undefined
      }
    };
  }

  private parseCorsOrigin(corsOrigin: string): string | string[] {
    if (corsOrigin.includes(',')) {
      return corsOrigin.split(',').map(origin => origin.trim());
    }
    return corsOrigin;
  }

  private parsePostgreSSL(): boolean | object {
    if (process.env.NODE_ENV === 'production') {
      if (process.env.POSTGRES_SSL_CERT && process.env.POSTGRES_SSL_KEY) {
        return {
          cert: process.env.POSTGRES_SSL_CERT,
          key: process.env.POSTGRES_SSL_KEY,
          ca: process.env.POSTGRES_SSL_CA,
          rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false'
        };
      }
      return { rejectUnauthorized: false };
    }
    return false;
  }

  private getHelmetConfig(): object {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate port range
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('Invalid port number');
    }

    // Validate JWT secret strength
    if (this.config.security.jwtSecret.length < 32) {
      errors.push('JWT secret must be at least 32 characters long');
    }

    // Validate database configuration
    if (!this.config.database.postgresql.host) {
      errors.push('PostgreSQL host is required');
    }

    if (!this.config.database.mongodb.uri) {
      errors.push('MongoDB URI is required');
    }

    // Validate Redis configuration
    if (!this.config.database.redis.host) {
      errors.push('Redis host is required');
    }

    // Production-specific validations
    if (this.config.server.nodeEnv === 'production') {
      if (this.config.server.corsOrigin === 'http://localhost:5173') {
        errors.push('CORS origin must be configured for production');
      }

      if (!this.config.security.csrfProtection) {
        errors.push('CSRF protection should be enabled in production');
      }

      if (this.config.logging.level === 'debug') {
        logger.warn('Debug logging is enabled in production');
      }
    }

    if (errors.length > 0) {
      const error = `Configuration validation failed: ${errors.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Configuration validation passed');
  }

  public getConfig(): ProductionConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ProductionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
    logger.info('Configuration updated');
  }

  public getEnvironmentInfo(): {
    nodeEnv: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      nodeEnv: this.config.server.nodeEnv,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  public isDevelopment(): boolean {
    return this.config.server.nodeEnv === 'development';
  }

  public isProduction(): boolean {
    return this.config.server.nodeEnv === 'production';
  }

  public isTest(): boolean {
    return this.config.server.nodeEnv === 'test';
  }

  public getSecurityConfig(): ProductionConfig['security'] {
    return { ...this.config.security };
  }

  public getDatabaseConfig(): ProductionConfig['database'] {
    return { ...this.config.database };
  }

  public getMonitoringConfig(): ProductionConfig['monitoring'] {
    return { ...this.config.monitoring };
  }

  public getCacheConfig(): ProductionConfig['cache'] {
    return { ...this.config.cache };
  }

  public getBackupConfig(): ProductionConfig['backup'] {
    return { ...this.config.backup };
  }
}

// Export singleton instance
export const productionConfig = new ProductionConfigManager();

// Export configuration getter for convenience
export const getConfig = () => productionConfig.getConfig();