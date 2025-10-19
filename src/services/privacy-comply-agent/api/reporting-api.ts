/**
 * Reporting API
 * REST endpoints for generating and managing compliance reports
 */

import { AgentController } from '../orchestration/agent-controller';
import {
  APIResponse,
  PaginatedResponse,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportListParams,
  ReportMetadata
} from './types';
import { ComplianceReport } from '../types';

export class ReportingAPI {
  private agentController: AgentController;
  private reportCache: Map<string, ComplianceReport> = new Map();
  private reportMetadataCache: Map<string, ReportMetadata> = new Map();

  constructor(agentController: AgentController) {
    this.agentController = agentController;
  }

  /**
   * POST /api/reports/generate
   * Generate a new compliance report
   */
  async generateReport(request: ReportGenerationRequest): Promise<APIResponse<ReportGenerationResponse>> {
    try {
      // Validate request
      const validation = this.validateReportRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid request: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      // Generate report ID
      const reportId = `report-${request.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start report generation (async process)
      this.generateReportAsync(reportId, request);

      // Return immediate response
      const response: ReportGenerationResponse = {
        reportId,
        status: 'GENERATING',
        downloadUrl: `/api/reports/download/${reportId}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      return {
        success: true,
        data: response,
        message: 'Report generation started',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports/:id/status
   * Get report generation status
   */
  async getReportStatus(reportId: string): Promise<APIResponse<ReportGenerationResponse>> {
    try {
      const metadata = this.reportMetadataCache.get(reportId);
      
      if (!metadata) {
        return {
          success: false,
          error: `Report with ID ${reportId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      const report = this.reportCache.get(reportId);
      const status = report ? 'COMPLETED' : 'GENERATING';

      const response: ReportGenerationResponse = {
        reportId,
        status,
        downloadUrl: status === 'COMPLETED' ? `/api/reports/download/${reportId}` : undefined,
        generatedAt: report ? report.generatedAt.toISOString() : undefined,
        expiresAt: metadata.expiresAt
      };

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report status',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports
   * Get paginated list of reports
   */
  async getReports(params: ReportListParams = {}): Promise<PaginatedResponse<ReportMetadata>> {
    try {
      let reports = Array.from(this.reportMetadataCache.values());

      // Apply filters
      if (params.type) {
        reports = reports.filter(r => r.type.toLowerCase() === params.type!.toLowerCase());
      }

      if (params.dateFrom) {
        const fromDate = new Date(params.dateFrom);
        reports = reports.filter(r => new Date(r.generatedAt) >= fromDate);
      }

      if (params.dateTo) {
        const toDate = new Date(params.dateTo);
        reports = reports.filter(r => new Date(r.generatedAt) <= toDate);
      }

      // Apply sorting
      reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedReports = reports.slice(startIndex, endIndex);
      const totalPages = Math.ceil(reports.length / limit);

      return {
        success: true,
        data: paginatedReports,
        pagination: {
          page,
          limit,
          total: reports.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get reports',
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports/:id
   * Get report details
   */
  async getReport(reportId: string): Promise<APIResponse<ComplianceReport>> {
    try {
      const report = this.reportCache.get(reportId);
      
      if (!report) {
        return {
          success: false,
          error: `Report with ID ${reportId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports/download/:id
   * Download report in specified format
   */
  async downloadReport(reportId: string, format?: string): Promise<APIResponse<{
    content: string;
    contentType: string;
    filename: string;
  }>> {
    try {
      const report = this.reportCache.get(reportId);
      const metadata = this.reportMetadataCache.get(reportId);
      
      if (!report || !metadata) {
        return {
          success: false,
          error: `Report with ID ${reportId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      // Check if report has expired
      if (new Date() > new Date(metadata.expiresAt)) {
        return {
          success: false,
          error: 'Report has expired',
          timestamp: new Date().toISOString()
        };
      }

      const requestedFormat = format || 'JSON';
      const content = await this.formatReport(report, requestedFormat);
      const contentType = this.getContentType(requestedFormat);
      const filename = `${report.type.toLowerCase()}-report-${reportId}.${requestedFormat.toLowerCase()}`;

      return {
        success: true,
        data: {
          content,
          contentType,
          filename
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download report',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * DELETE /api/reports/:id
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<APIResponse<{ message: string }>> {
    try {
      const report = this.reportCache.get(reportId);
      const metadata = this.reportMetadataCache.get(reportId);
      
      if (!report || !metadata) {
        return {
          success: false,
          error: `Report with ID ${reportId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      // Remove from caches
      this.reportCache.delete(reportId);
      this.reportMetadataCache.delete(reportId);

      return {
        success: true,
        data: { message: 'Report deleted successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete report',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports/templates
   * Get available report templates
   */
  async getReportTemplates(): Promise<APIResponse<Array<{
    type: string;
    name: string;
    description: string;
    supportedFormats: string[];
    requiredScope: string[];
  }>>> {
    try {
      const templates = [
        {
          type: 'DPIA',
          name: 'Data Protection Impact Assessment',
          description: 'Comprehensive assessment of data processing activities and associated privacy risks',
          supportedFormats: ['JSON', 'PDF', 'XLSX'],
          requiredScope: ['dataProcessingActivities', 'riskAssessment']
        },
        {
          type: 'ROPA',
          name: 'Records of Processing Activities',
          description: 'Detailed records of all data processing activities as required by GDPR Article 30',
          supportedFormats: ['JSON', 'PDF', 'XLSX'],
          requiredScope: ['processingActivities', 'dataCategories', 'legalBases']
        },
        {
          type: 'AUDIT',
          name: 'Compliance Audit Report',
          description: 'Comprehensive audit of compliance status and violations over a specified period',
          supportedFormats: ['JSON', 'PDF', 'XLSX'],
          requiredScope: ['timeRange', 'complianceFindings']
        },
        {
          type: 'SUMMARY',
          name: 'Executive Summary',
          description: 'High-level overview of compliance status and key metrics for executive reporting',
          supportedFormats: ['JSON', 'PDF'],
          requiredScope: ['overallScore', 'keyMetrics']
        }
      ];

      return {
        success: true,
        data: templates,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report templates',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private validateReportRequest(request: ReportGenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate report type
    const validTypes = ['DPIA', 'ROPA', 'AUDIT', 'SUMMARY'];
    if (!validTypes.includes(request.type)) {
      errors.push(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate format
    if (request.format) {
      const validFormats = ['JSON', 'PDF', 'XLSX'];
      if (!validFormats.includes(request.format)) {
        errors.push(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
      }
    }

    // Validate time range
    if (request.scope?.timeRange) {
      const { startDate, endDate } = request.scope.timeRange;
      if (new Date(startDate) >= new Date(endDate)) {
        errors.push('Start date must be before end date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async generateReportAsync(reportId: string, request: ReportGenerationRequest): Promise<void> {
    try {
      // Create metadata entry
      const metadata: ReportMetadata = {
        id: reportId,
        type: request.type,
        generatedAt: new Date().toISOString(),
        scope: request.scope || {},
        size: 0, // Will be updated after generation
        downloadUrl: `/api/reports/download/${reportId}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      this.reportMetadataCache.set(reportId, metadata);

      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate the actual report using the agent
      const report = await this.agentController.generateComplianceReport(request.type);
      
      // Update report with request-specific scope if provided
      if (request.scope) {
        report.scope = { ...report.scope, ...request.scope };
      }

      // Store the report
      this.reportCache.set(reportId, report);

      // Update metadata with actual size
      metadata.size = JSON.stringify(report).length;
      metadata.generatedAt = report.generatedAt.toISOString();

    } catch (error) {
      console.error(`Report generation failed for ${reportId}:`, error);
      
      // Update metadata to reflect failure
      const metadata = this.reportMetadataCache.get(reportId);
      if (metadata) {
        // In a real implementation, we'd have a status field to track failures
        console.error(`Report ${reportId} generation failed`);
      }
    }
  }

  private async formatReport(report: ComplianceReport, format: string): Promise<string> {
    switch (format.toUpperCase()) {
      case 'JSON':
        return JSON.stringify(report, null, 2);
      
      case 'PDF':
        // In a real implementation, this would generate a PDF
        return this.generatePDFContent(report);
      
      case 'XLSX':
        // In a real implementation, this would generate an Excel file
        return this.generateExcelContent(report);
      
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  private generatePDFContent(report: ComplianceReport): string {
    // Simplified PDF content generation
    // In a real implementation, this would use a PDF library
    return `
# ${report.type} Report

**Generated:** ${report.generatedAt.toISOString()}
**Report ID:** ${report.id}

## Executive Summary
${report.executiveSummary}

## Findings
Total Findings: ${report.findings.length}

${report.findings.map(finding => `
### Finding: ${finding.id}
- **Severity:** ${finding.severity}
- **Type:** ${finding.findingType}
- **Resource:** ${finding.resourceArn}
- **Description:** ${finding.description}
- **Detected:** ${finding.detectedAt.toISOString()}
`).join('\n')}

## Recommendations
Total Recommendations: ${report.recommendations.length}

${report.recommendations.map(rec => `
### Recommendation: ${rec.id}
- **Action:** ${rec.action}
- **Priority:** ${rec.priority}
- **Automatable:** ${rec.automatable ? 'Yes' : 'No'}
- **Impact:** ${rec.estimatedImpact}
`).join('\n')}
    `.trim();
  }

  private generateExcelContent(report: ComplianceReport): string {
    // Simplified Excel content generation
    // In a real implementation, this would generate actual Excel data
    const csvContent = [
      // Headers
      'Type,ID,Severity,Resource,Description,Detected At',
      // Findings data
      ...report.findings.map(finding => 
        `Finding,${finding.id},${finding.severity},${finding.resourceArn},"${finding.description}",${finding.detectedAt.toISOString()}`
      ),
      // Recommendations data
      ...report.recommendations.map(rec => 
        `Recommendation,${rec.id},${rec.priority},${rec.action},"${rec.estimatedImpact}",`
      )
    ].join('\n');

    return csvContent;
  }

  private getContentType(format: string): string {
    switch (format.toUpperCase()) {
      case 'JSON':
        return 'application/json';
      case 'PDF':
        return 'application/pdf';
      case 'XLSX':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/json';
    }
  }
}