// Main Privacy Comply Agent Service
import {
  PrivacyRiskDetector,
  ComplianceReasoningEngine,
  RemediationAutomationService,
  ComplianceReportingService,
  NaturalLanguageInterface
} from './';
import {
  ComplianceFinding,
  ComplianceAssessment,
  RemediationResult,
  ComplianceReport,
  QueryResponse,
  ConversationContext,
  AgentConfiguration
} from '../types';
import { SystemMonitor } from '../monitoring/system-monitor';
import { performanceMetrics, measurePerformance } from '../monitoring/performance-metrics';

/**
 * Main Privacy Comply Agent
 * Orchestrates all privacy compliance operations and services
 */
export interface PrivacyComplyAgent {
  /**
   * Initialize the agent with all required services
   */
  initialize(): Promise<void>;

  /**
   * Run a complete compliance scan and assessment
   * Detects risks, analyzes them, and generates recommendations
   */
  runComplianceScan(): Promise<{
    findings: ComplianceFinding[];
    assessments: ComplianceAssessment[];
    recommendations: any[];
  }>;

  /**
   * Execute automated remediation for high-priority findings
   * Automatically fixes issues that can be safely remediated
   */
  executeAutomatedRemediation(findingIds?: string[]): Promise<RemediationResult[]>;

  /**
   * Generate comprehensive compliance report
   * Creates detailed documentation of compliance status
   */
  generateComplianceReport(type: 'DPIA' | 'ROPA' | 'AUDIT' | 'SUMMARY'): Promise<ComplianceReport>;

  /**
   * Process natural language query about compliance
   * Provides conversational interface to compliance information
   */
  processQuery(query: string, context?: ConversationContext): Promise<QueryResponse>;

  /**
   * Get overall compliance health score
   */
  getComplianceHealthScore(): Promise<{
    overallScore: number;
    categoryScores: Record<string, number>;
    trends: any[];
    criticalIssues: number;
  }>;

  /**
   * Get system status and health
   */
  getSystemStatus(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    services: Record<string, boolean>;
    lastScan: Date;
    nextScan: Date;
    activeRemediations: number;
  }>;

  /**
   * Start continuous compliance monitoring
   */
  startMonitoring(): Promise<void>;

  /**
   * Stop continuous compliance monitoring
   */
  stopMonitoring(): Promise<void>;

  /**
   * Update agent configuration
   */
  updateConfiguration(config: any): Promise<void>;

  /**
   * Get agent configuration
   */
  getConfiguration(): Promise<any>;

  /**
   * Shutdown the agent gracefully
   */
  shutdown(): Promise<void>;
}

/**
 * Implementation class for Privacy Comply Agent
 */
export class PrivacyComplyAgentImpl implements PrivacyComplyAgent {
  private riskDetector: PrivacyRiskDetector;
  private reasoningEngine: ComplianceReasoningEngine;
  private remediationService: RemediationAutomationService;
  private reportingService: ComplianceReportingService;
  private nlInterface: NaturalLanguageInterface;
  private initialized = false;
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private configuration: AgentConfiguration;
  private lastScanTime?: Date;
  private nextScanTime?: Date;
  private activeRemediations: Set<string> = new Set();
  private systemMonitor?: SystemMonitor;

