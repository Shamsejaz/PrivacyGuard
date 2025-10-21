import { 
  AgentAnalytics, 
  AnalyticsTrend, 
  ResourceUtilization 
} from '../../types/ai-agents';

/**
 * Service for agent analytics and performance monitoring
 */
class AgentAnalyticsService {
  /**
   * Get analytics for a specific agent
   */
  async getAgentAnalytics(
    agentId: string, 
    timeRange: '1h' | '24h' | '7d' | '30d'
  ): Promise<AgentAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Calculate time range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Generate mock analytics data
    const analytics: AgentAnalytics = {
      agentId,
      period: {
        startDate,
        endDate
      },
      metrics: this.generateMetrics(timeRange),
      trends: this.generateTrends(timeRange),
      insights: this.generateInsights(agentId, timeRange)
    };

    return analytics;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    agentId: string,
    timeRange: '1h' | '24h' | '7d' | '30d',
    format: 'csv' | 'json' | 'pdf'
  ): Promise<Blob> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const analytics = await this.getAgentAnalytics(agentId, timeRange);
    
    switch (format) {
      case 'csv':
        return this.exportToCSV(analytics);
      case 'json':
        return this.exportToJSON(analytics);
      case 'pdf':
        return this.exportToPDF(analytics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get comparative analytics for multiple agents
   */
  async getComparativeAnalytics(
    agentIds: string[],
    timeRange: '1h' | '24h' | '7d' | '30d'
  ): Promise<{
    agents: { agentId: string; analytics: AgentAnalytics }[];
    comparison: {
      bestPerforming: string;
      worstPerforming: string;
      averageMetrics: any;
      trends: any;
    };
  }> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const agents = await Promise.all(
      agentIds.map(async agentId => ({
        agentId,
        analytics: await this.getAgentAnalytics(agentId, timeRange)
      }))
    );

    // Calculate comparison metrics
    const comparison = this.calculateComparison(agents);

    return { agents, comparison };
  }

  /**
   * Get real-time metrics for an agent
   */
  async getRealTimeMetrics(agentId: string): Promise<{
    currentLoad: number;
    activeConnections: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
    timestamp: Date;
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      currentLoad: Math.random() * 100,
      activeConnections: Math.floor(Math.random() * 50),
      responseTime: 100 + Math.random() * 500,
      errorRate: Math.random() * 5,
      throughput: Math.random() * 1000,
      timestamp: new Date()
    };
  }

  /**
   * Get agent performance alerts
   */
  async getPerformanceAlerts(agentId: string): Promise<{
    id: string;
    type: 'performance' | 'error' | 'resource' | 'availability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock alerts
    return [
      {
        id: 'alert-1',
        type: 'performance',
        severity: 'medium',
        message: 'Response time increased by 25% in the last hour',
        timestamp: new Date(Date.now() - 3600000),
        resolved: false
      },
      {
        id: 'alert-2',
        type: 'resource',
        severity: 'low',
        message: 'Memory usage above 80%',
        timestamp: new Date(Date.now() - 1800000),
        resolved: true
      }
    ];
  }

  private generateMetrics(timeRange: string): any {
    const baseMetrics = {
      totalTasks: Math.floor(Math.random() * 1000) + 100,
      successfulTasks: 0,
      failedTasks: 0,
      averageResponseTime: 1000 + Math.random() * 2000,
      peakUsage: new Date(Date.now() - Math.random() * 86400000),
      resourceUtilization: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        network: Math.random() * 1000000000, // bytes
        storage: Math.random() * 10000000000 // bytes
      }
    };

    // Calculate success/failure based on total
    const successRate = 0.85 + Math.random() * 0.14; // 85-99% success rate
    baseMetrics.successfulTasks = Math.floor(baseMetrics.totalTasks * successRate);
    baseMetrics.failedTasks = baseMetrics.totalTasks - baseMetrics.successfulTasks;

    return baseMetrics;
  }

  private generateTrends(timeRange: string): AnalyticsTrend[] {
    const trends: AnalyticsTrend[] = [];
    const metrics = ['response_time', 'success_rate', 'throughput', 'error_rate'];

    metrics.forEach(metric => {
      const values = this.generateTrendValues(timeRange);
      const trend = this.calculateTrendDirection(values);
      
      trends.push({
        metric,
        values,
        trend,
        changeRate: this.calculateChangeRate(values)
      });
    });

    return trends;
  }

  private generateTrendValues(timeRange: string): { timestamp: Date; value: number }[] {
    const values: { timestamp: Date; value: number }[] = [];
    const now = new Date();
    let intervals: number;
    let intervalMs: number;

    switch (timeRange) {
      case '1h':
        intervals = 12; // 5-minute intervals
        intervalMs = 5 * 60 * 1000;
        break;
      case '24h':
        intervals = 24; // 1-hour intervals
        intervalMs = 60 * 60 * 1000;
        break;
      case '7d':
        intervals = 7; // 1-day intervals
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case '30d':
        intervals = 30; // 1-day intervals
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      default:
        intervals = 24;
        intervalMs = 60 * 60 * 1000;
    }

    for (let i = intervals - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervalMs));
      const value = Math.random() * 100;
      values.push({ timestamp, value });
    }

    return values;
  }

  private calculateTrendDirection(values: { timestamp: Date; value: number }[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private calculateChangeRate(values: { timestamp: Date; value: number }[]): number {
    if (values.length < 2) return 0;

    const first = values[0].value;
    const last = values[values.length - 1].value;

    return ((last - first) / first) * 100;
  }

  private generateInsights(agentId: string, timeRange: string): string[] {
    const insights = [
      'Agent performance is within normal parameters',
      'Response time has improved by 15% compared to last period',
      'Success rate is above the 95% target threshold',
      'Resource utilization is optimal with room for increased load',
      'No significant anomalies detected in the current period'
    ];

    // Randomly select 2-4 insights
    const selectedInsights = [];
    const count = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * insights.length);
      if (!selectedInsights.includes(insights[randomIndex])) {
        selectedInsights.push(insights[randomIndex]);
      }
    }

    return selectedInsights;
  }

  private calculateComparison(agents: { agentId: string; analytics: AgentAnalytics }[]): any {
    if (agents.length === 0) {
      return {
        bestPerforming: '',
        worstPerforming: '',
        averageMetrics: {},
        trends: {}
      };
    }

    // Find best and worst performing agents based on success rate
    let bestAgent = agents[0];
    let worstAgent = agents[0];

    agents.forEach(agent => {
      const successRate = (agent.analytics.metrics.successfulTasks / agent.analytics.metrics.totalTasks) * 100;
      const bestSuccessRate = (bestAgent.analytics.metrics.successfulTasks / bestAgent.analytics.metrics.totalTasks) * 100;
      const worstSuccessRate = (worstAgent.analytics.metrics.successfulTasks / worstAgent.analytics.metrics.totalTasks) * 100;

      if (successRate > bestSuccessRate) {
        bestAgent = agent;
      }
      if (successRate < worstSuccessRate) {
        worstAgent = agent;
      }
    });

    // Calculate average metrics
    const totalTasks = agents.reduce((sum, agent) => sum + agent.analytics.metrics.totalTasks, 0);
    const totalSuccessful = agents.reduce((sum, agent) => sum + agent.analytics.metrics.successfulTasks, 0);
    const totalFailed = agents.reduce((sum, agent) => sum + agent.analytics.metrics.failedTasks, 0);
    const avgResponseTime = agents.reduce((sum, agent) => sum + agent.analytics.metrics.averageResponseTime, 0) / agents.length;

    return {
      bestPerforming: bestAgent.agentId,
      worstPerforming: worstAgent.agentId,
      averageMetrics: {
        totalTasks: Math.floor(totalTasks / agents.length),
        successfulTasks: Math.floor(totalSuccessful / agents.length),
        failedTasks: Math.floor(totalFailed / agents.length),
        averageResponseTime: Math.floor(avgResponseTime),
        successRate: (totalSuccessful / totalTasks) * 100
      },
      trends: {
        improving: agents.filter(agent => 
          agent.analytics.trends.some(trend => trend.trend === 'increasing' && trend.metric === 'success_rate')
        ).length,
        declining: agents.filter(agent => 
          agent.analytics.trends.some(trend => trend.trend === 'decreasing' && trend.metric === 'success_rate')
        ).length
      }
    };
  }

  private exportToCSV(analytics: AgentAnalytics): Blob {
    const csvContent = [
      'Metric,Value',
      `Total Tasks,${analytics.metrics.totalTasks}`,
      `Successful Tasks,${analytics.metrics.successfulTasks}`,
      `Failed Tasks,${analytics.metrics.failedTasks}`,
      `Average Response Time,${analytics.metrics.averageResponseTime}ms`,
      `CPU Utilization,${analytics.metrics.resourceUtilization.cpu.toFixed(2)}%`,
      `Memory Utilization,${analytics.metrics.resourceUtilization.memory.toFixed(2)}%`
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  private exportToJSON(analytics: AgentAnalytics): Blob {
    const jsonContent = JSON.stringify(analytics, null, 2);
    return new Blob([jsonContent], { type: 'application/json' });
  }

  private exportToPDF(analytics: AgentAnalytics): Blob {
    // Simplified PDF export (in real implementation, use a PDF library)
    const pdfContent = `
      Agent Analytics Report
      Agent ID: ${analytics.agentId}
      Period: ${analytics.period.startDate.toISOString()} - ${analytics.period.endDate.toISOString()}
      
      Metrics:
      - Total Tasks: ${analytics.metrics.totalTasks}
      - Successful Tasks: ${analytics.metrics.successfulTasks}
      - Failed Tasks: ${analytics.metrics.failedTasks}
      - Average Response Time: ${analytics.metrics.averageResponseTime}ms
      
      Resource Utilization:
      - CPU: ${analytics.metrics.resourceUtilization.cpu.toFixed(2)}%
      - Memory: ${analytics.metrics.resourceUtilization.memory.toFixed(2)}%
      
      Insights:
      ${analytics.insights.map(insight => `- ${insight}`).join('\n')}
    `;

    return new Blob([pdfContent], { type: 'application/pdf' });
  }
}

export const agentAnalyticsService = new AgentAnalyticsService();