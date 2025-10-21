import { eventService, EVENT_CHANNELS } from './EventService.js';
import { logger } from '../utils/logger.js';

export interface DashboardMetrics {
  timestamp: Date;
  dsarMetrics: {
    totalRequests: number;
    pendingRequests: number;
    completedToday: number;
    averageResponseTime: number;
    statusBreakdown: Record<string, number>;
  };
  riskMetrics: {
    totalAssessments: number;
    highRiskCount: number;
    criticalRiskCount: number;
    riskTrend: 'increasing' | 'decreasing' | 'stable';
    complianceScore: number;
  };
  gdprMetrics: {
    lawfulBasisRecords: number;
    processingActivities: number;
    breachNotifications: number;
    complianceGaps: number;
  };
  policyMetrics: {
    totalPolicies: number;
    activePolicies: number;
    pendingReviews: number;
    expiringPolicies: number;
  };
  systemMetrics: {
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastUpdated: Date;
  };
}

export interface ComplianceAlert {
  id: string;
  type: 'deadline' | 'gap' | 'breach' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  regulation?: string;
  resourceType?: string;
  resourceId?: string;
  dueDate?: Date;
  createdAt: Date;
}

export interface UserActivity {
  userId: string;
  userName: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress?: string;
}

class DashboardMetricsService {
  private metricsCache: DashboardMetrics | null = null;
  private lastUpdate: Date | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly UPDATE_INTERVAL = 60000; // 1 minute