  constructor(
    riskDetector: PrivacyRiskDetector,
    reasoningEngine: ComplianceReasoningEngine,
    remediationService: RemediationAutomationService,
    reportingService: ComplianceReportingService,
    nlInterface: NaturalLanguageInterface,
    config?: Partial<AgentConfiguration>
  ) {
    this.riskDetector = riskDetector;
    this.reasoningEngine = reasoningEngine;
    this.remediationService = remediationService;
    this.reportingService = reportingService;
    this.nlInterface = nlInterface;
    
    // Default configuration
    this.configuration = {
      scanInterval: 3600000, // 1 hour in milliseconds
      autoRemediation: true,
      maxConcurrentRemediations: 5,
      riskThreshold: 0.7,
      enableContinuousMonitoring: true,
      retryAttempts: 3,
      retryDelay: 5000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Privacy Comply Agent...');
      
      // Initialize all services
      await this.initializeServices();
      
      // Validate system readiness
      await this.validateSystemReadiness();
      
      this.initialized = true;
      console.log('Privacy Comply Agent initialized successfully');
      
      // Initialize system monitor
      this.systemMonitor = new SystemMonitor(this);
      
      // Start monitoring if enabled
      if (this.configuration.enableContinuousMonitoring) {
        await this.startMonitoring();
        await this.systemMonitor.startMonitoring();
      }
    } catch (error) {
      console.error('Failed to initialize Privacy Comply Agent:', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Services are already injected via constructor
    // This method can be extended for service-specific initialization
    console.log('Services initialized via dependency injection');
  }

  private async validateSystemReadiness(): Promise<void> {
    const issues: string[] = [];
    
    // Check if all required services are available
    if (!this.riskDetector) issues.push('Risk Detector not available');
    if (!this.reasoningEngine) issues.push('Reasoning Engine not available');
    if (!this.remediationService) issues.push('Remediation Service not available');
    if (!this.reportingService) issues.push('Reporting Service not available');
    if (!this.nlInterface) issues.push('Natural Language Interface not available');
    
    if (issues.length > 0) {
      throw new Error(`System readiness validation failed: ${issues.join(', ')}`);
    }
  }

  async runComplianceScan(): Promise<{
    findings: ComplianceFinding[];
    assessments: ComplianceAssessment[];
    recommendations: any[];
  }> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log('Starting comprehensive compliance scan...');
    this.lastScanTime = new Date();
    const scanStartTime = Date.now();
    
    // Track operation performance
    const operationId = `compliance-scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    performanceMetrics.startOperation(operationId, 'compliance-scan');
    
    try {
      // Step 1: Detect privacy risks across AWS environment
      const findings = await this.detectPrivacyRisks();
      console.log(`Detected ${findings.length} compliance findings`);

      // Step 2: Analyze findings using AI reasoning
      const assessments = await this.analyzeFindings(findings);
      console.log(`Generated ${assessments.length} compliance assessments`);

      // Step 3: Generate remediation recommendations
      const recommendations = await this.generateRecommendations(assessments);
      console.log(`Generated ${recommendations.length} remediation recommendations`);

      // Update next scan time
      this.nextScanTime = new Date(Date.now() + this.configuration.scanInterval);

      // Record performance metrics
      const scanDuration = Date.now() - scanStartTime;
      performanceMetrics.recordComplianceScanMetrics(
        findings.length,
        assessments.length,
        recommendations.length,
        scanDuration
      );
      
      // End operation tracking
      performanceMetrics.endOperation(operationId, true);

      return {
        findings,
        assessments,
        recommendations
      };
    } catch (error) {
      // End operation tracking with failure
      performanceMetrics.endOperation(operationId, false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.error('Compliance scan failed:', error);
      throw error;
    }
  }

  private async detectPrivacyRisks(): Promise<ComplianceFinding[]> {
    const allFindings: ComplianceFinding[] = [];
    
    try {
      // Scan S3 buckets
      const s3Findings = await this.riskDetector.scanS3Buckets();
      allFindings.push(...s3Findings);

      // Analyze IAM policies
      const iamFindings = await this.riskDetector.analyzeIAMPolicies();
      allFindings.push(...iamFindings);

      // Process CloudTrail logs
      const cloudTrailFindings = await this.riskDetector.processCloudTrailLogs();
      allFindings.push(...cloudTrailFindings);

      // Get Macie findings
      const macieFindings = await this.riskDetector.getMacieFindings();
      allFindings.push(...macieFindings);

      // Get Security Hub findings
      const securityHubFindings = await this.riskDetector.getSecurityHubFindings();
      allFindings.push(...securityHubFindings);

    } catch (error) {
      console.error('Error during risk detection:', error);
      // Continue with partial results rather than failing completely
    }

    return allFindings;
  }

  private async analyzeFindings(findings: ComplianceFinding[]): Promise<ComplianceAssessment[]> {
    const assessments: ComplianceAssessment[] = [];
    
    for (const finding of findings) {
      try {
        const assessment = await this.reasoningEngine.analyzeFinding(finding);
        assessments.push(assessment);
      } catch (error) {
        console.error(`Failed to analyze finding ${finding.id}:`, error);
        // Continue with other findings
      }
    }

    return assessments;
  }

  private async generateRecommendations(assessments: ComplianceAssessment[]): Promise<any[]> {
    const recommendations: any[] = [];
    
    for (const assessment of assessments) {
      try {
        const recs = await this.reasoningEngine.generateRecommendations(assessment);
        recommendations.push(...recs);
      } catch (error) {
        console.error(`Failed to generate recommendations for assessment ${assessment.findingId}:`, error);
        // Continue with other assessments
      }
    }

    return recommendations;
  }

  async executeAutomatedRemediation(findingIds?: string[]): Promise<RemediationResult[]> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    if (!this.configuration.autoRemediation) {
      throw new Error('Automated remediation is disabled in configuration');
    }

    console.log('Starting automated remediation...');
    const results: RemediationResult[] = [];
    const remediationStartTime = Date.now();
    
    // Track operation performance
    const operationId = `automated-remediation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    performanceMetrics.startOperation(operationId, 'automated-remediation');

    try {
      // Get current scan results if no specific findings provided
      let targetFindings: string[] = findingIds || [];
      
      if (targetFindings.length === 0) {
        const scanResults = await this.runComplianceScan();
        // Filter for high-priority findings that can be auto-remediated
        targetFindings = scanResults.recommendations
          .filter(rec => rec.automatable && rec.priority === 'HIGH' || rec.priority === 'CRITICAL')
          .map(rec => rec.findingId);
      }

      // Limit concurrent remediations
      const batchSize = Math.min(targetFindings.length, this.configuration.maxConcurrentRemediations);
      const batches = this.chunkArray(targetFindings, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (findingId) => {
          if (this.activeRemediations.has(findingId)) {
            console.log(`Remediation already in progress for finding ${findingId}`);
            return null;
          }

          this.activeRemediations.add(findingId);
          
          try {
            // Get the recommendation for this finding
            const recommendation = await this.getRemediationRecommendation(findingId);
            if (!recommendation) {
              console.log(`No remediation recommendation found for finding ${findingId}`);
              return null;
            }

            // Execute remediation
            const result = await this.remediationService.executeRemediation(recommendation);
            console.log(`Remediation completed for finding ${findingId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            
            return result;
          } catch (error) {
            console.error(`Remediation failed for finding ${findingId}:`, error);
            return {
              remediationId: `failed-${findingId}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              executedAt: new Date(),
              findingId
            } as RemediationResult;
          } finally {
            this.activeRemediations.delete(findingId);
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(result => result !== null) as RemediationResult[]);
      }

      // Record remediation metrics
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      const avgDuration = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.executedAt.getTime() - Date.now()), 0) / results.length 
        : 0;
      
      performanceMetrics.recordRemediationMetrics(results.length, successful, failed, Math.abs(avgDuration));
      
      // End operation tracking
      performanceMetrics.endOperation(operationId, true);

      console.log(`Automated remediation completed. ${successful}/${results.length} successful`);
      return results;
    } catch (error) {
      // End operation tracking with failure
      performanceMetrics.endOperation(operationId, false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.error('Automated remediation failed:', error);
      throw error;
    }
  }

  private async getRemediationRecommendation(findingId: string): Promise<any> {
    // This would typically query a database or cache
    // For now, we'll simulate getting a recommendation
    try {
      const scanResults = await this.runComplianceScan();
      return scanResults.recommendations.find(rec => rec.findingId === findingId);
    } catch (error) {
      console.error(`Failed to get recommendation for finding ${findingId}:`, error);
      return null;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async generateComplianceReport(type: 'DPIA' | 'ROPA' | 'AUDIT' | 'SUMMARY'): Promise<ComplianceReport> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log(`Generating ${type} compliance report...`);
    
    try {
      // Get current compliance data
      const scanResults = await this.runComplianceScan();
      
      // Define report scope based on type
      const scope = this.getReportScope(type);
      
      // Generate the report using the reporting service
      let report: ComplianceReport;
      
      switch (type) {
        case 'DPIA':
          report = await this.reportingService.generateDPIA(scope);
          break;
        case 'ROPA':
          report = await this.reportingService.generateRoPA(scope);
          break;
        case 'AUDIT':
          const timeRange = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }; // Last 30 days
          report = await this.reportingService.generateAuditReport(timeRange);
          break;
        case 'SUMMARY':
          report = await this.reportingService.generateComplianceSummary('ALL');
          break;
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      // Store the report
      const reportId = await this.reportingService.storeReport(report);
      console.log(`${type} report generated and stored with ID: ${reportId}`);
      
      return report;
    } catch (error) {
      console.error(`Failed to generate ${type} report:`, error);
      throw error;
    }
  }

  private getReportScope(type: string): any {
    // Define scope based on report type
    return {
      type,
      includeFindings: true,
      includeAssessments: true,
      includeRecommendations: true,
      timeRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        end: new Date()
      }
    };
  }

  async processQuery(query: string, context?: ConversationContext): Promise<QueryResponse> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log(`Processing natural language query: "${query}"`);
    
    try {
      // Use the natural language interface to process the query
      const response = await this.nlInterface.processQuery(query, context);
      
      console.log(`Query processed successfully with confidence: ${response.confidence}`);
      return response;
    } catch (error) {
      console.error('Failed to process query:', error);
      throw error;
    }
  }

