import {
  RegulatoryReport,
  ReportTemplate,
  ReportSchedule,
  ReportGenerationRequest,
  ReportGenerationStatus,
  ReportAnalytics,
  ComplianceReportData,
  RegulatoryReportType,
  ComplianceFramework,
  ReportFormat,
  ReportStatus,
  ReportParameters
} from '../types/regulatory-reporting';

class RegulatoryReportingService {
  private baseUrl = '/api/regulatory-reports';

  /**
   * Get all report templates
   */
  async getTemplates(framework?: ComplianceFramework): Promise<ReportTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (framework) {
        params.append('framework', framework);
      }

      const response = await fetch(`${this.baseUrl}/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific report template
   */
  async getTemplate(templateId: string): Promise<ReportTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report template:', error);
      throw error;
    }
  }

  /**
   * Create a new report template
   */
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create report template:', error);
      throw error;
    }
  }

  /**
   * Update a report template
   */
  async updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update template: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update report template:', error);
      throw error;
    }
  }

  /**
   * Delete a report template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete report template:', error);
      throw error;
    }
  }

  /**
   * Generate a regulatory report
   */
  async generateReport(request: ReportGenerationRequest): Promise<{ reportId: string; statusId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Get report generation status
   */
  async getGenerationStatus(statusId: string): Promise<ReportGenerationStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/generation-status/${statusId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get generation status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get generation status:', error);
      throw error;
    }
  }

  /**
   * Get all reports
   */
  async getReports(filters?: {
    framework?: ComplianceFramework;
    type?: RegulatoryReportType;
    status?: ReportStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: RegulatoryReport[]; totalCount: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get reports:', error);
      throw error;
    }
  }

  /**
   * Get a specific report
   */
  async getReport(reportId: string): Promise<RegulatoryReport> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  }

  /**
   * Download a report
   */
  async downloadReport(reportId: string, format?: ReportFormat): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (format) {
        params.append('format', format);
      }

      const response = await fetch(`${this.baseUrl}/reports/${reportId}/download?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to download report:', error);
      throw error;
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete report: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  }

  /**
   * Get report schedules
   */
  async getSchedules(): Promise<ReportSchedule[]> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report schedules:', error);
      throw error;
    }
  }

  /**
   * Create a report schedule
   */
  async createSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>): Promise<ReportSchedule> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(schedule)
      });

      if (!response.ok) {
        throw new Error(`Failed to create schedule: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create report schedule:', error);
      throw error;
    }
  }

  /**
   * Update a report schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<ReportSchedule> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update schedule: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update report schedule:', error);
      throw error;
    }
  }

  /**
   * Delete a report schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete schedule: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete report schedule:', error);
      throw error;
    }
  }

  /**
   * Get report analytics
   */
  async getAnalytics(dateRange?: { startDate: Date; endDate: Date }): Promise<ReportAnalytics> {
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.startDate.toISOString());
        params.append('endDate', dateRange.endDate.toISOString());
      }

      const response = await fetch(`${this.baseUrl}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get report analytics:', error);
      throw error;
    }
  }

  /**
   * Get compliance data for report generation
   */
  async getComplianceData(
    framework: ComplianceFramework,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<ComplianceReportData> {
    try {
      const response = await fetch(`${this.baseUrl}/compliance-data/${framework}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(dateRange)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get compliance data:', error);
      throw error;
    }
  }

  /**
   * Validate report template
   */
  async validateTemplate(template: Partial<ReportTemplate>): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Failed to validate template: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to validate template:', error);
      throw error;
    }
  }

  /**
   * Preview report with sample data
   */
  async previewReport(templateId: string, parameters: ReportParameters): Promise<{ html: string; warnings: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(parameters)
      });

      if (!response.ok) {
        throw new Error(`Failed to preview report: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to preview report:', error);
      throw error;
    }
  }

  /**
   * Get default templates for each framework
   */
  async getDefaultTemplates(): Promise<Record<ComplianceFramework, ReportTemplate[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/defaults`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch default templates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get default templates:', error);
      throw error;
    }
  }

  /**
   * Verify digital signature of a report
   */
  async verifySignature(reportId: string): Promise<{ valid: boolean; details: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}/verify-signature`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to verify signature: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to verify signature:', error);
      throw error;
    }
  }

  // Helper methods
  private getAuthToken(): string {
    return localStorage.getItem('privacyguard_session') || '';
  }

  /**
   * Get predefined report parameters for common report types
   */
  getDefaultParameters(reportType: RegulatoryReportType): Partial<ReportParameters> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseParams: Partial<ReportParameters> = {
      dateRange: {
        startDate: thirtyDaysAgo,
        endDate: now
      },
      includeCharts: true,
      includeRawData: false,
      format: ReportFormat.PDF,
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    switch (reportType) {
      case RegulatoryReportType.GDPR_COMPLIANCE_REPORT:
        return {
          ...baseParams,
          filters: {
            includeBreaches: true,
            includeDSARs: true,
            includeDPIAs: true
          }
        };

      case RegulatoryReportType.CCPA_COMPLIANCE_REPORT:
        return {
          ...baseParams,
          filters: {
            includeConsumerRequests: true,
            includeOptOuts: true,
            includeDisclosures: true
          }
        };

      case RegulatoryReportType.HIPAA_COMPLIANCE_REPORT:
        return {
          ...baseParams,
          filters: {
            includeRiskAssessments: true,
            includeSecurityIncidents: true,
            includeBusinessAssociates: true
          }
        };

      case RegulatoryReportType.PDPL_COMPLIANCE_REPORT:
        return {
          ...baseParams,
          filters: {
            includeConsent: true,
            includeTransfers: true,
            includeRetention: true
          }
        };

      default:
        return baseParams;
    }
  }
}

export const regulatoryReportingService = new RegulatoryReportingService();
export default regulatoryReportingService;