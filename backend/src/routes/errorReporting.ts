import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger, auditLog } from '../utils/logger';
import { monitoringService } from '../services/MonitoringService';

const router = Router();

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  context?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'javascript' | 'network' | 'authentication' | 'validation' | 'unknown';
}

interface UserFeedback {
  errorId: string;
  userDescription: string;
  reproductionSteps?: string;
  userEmail?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Store error reports (in production, this would be in a database)
const errorReports: Map<string, ErrorReport> = new Map();
const userFeedback: Map<string, UserFeedback[]> = new Map();

// Endpoint to receive error reports from frontend
router.post('/errors', asyncHandler(async (req, res) => {
  const errorReport: ErrorReport = req.body;

  // Validate required fields
  if (!errorReport.errorId || !errorReport.message || !errorReport.timestamp) {
    return res.status(400).json({
      error: 'Missing required fields: errorId, message, timestamp'
    });
  }

  // Store error report
  errorReports.set(errorReport.errorId, errorReport);

  // Log error for monitoring
  logger.error('Frontend Error Report', {
    errorId: errorReport.errorId,
    message: errorReport.message,
    url: errorReport.url,
    userId: errorReport.userId,
    severity: errorReport.severity || 'medium',
    category: errorReport.category || 'unknown',
    userAgent: errorReport.userAgent,
    timestamp: errorReport.timestamp,
  });

  // Record error metrics
  monitoringService.recordError();
  monitoringService.recordPerformanceMetric(`frontend_error_${errorReport.category || 'unknown'}`, 1);

  // Create alert for high severity errors
  if (errorReport.severity === 'critical' || errorReport.severity === 'high') {
    // In a real implementation, this would trigger alerting systems
    logger.warn(`High severity frontend error: ${errorReport.message}`, {
      errorId: errorReport.errorId,
      severity: errorReport.severity,
    });
  }

  // Audit log
  auditLog('frontend_error_reported', errorReport.userId, 'error', errorReport.errorId, {
    severity: errorReport.severity,
    category: errorReport.category,
    url: errorReport.url,
  });

  res.status(201).json({
    message: 'Error report received successfully',
    errorId: errorReport.errorId,
  });
}));

// Endpoint to receive user feedback about errors
router.post('/error-reports', asyncHandler(async (req, res) => {
  const feedback: UserFeedback = req.body;

  // Validate required fields
  if (!feedback.errorId || !feedback.userDescription) {
    return res.status(400).json({
      error: 'Missing required fields: errorId, userDescription'
    });
  }

  // Store user feedback
  if (!userFeedback.has(feedback.errorId)) {
    userFeedback.set(feedback.errorId, []);
  }
  userFeedback.get(feedback.errorId)!.push(feedback);

  // Log feedback
  logger.info('User Error Feedback', {
    errorId: feedback.errorId,
    userDescription: feedback.userDescription,
    userEmail: feedback.userEmail,
    severity: feedback.severity,
  });

  // Audit log
  auditLog('error_feedback_submitted', undefined, 'error_feedback', feedback.errorId, {
    userEmail: feedback.userEmail,
    severity: feedback.severity,
  });

  res.status(201).json({
    message: 'Feedback submitted successfully',
    errorId: feedback.errorId,
  });
}));

// Get error reports (admin endpoint)
router.get('/errors', asyncHandler(async (req, res) => {
  const { severity, category, limit = '50', offset = '0' } = req.query;
  
  let reports = Array.from(errorReports.values());

  // Filter by severity
  if (severity) {
    reports = reports.filter(report => report.severity === severity);
  }

  // Filter by category
  if (category) {
    reports = reports.filter(report => report.category === category);
  }

  // Sort by timestamp (newest first)
  reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Pagination
  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  const paginatedReports = reports.slice(offsetNum, offsetNum + limitNum);

  res.json({
    errors: paginatedReports,
    total: reports.length,
    limit: limitNum,
    offset: offsetNum,
  });
}));

// Get specific error report with feedback
router.get('/errors/:errorId', asyncHandler(async (req, res) => {
  const { errorId } = req.params;
  
  const errorReport = errorReports.get(errorId);
  if (!errorReport) {
    return res.status(404).json({
      error: 'Error report not found',
      errorId,
    });
  }

  const feedback = userFeedback.get(errorId) || [];

  res.json({
    error: errorReport,
    feedback,
  });
}));

// Get error statistics
router.get('/errors/stats/summary', asyncHandler(async (req, res) => {
  const reports = Array.from(errorReports.values());
  
  const stats = {
    total: reports.length,
    bySeverity: {
      critical: reports.filter(r => r.severity === 'critical').length,
      high: reports.filter(r => r.severity === 'high').length,
      medium: reports.filter(r => r.severity === 'medium').length,
      low: reports.filter(r => r.severity === 'low').length,
    },
    byCategory: {
      javascript: reports.filter(r => r.category === 'javascript').length,
      network: reports.filter(r => r.category === 'network').length,
      authentication: reports.filter(r => r.category === 'authentication').length,
      validation: reports.filter(r => r.category === 'validation').length,
      unknown: reports.filter(r => r.category === 'unknown').length,
    },
    recent: {
      last24h: reports.filter(r => 
        new Date(r.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
      last7d: reports.filter(r => 
        new Date(r.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length,
    },
  };

  res.json(stats);
}));

// Delete error report (admin endpoint)
router.delete('/errors/:errorId', asyncHandler(async (req, res) => {
  const { errorId } = req.params;
  
  const deleted = errorReports.delete(errorId);
  userFeedback.delete(errorId);

  if (!deleted) {
    return res.status(404).json({
      error: 'Error report not found',
      errorId,
    });
  }

  // Audit log
  auditLog('error_report_deleted', req.user?.id, 'error', errorId);

  res.json({
    message: 'Error report deleted successfully',
    errorId,
  });
}));

// Maintenance notification endpoint
router.get('/maintenance', asyncHandler(async (req, res) => {
  // In a real implementation, this would check a configuration or database
  const maintenanceScheduled = process.env.MAINTENANCE_SCHEDULED === 'true';
  const maintenanceTime = process.env.MAINTENANCE_TIME || '';

  res.json({
    scheduled: maintenanceScheduled,
    scheduledTime: maintenanceTime,
    message: process.env.MAINTENANCE_MESSAGE || 'Scheduled maintenance is planned.',
  });
}));

export default router;