  constructor() {
    this.startPeriodicUpdates();
  }

  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.refreshAndBroadcastMetrics();
      } catch (error) {
        logger.error('Error in periodic metrics update:', error);
      }
    }, this.UPDATE_INTERVAL);

    logger.info('Dashboard metrics service started with periodic updates');
  }

  async refreshAndBroadcastMetrics(userId?: string): Promise<DashboardMetrics> {
    try {
      const metrics = await this.calculateMetrics();
      this.metricsCache = metrics;
      this.lastUpdate = new Date();

      // Broadcast to all dashboard subscribers
      await eventService.publishDashboardMetrics(metrics, userId);

      logger.debug('Dashboard metrics refreshed and broadcasted');
      return metrics;
    } catch (error) {
      logger.error('Failed to refresh dashboard metrics:', error);
      throw error;
    }
  }

  async getMetrics(forceRefresh = false): Promise<DashboardMetrics> {
    const now = new Date();
    const cacheExpired = !this.lastUpdate || 
      (now.getTime() - this.lastUpdate.getTime()) > this.CACHE_DURATION;

    if (forceRefresh || cacheExpired || !this.metricsCache) {
      return await this.refreshAndBroadcastMetrics();
    }

    return this.metricsCache;
  }

  private async calculateMetrics(): Promise<DashboardMetrics> {
    // In a real implementation, these would query the actual databases
    // For now, we'll simulate the metrics calculation
    
    const timestamp = new Date();
    
    // Simulate DSAR metrics calculation
    const dsarMetrics = await this.calculateDSARMetrics();
    
    // Simulate risk metrics calculation
    const riskMetrics = await this.calculateRiskMetrics();
    
    // Simulate GDPR metrics calculation
    const gdprMetrics = await this.calculateGDPRMetrics();
    
    // Simulate policy metrics calculation
    const policyMetrics = await this.calculatePolicyMetrics();
    
    // Simulate system metrics calculation
    const systemMetrics = await this.calculateSystemMetrics();

    return {
      timestamp,
      dsarMetrics,
      riskMetrics,
      gdprMetrics,
      policyMetrics,
      systemMetrics
    };
  }

  private async calculateDSARMetrics(): Promise<DashboardMetrics['dsarMetrics']> {
    // TODO: Replace with actual database queries
    return {
      totalRequests: Math.floor(Math.random() * 1000) + 500,
      pendingRequests: Math.floor(Math.random() * 50) + 10,
      completedToday: Math.floor(Math.random() * 20) + 5,
      averageResponseTime: Math.floor(Math.random() * 10) + 15, // days
      statusBreakdown: {
        submitted: Math.floor(Math.random() * 20) + 5,
        in_review: Math.floor(Math.random() * 15) + 3,
        in_progress: Math.floor(Math.random() * 25) + 8,
        completed: Math.floor(Math.random() * 200) + 100,
        rejected: Math.floor(Math.random() * 10) + 2
      }
    };
  }

  private async calculateRiskMetrics(): Promise<DashboardMetrics['riskMetrics']> {
    // TODO: Replace with actual database queries
    const highRiskCount = Math.floor(Math.random() * 15) + 5;
    const criticalRiskCount = Math.floor(Math.random() * 5) + 1;
    
    return {
      totalAssessments: Math.floor(Math.random() * 200) + 100,
      highRiskCount,
      criticalRiskCount,
      riskTrend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any,
      complianceScore: Math.floor(Math.random() * 30) + 70 // 70-100%
    };
  }

  private async calculateGDPRMetrics(): Promise<DashboardMetrics['gdprMetrics']> {
    // TODO: Replace with actual database queries
    return {
      lawfulBasisRecords: Math.floor(Math.random() * 100) + 50,
      processingActivities: Math.floor(Math.random() * 80) + 40,
      breachNotifications: Math.floor(Math.random() * 5) + 1,
      complianceGaps: Math.floor(Math.random() * 10) + 2
    };
  }

  private async calculatePolicyMetrics(): Promise<DashboardMetrics['policyMetrics']> {
    // TODO: Replace with actual database queries
    const totalPolicies = Math.floor(Math.random() * 50) + 25;
    const activePolicies = Math.floor(totalPolicies * 0.8);
    
    return {
      totalPolicies,
      activePolicies,
      pendingReviews: Math.floor(Math.random() * 8) + 2,
      expiringPolicies: Math.floor(Math.random() * 5) + 1
    };
  }

  private async calculateSystemMetrics(): Promise<DashboardMetrics['systemMetrics']> {
    // TODO: Replace with actual system monitoring
    return {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      systemHealth: ['healthy', 'warning', 'critical'][Math.floor(Math.random() * 3)] as any,
      uptime: process.uptime(),
      lastUpdated: new Date()
    };
  }

  async publishComplianceAlert(alert: Omit<ComplianceAlert, 'id' | 'createdAt'>): Promise<void> {
    const fullAlert: ComplianceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    await eventService.publishComplianceAlert(
      alert.regulation || 'General',
      alert.severity,
      alert.message
    );

    logger.info(`Compliance alert published: ${fullAlert.title} (${fullAlert.severity})`);
  }

  async publishUserActivity(activity: Omit<UserActivity, 'timestamp'>): Promise<void> {
    const fullActivity: UserActivity = {
      ...activity,
      timestamp: new Date()
    };

    await eventService.publishUserActivity(
      activity.userId,
      activity.action,
      activity.resourceType,
      activity.resourceId
    );

    logger.debug(`User activity published: ${activity.userName} - ${activity.action}`);
  }

  async publishSystemNotification(
    message: string, 
    severity: 'info' | 'warning' | 'error',
    userId?: string
  ): Promise<void> {
    await eventService.publishSystemNotification(message, severity, userId);
    logger.info(`System notification published: ${message} (${severity})`);
  }

  // Real-time collaboration features
  async publishCollaborationEvent(
    type: 'user_joined' | 'user_left' | 'document_locked' | 'document_unlocked',
    resourceType: string,
    resourceId: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    await eventService.publish(`collaboration:${resourceType}`, {
      type: `collaboration_${type}`,
      payload: {
        resourceType,
        resourceId,
        userId,
        metadata
      },
      userId
    });

    logger.debug(`Collaboration event published: ${type} for ${resourceType}:${resourceId}`);
  }

  // Live activity feed
  async getRecentActivity(limit = 50): Promise<UserActivity[]> {
    // TODO: Implement actual activity retrieval from database
    // For now, return mock data
    return [];
  }

  // User presence indicators
  async updateUserPresence(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    await eventService.publish('user:presence', {
      type: 'presence_update',
      payload: {
        userId,
        status,
        timestamp: new Date()
      },
      userId
    });

    logger.debug(`User presence updated: ${userId} - ${status}`);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info('Dashboard metrics service stopped');
  }
}

// Create singleton instance
export const dashboardMetricsService = new DashboardMetricsService();

// Cleanup on process exit
process.on('SIGTERM', () => dashboardMetricsService.stop());
process.on('SIGINT', () => dashboardMetricsService.stop());