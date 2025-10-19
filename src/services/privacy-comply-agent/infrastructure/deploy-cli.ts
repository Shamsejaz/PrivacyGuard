#!/usr/bin/env node

/**
 * CLI for deploying Privacy Comply Agent Lambda functions
 * Implements task 10.2: Deploy Lambda functions and configure triggers
 */

import { 
  deployLambdaFunctionsAndConfigureTriggers,
  testDeployedLambdaFunctions,
  getDeploymentStatus,
  rollbackLambdaDeployment,
  updateLambdaFunctions
} from './deploy-lambda-functions';

interface CLIOptions {
  action: 'deploy' | 'test' | 'status' | 'rollback' | 'update';
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    action: 'deploy'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'deploy':
      case 'test':
      case 'status':
      case 'rollback':
      case 'update':
        options.action = arg;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Privacy Comply Agent Lambda Deployment CLI

Usage: node deploy-cli.js [action] [options]

Actions:
  deploy    Deploy Lambda functions and configure triggers (default)
  test      Test deployed Lambda functions
  status    Get deployment status
  rollback  Rollback deployment
  update    Update existing Lambda functions

Options:
  --verbose, -v    Enable verbose output
  --dry-run        Show what would be done without executing
  --help, -h       Show this help message

Examples:
  node deploy-cli.js deploy --verbose
  node deploy-cli.js test
  node deploy-cli.js status
  node deploy-cli.js rollback
  node deploy-cli.js update --verbose
`);
}

/**
 * Execute deployment action
 */
async function executeDeploy(options: CLIOptions): Promise<void> {
  if (options.dryRun) {
    console.log('🔍 DRY RUN: Would deploy Lambda functions and configure triggers');
    console.log('  - Deploy 3 remediation Lambda functions');
    console.log('  - Configure CloudWatch event triggers');
    console.log('  - Set up monitoring and alarms');
    console.log('  - Configure service integrations');
    return;
  }

  const report = await deployLambdaFunctionsAndConfigureTriggers();
  
  console.log('\n📊 Deployment Report:');
  console.log(`  Success: ${report.success ? '✅' : '❌'}`);
  console.log(`  Deployed Functions: ${report.deployedFunctions.length}`);
  console.log(`  Failed Functions: ${report.failedFunctions.length}`);
  console.log(`  Triggers Configured: ${report.triggersConfigured}`);
  console.log(`  Monitoring Setup: ${report.monitoringSetup ? '✅' : '❌'}`);
  console.log(`  Integration Status: ${report.integrationStatus ? '✅' : '❌'}`);
  console.log(`  Execution Time: ${report.executionTime}ms`);

  if (options.verbose && report.details) {
    console.log('\n🔍 Detailed Results:');
    console.log(JSON.stringify(report.details, null, 2));
  }

  if (report.failedFunctions.length > 0) {
    console.log('\n❌ Failed Functions:');
    report.failedFunctions.forEach(failure => console.log(`  - ${failure}`));
  }

  process.exit(report.success ? 0 : 1);
}

/**
 * Execute test action
 */
async function executeTest(options: CLIOptions): Promise<void> {
  if (options.dryRun) {
    console.log('🔍 DRY RUN: Would test deployed Lambda functions');
    return;
  }

  const testResult = await testDeployedLambdaFunctions();
  
  console.log('\n🧪 Test Results:');
  console.log(`  Overall Success: ${testResult.success ? '✅' : '❌'}`);
  
  testResult.testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.functionName}: ${result.responseTime}ms (${result.statusCode})`);
    
    if (options.verbose) {
      console.log(`    Payload: ${JSON.stringify(result.payload, null, 2)}`);
    }
  });

  process.exit(testResult.success ? 0 : 1);
}

/**
 * Execute status action
 */
