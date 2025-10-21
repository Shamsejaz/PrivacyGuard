import { ComplianceFramework } from '../types/compliance';

export interface ReportTemplate {
  id: string;
  name: string;
  framework: ComplianceFramework | 'all';
  type: 'regulatory' | 'internal' | 'audit' | 'executive';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  format: 'pdf' | 'excel' | 'word' | 'html' | 'json';
  sections: ReportSection[];
  recipients: string[];
  isActive: boolean;
  schedule?: ReportSchedule;
  lastGenerated?: Date;
  nextScheduled?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  name: string;
  type: 'executive_summary' | 'compliance_status' | 'risk_assessment' | 'gap_analysis' | 'trend_analysis' | 'recommendations' | 'metrics' | 'charts';
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface ReportSchedule {
  frequency: ReportTemplate['frequency'];
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  timezone: string;
  endDate?: Date;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  templateName: string;
  framework: ComplianceFramework | 'all';
  generatedDate: Date;
  status: 'generating' | 'completed' | 'failed' | 'cancelled';
  format: ReportTemplate['format'];
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalRequirements: number;
    compliantRequirements: number;
    overallScore: number;
    criticalGaps: number;
  };
  frameworks: Record<ComplianceFramework, {
    score: number;
    requirements: number;
    gaps: number;
  }>;
  generationTime: number; // milliseconds
}

export interface ReportAnalytics {
  totalReports: number;
  reportsThisMonth: number;
  averageGenerationTime: number;
  mostRequestedFramework: ComplianceFramework;
  popularFormats: Record<string, number>;
  scheduledReports: number;
  failureRate: number;
}

class ComplianceReportingService {
  private baseUrl = '/api/compliance/reports';

  // Template Management
  async getTemplates(): Promise<ReportTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching report templates:', error);
      return this.getMockTemplates();
    }
  }

  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (!response.ok) throw new Error('Failed to create template');
      return await response.json();
    } catch (error) {
      console.error('Error creating report template:', error);
      throw error;
    }
  }

  async updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update template');
      return await response.json();
    } catch (error) {
      console.error('Error updating report template:', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');
    } catch (error) {
      console.error('Error deleting report template:', error);
      throw error;
    }
  }

  // Report Generation
  async generateReport(templateId: string, options?: {
    period?: { start: Date; end: Date };
    format?: ReportTemplate['format'];
    recipients?: string[];
  }): Promise<GeneratedReport> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, ...options })
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return await response.json();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async getGeneratedReports(filters?: {
    framework?: ComplianceFramework;
    status?: GeneratedReport['status'];
    dateRange?: { start: Date; end: Date };
  }): Promise<GeneratedReport[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.framework) params.append('framework', filters.framework);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }

      const response = await fetch(`${this.baseUrl}/generated?${params}`);
      if (!response.ok) throw new Error('Failed to fetch generated reports');
      return await response.json();
    } catch (error) {
      console.error('Error fetching generated reports:', error);
      return this.getMockGeneratedReports();
    }
  }

  async downloadReport(reportId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/download/${reportId}`);
      if (!response.ok) throw new Error('Failed to download report');
      return await response.blob();
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  // Scheduling
  async scheduleReport(templateId: string, schedule: ReportSchedule): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, schedule })
      });
      if (!response.ok) throw new Error('Failed to schedule report');
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  }

  async getScheduledReports(): Promise<Array<{
    id: string;
    templateId: string;
    templateName: string;
    framework: ComplianceFramework | 'all';
    nextRun: Date;
    schedule: ReportSchedule;
    isActive: boolean;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/scheduled`);
      if (!response.ok) throw new Error('Failed to fetch scheduled reports');
      return await response.json();
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      return [];
    }
  }

  async cancelScheduledReport(scheduleId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/scheduled/${scheduleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to cancel scheduled report');
    } catch (error) {
      console.error('Error cancelling scheduled report:', error);
      throw error;
    }
  }

  // Analytics
  async getReportAnalytics(period?: { start: Date; end: Date }): Promise<ReportAnalytics> {
    try {
      const params = new URLSearchParams();
      if (period) {
        params.append('startDate', period.start.toISOString());
        params.append('endDate', period.end.toISOString());
      }

      const response = await fetch(`${this.baseUrl}/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report analytics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching report analytics:', error);
      return this.getMockAnalytics();
    }
  }

  // Export and Import
  async exportTemplate(templateId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}/export`);
      if (!response.ok) throw new Error('Failed to export template');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting template:', error);
      throw error;
    }
  }

  async importTemplate(file: File): Promise<ReportTemplate> {
    try {
      const formData = new FormData();
      formData.append('template', file);

      const response = await fetch(`${this.baseUrl}/templates/import`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to import template');
      return await response.json();
    } catch (error) {
      console.error('Error importing template:', error);
      throw error;
    }
  }

  // Mock data for development
  private getMockTemplates(): ReportTemplate[] {
    return [
      {
        id: '1',
        name: 'Executive Compliance Summary',
        framework: 'all',
        type: 'executive',
        frequency: 'monthly',
        format: 'pdf',
        sections: [
          { id: '1', name: 'Executive Summary', type: 'executive_summary', enabled: true },
          { id: '2', name: 'Compliance Status', type: 'compliance_status', enabled: true },
          { id: '3', name: 'Risk Assessment', type: 'risk_assessment', enabled: true },
          { id: '4', name: 'Trend Analysis', type: 'trend_analysis', enabled: true }
        ],
        recipients: ['ceo@company.com', 'dpo@company.com'],
        isActive: true,
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 1,
          time: '09:00',
          timezone: 'UTC'
        },
        lastGenerated: new Date('2024-01-01'),
        nextScheduled: new Date('2024-02-01'),
        createdBy: 'admin',
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2024-01-15')
      }
    ];
  }

  private getMockGeneratedReports(): GeneratedReport[] {
    return [
      {
        id: '1',
        templateId: '1',
        templateName: 'Executive Compliance Summary',
        framework: 'all',
        generatedDate: new Date('2024-01-01'),
        status: 'completed',
        format: 'pdf',
        fileSize: 2457600, // 2.4 MB
        downloadUrl: '/reports/executive-summary-jan-2024.pdf',
        metadata: {
          period: {
            start: new Date('2023-12-01'),
            end: new Date('2023-12-31')
          },
          metrics: {
            totalRequirements: 464,
            compliantRequirements: 367,
            overallScore: 79,
            criticalGaps: 6
          },
          frameworks: {
            GDPR: { score: 82, requirements: 156, gaps: 8 },
            PDPL: { score: 75, requirements: 98, gaps: 12 },
            HIPAA: { score: 88, requirements: 134, gaps: 4 },
            CCPA: { score: 70, requirements: 76, gaps: 15 }
          },
          generationTime: 15000
        }
      }
    ];
  }

  private getMockAnalytics(): ReportAnalytics {
    return {
      totalReports: 156,
      reportsThisMonth: 23,
      averageGenerationTime: 12000,
      mostRequestedFramework: 'GDPR',
      popularFormats: {
        pdf: 89,
        excel: 45,
        html: 22
      },
      scheduledReports: 12,
      failureRate: 2.1
    };
  }
}

export const complianceReportingService = new ComplianceReportingService();