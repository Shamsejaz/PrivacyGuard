import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import websocketRoutes from '../routes/websocket';
import { authenticateToken } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/permissions';
import { dashboardMetricsService } from '../services/DashboardMetricsService';
import { getWebSocketStats } from '../websocket/server';
import { eventService } from '../services/EventService';

// Mock dependencies
vi.mock('../websocket/server', () => ({
  getWebSocketStats: vi.fn()
}));

vi.mock('../services/DashboardMetricsService', () => ({
  dashboardMetricsService: {
    refreshAndBroadcastMetrics: vi.fn(),
    getMetrics: vi.fn(),
    publishSystemNotification: vi.fn(),
    publishComplianceAlert: vi.fn(),
    updateUserPresence: vi.fn()
  }
}));

vi.mock('../services/EventService', () => ({
  eventService: {
    isHealthy: vi.fn(),
    getSubscriptionCount: vi.fn(),
    getActiveChannels: vi.fn()
  }
}));

vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      permissions: ['*']
    };
    next();
  })
}));

vi.mock('../middleware/permissions', () => ({
  requirePermission: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('WebSocket Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/websocket', websocketRoutes);
    vi.clearAllMocks();
  });

  describe('GET /websocket/stats', () => {
    it('should return WebSocket statistics', async () => {
      const mockStats = {
        connectedClients: 5,
        authenticatedClients: 4,
        totalSubscriptions: 12,
        eventServiceHealth: true,
        eventServiceSubscriptions: 8,
        activeChannels: ['dsar:updates', 'risk:alerts']
      };

      vi.mocked(getWebSocketStats).mockReturnValue(mockStats);

      const response = await request(app)
        .get('/websocket/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });

      expect(authenticateToken).toHaveBeenCalled();
      expect(requirePermission).toHaveBeenCalledWith('system:read');
    });

    it('should handle errors when getting stats', async () => {
      vi.mocked(getWebSocketStats).mockImplementation(() => {
        throw new Error('Stats unavailable');
      });

      const response = await request(app)
        .get('/websocket/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get WebSocket statistics'
      });
    });
  });

  describe('GET /websocket/health', () => {
    it('should return health status', async () => {
      const mockHealth = {
        eventService: {
          connected: true,
          subscriptions: 5,
          channels: ['dsar:updates', 'risk:alerts']
        },
        websocket: {
          connectedClients: 3,
          authenticatedClients: 2
        }
      };

      vi.mocked(eventService.isHealthy).mockReturnValue(true);
      vi.mocked(eventService.getSubscriptionCount).mockReturnValue(5);
      vi.mocked(eventService.getActiveChannels).mockReturnValue(['dsar:updates', 'risk:alerts']);
      vi.mocked(getWebSocketStats).mockReturnValue({
        connectedClients: 3,
        authenticatedClients: 2
      });

      const response = await request(app)
        .get('/websocket/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eventService');
      expect(response.body.data).toHaveProperty('websocket');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.eventService.connected).toBe(true);
    });
  });

  describe('POST /websocket/metrics/refresh', () => {
    it('should refresh and broadcast metrics', async () => {
      const mockMetrics = {
        timestamp: new Date(),
        dsarMetrics: { totalRequests: 100 },
        riskMetrics: { highRiskCount: 5 },
        gdprMetrics: { complianceGaps: 2 },
        policyMetrics: { activePolicies: 15 },
        systemMetrics: { activeUsers: 8 }
      };

      vi.mocked(dashboardMetricsService.refreshAndBroadcastMetrics)
        .mockResolvedValue(mockMetrics as any);

      const response = await request(app)
        .post('/websocket/metrics/refresh')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics,
        message: 'Dashboard metrics refreshed and broadcasted'
      });

      expect(dashboardMetricsService.refreshAndBroadcastMetrics)
        .toHaveBeenCalledWith('test-user-id');
      expect(requirePermission).toHaveBeenCalledWith('dashboard:read');
    });

    it('should handle refresh errors', async () => {
      vi.mocked(dashboardMetricsService.refreshAndBroadcastMetrics)
        .mockRejectedValue(new Error('Refresh failed'));

      const response = await request(app)
        .post('/websocket/metrics/refresh')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to refresh dashboard metrics'
      });
    });
  });

  describe('GET /websocket/metrics', () => {
    it('should return current metrics', async () => {
      const mockMetrics = {
        timestamp: new Date(),
        dsarMetrics: { totalRequests: 100 },
        riskMetrics: { highRiskCount: 5 }
      };

      vi.mocked(dashboardMetricsService.getMetrics)
        .mockResolvedValue(mockMetrics as any);

      const response = await request(app)
        .get('/websocket/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics
      });

      expect(dashboardMetricsService.getMetrics).toHaveBeenCalledWith(false);
    });

    it('should force refresh when requested', async () => {
      const mockMetrics = { timestamp: new Date() };

      vi.mocked(dashboardMetricsService.getMetrics)
        .mockResolvedValue(mockMetrics as any);

      await request(app)
        .get('/websocket/metrics?refresh=true')
        .expect(200);

      expect(dashboardMetricsService.getMetrics).toHaveBeenCalledWith(true);
    });
  });

  describe('POST /websocket/test/notification', () => {
    it('should publish test notification', async () => {
      const notificationData = {
        message: 'Test notification message',
        severity: 'info',
        userId: 'target-user-123'
      };

      vi.mocked(dashboardMetricsService.publishSystemNotification)
        .mockResolvedValue();

      const response = await request(app)
        .post('/websocket/test/notification')
        .send(notificationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Test notification published'
      });

      expect(dashboardMetricsService.publishSystemNotification)
        .toHaveBeenCalledWith('Test notification message', 'info', 'target-user-123');
    });

    it('should use default severity and user ID', async () => {
      const notificationData = {
        message: 'Test notification'
      };

      vi.mocked(dashboardMetricsService.publishSystemNotification)
        .mockResolvedValue();

      await request(app)
        .post('/websocket/test/notification')
        .send(notificationData)
        .expect(200);

      expect(dashboardMetricsService.publishSystemNotification)
        .toHaveBeenCalledWith('Test notification', 'info', 'test-user-id');
    });

    it('should require message field', async () => {
      const response = await request(app)
        .post('/websocket/test/notification')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Message is required'
      });
    });
  });

  describe('POST /websocket/alerts/compliance', () => {
    it('should publish compliance alert', async () => {
      const alertData = {
        type: 'deadline',
        severity: 'high',
        title: 'GDPR Compliance Alert',
        message: 'DPIA review due soon',
        regulation: 'GDPR',
        resourceType: 'dpia',
        resourceId: 'dpia-123',
        dueDate: '2024-12-31T23:59:59Z'
      };

      vi.mocked(dashboardMetricsService.publishComplianceAlert)
        .mockResolvedValue();

      const response = await request(app)
        .post('/websocket/alerts/compliance')
        .send(alertData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Compliance alert published'
      });

      expect(dashboardMetricsService.publishComplianceAlert)
        .toHaveBeenCalledWith({
          type: 'deadline',
          severity: 'high',
          title: 'GDPR Compliance Alert',
          message: 'DPIA review due soon',
          regulation: 'GDPR',
          resourceType: 'dpia',
          resourceId: 'dpia-123',
          dueDate: new Date('2024-12-31T23:59:59Z')
        });

      expect(requirePermission).toHaveBeenCalledWith('compliance:write');
    });

    it('should require mandatory fields', async () => {
      const incompleteData = {
        type: 'deadline',
        severity: 'high'
        // Missing title and message
      };

      const response = await request(app)
        .post('/websocket/alerts/compliance')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Type, severity, title, and message are required'
      });
    });
  });

  describe('POST /websocket/presence', () => {
    it('should update user presence', async () => {
      const presenceData = {
        status: 'online'
      };

      vi.mocked(dashboardMetricsService.updateUserPresence)
        .mockResolvedValue();

      const response = await request(app)
        .post('/websocket/presence')
        .send(presenceData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'User presence updated'
      });

      expect(dashboardMetricsService.updateUserPresence)
        .toHaveBeenCalledWith('test-user-id', 'online');
    });

    it('should validate status values', async () => {
      const invalidData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/websocket/presence')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid status. Must be online, away, or offline'
      });
    });

    it('should handle missing authentication', async () => {
      // Mock unauthenticated request
      vi.mocked(authenticateToken).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/websocket/presence')
        .send({ status: 'online' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'User not authenticated'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(dashboardMetricsService.publishSystemNotification)
        .mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/websocket/test/notification')
        .send({ message: 'Test' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to publish test notification'
      });
    });
  });
});