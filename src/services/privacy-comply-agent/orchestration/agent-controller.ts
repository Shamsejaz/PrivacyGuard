/**
 * Central Agent Controller
 * Main orchestration logic for the Privacy Comply Agent
 * Coordinates all services and manages workflows
 */

import {
  PrivacyRiskDetector,
  ComplianceReasoningEngine,
  RemediationAutomationService,
  ComplianceReportingService,
  NaturalLanguageInterface
} from '../services';
import {
  ComplianceFinding,
  ComplianceAssessment,
  RemediationRecommendation,
  RemediationResult,
  ComplianceReport,
  QueryResponse,
  ConversationContext,
  AgentConfiguration
} from '../types';
import { SystemMonitor } from '../monitoring/system-monitor';
import { performanceMetrics } from '../monitoring/performance-metrics';
import { RemediationWorkflowManager } from './remediation-workflow-manager';
import { AWSConfigManager, AWSServiceClients, AgentConfigurationManager } from '../config';

export interface AgentControllerState {
  initialized: boolean;
  monitoring: boolean;
  lastScanTime?: Date;
  nextScanTime?: Date;
  activeWorkflows: Set<string>;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  serviceStatuses: Record<string, boolean>;
}

export interface WorkflowCoordinationResult {
  workflowId: string;
  success: boolean;
  findings: ComplianceFinding[];
  assessments: ComplianceAssessment[];
  recommendations: RemediationRecommendation[];
  remediationResults: RemediationResult[];
  executionTime: number;
  errors: string[];
}

/**
 * Central Agent Controller
 * Orchestrates all privacy compliance operations and service coordination
 */
export class AgentController {
  private state: AgentControllerState;
  private configuration: AgentConfiguration;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Core services
  private riskDetector: PrivacyRiskDetector;
  private reasoningEngine: ComplianceReasoningEngine;
  private remediationService: RemediationAutomationService;
  private reportingService: ComplianceReportingService;
  private nlInterface: NaturalLanguageInterface;
  
  // Orchestration components
  private systemMonitor: SystemMonitor;
  private workflowManager: RemediationWorkflowManager;
  private configManager: AWSConfigManager;
  private serviceClients: AWSServiceClients;
  private agentConfigManager: AgentConfigurationManager;

  constructor(
    riskDetector: PrivacyRiskDetector,
    reasoningEngine: ComplianceReasoningEngine,
    remediationService: RemediationAutomationService,
    reportingService: ComplianceReportingService,
    nlInterface: NaturalLanguageInterface,
    config?: Partial<AgentConfiguration>
  ) {
    // Initialize services
    this.riskDetector = riskDetector;
    this.reasoningEngine = reasoningEngine;
    this.remediationService = remediationService;
    this.reportingService = reportingService;
    this.nlInterface = nlInterface;
    
    // Initialize orchestration components
    this.workflowManager = new RemediationWorkflowManager();
    this.configManager = AWSConfigManager.getInstance();
    this.serviceClients = AWSServiceClients.getInstance();
    this.agentConfigManager = AgentConfigurationManager.getInstance();
    
    // Initialize state
    this.state = {
      initialized: false,
      monitoring: false,
      activeWorkflows: new Set(),
      systemHealth: 'UNHEALTHY',
      serviceStatuses: {}
    };
    
    // Default configuration
    this.configuration = {
      scanInterval: 3600000, // 1 hour
      autoRemediation: true,
      maxConcurrentRemediations: 5,
      riskThreshold: 0.7,
      enableContinuousMonitoring: true,
      retryAttempts: 3,
      retryDelay: 5000,
      ...config
    };
  }