async function executeStatus(options: CLIOptions): Promise<void> {
  const status = await getDeploymentStatus();
  
  console.log('\n📊 Deployment Status:');
  
  console.log('\n🔧 Lambda Functions:');
  status.lambdaFunctions.forEach(func => {
    const deployedStatus = func.deployed ? '✅' : '❌';
    console.log(`  ${deployedStatus} ${func.functionName}`);
    if (func.deployed && options.verbose) {
      console.log(`    Version: ${func.version}`);
      console.log(`    Last Modified: ${func.lastModified}`);
    }
  });

  console.log('\n⚡ Event Triggers:');
  console.log(`  Valid: ${status.eventTriggers.valid ? '✅' : '❌'}`);
  if (options.verbose) {
    status.eventTriggers.triggers.forEach(trigger => {
      console.log(`  - ${trigger.ruleName}: ${trigger.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`    Successful: ${trigger.successfulInvocations}, Failed: ${trigger.failedInvocations}`);
    });
  }

  console.log('\n📊 Monitoring:');
  console.log(`  Valid: ${status.monitoring.valid ? '✅' : '❌'}`);
  if (options.verbose) {
    const metrics = status.monitoring.metrics;
    console.log(`  Lambda Invocations: ${metrics.lambdaInvocations}`);
    console.log(`  Successful Remediations: ${metrics.successfulRemediations}`);
    console.log(`  Failed Remediations: ${metrics.failedRemediations}`);
    console.log(`  Average Response Time: ${metrics.averageResponseTime}ms`);
    console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
  }

  console.log('\n🔗 Integrations:');
  const integrations = status.integrations;
  console.log(`  Lambda: ${integrations.lambdaIntegrations ? '✅' : '❌'}`);
  console.log(`  EventBridge: ${integrations.eventBridgeIntegrations ? '✅' : '❌'}`);
  console.log(`  Notifications: ${integrations.notificationIntegrations ? '✅' : '❌'}`);
  console.log(`  Security Hub: ${integrations.securityHubIntegration ? '✅' : '❌'}`);
  console.log(`  Macie: ${integrations.macieIntegration ? '✅' : '❌'}`);
  console.log(`  Bedrock: ${integrations.bedrockIntegration ? '✅' : '❌'}`);
}

/**
 * Execute rollback action
 */
async function executeRollback(options: CLIOptions): Promise<void> {
  if (options.dryRun) {
    console.log('🔍 DRY RUN: Would rollback Lambda deployment');
    return;
  }

  console.log('⚠️  WARNING: This will rollback the entire Lambda deployment!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const result = await rollbackLambdaDeployment();
  
  console.log('\n🔄 Rollback Result:');
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Message: ${result.message}`);
  
  if (options.verbose && result.details) {
    console.log('\n🔍 Rollback Details:');
    console.log(JSON.stringify(result.details, null, 2));
  }

  process.exit(result.success ? 0 : 1);
}

/**
 * Execute update action
 */
async function executeUpdate(options: CLIOptions): Promise<void> {
  if (options.dryRun) {
    console.log('🔍 DRY RUN: Would update existing Lambda functions');
    return;
  }

  const result = await updateLambdaFunctions();
  
  console.log('\n🔄 Update Result:');
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Updated Functions: ${result.updatedFunctions.length}`);
  console.log(`  Failed Updates: ${result.failedUpdates.length}`);
  
  if (result.updatedFunctions.length > 0) {
    console.log('\n✅ Updated Functions:');
    result.updatedFunctions.forEach(func => console.log(`  - ${func}`));
  }
  
  if (result.failedUpdates.length > 0) {
    console.log('\n❌ Failed Updates:');
    result.failedUpdates.forEach(failure => console.log(`  - ${failure}`));
  }

  if (options.verbose && result.details) {
    console.log('\n🔍 Update Details:');
    console.log(JSON.stringify(result.details, null, 2));
  }

  process.exit(result.success ? 0 : 1);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    
    console.log('🚀 Privacy Comply Agent Lambda Deployment CLI');
    console.log(`Action: ${options.action}`);
    if (options.verbose) console.log('Verbose mode enabled');
    if (options.dryRun) console.log('Dry run mode enabled');
    console.log('');

    switch (options.action) {
      case 'deploy':
        await executeDeploy(options);
        break;
      case 'test':
        await executeTest(options);
        break;
      case 'status':
        await executeStatus(options);
        break;
      case 'rollback':
        await executeRollback(options);
        break;
      case 'update':
        await executeUpdate(options);
        break;
      default:
        console.error(`Unknown action: ${options.action}`);
        printHelp();
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runCLI };