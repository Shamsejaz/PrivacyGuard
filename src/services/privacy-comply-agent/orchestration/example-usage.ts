/**
 * Example Usage of Privacy Comply Agent Controller
 * Demonstrates how to use the central agent controller for orchestration
 */

import { AgentController } from './agent-controller';
import { createAgentController } from '../factory';
import { AgentConfiguration } from '../types';

/**
 * Example 1: Basic Agent Controller Setup and Initialization
 */
async function basicAgentControllerExample() {
  console.log('=== Basic Agent Controller Example ===');
  
  try {
    // Create agent controller with default configuration
    const controller = await createAgentController();
    
    // Initialize the controller
    await controller.initialize();
    
    // Get system status
    const status = await controller.getSystemStatus();
    console.log('System Status:', status);
    
    // Shutdown gracefully
    await controller.shutdown();
    
  } catch (error) {
    console.error('Basic example failed:', error);
  }
}

/**
 * Example 2: Custom Configuration and Advanced Orchestration
 */
async function advancedOrchestrationExample() {
  console.log('=== Advanced Orchestration Example ===');
  
  try {
    // Custom configuration
    const config: Partial<AgentConfiguration> = {
      scanInterval: 1800000, // 30 minutes
      autoRemediation: true,
      maxConcurrentRemediations: 5,
      riskThreshold: 0.8,
      enableContinuousMonitoring: true,
      retryAttempts: 3,
      retryDelay: 3000
    };
    
    // Create controller with custom config
    const controller = await createAgentController(config);
    
    // Initialize with detailed progress tracking
    console.log('Initializing agent controller...');
    await controller.initialize();
    
    // Execute a complete compliance workflow
    console.log('Executing compliance workflow...');
    const workflowResult = await controller.executeComplianceWorkflow({
      generateReport: true,
      skipRemediation: false
    });
    
    console.log('Workflow Results:', {
      workflowId: workflowResult.workflowId,
      success: workflowResult.success,
      findingsCount: workflowResult.findings.length,
      assessmentsCount: workflowResult.assessments.length,
      recommendationsCount: workflowResult.recommendations.length,
      remediationsCount: workflowResult.remediationResults.length,
      executionTime: workflowResult.executionTime,
      errors: workflowResult.errors
    });
    
    // Get performance metrics
    const metrics = controller.getPerformanceMetrics();
    const summary = metrics.getPerformanceSummary();
    console.log('Performance Summary:', summary);
    
    // Shutdown
    await controller.shutdown();
    
  } catch (error) {
    console.error('Advanced example failed:', error);
  }
}

/**
 * Example 3: Continuous Monitoring and Real-time Operations
 */
async function continuousMonitoringExample() {
  console.log('=== Continuous Monitoring Example ===');
  
  try {
    const config: Partial<AgentConfiguration> = {
      scanInterval: 300000, // 5 minutes for demo
      autoRemediation: true,
      enableContinuousMonitoring: true,
      maxConcurrentRemediations: 3,
      riskThreshold: 0.7
    };
    
    const controller = await createAgentController(config);
    await controller.initialize();
    
    console.log('Starting continuous monitoring...');
    
    // Monitor for a period (in real usage, this would run indefinitely)
    const monitoringDuration = 60000; // 1 minute for demo
    const startTime = Date.now();
    
    // Set up periodic status checks
    const statusInterval = setInterval(async () => {
      try {
        const status = await controller.getSystemStatus();
        console.log(`[${new Date().toISOString()}] System Status:`, {
          health: status.status,
          activeWorkflows: status.activeWorkflows,
          lastScan: status.lastScan,
          nextScan: status.nextScan
        });
        
        // Get current state
        const state = controller.getState();
        console.log(`[${new Date().toISOString()}] Controller State:`, {
          initialized: state.initialized,
          monitoring: state.monitoring,
          systemHealth: state.systemHealth,
          activeWorkflows: state.activeWorkflows.size
        });
        
      } catch (error) {
        console.error('Status check failed:', error);
      }
    }, 15000); // Check every 15 seconds
    
    // Wait for monitoring period
    await new Promise(resolve => setTimeout(resolve, monitoringDuration));
    
    // Clean up
    clearInterval(statusInterval);
    await controller.shutdown();
    
    console.log('Continuous monitoring example completed');
    
  } catch (error) {
    console.error('Continuous monitoring example failed:', error);
  }
}

/**
 * Example 4: Configuration Management and Validation
 */
