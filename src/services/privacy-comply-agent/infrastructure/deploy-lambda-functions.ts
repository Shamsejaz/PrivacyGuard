/**
 * Deploy Lambda Functions Script
 * Implements task 10.2: Deploy Lambda functions and configure triggers
 */

import { DeploymentOrchestrator } from './deployment-orchestrator';
import { LambdaDeploymentManager } from './lambda-deployment';
import { CloudWatchMonitoringManager } from './cloudwatch-monitoring';
import { ServiceIntegrationManager } from './service-integration';
import { getLambdaRegistry } from '../lambda-functions/lambda-registry';

export interface LambdaDeploymentReport {
  success: boolean;
  deployedFunctions: string[];
  failedFunctions: string[];
  triggersConfigured: number;
  monitoringSetup: boolean;
  integrationStatus: boolean;
  executionTime: number;
  details: any;
}

/**
 * Main deployment function for task 10.2
 */
export async function deployLambdaFunctionsAndConfigureTriggers(): Promise<LambdaDeploymentReport> {
  const startTime = Date.now();
  console.log('🚀 Starting Lambda function deployment and trigger configuration...');

  const deploymentManager = new LambdaDeploymentManager();
  const monitoringManager = new CloudWatchMonitoringManager();
  const integrationManager = new ServiceIntegrationManager();
  const registry = getLambdaRegistry();

  const report: LambdaDeploymentReport = {
    success: false,
    deployedFunctions: [],
    failedFunctions: [],
    triggersConfigured: 0,
    monitoringSetup: false,
    integrationStatus: false,
    executionTime: 0,
    details: {}
  };

  try {
    // Step 1: Deploy all remediation Lambda functions
    console.log('📦 Deploying remediation Lambda functions...');
    const deploymentResults = await deploymentManager.deployAllLambdaFunctions();
    
    for (const result of deploymentResults) {
      if (result.success) {
        report.deployedFunctions.push(result.functionArn?.split(':').pop() || 'unknown');
        if (result.triggers) {
          report.triggersConfigured += result.triggers.filter(t => t.success).length;
        }
      } else {
        report.failedFunctions.push(result.message);
      }
    }

    console.log(`✅ Deployed ${report.deployedFunctions.length} Lambda functions`);
    console.log(`⚡ Configured ${report.triggersConfigured} event triggers`);

    // Step 2: Set up CloudWatch monitoring and alarms
    console.log('📊 Setting up CloudWatch monitoring...');
    await monitoringManager.setupMonitoringForAllFunctions();
    report.monitoringSetup = true;
    console.log('✅ CloudWatch monitoring configured');

    // Step 3: Configure service integrations and permissions
    console.log('🔗 Configuring service integrations...');
    await integrationManager.configureAllIntegrations();
    report.integrationStatus = true;
    console.log('✅ Service integrations configured');

    // Step 4: Validate deployment
    console.log('🔍 Validating deployment...');
    const validation = await validateDeployment(deploymentManager, monitoringManager, integrationManager);
    
    report.success = validation.valid && report.failedFunctions.length === 0;
    report.details = {
      deploymentResults,
      validation,
      functionMetadata: registry.getFunctionMetadata()
    };

    const executionTime = Date.now() - startTime;
    report.executionTime = executionTime;

    if (report.success) {
      console.log(`🎉 Lambda deployment completed successfully in ${executionTime}ms`);
    } else {
      console.log(`❌ Lambda deployment completed with issues in ${executionTime}ms`);
    }

    return report;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    report.executionTime = executionTime;
    report.details.error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Lambda deployment failed after ${executionTime}ms:`, error);
    return report;
  }
}

/**
 * Validate the Lambda deployment
 */
async function validateDeployment(
  deploymentManager: LambdaDeploymentManager,
  monitoringManager: CloudWatchMonitoringManager,
  integrationManager: ServiceIntegrationManager
): Promise<{
  valid: boolean;
  issues: string[];
  checks: {
    lambdaFunctions: boolean;
    eventTriggers: boolean;
    monitoring: boolean;
    integrations: boolean;
  };
}> {
  const issues: string[] = [];
  const checks = {
    lambdaFunctions: false,
    eventTriggers: false,
    monitoring: false,
    integrations: false
  };

  try {
    // Check Lambda functions deployment status
    const lambdaStatus = await deploymentManager.getDeploymentStatus();
    const deployedCount = lambdaStatus.filter(f => f.deployed).length;
    const totalCount = lambdaStatus.length;
    
    if (deployedCount === totalCount) {
      checks.lambdaFunctions = true;
    } else {
      issues.push(`Only ${deployedCount}/${totalCount} Lambda functions deployed successfully`);
    }

    // Check event triggers
    const triggerValidation = await monitoringManager.validateEventTriggers();
    if (triggerValidation.valid) {
      checks.eventTriggers = true;
    } else {
      issues.push('Event triggers validation failed');
    }

    // Check monitoring setup
    const monitoringStatus = await monitoringManager.getMonitoringStatus();
    const monitoredCount = monitoringStatus.filter(f => f.logGroupExists && f.alarmsConfigured > 0).length;
    
    if (monitoredCount === totalCount) {
      checks.monitoring = true;
    } else {
      issues.push(`Only ${monitoredCount}/${totalCount} functions have monitoring configured`);
    }

    // Check service integrations
    const integrationValidation = await integrationManager.validateIntegrations();
    if (integrationValidation.valid) {
      checks.integrations = true;
    } else {
      issues.push(`Service integration issues: ${integrationValidation.issues.join(', ')}`);
    }

  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    checks
  };
}

/**
 * Test deployed Lambda functions
 */
export async function testDeployedLambdaFunctions(): Promise<{
  success: boolean;
  testResults: Array<{
    functionName: string;
    success: boolean;
    responseTime: number;
    statusCode: number;
    payload: any;
  }>;
}> {
  console.log('🧪 Testing deployed Lambda functions...');
  
  const deploymentManager = new LambdaDeploymentManager();
  const testResults = await deploymentManager.testLambdaFunctions();
  
  const successfulTests = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  
  console.log(`✅ ${successfulTests}/${totalTests} Lambda function tests passed`);
  
  return {
    success: successfulTests === totalTests,
    testResults
  };
}

/**
 * Get comprehensive deployment status
 */
export async function getDeploymentStatus(): Promise<{
  lambdaFunctions: Array<{
    functionName: string;
    deployed: boolean;
    lastModified?: Date;
    version?: string;
  }>;
  eventTriggers: {
    valid: boolean;
    triggers: Array<{
      ruleName: string;
      enabled: boolean;
      targets: number;
      lastTriggered?: Date;
      successfulInvocations: number;
      failedInvocations: number;
    }>;
  };
  monitoring: {
    valid: boolean;
    metrics: {
      lambdaInvocations: number;
      successfulRemediations: number;
      failedRemediations: number;
      averageResponseTime: number;
      errorRate: number;
    };
    alerts: Array<{
      alertName: string;
      enabled: boolean;
      threshold: number;
      currentValue: number;
      status: string;
    }>;
  };
  integrations: {
    lambdaIntegrations: boolean;
    eventBridgeIntegrations: boolean;
    notificationIntegrations: boolean;
    securityHubIntegration: boolean;
    macieIntegration: boolean;
    bedrockIntegration: boolean;
  };
}> {
  const deploymentManager = new LambdaDeploymentManager();
  const monitoringManager = new CloudWatchMonitoringManager();
  const integrationManager = new ServiceIntegrationManager();

  const [lambdaStatus, eventTriggers, monitoring, integrations] = await Promise.all([
    deploymentManager.getDeploymentStatus(),
    monitoringManager.validateEventTriggers(),
    monitoringManager.validateMonitoring(),
    integrationManager.getIntegrationStatus()
  ]);

  return {
    lambdaFunctions: lambdaStatus,
    eventTriggers,
    monitoring,
    integrations
  };
}

/**
 * Rollback Lambda deployment
 */
export async function rollbackLambdaDeployment(): Promise<{
  success: boolean;
  message: string;
  details: any;
}> {
  console.log('🔄 Rolling back Lambda deployment...');
  
  const orchestrator = new DeploymentOrchestrator();
  return orchestrator.rollbackDeployment();
}

/**
 * Update existing Lambda functions
 */
export async function updateLambdaFunctions(): Promise<{
  success: boolean;
  updatedFunctions: string[];
  failedUpdates: string[];
  details: any;
}> {
  console.log('🔄 Updating Lambda functions...');
  
  const deploymentManager = new LambdaDeploymentManager();
  const results = await deploymentManager.deployAllLambdaFunctions();
  
  const updatedFunctions: string[] = [];
  const failedUpdates: string[] = [];
  
  for (const result of results) {
    if (result.success) {
      updatedFunctions.push(result.functionArn?.split(':').pop() || 'unknown');
    } else {
      failedUpdates.push(result.message);
    }
  }
  
  return {
    success: failedUpdates.length === 0,
    updatedFunctions,
    failedUpdates,
    details: { results }
  };
}

// Export main deployment function as default
export default deployLambdaFunctionsAndConfigureTriggers;