  /**
   * Initialize the agent controller and all services
   */
  async initialize(): Promise<void> {
    if (this.state.initialized) {
      console.log('Agent controller already initialized');
      return;
    }

    console.log('Initializing Privacy Comply Agent Controller...');
    const initStartTime = Date.now();

    try {
      // Step 1: Validate configuration
      await this.validateConfiguration();
      
      // Step 2: Initialize AWS services and connectivity
      await this.initializeAWSServices();
      
      // Step 3: Initialize core services
      await this.initializeCoreServices();
      
      // Step 4: Initialize orchestration components
      await this.initializeOrchestrationComponents();
      
      // Step 5: Validate system readiness
      await this.validateSystemReadiness();
      
      // Step 6: Start monitoring if enabled
      if (this.configuration.enableContinuousMonitoring) {
        await this.startContinuousMonitoring();
      }

      // Update state
      this.state.initialized = true;
      this.state.systemHealth = 'HEALTHY';
      
      const initDuration = Date.now() - initStartTime;
      console.log(`Agent controller initialized successfully in ${initDuration}ms`);
      
      // Record initialization metrics
      performanceMetrics.recordInitializationMetrics(initDuration, true);
      
    } catch (error) {
      this.state.systemHealth = 'UNHEALTHY';
      const initDuration = Date.now() - initStartTime;
      
      performanceMetrics.recordInitializationMetrics(initDuration, false);
      
      console.error('Failed to initialize agent controller:', error);
      throw new Error(`Agent controller initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate agent configuration
   */
  private async validateConfiguration(): Promise<void> {
    console.log('Validating agent configuration...');
    
    this.agentConfigManager.updateInitializationStep('configuration_validation', 'in_progress');
    const stepStartTime = Date.now();
    
    try {
      // Run complete validation using the configuration manager
      const validation = await this.agentConfigManager.runCompleteValidation(this.configuration);
      
      if (!validation.overall.valid) {
        throw new Error(`Configuration validation failed: ${validation.overall.errors.join(', ')}`);
      }
      
      // Log warnings if any
      if (validation.overall.warnings.length > 0) {
        console.warn('Configuration warnings:', validation.overall.warnings.join('; '));
      }
      
      const stepDuration = Date.now() - stepStartTime;
      this.agentConfigManager.updateInitializationStep('configuration_validation', 'completed', undefined, stepDuration);
      
      console.log('Configuration validation completed successfully');
    } catch (error) {
      const stepDuration = Date.now() - stepStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.agentConfigManager.updateInitializationStep('configuration_validation', 'failed', errorMessage, stepDuration);
      throw error;
    }
  }

  /**
   * Initialize AWS services and test connectivity
   */
  private async initializeAWSServices(): Promise<void> {
    console.log('Initializing AWS services...');
    
    try {
      // Test AWS connectivity
      const connectivityTest = await this.serviceClients.testConnectivity();
      const failedServices = connectivityTest.filter(service => !service.connected);
      
      if (failedServices.length > 0) {
        const failedServiceNames = failedServices.map(s => s.service).join(', ');
        throw new Error(`Failed to connect to AWS services: ${failedServiceNames}`);
      }
      
      console.log('AWS services initialized successfully');
    } catch (error) {
      throw new Error(`AWS services initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize core privacy compliance services
   */
  private async initializeCoreServices(): Promise<void> {
    console.log('Initializing core services...');
    
    const serviceInitPromises = [
      this.initializeService('Risk Detector', async () => {
        // Risk detector initialization if needed
        return true;
      }),
      this.initializeService('Reasoning Engine', async () => {
        // Reasoning engine initialization if needed
        return true;
      }),
      this.initializeService('Remediation Service', async () => {
        // Remediation service initialization if needed
        return true;
      }),
      this.initializeService('Reporting Service', async () => {
        // Reporting service initialization if needed
        return true;
      }),
      this.initializeService('Natural Language Interface', async () => {
        // NL interface initialization if needed
        return true;
      })
    ];

    const results = await Promise.allSettled(serviceInitPromises);
    const failures = results.filter(result => result.status === 'rejected');
    
    if (failures.length > 0) {
      const errorMessages = failures.map(failure => 
        failure.status === 'rejected' ? failure.reason : 'Unknown error'
      );
      throw new Error(`Core service initialization failed: ${errorMessages.join(', ')}`);
    }
    
    console.log('Core services initialized successfully');
  }

  /**
   * Initialize orchestration components
   */
  private async initializeOrchestrationComponents(): Promise<void> {
    console.log('Initializing orchestration components...');
    
    try {
      // Initialize system monitor
      this.systemMonitor = new SystemMonitor({
        getSystemStatus: () => this.getSystemStatus(),
        getPerformanceMetrics: () => performanceMetrics
      } as any);
      
      console.log('Orchestration components initialized successfully');
    } catch (error) {
      throw new Error(`Orchestration components initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to initialize individual services with error handling
   */
  private async initializeService(serviceName: string, initFunction: () => Promise<boolean>): Promise<void> {
    try {
      console.log(`Initializing ${serviceName}...`);
      const success = await initFunction();
      
      if (!success) {
        throw new Error(`${serviceName} initialization returned false`);
      }
      
      this.state.serviceStatuses[serviceName] = true;
      console.log(`${serviceName} initialized successfully`);
    } catch (error) {
      this.state.serviceStatuses[serviceName] = false;
      throw new Error(`${serviceName} initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate system readiness after initialization
   */
  private async validateSystemReadiness(): Promise<void> {
    console.log('Validating system readiness...');
    
    const issues: string[] = [];
    
    // Check service availability
    if (!this.riskDetector) issues.push('Risk Detector not available');
    if (!this.reasoningEngine) issues.push('Reasoning Engine not available');
    if (!this.remediationService) issues.push('Remediation Service not available');
    if (!this.reportingService) issues.push('Reporting Service not available');
    if (!this.nlInterface) issues.push('Natural Language Interface not available');
    
    // Check orchestration components
    if (!this.systemMonitor) issues.push('System Monitor not available');
    if (!this.workflowManager) issues.push('Workflow Manager not available');
    
    // Perform basic health checks
    try {
      const healthChecks = await this.performHealthChecks();
      const failedChecks = Object.entries(healthChecks)
        .filter(([_, healthy]) => !healthy)
        .map(([service, _]) => service);
      
      if (failedChecks.length > 0) {
        issues.push(`Health checks failed for: ${failedChecks.join(', ')}`);
      }
    } catch (error) {
      issues.push(`Health check execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    if (issues.length > 0) {
      throw new Error(`System readiness validation failed: ${issues.join('; ')}`);
    }
    
    console.log('System readiness validation completed successfully');
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<Record<string, boolean>> {
    const healthChecks: Record<string, boolean> = {};
    
    try {
      // Basic service availability checks
      healthChecks['riskDetector'] = this.riskDetector !== undefined;
      healthChecks['reasoningEngine'] = this.reasoningEngine !== undefined;
      healthChecks['remediationService'] = this.remediationService !== undefined;
      healthChecks['reportingService'] = this.reportingService !== undefined;
      healthChecks['nlInterface'] = this.nlInterface !== undefined;
      healthChecks['systemMonitor'] = this.systemMonitor !== undefined;
      healthChecks['workflowManager'] = this.workflowManager !== undefined;
      
      // AWS connectivity check
      const connectivityTest = await this.serviceClients.testConnectivity();
      healthChecks['awsConnectivity'] = connectivityTest.every(service => service.connected);
      
    } catch (error) {
      console.error('Health check execution error:', error);
      // Set all checks to false on error
      Object.keys(healthChecks).forEach(key => {
        healthChecks[key] = false;
      });
    }
    
    return healthChecks;
  }

  /**
   * Start continuous monitoring
   */
  private async startContinuousMonitoring(): Promise<void> {
    if (this.state.monitoring) {
      console.log('Continuous monitoring already active');
      return;
    }

    console.log('Starting continuous monitoring...');
    this.state.monitoring = true;

    // Start system monitor
    await this.systemMonitor.startMonitoring();

    // Schedule periodic compliance workflows
    this.monitoringInterval = setInterval(async () => {
      try {
        console.log('Running scheduled compliance workflow...');
        await this.executeComplianceWorkflow();
      } catch (error) {
        console.error('Scheduled compliance workflow failed:', error);
        // Continue monitoring despite errors
      }
    }, this.configuration.scanInterval);

    console.log(`Continuous monitoring started with ${this.configuration.scanInterval}ms interval`);
  }

  /**
   * Execute a complete compliance workflow
   * This is the main orchestration method that coordinates all services
   */
  async executeComplianceWorkflow(options?: {
    skipRemediation?: boolean;
    targetFindings?: string[];
    generateReport?: boolean;
  }): Promise<WorkflowCoordinationResult> {
    if (!this.state.initialized) {
      throw new Error('Agent controller not initialized');
    }

    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workflowStartTime = Date.now();
    
    console.log(`Starting compliance workflow ${workflowId}...`);
    this.state.activeWorkflows.add(workflowId);
    
    // Track workflow performance
    performanceMetrics.startOperation(workflowId, 'compliance-workflow');
    
    const result: WorkflowCoordinationResult = {
      workflowId,
      success: false,
      findings: [],
      assessments: [],
      recommendations: [],
      remediationResults: [],
      executionTime: 0,
      errors: []
    };

    try {
      // Step 1: Risk Detection Phase
      console.log(`[${workflowId}] Phase 1: Risk Detection`);
      result.findings = await this.orchestrateRiskDetection();
      console.log(`[${workflowId}] Detected ${result.findings.length} compliance findings`);

      // Step 2: Compliance Analysis Phase
      console.log(`[${workflowId}] Phase 2: Compliance Analysis`);
      result.assessments = await this.orchestrateComplianceAnalysis(result.findings);
      console.log(`[${workflowId}] Generated ${result.assessments.length} compliance assessments`);

      // Step 3: Recommendation Generation Phase
      console.log(`[${workflowId}] Phase 3: Recommendation Generation`);
      result.recommendations = await this.orchestrateRecommendationGeneration(result.assessments);
      console.log(`[${workflowId}] Generated ${result.recommendations.length} recommendations`);

      // Step 4: Remediation Phase (if enabled)
      if (!options?.skipRemediation && this.configuration.autoRemediation) {
        console.log(`[${workflowId}] Phase 4: Automated Remediation`);
        result.remediationResults = await this.orchestrateAutomatedRemediation(
          result.recommendations,
          options?.targetFindings
        );
        console.log(`[${workflowId}] Executed ${result.remediationResults.length} remediations`);
      }

      // Step 5: Report Generation (if requested)
      if (options?.generateReport) {
        console.log(`[${workflowId}] Phase 5: Report Generation`);
        await this.orchestrateReportGeneration(result);
      }

      // Update workflow state
      this.state.lastScanTime = new Date();
      this.state.nextScanTime = new Date(Date.now() + this.configuration.scanInterval);
      
      result.success = true;
      result.executionTime = Date.now() - workflowStartTime;
      
      console.log(`Compliance workflow ${workflowId} completed successfully in ${result.executionTime}ms`);
      
      // Record workflow metrics
      performanceMetrics.recordWorkflowMetrics(
        result.findings.length,
        result.assessments.length,
        result.recommendations.length,
        result.remediationResults.length,
        result.executionTime
      );
      
      performanceMetrics.endOperation(workflowId, true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.executionTime = Date.now() - workflowStartTime;
      
      console.error(`Compliance workflow ${workflowId} failed:`, error);
      
      performanceMetrics.endOperation(workflowId, false, { error: errorMessage });
      
      // Don't throw - return result with error information
    } finally {
      this.state.activeWorkflows.delete(workflowId);
    }

    return result;
  }

  /**
   * Orchestrate risk detection across all AWS resources
   */
  private async orchestrateRiskDetection(): Promise<ComplianceFinding[]> {
    const allFindings: ComplianceFinding[] = [];
    const detectionTasks = [];

    // Parallel execution of different detection methods
    detectionTasks.push(
      this.executeWithRetry('S3 Bucket Scan', () => this.riskDetector.scanS3Buckets()),
      this.executeWithRetry('IAM Policy Analysis', () => this.riskDetector.analyzeIAMPolicies()),
      this.executeWithRetry('CloudTrail Processing', () => this.riskDetector.processCloudTrailLogs()),
      this.executeWithRetry('Macie Findings', () => this.riskDetector.getMacieFindings()),
      this.executeWithRetry('Security Hub Findings', () => this.riskDetector.getSecurityHubFindings())
    );

    const results = await Promise.allSettled(detectionTasks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allFindings.push(...result.value);
      } else {
        console.error(`Risk detection task ${index} failed:`, result.reason);
      }
    });

    return allFindings;
  }

  /**
   * Orchestrate compliance analysis of findings
   */
  private async orchestrateComplianceAnalysis(findings: ComplianceFinding[]): Promise<ComplianceAssessment[]> {
    const assessments: ComplianceAssessment[] = [];
    const batchSize = 10; // Process findings in batches to avoid overwhelming the reasoning engine
    
    for (let i = 0; i < findings.length; i += batchSize) {
      const batch = findings.slice(i, i + batchSize);
      const batchPromises = batch.map(finding =>
        this.executeWithRetry(
          `Analysis of finding ${finding.id}`,
          () => this.reasoningEngine.analyzeFinding(finding)
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          assessments.push(result.value);
        } else {
          console.error(`Analysis of finding ${batch[index].id} failed:`, result.reason);
        }
      });
    }

    return assessments;
  }

  /**
   * Orchestrate recommendation generation
   */
  private async orchestrateRecommendationGeneration(assessments: ComplianceAssessment[]): Promise<RemediationRecommendation[]> {
    const allRecommendations: RemediationRecommendation[] = [];
    
    for (const assessment of assessments) {
      try {
        const recommendations = await this.executeWithRetry(
          `Recommendation generation for assessment ${assessment.findingId}`,
          () => this.reasoningEngine.generateRecommendations(assessment)
        );
        allRecommendations.push(...recommendations);
      } catch (error) {
        console.error(`Failed to generate recommendations for assessment ${assessment.findingId}:`, error);
      }
    }

    return allRecommendations;
  }

  /**
   * Orchestrate automated remediation
   */
  private async orchestrateAutomatedRemediation(
    recommendations: RemediationRecommendation[],
    targetFindings?: string[]
  ): Promise<RemediationResult[]> {
    // Filter recommendations for auto-remediation
    let targetRecommendations = recommendations.filter(rec => 
      rec.automatable && 
      (rec.priority === 'HIGH' || rec.priority === 'CRITICAL')
    );

    // Further filter by target findings if specified
    if (targetFindings && targetFindings.length > 0) {
      targetRecommendations = targetRecommendations.filter(rec =>
        targetFindings.includes(rec.findingId)
      );
    }

    const remediationResults: RemediationResult[] = [];
    const maxConcurrent = this.configuration.maxConcurrentRemediations;
    
    // Process remediations in batches to respect concurrency limits
    for (let i = 0; i < targetRecommendations.length; i += maxConcurrent) {
      const batch = targetRecommendations.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (recommendation) => {
        try {
          // Create workflow for this remediation
          const workflowId = await this.workflowManager.createWorkflow(recommendation);
          
          // Execute remediation through the service
          const result = await this.executeWithRetry(
            `Remediation of finding ${recommendation.findingId}`,
            () => this.remediationService.executeRemediation(recommendation)
          );
          
          return result;
        } catch (error) {
          console.error(`Remediation failed for finding ${recommendation.findingId}:`, error);
          return {
            remediationId: `failed-${recommendation.findingId}`,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            executedAt: new Date(),
            findingId: recommendation.findingId
          } as RemediationResult;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          remediationResults.push(result.value);
        }
      });
    }

    return remediationResults;
  }

  /**
   * Orchestrate report generation
   */
  private async orchestrateReportGeneration(workflowResult: WorkflowCoordinationResult): Promise<void> {
    try {
      // Generate compliance summary report
      const summaryReport = await this.reportingService.generateComplianceSummary('ALL');
      
      // Store the report
      await this.reportingService.storeReport(summaryReport);
      
      console.log(`Compliance report generated and stored for workflow ${workflowResult.workflowId}`);
    } catch (error) {
      console.error('Report generation failed:', error);
      workflowResult.errors.push(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.configuration.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.configuration.retryAttempts) {
          console.warn(`${operationName} failed (attempt ${attempt}/${this.configuration.retryAttempts}), retrying in ${this.configuration.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.configuration.retryDelay));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.configuration.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Get current system status
   */
  async getSystemStatus(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    services: Record<string, boolean>;
    lastScan: Date;
    nextScan: Date;
    activeWorkflows: number;
    configuration: AgentConfiguration;
  }> {
    const healthChecks = await this.performHealthChecks();
    const systemHealth = this.determineSystemHealth(healthChecks);
    
    return {
      status: systemHealth,
      services: healthChecks,
      lastScan: this.state.lastScanTime || new Date(0),
      nextScan: this.state.nextScanTime || new Date(),
      activeWorkflows: this.state.activeWorkflows.size,
      configuration: { ...this.configuration }
    };
  }

  /**
   * Determine overall system health based on service health checks
   */
  private determineSystemHealth(healthChecks: Record<string, boolean>): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const serviceStatuses = Object.values(healthChecks);
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

  /**
   * Update agent configuration
   */
  async updateConfiguration(config: Partial<AgentConfiguration>): Promise<void> {
    console.log('Updating agent configuration...');
    
    const oldConfig = { ...this.configuration };
    this.configuration = { ...this.configuration, ...config };
    
    // Restart monitoring if interval changed and monitoring is active
    if (this.state.monitoring && config.scanInterval && config.scanInterval !== oldConfig.scanInterval) {
      await this.stopContinuousMonitoring();
      await this.startContinuousMonitoring();
    }
    
    console.log('Agent configuration updated successfully');
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AgentConfiguration {
    return { ...this.configuration };
  }

  /**
   * Stop continuous monitoring
   */
  async stopContinuousMonitoring(): Promise<void> {
    if (!this.state.monitoring) {
      console.log('Continuous monitoring is not active');
      return;
    }

    console.log('Stopping continuous monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    // Stop system monitor
    if (this.systemMonitor) {
      await this.systemMonitor.stopMonitoring();
    }
    
    this.state.monitoring = false;
    console.log('Continuous monitoring stopped');
  }

  /**
   * Shutdown the agent controller gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Agent Controller...');
    
    // Stop monitoring
    await this.stopContinuousMonitoring();
    
    // Wait for active workflows to complete or timeout
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.state.activeWorkflows.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      console.log(`Waiting for ${this.state.activeWorkflows.size} active workflows to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.state.activeWorkflows.size > 0) {
      console.warn(`Shutting down with ${this.state.activeWorkflows.size} active workflows still running`);
    }
    
    // Clear state
    this.state.initialized = false;
    this.state.monitoring = false;
    this.state.activeWorkflows.clear();
    this.state.systemHealth = 'UNHEALTHY';
    
    console.log('Agent Controller shutdown complete');
  }

  /**
   * Get workflow manager instance
   */
  getWorkflowManager(): RemediationWorkflowManager {
    return this.workflowManager;
  }

  /**
   * Get system monitor instance
   */
  getSystemMonitor(): SystemMonitor {
    return this.systemMonitor;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return performanceMetrics;
  }

  /**
   * Get current state
   */
  getState(): AgentControllerState {
    return { ...this.state };
  }
}