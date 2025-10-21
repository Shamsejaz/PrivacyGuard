import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

export interface EventData {
  type: string;
  payload: any;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EventSubscription {
  channel: string;
  callback: (data: EventData) => void;
}

class EventService {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private subscriptions: Map<string, Set<(data: EventData) => void>> = new Map();
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.publisher.on('error', (err) => {
      logger.error('Redis Publisher Error:', err);
    });

    this.subscriber.on('error', (err) => {
      logger.error('Redis Subscriber Error:', err);
    });

    this.publisher.on('connect', () => {
      logger.info('Redis Publisher connected');
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis Subscriber connected');
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect()
      ]);
      
      this.isConnected = true;
      logger.info('✅ EventService connected to Redis');
    } catch (error) {
      logger.error('Failed to connect EventService to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.publisher.disconnect(),
        this.subscriber.disconnect()
      ]);
      
      this.isConnected = false;
      this.subscriptions.clear();
      logger.info('EventService disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting EventService:', error);
    }
  }

  async publish(channel: string, data: Omit<EventData, 'timestamp'>): Promise<void> {
    if (!this.isConnected) {
      logger.warn('EventService not connected, skipping publish');
      return;
    }

    try {
      const eventData: EventData = {
        ...data,
        timestamp: new Date()
      };

      await this.publisher.publish(channel, JSON.stringify(eventData));
      logger.debug(`Event published to channel ${channel}:`, eventData.type);
    } catch (error) {
      logger.error(`Failed to publish event to channel ${channel}:`, error);
    }
  }

  async subscribe(channel: string, callback: (data: EventData) => void): Promise<void> {
    if (!this.isConnected) {
      throw new Error('EventService not connected');
    }

    try {
      // Add callback to local subscriptions
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
        
        // Subscribe to Redis channel
        await this.subscriber.subscribe(channel, (message) => {
          try {
            const eventData: EventData = JSON.parse(message);
            const callbacks = this.subscriptions.get(channel);
            
            if (callbacks) {
              callbacks.forEach(cb => {
                try {
                  cb(eventData);
                } catch (error) {
                  logger.error(`Error in event callback for channel ${channel}:`, error);
                }
              });
            }
          } catch (error) {
            logger.error(`Failed to parse event data for channel ${channel}:`, error);
          }
        });
      }

      this.subscriptions.get(channel)!.add(callback);
      logger.debug(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel: string, callback?: (data: EventData) => void): Promise<void> {
    const callbacks = this.subscriptions.get(channel);
    
    if (!callbacks) {
      return;
    }

    if (callback) {
      callbacks.delete(callback);
      
      // If no more callbacks, unsubscribe from Redis
      if (callbacks.size === 0) {
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(channel);
      }
    } else {
      // Unsubscribe all callbacks for this channel
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
    }

    logger.debug(`Unsubscribed from channel: ${channel}`);
  }

  // Convenience methods for specific event types
  async publishDSARUpdate(dsarId: string, status: string, userId?: string): Promise<void> {
    await this.publish('dsar:updates', {
      type: 'dsar_status_changed',
      payload: { dsarId, status },
      userId,
      metadata: { resourceType: 'dsar', resourceId: dsarId }
    });
  }

  async publishRiskAlert(riskId: string, level: string, message: string, userId?: string): Promise<void> {
    await this.publish('risk:alerts', {
      type: 'risk_alert',
      payload: { riskId, level, message },
      userId,
      metadata: { resourceType: 'risk', resourceId: riskId }
    });
  }

  async publishGDPRNotification(type: string, payload: any, userId?: string): Promise<void> {
    await this.publish('gdpr:notifications', {
      type: `gdpr_${type}`,
      payload,
      userId,
      metadata: { resourceType: 'gdpr' }
    });
  }

  async publishPolicyChange(policyId: string, action: string, userId?: string): Promise<void> {
    await this.publish('policy:changes', {
      type: 'policy_changed',
      payload: { policyId, action },
      userId,
      metadata: { resourceType: 'policy', resourceId: policyId }
    });
  }

  async publishSystemNotification(message: string, severity: 'info' | 'warning' | 'error', userId?: string): Promise<void> {
    await this.publish('system:notifications', {
      type: 'system_notification',
      payload: { message, severity },
      userId,
      metadata: { resourceType: 'system' }
    });
  }

  async publishUserActivity(userId: string, action: string, resourceType?: string, resourceId?: string): Promise<void> {
    await this.publish('user:activity', {
      type: 'user_activity',
      payload: { action, resourceType, resourceId },
      userId,
      metadata: { resourceType: 'user', resourceId: userId }
    });
  }

  // Dashboard metrics broadcasting
  async publishDashboardMetrics(metrics: any, userId?: string): Promise<void> {
    await this.publish('dashboard:metrics', {
      type: 'metrics_update',
      payload: metrics,
      userId,
      metadata: { resourceType: 'dashboard' }
    });
  }

  async publishComplianceAlert(regulation: string, severity: string, message: string, userId?: string): Promise<void> {
    await this.publish('compliance:alerts', {
      type: 'compliance_alert',
      payload: { regulation, severity, message },
      userId,
      metadata: { resourceType: 'compliance' }
    });
  }

  // Get connection status
  isHealthy(): boolean {
    return this.isConnected && 
           this.publisher.isReady && 
           this.subscriber.isReady;
  }

  // Get subscription count for monitoring
  getSubscriptionCount(): number {
    return Array.from(this.subscriptions.values())
      .reduce((total, callbacks) => total + callbacks.size, 0);
  }

  // Get active channels
  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Create singleton instance
export const eventService = new EventService();

// Event channel constants
export const EVENT_CHANNELS = {
  DSAR_UPDATES: 'dsar:updates',
  RISK_ALERTS: 'risk:alerts',
  GDPR_NOTIFICATIONS: 'gdpr:notifications',
  POLICY_CHANGES: 'policy:changes',
  SYSTEM_NOTIFICATIONS: 'system:notifications',
  USER_ACTIVITY: 'user:activity',
  DASHBOARD_METRICS: 'dashboard:metrics',
  COMPLIANCE_ALERTS: 'compliance:alerts'
} as const;

export type EventChannel = typeof EVENT_CHANNELS[keyof typeof EVENT_CHANNELS];