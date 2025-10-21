import { ComplianceFramework } from '../types/compliance';
import { complianceReportingService, ReportTemplate, GeneratedReport } from './complianceReportingService';
import { complianceAnalyticsService, ComplianceMetric, TrendAnalysis, ComplianceKPI } from './complianceAnalyticsService';

export interface DashboardData {
  executiveMetrics: ExecutiveMetric[];
  frameworkScores: FrameworkScore[];
  topRisks: RiskItem[];
  recentReports: GeneratedReport[];
  complianceTrends: ComplianceTrends;
  keyInsights: DashboardInsight[];
  upcomingDeadlines: Deadline[];
  performanceIndicators: ComplianceKPI[];
}

export interface ExecutiveMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  icon: string;
  description?: string;
}

export interface FrameworkScore {
  framework: ComplianceFramework;
  score: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  change: number;
  requirements: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
  };
}

export interface RiskItem {
  id: string;
  framework: ComplianceFramework;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  impact: string;
  mitigation: string;
  owner: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ComplianceTrends {
  overall: TrendData;
  frameworks: Record<ComplianceFramework, TrendData>;
  forecast: ForecastPoint[];
}

export interface TrendData {
  current: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

export interface ForecastPoint {
  date: Date;
  framework: ComplianceFramework | 'overall';
  predictedScore: number;
  confidence: number;
}

export interface DashboardInsight {
  id: string;
  type: 'achievement' | 'risk' | 'opportunity' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation?: string;
  framework?: ComplianceFramework;
  impact: number;
  actionRequired: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  framework: ComplianceFramework;
  type: 'regulatory' | 'internal' | 'audit';
  dueDate: Date;
  status: 'on_track' | 'at_risk' | 'overdue';
  owner: string;
  description: string;
}

class ComplianceDashboardService {
  async getDashboardData(period: { start: Date; end: Date }): Promise<DashboardData> {
    try {
      // Fetch data from multiple services in parallel
      const [
        metrics,
        trends,
        kpis,
        reports,
        insights
      ] = await Promise.all([
        complianceAnalyticsService.getMetrics({
          period,
          granularity: 'monthly'
        }),
        this.getComplianceTrends(period),
        complianceAnalyticsService.getKPIs(),
        complianceReportingService.getGeneratedReports({
          dateRange: period
        }),
        complianceAnalyticsService.getInsights()
      ]);

      return {
        executiveMetrics: this.buildExecutiveMetrics(metrics, kpis),
        frameworkScores: this.buildFrameworkScores(metrics),
        topRisks: this.getTopRisks(),
        recentReports: reports.slice(0, 5),
        complianceTrends: trends,
        keyInsights: this.transformInsights(insights),
        upcomingDeadlines: this.getUpcomingDeadlines(),
        performanceIndicators: kpis
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return this.getMockDashboardData();
    }
  }  private 
async getComplianceTrends(period: { start: Date; end: Date }): Promise<ComplianceTrends> {
    const frameworks: ComplianceFramework[] = ['GDPR', 'PDPL', 'HIPAA', 'CCPA'];
    
    const [overallTrend, ...frameworkTrends] = await Promise.all([
      complianceAnalyticsService.getTrendAnalysis('overall', period),
      ...frameworks.map(fw => complianceAnalyticsService.getTrendAnalysis(fw, period))
    ]);

    const forecast = await complianceAnalyticsService.getForecast('overall', 6);

    return {
      overall: {
        current: 78,
        change: overallTrend.changeRate,
        trend: overallTrend.trend === 'improving' ? 'up' : overallTrend.trend === 'declining' ? 'down' : 'stable',
        confidence: overallTrend.confidence
      },
      frameworks: frameworks.reduce((acc, fw, index) => {
        const trend = frameworkTrends[index];
        acc[fw] = {
          current: trend.forecast[0]?.predictedScore || 75,
          change: trend.changeRate,
          trend: trend.trend === 'improving' ? 'up' : trend.trend === 'declining' ? 'down' : 'stable',
          confidence: trend.confidence
        };
        return acc;
      }, {} as Record<ComplianceFramework, TrendData>),
      forecast: forecast.map(f => ({
        date: f.date,
        framework: 'overall' as const,
        predictedScore: f.predictedScore,
        confidence: f.confidence
      }))
    };
  }

  private buildExecutiveMetrics(metrics: ComplianceMetric[], kpis: ComplianceKPI[]): ExecutiveMetric[] {
    const latestOverallMetric = metrics.find(m => m.framework === 'overall');
    const overallScore = latestOverallMetric?.score || 78;
    
    return [
      {
        id: 'overall_compliance',
        title: 'Overall Compliance Score',
        value: `${Math.round(overallScore)}%`,
        change: 5.2,
        trend: 'up',
        status: overallScore >= 80 ? 'good' : overallScore >= 60 ? 'warning' : 'critical',
        icon: 'Shield',
        description: 'Weighted average across all compliance frameworks'
      },
      {
        id: 'critical_risks',
        title: 'Critical Risks',
        value: 3,
        change: -2,
        trend: 'down',
        status: 'good',
        icon: 'AlertTriangle',
        description: 'High-priority compliance risks requiring immediate attention'
      },
      {
        id: 'overdue_items',
        title: 'Overdue Items',
        value: 8,
        change: 1,
        trend: 'up',
        status: 'critical',
        icon: 'Calendar',
        description: 'Compliance tasks past their due date'
      },
      {
        id: 'compliance_roi',
        title: 'Compliance ROI',
        value: '$2.4M',
        change: 12.5,
        trend: 'up',
        status: 'good',
        icon: 'Target',
        description: 'Return on investment from compliance initiatives'
      }
    ];
  }

  private buildFrameworkScores(metrics: ComplianceMetric[]): FrameworkScore[] {
    const frameworks: ComplianceFramework[] = ['GDPR', 'PDPL', 'HIPAA', 'CCPA'];
    
    return frameworks.map(framework => {
      const metric = metrics.find(m => m.framework === framework);
      const score = metric?.score || 75;
      const target = framework === 'HIPAA' ? 90 : 85;
      
      return {
        framework,
        score: Math.round(score),
        target,
        status: score >= target * 0.9 ? 'good' : score >= target * 0.7 ? 'warning' : 'critical',
        change: Math.random() * 6 - 1, // Mock change data
        requirements: metric?.requirements || {
          total: 100,
          compliant: Math.floor(score),
          partial: Math.floor((100 - score) * 0.6),
          nonCompliant: Math.floor((100 - score) * 0.4)
        }
      };
    });
  }

  private getTopRisks(): RiskItem[] {
    return [
      {
        id: '1',
        framework: 'GDPR',
        title: 'Inadequate consent management for marketing activities',
        description: 'Current consent collection mechanisms do not meet GDPR granularity requirements',
        severity: 'high',
        likelihood: 'medium',
        impact: 'Potential fines up to €20M or 4% of annual revenue',
        mitigation: 'Implement granular consent controls and audit trail',
        owner: 'Marketing Team',
        dueDate: new Date('2024-03-15'),
        status: 'in_progress'
      },
      {
        id: '2',
        framework: 'HIPAA',
        title: 'Insufficient access controls for patient data',
        description: 'Role-based access controls not properly implemented for PHI access',
        severity: 'critical',
        likelihood: 'high',
        impact: 'OCR investigation and potential penalties',
        mitigation: 'Deploy comprehensive RBAC system with audit logging',
        owner: 'IT Security',
        dueDate: new Date('2024-02-28'),
        status: 'open'
      },
      {
        id: '3',
        framework: 'PDPL',
        title: 'Cross-border data transfer without adequate safeguards',
        description: 'Data transfers to third countries lack proper adequacy decisions or SCCs',
        severity: 'medium',
        likelihood: 'medium',
        impact: 'Regulatory investigation and transfer restrictions',
        mitigation: 'Implement Standard Contractual Clauses and transfer impact assessments',
        owner: 'Legal Team',
        dueDate: new Date('2024-04-01'),
        status: 'open'
      }
    ];
  }  pri
vate transformInsights(analyticsInsights: any[]): DashboardInsight[] {
    return analyticsInsights.map((insight, index) => ({
      id: `insight_${index}`,
      type: insight.type === 'positive' ? 'achievement' : 
            insight.type === 'negative' ? 'risk' : 
            insight.type === 'warning' ? 'risk' : 'trend',
      priority: insight.priority,
      title: insight.title,
      description: insight.description,
      recommendation: insight.recommendation,
      framework: insight.framework,
      impact: insight.impact,
      actionRequired: insight.type === 'negative' || insight.type === 'warning'
    }));
  }

  private getUpcomingDeadlines(): Deadline[] {
    return [
      {
        id: '1',
        title: 'GDPR Article 30 Records Update',
        framework: 'GDPR',
        type: 'regulatory',
        dueDate: new Date('2024-03-01'),
        status: 'on_track',
        owner: 'DPO Team',
        description: 'Annual update of Records of Processing Activities'
      },
      {
        id: '2',
        title: 'HIPAA Risk Assessment',
        framework: 'HIPAA',
        type: 'regulatory',
        dueDate: new Date('2024-03-15'),
        status: 'at_risk',
        owner: 'Security Team',
        description: 'Comprehensive HIPAA security risk assessment'
      },
      {
        id: '3',
        title: 'CCPA Consumer Rights Audit',
        framework: 'CCPA',
        type: 'internal',
        dueDate: new Date('2024-02-28'),
        status: 'overdue',
        owner: 'Compliance Team',
        description: 'Audit of consumer rights request processing'
      }
    ];
  }

  async exportDashboardData(format: 'json' | 'csv' | 'pdf', period: { start: Date; end: Date }): Promise<Blob> {
    const data = await this.getDashboardData(period);
    
    if (format === 'json') {
      const jsonData = JSON.stringify(data, null, 2);
      return new Blob([jsonData], { type: 'application/json' });
    }
    
    if (format === 'csv') {
      const csvData = this.convertToCSV(data);
      return new Blob([csvData], { type: 'text/csv' });
    }
    
    // For PDF, we would typically use a service or library
    throw new Error('PDF export not implemented');
  }

  private convertToCSV(data: DashboardData): string {
    const headers = ['Metric', 'Value', 'Change', 'Status', 'Framework'];
    const rows = [headers.join(',')];
    
    // Add executive metrics
    data.executiveMetrics.forEach(metric => {
      rows.push([
        metric.title,
        metric.value.toString(),
        `${metric.change}%`,
        metric.status,
        'Overall'
      ].join(','));
    });
    
    // Add framework scores
    data.frameworkScores.forEach(score => {
      rows.push([
        'Compliance Score',
        `${score.score}%`,
        `${score.change}%`,
        score.status,
        score.framework
      ].join(','));
    });
    
    return rows.join('\n');
  }

  private getMockDashboardData(): DashboardData {
    return {
      executiveMetrics: this.buildExecutiveMetrics([], []),
      frameworkScores: this.buildFrameworkScores([]),
      topRisks: this.getTopRisks(),
      recentReports: [],
      complianceTrends: {
        overall: { current: 78, change: 5.2, trend: 'up', confidence: 85 },
        frameworks: {
          GDPR: { current: 82, change: 3.1, trend: 'up', confidence: 88 },
          PDPL: { current: 75, change: 2.8, trend: 'up', confidence: 82 },
          HIPAA: { current: 88, change: 1.5, trend: 'up', confidence: 92 },
          CCPA: { current: 70, change: -1.2, trend: 'down', confidence: 78 }
        },
        forecast: []
      },
      keyInsights: [],
      upcomingDeadlines: this.getUpcomingDeadlines(),
      performanceIndicators: []
    };
  }

  async scheduleAutomatedReport(templateId: string, schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'html';
  }): Promise<void> {
    return complianceReportingService.scheduleReport(templateId, {
      frequency: schedule.frequency,
      time: '09:00',
      timezone: 'UTC'
    });
  }

  async generateExecutiveReport(period: { start: Date; end: Date }): Promise<GeneratedReport> {
    // Create a temporary executive report template
    const template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Executive Compliance Dashboard Report',
      framework: 'all',
      type: 'executive',
      frequency: 'on_demand',
      format: 'pdf',
      sections: [
        { id: '1', name: 'Executive Summary', type: 'executive_summary', enabled: true },
        { id: '2', name: 'Key Metrics', type: 'metrics', enabled: true },
        { id: '3', name: 'Framework Performance', type: 'compliance_status', enabled: true },
        { id: '4', name: 'Risk Analysis', type: 'risk_assessment', enabled: true },
        { id: '5', name: 'Trend Analysis', type: 'trend_analysis', enabled: true },
        { id: '6', name: 'Recommendations', type: 'recommendations', enabled: true }
      ],
      recipients: [],
      isActive: true,
      createdBy: 'system'
    };

    const createdTemplate = await complianceReportingService.createTemplate(template);
    return complianceReportingService.generateReport(createdTemplate.id, { period });
  }
}

export const complianceDashboardService = new ComplianceDashboardService();