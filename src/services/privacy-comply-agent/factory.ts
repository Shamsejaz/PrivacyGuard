// Privacy Comply Agent Factory
import {
  PrivacyComplyAgent,
  PrivacyComplyAgentImpl,
  PrivacyRiskDetectionService,
  ComplianceReasoningEngineService,
  RemediationAutomationServiceImpl,
  ComplianceReportingServiceImpl,
  NaturalLanguageInterfaceImpl
} from './services';
import { AWSConfigManager, AWSServiceClients } from './config';
import { AgentController } from './orchestration/agent-controller';
import { AgentConfiguration } from './types';

/**
 * Factory class for creating Privacy Comply Agent instances
 */
export class PrivacyComplyAgentFactory {
  private static instance: PrivacyComplyAgentFactory;
  private configManager: AWSConfigManager;
  private serviceClients: AWSServiceClients;

  private constructor() {
    this.configManager = AWSConfigManager.getInstance();
    this.serviceClients = AWSServiceClients.getInstance();
  }

  public static getInstance(): PrivacyComplyAgentFactory {
    if (!PrivacyComplyAgentFactory.instance) {
      PrivacyComplyAgentFactory.instance = new PrivacyComplyAgentFactory();
    }
    return PrivacyComplyAgentFactory.instance;
  }

  /**
   * Create a fully configured Privacy Comply Agent instance
   */
  public async createAgent(config?: Partial<AgentConfiguration>): Promise<PrivacyComplyAgent> {
    // Validate configuration before creating agent
    const configValidation = this.configManager.validateConfig();
    if (!configValidation.valid) {
      throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
    }

    // Create service instances
    const riskDetector = new PrivacyRiskDetectionService();
    const reasoningEngine = new ComplianceReasoningEngineService();
    const remediationService = new RemediationAutomationServiceImpl();
    const reportingService = new ComplianceReportingServiceImpl();
    const nlInterface = new NaturalLanguageInterfaceImpl();

    // Create and return the main agent with enhanced orchestration
    const agent = new PrivacyComplyAgentImpl(
      riskDetector,
      reasoningEngine,
      remediationService,
      reportingService,
      nlInterface,
      config
    );

    return agent;
  }

  /**
   * Create a central agent controller for advanced orchestration
   */
  public async createAgentController(config?: Partial<AgentConfiguration>): Promise<AgentController> {
    // Validate configuration before creating controller
    const configValidation = this.configManager.validateConfig();
    if (!configValidation.valid) {
      throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
    }

    // Create service instances
    const riskDetector = new PrivacyRiskDetectionService();
    const reasoningEngine = new ComplianceReasoningEngineService();
    const remediationService = new RemediationAutomationServiceImpl();
    const reportingService = new ComplianceReportingServiceImpl();
    const nlInterface = new NaturalLanguageInterfaceImpl();

    // Create and return the agent controller
    const controller = new AgentController(
      riskDetector,
      reasoningEngine,
      remediationService,
      reportingService,
      nlInterface,
      config
    );

    return controller;
  }

  /**
   * Create Privacy Risk Detection Service
   */
  public createRiskDetectionService(): PrivacyRiskDetectionService {
    return new PrivacyRiskDetectionService();
  }

  /**
   * Create Compliance Reasoning Engine
   */
  public createReasoningEngine(): ComplianceReasoningEngineService {
    return new ComplianceReasoningEngineService();
  }

  /**
   * Create Remediation Automation Service
   */
  public createRemediationService(): RemediationAutomationServiceImpl {
    return new RemediationAutomationServiceImpl();
  }

  /**
   * Create Compliance Reporting Service
   */
  public createReportingService(): ComplianceReportingServiceImpl {
    return new ComplianceReportingServiceImpl();
  }

  /**
   * Create Natural Language Interface
   */
  public createNaturalLanguageInterface(): NaturalLanguageInterfaceImpl {
    return new NaturalLanguageInterfaceImpl();
  }

  /**
   * Get AWS service clients
   */
  public getServiceClients(): AWSServiceClients {
    return this.serviceClients;
  }

  /**
   * Get configuration manager
   */
  public getConfigManager(): AWSConfigManager {
    return this.configManager;
  }

  /**
   * Test system connectivity and readiness
   */
  public async testSystemReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    serviceStatus: any[];
  }> {
    const issues: string[] = [];

    // Test configuration
    const configValidation = this.configManager.validateConfig();
    if (!configValidation.valid) {
      issues.push(...configValidation.errors);
    }

    // Test AWS connectivity
    const serviceStatus = await this.serviceClients.testConnectivity();
    const failedServices = serviceStatus.filter((s: any) => !s.connected);
    if (failedServices.length > 0) {
      issues.push(`Failed to connect to AWS services: ${failedServices.map((s: any) => s.service).join(', ')}`);
    }

    return {
      ready: issues.length === 0,
      issues,
      serviceStatus
    };
  }

  /**
   * Create agent with custom configuration
   */
  public async createAgentWithConfig(config: {
    aws?: any;
    services?: any;
    agent?: Partial<AgentConfiguration>;
  }): Promise<PrivacyComplyAgent> {
    // Update configuration if provided
    if (config.aws) {
      this.configManager.updateAWSConfig(config.aws);
    }
    if (config.services) {
      this.configManager.updateServiceConfig(config.services);
    }

    // Clear cached clients to use new configuration
    this.serviceClients.clearClients();

    // Create agent with new configuration
    return this.createAgent(config.agent);
  }

  /**
   * Create agent controller with custom configuration
   */
  public async createAgentControllerWithConfig(config: {
    aws?: any;
    services?: any;
    agent?: Partial<AgentConfiguration>;
  }): Promise<AgentController> {
    // Update configuration if provided
    if (config.aws) {
      this.configManager.updateAWSConfig(config.aws);
    }
    if (config.services) {
      this.configManager.updateServiceConfig(config.services);
    }

    // Clear cached clients to use new configuration
    this.serviceClients.clearClients();

    // Create controller with new configuration
    return this.createAgentController(config.agent);
  }
}

/**
 * Convenience function to create a Privacy Comply Agent
 */
export async function createPrivacyComplyAgent(config?: Partial<AgentConfiguration>): Promise<PrivacyComplyAgent> {
  const factory = PrivacyComplyAgentFactory.getInstance();
  return factory.createAgent(config);
}

/**
 * Convenience function to create an Agent Controller
 */
export async function createAgentController(config?: Partial<AgentConfiguration>): Promise<AgentController> {
  const factory = PrivacyComplyAgentFactory.getInstance();
  return factory.createAgentController(config);
}

/**
 * Convenience function to test system readiness
 */
export async function testSystemReadiness() {
  const factory = PrivacyComplyAgentFactory.getInstance();
  return factory.testSystemReadiness();
}