  async getComplianceHealthScore(): Promise<{
    overallScore: number;
    categoryScores: Record<string, number>;
    trends: any[];
    criticalIssues: number;
  }> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log('Calculating compliance health score...');
    
    try {
      // Get current compliance data
      const scanResults = await this.runComplianceScan();
      
      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(scanResults.findings, scanResults.assessments);
      
      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore(categoryScores);
      
      // Get trends (simplified - would typically use historical data)
      const trends = await this.calculateTrends(scanResults);
      
      // Count critical issues
      const criticalIssues = scanResults.findings.filter(f => f.severity === 'CRITICAL').length;
      
      console.log(`Compliance health score calculated: ${overallScore.toFixed(2)}`);
      
      return {
        overallScore,
        categoryScores,
        trends,
        criticalIssues
      };
    } catch (error) {
      console.error('Failed to calculate compliance health score:', error);
      throw error;
    }
  }

  private calculateCategoryScores(findings: ComplianceFinding[], assessments: ComplianceAssessment[]): Record<string, number> {
    const categories = {
      'ENCRYPTION': 0,
      'ACCESS_CONTROL': 0,
      'PII_EXPOSURE': 0,
      'LOGGING': 0
    };

    // Group findings by type
    const findingsByType = findings.reduce((acc, finding) => {
      if (!acc[finding.findingType]) {
        acc[finding.findingType] = [];
      }
      acc[finding.findingType].push(finding);
      return acc;
    }, {} as Record<string, ComplianceFinding[]>);

    // Calculate score for each category (0-1 scale)
    Object.keys(categories).forEach(category => {
      const categoryFindings = findingsByType[category] || [];
      const totalFindings = categoryFindings.length;
      
      if (totalFindings === 0) {
        categories[category] = 1.0; // Perfect score if no issues
      } else {
        // Weight by severity
        const severityWeights = { 'LOW': 0.1, 'MEDIUM': 0.3, 'HIGH': 0.6, 'CRITICAL': 1.0 };
        const totalWeight = categoryFindings.reduce((sum, finding) => {
          return sum + severityWeights[finding.severity];
        }, 0);
        
        // Score decreases with more severe issues
        categories[category] = Math.max(0, 1 - (totalWeight / (totalFindings * 1.0)));
      }
    });

    return categories;
  }

  private calculateOverallScore(categoryScores: Record<string, number>): number {
    // Weighted average of category scores
    const weights = {
      'ENCRYPTION': 0.3,
      'ACCESS_CONTROL': 0.3,
      'PII_EXPOSURE': 0.3,
      'LOGGING': 0.1
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(categoryScores).forEach(([category, score]) => {
      const weight = weights[category] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async calculateTrends(scanResults: any): Promise<any[]> {
    // Simplified trend calculation - in production would use historical data
    return [
      {
        category: 'Overall Compliance',
        trend: 'improving', // 'improving', 'declining', 'stable'
        change: 0.05, // percentage change
        period: '30d'
      },
      {
        category: 'Critical Issues',
        trend: 'stable',
        change: 0.0,
        period: '30d'
      }
    ];
  }

  async getSystemStatus(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    services: Record<string, boolean>;
    lastScan: Date;
    nextScan: Date;
    activeRemediations: number;
  }> {
    console.log('Checking system status...');
    
    try {
      // Check service health
      const services = await this.checkServiceHealth();
      
      // Determine overall system status
      const status = this.determineSystemStatus(services);
      
      return {
        status,
        services,
        lastScan: this.lastScanTime || new Date(0),
        nextScan: this.nextScanTime || new Date(),
        activeRemediations: this.activeRemediations.size
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        status: 'UNHEALTHY',
        services: {
          'riskDetector': false,
          'reasoningEngine': false,
          'remediationService': false,
          'reportingService': false,
          'nlInterface': false
        },
        lastScan: this.lastScanTime || new Date(0),
        nextScan: this.nextScanTime || new Date(),
        activeRemediations: this.activeRemediations.size
      };
    }
  }

  private async checkServiceHealth(): Promise<Record<string, boolean>> {
    const services: Record<string, boolean> = {};
    
    // Check each service with timeout
    const checkTimeout = 5000; // 5 seconds
    
    try {
      // Risk Detector health check
      services['riskDetector'] = await this.checkServiceWithTimeout(
        () => this.healthCheckRiskDetector(),
        checkTimeout
      );
    } catch {
      services['riskDetector'] = false;
    }

    try {
      // Reasoning Engine health check
      services['reasoningEngine'] = await this.checkServiceWithTimeout(
        () => this.healthCheckReasoningEngine(),
        checkTimeout
      );
    } catch {
      services['reasoningEngine'] = false;
    }

    try {
      // Remediation Service health check
      services['remediationService'] = await this.checkServiceWithTimeout(
        () => this.healthCheckRemediationService(),
        checkTimeout
      );
    } catch {
      services['remediationService'] = false;
    }

    try {
      // Reporting Service health check
      services['reportingService'] = await this.checkServiceWithTimeout(
        () => this.healthCheckReportingService(),
        checkTimeout
      );
    } catch {
      services['reportingService'] = false;
    }

    try {
      // Natural Language Interface health check
      services['nlInterface'] = await this.checkServiceWithTimeout(
        () => this.healthCheckNLInterface(),
        checkTimeout
      );
    } catch {
      services['nlInterface'] = false;
    }

    return services;
  }

  private async checkServiceWithTimeout(healthCheck: () => Promise<boolean>, timeout: number): Promise<boolean> {
    return Promise.race([
      healthCheck(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      )
    ]);
  }

  private async healthCheckRiskDetector(): Promise<boolean> {
    // Simple health check - verify service is available
    return this.riskDetector !== undefined;
  }

  private async healthCheckReasoningEngine(): Promise<boolean> {
    return this.reasoningEngine !== undefined;
  }

  private async healthCheckRemediationService(): Promise<boolean> {
    return this.remediationService !== undefined;
  }

  private async healthCheckReportingService(): Promise<boolean> {
    return this.reportingService !== undefined;
  }

  private async healthCheckNLInterface(): Promise<boolean> {
    return this.nlInterface !== undefined;
  }

  private determineSystemStatus(services: Record<string, boolean>): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const serviceStatuses = Object.values(services);
    const healthyServices = serviceStatuses.filter(status => status).length;
    const totalServices = serviceStatuses.length;
    
    if (healthyServices === totalServices) {
      return 'HEALTHY';
    } else if (healthyServices >= totalServices * 0.6) { // At least 60% healthy
      return 'DEGRADED';
    } else {
      return 'UNHEALTHY';
    }
  }

  async startMonitoring(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    if (this.monitoring) {
      console.log('Monitoring is already active');
      return;
    }

    console.log('Starting continuous compliance monitoring...');
    this.monitoring = true;

    // Schedule periodic compliance scans
    this.monitoringInterval = setInterval(async () => {
      try {
        console.log('Running scheduled compliance scan...');
        const scanResults = await this.runComplianceScan();
        
        // Auto-remediate critical issues if enabled
        if (this.configuration.autoRemediation) {
          const criticalFindings = scanResults.recommendations
            .filter(rec => rec.priority === 'CRITICAL' && rec.automatable)
            .map(rec => rec.findingId);
          
          if (criticalFindings.length > 0) {
            console.log(`Auto-remediating ${criticalFindings.length} critical findings...`);
            await this.executeAutomatedRemediation(criticalFindings);
          }
        }
      } catch (error) {
        console.error('Scheduled compliance scan failed:', error);
        // Continue monitoring despite errors
      }
    }, this.configuration.scanInterval);

    console.log(`Continuous monitoring started with ${this.configuration.scanInterval}ms interval`);
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) {
      console.log('Monitoring is not active');
      return;
    }

    console.log('Stopping continuous compliance monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    // Stop system monitor
    if (this.systemMonitor) {
      await this.systemMonitor.stopMonitoring();
    }
    
    this.monitoring = false;
    console.log('Continuous monitoring stopped');
  }

  async updateConfiguration(config: Partial<AgentConfiguration>): Promise<void> {
    console.log('Updating agent configuration...');
    
    const oldConfig = { ...this.configuration };
    this.configuration = { ...this.configuration, ...config };
    
    // Restart monitoring if interval changed and monitoring is active
    if (this.monitoring && config.scanInterval && config.scanInterval !== oldConfig.scanInterval) {
      await this.stopMonitoring();
      await this.startMonitoring();
    }
    
    console.log('Agent configuration updated successfully');
  }

  async getConfiguration(): Promise<AgentConfiguration> {
    return { ...this.configuration };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Privacy Comply Agent...');
    
    // Stop monitoring
    await this.stopMonitoring();
    
    // Wait for active remediations to complete or timeout
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeRemediations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      console.log(`Waiting for ${this.activeRemediations.size} active remediations to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.activeRemediations.size > 0) {
      console.warn(`Shutting down with ${this.activeRemediations.size} active remediations still running`);
    }
    
    // Clear state
    this.initialized = false;
    this.activeRemediations.clear();
    this.systemMonitor = undefined;
    
    console.log('Privacy Comply Agent shutdown complete');
  }

  /**
   * Get system monitor instance
   */
  getSystemMonitor(): SystemMonitor | undefined {
    return this.systemMonitor;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return performanceMetrics;
  }
}