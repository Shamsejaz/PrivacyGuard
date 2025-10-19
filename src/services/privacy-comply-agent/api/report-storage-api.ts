// Report Storage and Retrieval API
import { Request, Response } from 'express';
import { ReportStorageServiceImpl } from '../services/report-storage-service';
import { AWSServiceClients } from '../config/service-clients';
import { ComplianceReport, DateRange } from '../types';

/**
 * Report Storage API Controller
 * Provides REST endpoints for report storage and retrieval operations
 */
export class ReportStorageAPI {
  private reportStorageService: ReportStorageServiceImpl;

  constructor() {
    const awsClients = AWSServiceClients.getInstance();
    this.reportStorageService = new ReportStorageServiceImpl(awsClients);
  }

  /**
   * Store a new compliance report
   * POST /api/privacy-comply-agent/reports
   */
  async storeReport(req: Request, res: Response): Promise<void> {
    try {
      const report: ComplianceReport = req.body;
      
      // Validate required fields
      if (!report.id || !report.type || !report.generatedAt) {
        res.status(400).json({
          error: 'Missing required fields: id, type, generatedAt'
        });
        return;
      }

      const result = await this.reportStorageService.storeReport(report);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Report stored successfully'
      });
    } catch (error) {
      console.error('Error storing report:', error);
      res.status(500).json({
        error: 'Failed to store report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Retrieve a report by ID
   * GET /api/privacy-comply-agent/reports/:reportId
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      if (!reportId) {
        res.status(400).json({
          error: 'Report ID is required'
        });
        return;
      }

      const report = await this.reportStorageService.getReport(reportId);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error retrieving report:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Report not found',
          reportId: req.params.reportId
        });
      } else {
        res.status(500).json({
          error: 'Failed to retrieve report',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get report metadata only
   * GET /api/privacy-comply-agent/reports/:reportId/metadata
   */
  async getReportMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      if (!reportId) {
        res.status(400).json({
          error: 'Report ID is required'
        });
        return;
      }

      const metadata = await this.reportStorageService.getReportMetadata(reportId);
      
      if (!metadata) {
        res.status(404).json({
          error: 'Report not found',
          reportId
        });
        return;
      }

      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Error retrieving report metadata:', error);
      res.status(500).json({
        error: 'Failed to retrieve report metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search reports with advanced criteria
   * POST /api/privacy-comply-agent/reports/search
   */
  async searchReports(req: Request, res: Response): Promise<void> {
    try {
      const searchCriteria = req.body;
      
      // Parse date range if provided
      if (searchCriteria.dateRange) {
        searchCriteria.dateRange = {
          startDate: new Date(searchCriteria.dateRange.startDate),
          endDate: new Date(searchCriteria.dateRange.endDate)
        };
      }

      const result = await this.reportStorageService.searchReports(searchCriteria);
      
      res.json({
        success: true,
        data: result.reports,
        pagination: {
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit: searchCriteria.limit || 20,
          offset: searchCriteria.offset || 0
        },
        searchMetadata: result.searchMetadata
      });
    } catch (error) {
      console.error('Error searching reports:', error);
      res.status(500).json({
        error: 'Failed to search reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get simple list of reports with basic filtering
   * GET /api/privacy-comply-agent/reports
   */
  async listReports(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        regulation,
        department,
        status,
        limit = '20',
        offset = '0',
        startDate,
        endDate
      } = req.query;

      const searchCriteria: any = {
        type: type as string,
        regulation: regulation as string,
        department: department as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      // Add date range if provided
      if (startDate && endDate) {
        searchCriteria.dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const result = await this.reportStorageService.searchReports(searchCriteria);
      
      res.json({
        success: true,
        data: result.reports,
        pagination: {
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit: searchCriteria.limit,
          offset: searchCriteria.offset
        }
      });
    } catch (error) {
      console.error('Error listing reports:', error);
      res.status(500).json({
        error: 'Failed to list reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a report
   * DELETE /api/privacy-comply-agent/reports/:reportId
   */
  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { reason } = req.body;
      
      if (!reportId) {
        res.status(400).json({
          error: 'Report ID is required'
        });
        return;
      }

      const result = await this.reportStorageService.deleteReport(reportId, reason);
      
      res.json({
        success: true,
        data: result,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Report not found',
          reportId: req.params.reportId
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete report',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Bulk store multiple reports
   * POST /api/privacy-comply-agent/reports/bulk
   */
  async bulkStoreReports(req: Request, res: Response): Promise<void> {
    try {
      const { reports } = req.body;
      
      if (!Array.isArray(reports) || reports.length === 0) {
        res.status(400).json({
          error: 'Reports array is required and must not be empty'
        });
        return;
      }

      const result = await this.reportStorageService.bulkStoreReports(reports);
      
      res.status(201).json({
        success: true,
        data: result,
        message: `Bulk operation completed: ${result.successful.length} successful, ${result.failed.length} failed`
      });
    } catch (error) {
      console.error('Error bulk storing reports:', error);
      res.status(500).json({
        error: 'Failed to bulk store reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Archive old reports
   * POST /api/privacy-comply-agent/reports/archive
   */
  async archiveOldReports(req: Request, res: Response): Promise<void> {
    try {
      const { olderThanDays = 365 } = req.body;
      
      if (typeof olderThanDays !== 'number' || olderThanDays < 30) {
        res.status(400).json({
          error: 'olderThanDays must be a number and at least 30'
        });
        return;
      }

      const result = await this.reportStorageService.archiveOldReports(olderThanDays);
      
      res.json({
        success: true,
        data: result,
        message: `Archived ${result.archivedCount} reports`
      });
    } catch (error) {
      console.error('Error archiving reports:', error);
      res.status(500).json({
        error: 'Failed to archive reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get storage metrics and health
   * GET /api/privacy-comply-agent/reports/metrics
   */
  async getStorageMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.reportStorageService.getStorageMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting storage metrics:', error);
      res.status(500).json({
        error: 'Failed to get storage metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate report integrity
   * GET /api/privacy-comply-agent/reports/:reportId/validate
   */
  async validateReportIntegrity(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      if (!reportId) {
        res.status(400).json({
          error: 'Report ID is required'
        });
        return;
      }

      const validation = await this.reportStorageService.validateReportIntegrity(reportId);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating report integrity:', error);
      res.status(500).json({
        error: 'Failed to validate report integrity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get report export in different formats
   * GET /api/privacy-comply-agent/reports/:reportId/export?format=pdf|json|csv
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;
      
      if (!reportId) {
        res.status(400).json({
          error: 'Report ID is required'
        });
        return;
      }

      if (!['pdf', 'json', 'csv'].includes(format as string)) {
        res.status(400).json({
          error: 'Invalid format. Supported formats: pdf, json, csv'
        });
        return;
      }

      // Get the report first
      const report = await this.reportStorageService.getReport(reportId);
      
      let exportData: Buffer;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'json':
          exportData = Buffer.from(JSON.stringify(report, null, 2));
          contentType = 'application/json';
          filename = `${reportId}.json`;
          break;
        
        case 'csv':
          exportData = this.exportReportAsCSV(report);
          contentType = 'text/csv';
          filename = `${reportId}.csv`;
          break;
        
        case 'pdf':
          exportData = this.exportReportAsPDF(report);
          contentType = 'application/pdf';
          filename = `${reportId}.pdf`;
          break;
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting report:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Report not found',
          reportId: req.params.reportId
        });
      } else {
        res.status(500).json({
          error: 'Failed to export report',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get report statistics for dashboard
   * GET /api/privacy-comply-agent/reports/stats
   */
  async getReportStatistics(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day'
      } = req.query;

      const dateRange: DateRange = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date()
      };

      // Get basic metrics
      const metrics = await this.reportStorageService.getStorageMetrics();
      
      // Get reports in date range for trend analysis
      const searchResult = await this.reportStorageService.searchReports({
        dateRange,
        limit: 1000
      });

      // Calculate statistics
      const stats = this.calculateReportStatistics(searchResult.reports, groupBy as string);
      
      res.json({
        success: true,
        data: {
          overview: {
            totalReports: metrics.totalReports,
            totalStorageSize: metrics.totalStorageSize,
            averageReportSize: metrics.averageReportSize,
            storageHealth: metrics.storageHealth
          },
          trends: stats.trends,
          breakdown: {
            byType: stats.byType,
            bySeverity: stats.bySeverity,
            byRegulation: stats.byRegulation
          },
          dateRange
        }
      });
    } catch (error) {
      console.error('Error getting report statistics:', error);
      res.status(500).json({
        error: 'Failed to get report statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private exportReportAsCSV(report: ComplianceReport): Buffer {
    const csvLines: string[] = [];
    
    // Header
    csvLines.push('Report ID,Type,Generated At,Findings Count,Overall Score');
    
    // Report summary
    const overallScore = (report as any).overallScore || (report as any).complianceScore || 'N/A';
    csvLines.push(`${report.id},${report.type},${report.generatedAt.toISOString()},${report.findings.length},${overallScore}`);
    
    // Findings section
    csvLines.push('');
    csvLines.push('Findings');
    csvLines.push('ID,Resource ARN,Type,Severity,Description,Detected At');
    
    report.findings.forEach(finding => {
      csvLines.push(`${finding.id},${finding.resourceArn},${finding.findingType},${finding.severity},"${finding.description}",${finding.detectedAt.toISOString()}`);
    });
    
    // Recommendations section
    csvLines.push('');
    csvLines.push('Recommendations');
    csvLines.push('ID,Action,Priority,Automatable,Description');
    
    report.recommendations.forEach(rec => {
      csvLines.push(`${rec.id},${rec.action},${rec.priority},${rec.automatable},"${rec.estimatedImpact}"`);
    });
    
    return Buffer.from(csvLines.join('\n'));
  }

  private exportReportAsPDF(report: ComplianceReport): Buffer {
    // Simple text-based PDF content
    const pdfContent = `
COMPLIANCE REPORT
================

Report ID: ${report.id}
Type: ${report.type}
Generated: ${report.generatedAt.toISOString()}

EXECUTIVE SUMMARY
================
${report.executiveSummary}

FINDINGS SUMMARY
===============
Total Findings: ${report.findings.length}
Critical: ${report.findings.filter(f => f.severity === 'CRITICAL').length}
High: ${report.findings.filter(f => f.severity === 'HIGH').length}
Medium: ${report.findings.filter(f => f.severity === 'MEDIUM').length}
Low: ${report.findings.filter(f => f.severity === 'LOW').length}

RECOMMENDATIONS
==============
Total Recommendations: ${report.recommendations.length}
High Priority: ${report.recommendations.filter(r => r.priority === 'HIGH').length}
Automatable: ${report.recommendations.filter(r => r.automatable).length}

DETAILED FINDINGS
================
${report.findings.map(f => `
Finding: ${f.id}
Resource: ${f.resourceArn}
Type: ${f.findingType}
Severity: ${f.severity}
Description: ${f.description}
Detected: ${f.detectedAt.toISOString()}
`).join('\n')}
`;

    return Buffer.from(pdfContent);
  }

  private calculateReportStatistics(reports: ComplianceReport[], groupBy: string): {
    trends: Array<{ period: string; count: number; avgScore: number }>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byRegulation: Record<string, number>;
  } {
    const trends = new Map<string, { count: number; totalScore: number }>();
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byRegulation: Record<string, number> = {};

    reports.forEach(report => {
      // Calculate trends
      const date = report.generatedAt;
      let period: string;
      
      switch (groupBy) {
        case 'hour':
          period = date.toISOString().substring(0, 13);
          break;
        case 'day':
          period = date.toISOString().substring(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().substring(0, 10);
          break;
        case 'month':
          period = date.toISOString().substring(0, 7);
          break;
        default:
          period = date.toISOString().substring(0, 10);
      }

      if (!trends.has(period)) {
        trends.set(period, { count: 0, totalScore: 0 });
      }
      
      const trend = trends.get(period)!;
      trend.count++;
      
      const score = (report as any).overallScore || (report as any).complianceScore || 0;
      trend.totalScore += score;

      // Count by type
      byType[report.type] = (byType[report.type] || 0) + 1;

      // Count by severity
      report.findings.forEach(finding => {
        bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
      });

      // Count by regulation
      if (report.scope.regulations) {
        report.scope.regulations.forEach(regulation => {
          byRegulation[regulation] = (byRegulation[regulation] || 0) + 1;
        });
      }
    });

    // Convert trends to array
    const trendsArray = Array.from(trends.entries())
      .map(([period, data]) => ({
        period,
        count: data.count,
        avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      trends: trendsArray,
      byType,
      bySeverity,
      byRegulation
    };
  }
}