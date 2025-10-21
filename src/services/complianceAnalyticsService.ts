import { ComplianceFramework } from '../types/compliance';

export interface ComplianceMetric {
  framework: ComplianceFramework | 'overall';
  date: Date;
  score: number;
  requirements: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
  };
  gaps: number;
  risks: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface TrendAnalysis {
  framework: ComplianceFramework | 'overall';
  period: { start: Date; end: Date };
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number; // percentage change
  confidence: number; // 0-100
  forecast: ForecastData[];
  insights: AnalyticsInsight[];
}

export interface ForecastData {
  date: Date;
  predictedScore: number;
  confidence: number;
  factors: string[];
}

export interface AnalyticsInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation?: string;
  impact: number; // 1-10 scale
  framework?: ComplianceFramework;
}

export interface ComplianceKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'on_track' | 'at_risk' | 'off_track';
}

class ComplianceAnalyticsService {
  private baseUrl = '/api/compliance/analytics';

  async getMetrics(options: {
    frameworks?: ComplianceFramework[];
    period: { start: Date; end: Date };
    granularity?: 'daily' | 'weekly' | 'monthly';
  }): Promise<ComplianceMetric[]> {
    try {
      const params = new URLSearchParams({
        startDate: options.period.start.toISOString(),
        endDate: options.period.end.toISOString(),
        granularity: options.granularity || 'monthly'
      });
      
      if (options.frameworks) {
        options.frameworks.forEach(fw => params.append('frameworks', fw));
      }

      const response = await fetch(`${this.baseUrl}/metrics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      return this.getMockMetrics(options);
    }
  }  
async getTrendAnalysis(framework: ComplianceFramework | 'overall', period: { start: Date; end: Date }): Promise<TrendAnalysis> {
    try {
      const params = new URLSearchParams({
        framework,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString()
      });

      const response = await fetch(`${this.baseUrl}/trends?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trend analysis');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      return this.getMockTrendAnalysis(framework, period);
    }
  }

  async getForecast(framework: ComplianceFramework | 'overall', months: number = 6): Promise<ForecastData[]> {
    try {
      const params = new URLSearchParams({
        framework,
        months: months.toString()
      });

      const response = await fetch(`${this.baseUrl}/forecast?${params}`);
      if (!response.ok) throw new Error('Failed to fetch forecast');
      return await response.json();
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return this.getMockForecast(framework, months);
    }
  }

  async getInsights(frameworks?: ComplianceFramework[]): Promise<AnalyticsInsight[]> {
    try {
      const params = new URLSearchParams();
      if (frameworks) {
        frameworks.forEach(fw => params.append('frameworks', fw));
      }

      const response = await fetch(`${this.baseUrl}/insights?${params}`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      return await response.json();
    } catch (error) {
      console.error('Error fetching insights:', error);
      return this.getMockInsights();
    }
  }

  async getKPIs(framework?: ComplianceFramework): Promise<ComplianceKPI[]> {
    try {
      const params = new URLSearchParams();
      if (framework) params.append('framework', framework);

      const response = await fetch(`${this.baseUrl}/kpis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      return this.getMockKPIs();
    }
  }

  async generateReport(type: 'executive' | 'detailed' | 'trends', options: {
    frameworks?: ComplianceFramework[];
    period: { start: Date; end: Date };
    format: 'json' | 'csv' | 'pdf';
  }): Promise<Blob | object> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      if (options.format === 'json') {
        return await response.json();
      } else {
        return await response.blob();
      }
    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }

  // Mock data methods
  private getMockMetrics(options: any): ComplianceMetric[] {
    const frameworks: (ComplianceFramework | 'overall')[] = options.frameworks || ['GDPR', 'PDPL', 'HIPAA', 'CCPA', 'overall'];
    const metrics: ComplianceMetric[] = [];
    
    const startDate = new Date(options.period.start);
    const endDate = new Date(options.period.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      frameworks.forEach(framework => {
        const baseScore = framework === 'overall' ? 78 : 
                         framework === 'GDPR' ? 82 :
                         framework === 'PDPL' ? 75 :
                         framework === 'HIPAA' ? 88 : 70;
        
        metrics.push({
          framework,
          date: new Date(d),
          score: baseScore + Math.random() * 10 - 5,
          requirements: {
            total: 100,
            compliant: Math.floor(baseScore),
            partial: Math.floor((100 - baseScore) * 0.6),
            nonCompliant: Math.floor((100 - baseScore) * 0.4)
          },
          gaps: Math.floor(Math.random() * 15),
          risks: {
            critical: Math.floor(Math.random() * 3),
            high: Math.floor(Math.random() * 8),
            medium: Math.floor(Math.random() * 15),
            low: Math.floor(Math.random() * 25)
          }
        });
      });
    }
    
    return metrics;
  } 
 private getMockTrendAnalysis(framework: ComplianceFramework | 'overall', period: { start: Date; end: Date }): TrendAnalysis {
    const changeRate = Math.random() * 10 - 2; // -2% to +8%
    const trend = changeRate > 2 ? 'improving' : changeRate < -1 ? 'declining' : 'stable';
    
    return {
      framework,
      period,
      trend,
      changeRate,
      confidence: 75 + Math.random() * 20,
      forecast: this.getMockForecast(framework, 6),
      insights: this.getMockInsights().filter(insight => 
        !insight.framework || insight.framework === framework
      ).slice(0, 3)
    };
  }

  private getMockForecast(framework: ComplianceFramework | 'overall', months: number): ForecastData[] {
    const forecast: ForecastData[] = [];
    const baseScore = framework === 'overall' ? 78 : 
                     framework === 'GDPR' ? 82 :
                     framework === 'PDPL' ? 75 :
                     framework === 'HIPAA' ? 88 : 70;
    
    for (let i = 1; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      forecast.push({
        date,
        predictedScore: Math.min(100, baseScore + (i * 1.5) + Math.random() * 5),
        confidence: Math.max(60, 90 - (i * 5)),
        factors: ['Historical trends', 'Planned improvements', 'Resource allocation']
      });
    }
    
    return forecast;
  }

  private getMockInsights(): AnalyticsInsight[] {
    return [
      {
        type: 'positive',
        priority: 'high',
        title: 'GDPR Compliance Trending Upward',
        description: 'GDPR compliance has improved by 8% over the last quarter due to enhanced data mapping initiatives.',
        recommendation: 'Continue current data mapping efforts and expand to other frameworks.',
        impact: 8,
        framework: 'GDPR'
      },
      {
        type: 'warning',
        priority: 'high',
        title: 'CCPA Compliance Below Target',
        description: 'CCPA compliance is 15 points below target, primarily due to consumer rights automation gaps.',
        recommendation: 'Prioritize consumer rights automation and data portability workflows.',
        impact: 7,
        framework: 'CCPA'
      },
      {
        type: 'neutral',
        priority: 'medium',
        title: 'Seasonal Compliance Patterns Detected',
        description: 'Analysis shows compliance scores typically dip in Q4 due to resource allocation to other priorities.',
        recommendation: 'Plan additional compliance resources for Q4 to maintain momentum.',
        impact: 5
      },
      {
        type: 'positive',
        priority: 'medium',
        title: 'Cost Efficiency Improvements',
        description: 'Automation initiatives have reduced compliance costs by 15% while maintaining quality.',
        recommendation: 'Expand automation to additional compliance processes.',
        impact: 6
      }
    ];
  }

  private getMockKPIs(): ComplianceKPI[] {
    return [
      {
        id: 'overall_score',
        name: 'Overall Compliance Score',
        value: 78,
        target: 85,
        unit: '%',
        trend: 'up',
        change: 5.2,
        status: 'on_track'
      },
      {
        id: 'critical_gaps',
        name: 'Critical Compliance Gaps',
        value: 6,
        target: 0,
        unit: 'gaps',
        trend: 'down',
        change: -2,
        status: 'on_track'
      },
      {
        id: 'time_to_resolution',
        name: 'Average Gap Resolution Time',
        value: 14,
        target: 10,
        unit: 'days',
        trend: 'down',
        change: -3,
        status: 'at_risk'
      },
      {
        id: 'compliance_cost',
        name: 'Compliance Cost per Requirement',
        value: 1250,
        target: 1000,
        unit: 'USD',
        trend: 'down',
        change: -8.5,
        status: 'on_track'
      }
    ];
  }
}

export const complianceAnalyticsService = new ComplianceAnalyticsService();