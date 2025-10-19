// System Monitoring and Alerting Service
import { PrivacyComplyAgent } from '../services/privacy-comply-agent';

export interface SystemMetrics {
  timestamp: Date;
  overallHealth: number;
  serviceHealth: Record<string, boolean>;
  activeRemediations: number;
  criticalIssues: number;
  scanDuration: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export interface AlertingConfig {
  enabled: boolean;
  criticalThreshold: number; // Health score threshold for critical alerts
  warningThreshold: number; // Health score threshold for warning alerts
  maxCriticalIssues: number; // Max critical issues before alerting
  serviceDowngradeThreshold: number; // Percentage of services down before alert
  notificationChannels: string[]; // Email, Slack, etc.
}

/**
 * System Monitor for Privacy Comply Agent
 * Collects metrics, monitors health, and sends alerts
 */
export class SystemMonitor {
  private agent: PrivacyComplyAgent;
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private alertingConfig: AlertingConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(agent: PrivacyComplyAgent, config?: Partial<AlertingConfig>) {
    this.agent = agent;
    this.alertingConfig = {
      enabled: true,
      criticalThreshold: 0.3,
      warningThreshold: 0.6,
      maxCriticalIssues: 5,
      serviceDowngradeThreshold: 0.4,
      notificationChannels: ['console'],
      ...config
    };
  }

  /**
   * Start system monitoring
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.isMonitoring) {
      console.log('System monitoring is already active');
      return;
    }

    console.log('Starting system monitoring...');
    this.isMonitoring = true;

    // Collect initial metrics
    await this.collectMetrics();

    // Schedule periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.evaluateAlerts();
      } catch (error) {
        console.error('System monitoring error:', error);
      }
    }, intervalMs);

    console.log(`System monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop system monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      console.log('System monitoring is not active');
      return;
    }

    console.log('Stopping system monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    console.log('System monitoring stopped');
  }

  /**
   * Collect current system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const startTime = Date.now();
    
    try {
      // Get system status
      const systemStatus = await this.agent.getSystemStatus();
      
      // Get compliance health score
      const healthScore = await this.agent.getComplianceHealthScore();
      
      // Get system resource usage
      const resourceUsage = this.getResourceUsage();
      
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        overallHealth: healthScore.overallScore,
        serviceHealth: systemStatus.services,
        activeRemediations: systemStatus.activeRemediations,
        criticalIssues: healthScore.criticalIssues,
        scanDuration: Date.now() - startTime,
        memoryUsage: resourceUsage.memory,
        cpuUsage: resourceUsage.cpu
      };

      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  /**
   * Evaluate current metrics and generate alerts if needed
   */
  async evaluateAlerts(): Promise<void> {
    if (!this.alertingConfig.enabled) {
      return;
    }

    const latestMetrics = this.getLatestMetrics();
    if (!latestMetrics) {
      return;
    }

    // Check overall health
    await this.checkHealthAlerts(latestMetrics);
    
    // Check service health
    await this.checkServiceAlerts(latestMetrics);
    
    // Check critical issues
    await this.checkCriticalIssueAlerts(latestMetrics);
    
    // Check resource usage
    await this.checkResourceAlerts(latestMetrics);
  }

  private async checkHealthAlerts(metrics: SystemMetrics): Promise<void> {
    const healthScore = metrics.overallHealth;
    
    if (healthScore <= this.alertingConfig.criticalThreshold) {
      await this.createAlert('CRITICAL', 
        `System health critically low: ${(healthScore * 100).toFixed(1)}%`,
        { healthScore, threshold: this.alertingConfig.criticalThreshold }
      );
    } else if (healthScore <= this.alertingConfig.warningThreshold) {
      await this.createAlert('WARNING',
        `System health below warning threshold: ${(healthScore * 100).toFixed(1)}%`,
        { healthScore, threshold: this.alertingConfig.warningThreshold }
      );
    }
  }

  private async checkServiceAlerts(metrics: SystemMetrics): Promise<void> {
    const services = Object.values(metrics.serviceHealth);
    const healthyServices = services.filter(healthy => healthy).length;
    const healthyPercentage = healthyServices / services.length;
    
    if (healthyPercentage <= this.alertingConfig.serviceDowngradeThreshold) {
      await this.createAlert('CRITICAL',
        `Service degradation detected: ${healthyServices}/${services.length} services healthy`,
        { healthyServices, totalServices: services.length, healthyPercentage }
      );
    }
  }

  private async checkCriticalIssueAlerts(metrics: SystemMetrics): Promise<void> {
    if (metrics.criticalIssues > this.alertingConfig.maxCriticalIssues) {
      await this.createAlert('CRITICAL',
        `High number of critical compliance issues: ${metrics.criticalIssues}`,
        { criticalIssues: metrics.criticalIssues, threshold: this.alertingConfig.maxCriticalIssues }
      );
    }
  }

  private async checkResourceAlerts(metrics: SystemMetrics): Promise<void> {
    // Memory usage alert (above 90%)
    if (metrics.memoryUsage > 0.9) {
      await this.createAlert('WARNING',
        `High memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        { memoryUsage: metrics.memoryUsage }
      );
    }
    
    // CPU usage alert (above 80%)
    if (metrics.cpuUsage > 0.8) {
      await this.createAlert('WARNING',
        `High CPU usage: ${(metrics.cpuUsage * 100).toFixed(1)}%`,
        { cpuUsage: metrics.cpuUsage }
      );
    }
  }

  private async createAlert(type: Alert['type'], message: string, metadata?: any): Promise<void> {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.message === message && 
      alert.type === type
    );
    
    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    
    // Send notification
    await this.sendNotification(alert);
    
    console.log(`[${type}] Alert created: ${message}`);
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // Simple console notification - in production would integrate with actual notification services
    for (const channel of this.alertingConfig.notificationChannels) {
      switch (channel) {
        case 'console':
          console.log(`🚨 [${alert.type}] ${alert.message} (${alert.timestamp.toISOString()})`);
          break;
        // Add other notification channels (email, Slack, etc.) here
        default:
          console.log(`Unknown notification channel: ${channel}`);
      }
    }
  }

  private getResourceUsage(): { memory: number; cpu: number } {
    // Simplified resource usage - in production would use actual system metrics
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        memory: memUsage.heapUsed / memUsage.heapTotal,
        cpu: Math.random() * 0.5 // Placeholder - would use actual CPU metrics
      };
    }
    
    return { memory: 0.1, cpu: 0.1 }; // Default values
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    return limit ? this.metrics.slice(-limit) : [...this.metrics];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): Alert[] {
    const sortedAlerts = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      console.log(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * Update alerting configuration
   */
  updateAlertingConfig(config: Partial<AlertingConfig>): void {
    this.alertingConfig = { ...this.alertingConfig, ...config };
    console.log('Alerting configuration updated');
  }

  /**
   * Get current alerting configuration
   */
  getAlertingConfig(): AlertingConfig {
    return { ...this.alertingConfig };
  }
}