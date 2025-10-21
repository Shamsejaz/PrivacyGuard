import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.js';
import { getWebSocketStats } from '../websocket/server.js';
import { eventService } from '../services/EventService.js';
import { dashboardMetricsService } from '../services/DashboardMetricsService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnyPermission } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get WebSocket server statistics
router.get('/stats', authenticateToken, requireAnyPermission(['system:read']), (req, res) => {
  try {
    const stats = getWebSocketStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket statistics'
    });
  }
});

// Get event service health
router.get('/health', authenticateToken, requireAnyPermission(['system:read']), (req, res) => {
  try {
    const health = {
      eventService: {
        connected: eventService.isHealthy(),
        subscriptions: eventService.getSubscriptionCount(),
        channels: eventService.getActiveChannels()
      },
      websocket: getWebSocketStats(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting WebSocket health:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket health status'
    });
  }
});

// Trigger dashboard metrics refresh
router.post('/metrics/refresh', authenticateToken, requireAnyPermission(['dashboard:read']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const metrics = await dashboardMetricsService.refreshAndBroadcastMetrics(userId);
    
    res.json({
      success: true,
      data: metrics,
      message: 'Dashboard metrics refreshed and broadcasted'
    });
  } catch (error) {
    logger.error('Error refreshing dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh dashboard metrics'
    });
  }
});

// Get current dashboard metrics
router.get('/metrics', authenticateToken, requireAnyPermission(['dashboard:read']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const metrics = await dashboardMetricsService.getMetrics(forceRefresh);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get dashboard metrics'
    });
  }
});

// Publish test notification (for testing purposes)
router.post('/test/notification', authenticateToken, requireAnyPermission(['system:write']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, severity = 'info', userId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    await dashboardMetricsService.publishSystemNotification(
      message,
      severity,
      userId || req.user?.id
    );

    return res.json({
      success: true,
      message: 'Test notification published'
    });
  } catch (error) {
    logger.error('Error publishing test notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to publish test notification'
    });
  }
});

// Publish compliance alert
router.post('/alerts/compliance', authenticateToken, requireAnyPermission(['compliance:write']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, severity, title, message, regulation, resourceType, resourceId, dueDate } = req.body;
    
    if (!type || !severity || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Type, severity, title, and message are required'
      });
    }

    await dashboardMetricsService.publishComplianceAlert({
      type,
      severity,
      title,
      message,
      regulation,
      resourceType,
      resourceId,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return res.json({
      success: true,
      message: 'Compliance alert published'
    });
  } catch (error) {
    logger.error('Error publishing compliance alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to publish compliance alert'
    });
  }
});

// Update user presence
router.post('/presence', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!['online', 'away', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be online, away, or offline'
      });
    }

    await dashboardMetricsService.updateUserPresence(userId, status);

    return res.json({
      success: true,
      message: 'User presence updated'
    });
  } catch (error) {
    logger.error('Error updating user presence:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user presence'
    });
  }
});

export default router;
