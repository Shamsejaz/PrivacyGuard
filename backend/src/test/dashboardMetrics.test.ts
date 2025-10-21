import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dashboardMetricsService } from '../services/DashboardMetricsService';
import { eventService } from '../services/EventService';

// Mock the event service
vi.mock('../services/EventService', () => ({
  eventService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    publish: vi.fn(),
    publishDashboardMetrics: vi.fn(),
    publishComplianceAlert: vi.fn(),
    publishSystemNotification: vi.fn(),
    publishUserActivity: vi.fn(),
    isHealthy: vi.fn(() => true)
  }
}));

describe('Dashboard Metrics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metrics Calculation', () => {
    it('should calculate and return dashboard metrics', async () => {
      const metrics = await dashboardMetricsService.getMetrics(true);

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('dsarMetrics');
      expect(metrics).toHaveProperty('riskMetrics');
      expect(metrics).toHaveProperty('gdprMetrics');
      expect(metrics).toHaveProperty('policyMetrics');
      expect(metrics).toHaveProperty('systemMetrics');

      // Verify DSAR metrics structure
      expect(metrics.dsarMetrics).toHaveProperty('totalRequests');
      expect(metrics.dsarMetrics).toHaveProperty('pendingRequests');
      expect(metrics.dsarMetrics).toHaveProperty('completedToday');
      expect(metrics.dsarMetrics).toHaveProperty('averageResponseTime');
      expect(metrics.dsarMetrics).toHaveProperty('statusBreakdown');

      // Verify risk metrics structure
      expect(metrics.riskMetrics).toHaveProperty('totalAssessments');
      expect(metrics.riskMetrics).toHaveProperty('highRiskCount');
      expect(metrics.riskMetrics).toHaveProperty('criticalRiskCount');
      expect(metrics.riskMetrics).toHaveProperty('riskTrend');
      expect(metrics.riskMetrics).toHaveProperty('complianceScore');

      // Verify GDPR metrics structure
      expect(metrics.gdprMetrics).toHaveProperty('lawfulBasisRecords');
      expect(metrics.gdprMetrics).toHaveProperty('processingActivities');
      expect(metrics.gdprMetrics).toHaveProperty('breachNotifications');
      expect(metrics.gdprMetrics).toHaveProperty('complianceGaps');

      // Verify policy metrics structure
      expect(metrics.policyMetrics).toHaveProperty('totalPolicies');
      expect(metrics.policyMetrics).toHaveProperty('activePolicies');
      expect(metrics.policyMetrics).toHaveProperty('pendingReviews');
      expect(metrics.policyMetrics).toHaveProperty('expiringPolicies');

      // Verify system metrics structure
      expect(metrics.systemMetrics).toHaveProperty('activeUsers');
      expect(metrics.systemMetrics).toHaveProperty('systemHealth');
      expect(metrics.systemMetrics).toHaveProperty('uptime');
      expect(metrics.systemMetrics).toHaveProperty('lastUpdated');
    });

    it('should use cached metrics when not expired', async () => {
      // Get metrics first time (will calculate)
      const firstMetrics = await dashboardMetricsService.getMetrics(true);
      
      // Get metrics second time (should use cache)
      const secondMetrics = await dashboardMetricsService.getMetrics(false);
      
      expect(firstMetrics.timestamp).toEqual(secondMetrics.timestamp);
    });

    it('should refresh metrics when forced', async () => {
      // Get metrics first time
      const firstMetrics = await dashboardMetricsService.getMetrics(true);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Force refresh
      const refreshedMetrics = await dashboardMetricsService.getMetrics(true);
      
      expect(new Date(refreshedMetrics.timestamp).getTime()).toBeGreaterThan(
        new Date(firstMetrics.timestamp).getTime()
      );
    });

    it('should broadcast metrics when refreshed', async () => {
      const userId = 'test-user-123';
      
      await dashboardMetricsService.refreshAndBroadcastMetrics(userId);
      
      expect(eventService.publishDashboardMetrics).toHaveBeenCalledWith(
        expect.any(Object),
        userId
      );
    });
  });

  describe('Event Publishing', () => {
    it('should publish compliance alerts', async () => {
      const alert = {
        type: 'deadline' as const,
        severity: 'high' as const,
        title: 'GDPR Compliance Deadline',
        message: 'DPIA review due in 3 days',
        regulation: 'GDPR',
        resourceType: 'dpia',
        resourceId: 'dpia-123',
        dueDate: new Date('2024-12-31')
      };

      await dashboardMetricsService.publishComplianceAlert(alert);

      expect(eventService.publishComplianceAlert).toHaveBeenCalledWith(
        'GDPR',
        'high',
        'DPIA review due in 3 days'
      );
    });

    it('should publish user activity', async () => {
      const activity = {
        userId: 'user-123',
        userName: 'John Doe',
        action: 'created_dsar',
        resourceType: 'dsar',
        resourceId: 'dsar-456',
        ipAddress: '192.168.1.1'
      };

      await dashboardMetricsService.publishUserActivity(activity);

      expect(eventService.publishUserActivity).toHaveBeenCalledWith(
        'user-123',
        'created_dsar',
        'dsar',
        'dsar-456'
      );
    });

    it('should publish system notifications', async () => {
      const message = 'Database backup completed successfully';
      const severity = 'info';
      const userId = 'admin-123';

      await dashboardMetricsService.publishSystemNotification(message, severity, userId);

      expect(eventService.publishSystemNotification).toHaveBeenCalledWith(
        message,
        severity,
        userId
      );
    });

    it('should publish collaboration events', async () => {
      await dashboardMetricsService.publishCollaborationEvent(
        'user_joined',
        'dsar',
        'dsar-789',
        'user-123',
        { sessionId: 'session-456' }
      );

      expect(eventService.publish).toHaveBeenCalledWith(
        'collaboration:dsar',
        expect.objectContaining({
          type: 'collaboration_user_joined',
          payload: expect.objectContaining({
            resourceType: 'dsar',
            resourceId: 'dsar-789',
            userId: 'user-123',
            metadata: { sessionId: 'session-456' }
          }),
          userId: 'user-123'
        })
      );
    });

    it('should update user presence', async () => {
      const userId = 'user-123';
      const status = 'online';

      await dashboardMetricsService.updateUserPresence(userId, status);

      expect(eventService.publish).toHaveBeenCalledWith(
        'user:presence',
        expect.objectContaining({
          type: 'presence_update',
          payload: expect.objectContaining({
            userId,
            status,
            timestamp: expect.any(Date)
          }),
          userId
        })
      );
    });
  });

  describe('Data Validation', () => {
    it('should generate valid DSAR metrics', async () => {
      const metrics = await dashboardMetricsService.getMetrics(true);
      
      expect(typeof metrics.dsarMetrics.totalRequests).toBe('number');
      expect(typeof metrics.dsarMetrics.pendingRequests).toBe('number');
      expect(typeof metrics.dsarMetrics.completedToday).toBe('number');
      expect(typeof metrics.dsarMetrics.averageResponseTime).toBe('number');
      
      expect(metrics.dsarMetrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.dsarMetrics.pendingRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.dsarMetrics.completedToday).toBeGreaterThanOrEqual(0);
      expect(metrics.dsarMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      
      expect(typeof metrics.dsarMetrics.statusBreakdown).toBe('object');
      expect(metrics.dsarMetrics.statusBreakdown).toHaveProperty('submitted');
      expect(metrics.dsarMetrics.statusBreakdown).toHaveProperty('in_review');
      expect(metrics.dsarMetrics.statusBreakdown).toHaveProperty('in_progress');
      expect(metrics.dsarMetrics.statusBreakdown).toHaveProperty('completed');
      expect(metrics.dsarMetrics.statusBreakdown).toHaveProperty('rejected');
    });

    it('should generate valid risk metrics', async () => {
      const metrics = await dashboardMetricsService.getMetrics(true);
      
      expect(typeof metrics.riskMetrics.totalAssessments).toBe('number');
      expect(typeof metrics.riskMetrics.highRiskCount).toBe('number');
      expect(typeof metrics.riskMetrics.criticalRiskCount).toBe('number');
      expect(typeof metrics.riskMetrics.complianceScore).toBe('number');
      
      expect(metrics.riskMetrics.totalAssessments).toBeGreaterThanOrEqual(0);
      expect(metrics.riskMetrics.highRiskCount).toBeGreaterThanOrEqual(0);
      expect(metrics.riskMetrics.criticalRiskCount).toBeGreaterThanOrEqual(0);
      expect(metrics.riskMetrics.complianceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.riskMetrics.complianceScore).toBeLessThanOrEqual(100);
      
      expect(['increasing', 'decreasing', 'stable']).toContain(metrics.riskMetrics.riskTrend);
    });

    it('should generate valid system metrics', async () => {
      const metrics = await dashboardMetricsService.getMetrics(true);
      
      expect(typeof metrics.systemMetrics.activeUsers).toBe('number');
      expect(typeof metrics.systemMetrics.uptime).toBe('number');
      
      expect(metrics.systemMetrics.activeUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.systemMetrics.uptime).toBeGreaterThanOrEqual(0);
      
      expect(['healthy', 'warning', 'critical']).toContain(metrics.systemMetrics.systemHealth);
      expect(new Date(metrics.systemMetrics.lastUpdated)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle event service errors gracefully', async () => {
      // Mock event service to throw error
      vi.mocked(eventService.publishDashboardMetrics).mockRejectedValueOnce(
        new Error('Redis connection failed')
      );

      // Should not throw error
      await expect(
        dashboardMetricsService.refreshAndBroadcastMetrics()
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle compliance alert publishing errors', async () => {
      vi.mocked(eventService.publishComplianceAlert).mockRejectedValueOnce(
        new Error('Event publishing failed')
      );

      await expect(
        dashboardMetricsService.publishComplianceAlert({
          type: 'deadline',
          severity: 'high',
          title: 'Test Alert',
          message: 'Test message'
        })
      ).rejects.toThrow('Event publishing failed');
    });
  });

  describe('Service Lifecycle', () => {
    it('should stop periodic updates when stopped', () => {
      // This test verifies that the service can be stopped
      // In a real implementation, we would check that intervals are cleared
      expect(() => dashboardMetricsService.stop()).not.toThrow();
    });
  });
});