async function configurationManagementExample() {
  console.log('=== Configuration Management Example ===');
  
  try {
    const controller = await createAgentController();
    
    // Get current configuration
    const currentConfig = controller.getConfiguration();
    console.log('Current Configuration:', currentConfig);
    
    // Update configuration
    const newConfig: Partial<AgentConfiguration> = {
      scanInterval: 7200000, // 2 hours
      riskThreshold: 0.6,
      maxConcurrentRemediations: 8
    };
    
    console.log('Updating configuration...');
    await controller.updateConfiguration(newConfig);
    
    const updatedConfig = controller.getConfiguration();
    console.log('Updated Configuration:', updatedConfig);
    
    // Initialize with new configuration
    await controller.initialize();
    
    // Test the configuration
    const status = await controller.getSystemStatus();
    console.log('System status with new configuration:', status);
    
    await controller.shutdown();
    
  } catch (error) {
    console.error('Configuration management example failed:', error);
  }
}

/**
 * Example 5: Error Handling and Recovery
 */
async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');
  
  try {
    // Create controller with potentially problematic configuration
    const config: Partial<AgentConfiguration> = {
      scanInterval: 30000, // Very short interval
      maxConcurrentRemediations: 1,
      retryAttempts: 2,
      retryDelay: 1000
    };
    
    const controller = await createAgentController(config);
    
    try {
      await controller.initialize();
      
      // Execute workflow that might fail
      const workflowResult = await controller.executeComplianceWorkflow({
        skipRemediation: false
      });
      
      if (!workflowResult.success) {
        console.log('Workflow completed with errors:', workflowResult.errors);
      } else {
        console.log('Workflow completed successfully despite potential issues');
      }
      
    } catch (initError) {
      console.log('Initialization failed as expected:', initError instanceof Error ? initError.message : 'Unknown error');
      
      // Demonstrate recovery by updating configuration
      console.log('Attempting recovery with better configuration...');
      await controller.updateConfiguration({
        scanInterval: 300000, // 5 minutes
        retryAttempts: 3,
        retryDelay: 5000
      });
      
      // Try initialization again
      await controller.initialize();
      console.log('Recovery successful!');
    }
    
    await controller.shutdown();
    
  } catch (error) {
    console.error('Error handling example failed:', error);
  }
}

/**
 * Example 6: Workflow Coordination and Service Integration
 */
async function workflowCoordinationExample() {
  console.log('=== Workflow Coordination Example ===');
  
  try {
    const controller = await createAgentController({
      autoRemediation: false, // Manual control for this example
      enableContinuousMonitoring: false
    });
    
    await controller.initialize();
    
    // Execute workflow with specific options
    console.log('Executing risk detection only...');
    const riskDetectionResult = await controller.executeComplianceWorkflow({
      skipRemediation: true,
      generateReport: false
    });
    
    console.log('Risk Detection Results:', {
      findings: riskDetectionResult.findings.length,
      assessments: riskDetectionResult.assessments.length,
      recommendations: riskDetectionResult.recommendations.length
    });
    
    // If we found high-priority issues, execute targeted remediation
    const highPriorityRecommendations = riskDetectionResult.recommendations
      .filter(rec => rec.priority === 'HIGH' || rec.priority === 'CRITICAL');
    
    if (highPriorityRecommendations.length > 0) {
      console.log(`Found ${highPriorityRecommendations.length} high-priority issues, executing targeted remediation...`);
      
      const targetFindings = highPriorityRecommendations.map(rec => rec.findingId);
      const remediationResult = await controller.executeComplianceWorkflow({
        targetFindings,
        generateReport: true
      });
      
      console.log('Targeted Remediation Results:', {
        remediations: remediationResult.remediationResults.length,
        successful: remediationResult.remediationResults.filter(r => r.success).length,
        failed: remediationResult.remediationResults.filter(r => !r.success).length
      });
    }
    
    // Get workflow manager for detailed workflow information
    const workflowManager = controller.getWorkflowManager();
    console.log('Workflow manager available for detailed workflow tracking');
    
    await controller.shutdown();
    
  } catch (error) {
    console.error('Workflow coordination example failed:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('Starting Privacy Comply Agent Controller Examples...\n');
  
  await basicAgentControllerExample();
  console.log('\n');
  
  await advancedOrchestrationExample();
  console.log('\n');
  
  await configurationManagementExample();
  console.log('\n');
  
  await errorHandlingExample();
  console.log('\n');
  
  await workflowCoordinationExample();
  console.log('\n');
  
  // Note: Continuous monitoring example is commented out as it runs for a longer time
  // Uncomment the line below to run it
  // await continuousMonitoringExample();
  
  console.log('All examples completed!');
}

// Export examples for individual use
export {
  basicAgentControllerExample,
  advancedOrchestrationExample,
  continuousMonitoringExample,
  configurationManagementExample,
  errorHandlingExample,
  workflowCoordinationExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}