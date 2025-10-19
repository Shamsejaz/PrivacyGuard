#!/usr/bin/env node

/**
 * AWS Services Setup CLI
 * Command-line interface for setting up AWS service configurations
 * Requirements: 1.5, 3.5, 4.4
 */

import { AWSServiceConfigurator } from './aws-service-configurator';

interface CLIOptions {
  action: 'setup' | 'validate' | 'status' | 'test' | 'report';
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    action: 'setup'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'setup':
      case 'configure':
        options.action = 'setup';
        break;
      case 'validate':
      case 'check':
        options.action = 'validate';
        break;
      case 'status':
        options.action = 'status';
        break;
      case 'test':
      case 'connectivity':
        options.action = 'test';
        break;
      case 'report':
        options.action = 'report';
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
Privacy Comply Agent - AWS Services Setup CLI

Usage: node setup-aws-services.ts [action] [options]

Actions:
  setup, configure    Set up all AWS service configurations (default)
  validate, check     Validate existing AWS service configurations
  status              Get current status of all AWS services
  test, connectivity  Test connectivity to AWS services
  report              Generate comprehensive configuration report

Options:
  --verbose, -v       Enable verbose output
  --dry-run          Show what would be done without making changes
  --help, -h         Show this help message

Examples:
  node setup-aws-services.ts setup --verbose
  node setup-aws-services.ts validate
  node setup-aws-services.ts status
  node setup-aws-services.ts test
  node setup-aws-services.ts report

Environment Variables:
  AWS_REGION                 AWS region (default: us-east-1)
  AWS_ACCESS_KEY_ID         AWS access key ID
  AWS_SECRET_ACCESS_KEY     AWS secret access key
  AWS_PROFILE               AWS profile name
  S3_REPORTS_BUCKET         S3 bucket for reports
  DYNAMODB_TABLE_NAME       DynamoDB table name prefix
`);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const options = parseArguments();
  const configurator = new AWSServiceConfigurator();

  console.log('🔧 Privacy Comply Agent - AWS Services Setup');
  console.log('=' .repeat(50));

  if (options.verbose) {
    console.log(`Action: ${options.action}`);
    console.log(`Verbose: ${options.verbose}`);
    console.log(`Dry Run: ${options.dryRun || false}`);
    console.log('');
  }

  try {
    switch (options.action) {
      case 'setup':
        await handleSetup(configurator, options);
        break;
      case 'validate':
        await handleValidate(configurator, options);
        break;
      case 'status':
        await handleStatus(configurator, options);
        break;
      case 'test':
        await handleTest(configurator, options);
        break;
      case 'report':
        await handleReport(configurator, options);
        break;
      default:
        console.error(`Unknown action: ${options.action}`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Operation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Handle setup action
 */
async function handleSetup(configurator: AWSServiceConfigurator, options: CLIOptions): Promise<void> {
  console.log('🚀 Setting up AWS service configurations...');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
    console.log('Would configure:');
    console.log('  ✓ IAM Roles and Policies');
    console.log('    - PrivacyComplyLambdaExecutionRole');
    console.log('    - PrivacyComplyAgentRole');
    console.log('    - PrivacyComplyBedrockAccessRole');
    console.log('  ✓ DynamoDB Tables');
    console.log('    - privacy-comply-findings');
    console.log('    - privacy-comply-assessments');
    console.log('  ✓ S3 Buckets');
    console.log('    - privacy-comply-reports (encrypted)');
    console.log('    - privacy-comply-data-lake (encrypted)');
    return;
  }

  const result = await configurator.configureAllServices();
  
  if (result.success) {
    console.log('✅ AWS service configuration completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  IAM Roles: ${result.details.iam.rolesCreated.length} created`);
    console.log(`  DynamoDB Tables: ${result.details.dynamodb.tablesCreated.length} created`);
    console.log(`  S3 Buckets: ${result.details.s3.bucketsCreated.length} created`);
    console.log(`  Duration: ${result.duration}ms`);
    
    if (options.verbose) {
      console.log('');
      console.log('📋 Detailed Results:');
      console.log('  IAM Roles:', result.details.iam.rolesCreated);
      console.log('  DynamoDB Tables:', result.details.dynamodb.tablesCreated);
      console.log('  S3 Buckets:', result.details.s3.bucketsCreated);
    }
  } else {
    console.log('⚠️ AWS service configuration completed with errors');
    console.log('');
    console.log('❌ Errors:');
    
    if (!result.details.iam.success && result.details.iam.errors) {
      console.log(`  IAM: ${result.details.iam.errors.join(', ')}`);
    }
    if (!result.details.dynamodb.success && result.details.dynamodb.errors) {
      console.log(`  DynamoDB: ${result.details.dynamodb.errors.join(', ')}`);
    }
    if (!result.details.s3.success && result.details.s3.errors) {
      console.log(`  S3: ${result.details.s3.errors.join(', ')}`);
    }
    
    process.exit(1);
  }
}

/**
 * Handle validate action
 */
async function handleValidate(configurator: AWSServiceConfigurator, options: CLIOptions): Promise<void> {
  console.log('🔍 Validating AWS service configurations...');
  
  const result = await configurator.validateServiceConfiguration();
  
  if (result.valid) {
    console.log('✅ All AWS service configurations are valid!');
  } else {
    console.log('⚠️ AWS service configuration issues detected:');
    console.log('');
    
    Object.entries(result.services).forEach(([service, config]) => {
      if (!config.valid) {
        console.log(`❌ ${service.toUpperCase()}:`);
        config.issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log(`✅ ${service.toUpperCase()}: OK`);
      }
    });
    
    if (result.recommendations.length > 0) {
      console.log('');
      console.log('💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    process.exit(1);
  }
}

/**
 * Handle status action
 */
async function handleStatus(configurator: AWSServiceConfigurator, options: CLIOptions): Promise<void> {
  console.log('📊 Getting AWS service status...');
  
  const status = await configurator.getServiceStatus();
  
  console.log('');
  console.log(`Overall Status: ${getStatusEmoji(status.overall)} ${status.overall.toUpperCase()}`);
  console.log('');
  console.log('Service Status:');
  
  Object.entries(status.services).forEach(([service, serviceStatus]) => {
    console.log(`  ${getStatusEmoji(serviceStatus)} ${service.toUpperCase()}: ${serviceStatus}`);
  });
  
  console.log('');
  console.log(`Last Checked: ${status.lastChecked.toISOString()}`);
  
  if (options.verbose && status.details) {
    console.log('');
    console.log('📋 Detailed Status:');
    console.log(JSON.stringify(status.details, null, 2));
  }
}

/**
 * Handle test action
 */
async function handleTest(configurator: AWSServiceConfigurator, options: CLIOptions): Promise<void> {
  console.log('🔗 Testing connectivity to AWS services...');
  
  const result = await configurator.testServiceConnectivity();
  
  console.log('');
  if (result.success) {
    console.log('✅ All AWS services are reachable!');
  } else {
    console.log('⚠️ Some AWS services are unreachable');
  }
  
  console.log('');
  console.log('Service Connectivity:');
  
  Object.entries(result.services).forEach(([service, reachable]) => {
    console.log(`  ${reachable ? '✅' : '❌'} ${service.toUpperCase()}: ${reachable ? 'reachable' : 'unreachable'}`);
  });
  
  console.log('');
  console.log(`Message: ${result.message}`);
  
  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Handle report action
 */
async function handleReport(configurator: AWSServiceConfigurator, options: CLIOptions): Promise<void> {
  console.log('📋 Generating comprehensive configuration report...');
  
  const report = await configurator.generateConfigurationReport();
  
  console.log('');
  console.log('📊 Configuration Report');
  console.log('=' .repeat(50));
  console.log(`Generated: ${report.timestamp.toISOString()}`);
  console.log('');
  
  // Configuration Summary
  console.log('🔧 Configuration Summary:');
  console.log(`  Overall: ${report.configuration.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`  Message: ${report.configuration.message}`);
  console.log('');
  
  // Validation Summary
  console.log('🔍 Validation Summary:');
  console.log(`  Overall: ${report.validation.valid ? '✅ Valid' : '❌ Invalid'}`);
  Object.entries(report.validation.services).forEach(([service, config]) => {
    console.log(`  ${service.toUpperCase()}: ${config.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!config.valid && config.issues.length > 0) {
      config.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  });
  console.log('');
  
  // Connectivity Summary
  console.log('🔗 Connectivity Summary:');
  console.log(`  Overall: ${report.connectivity.success ? '✅ All services reachable' : '❌ Some services unreachable'}`);
  Object.entries(report.connectivity.services).forEach(([service, reachable]) => {
    console.log(`  ${service.toUpperCase()}: ${reachable ? '✅ Reachable' : '❌ Unreachable'}`);
  });
  console.log('');
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    console.log('');
  }
  
  if (options.verbose) {
    console.log('📋 Full Report Data:');
    console.log(JSON.stringify(report, null, 2));
  }
}

/**
 * Get status emoji
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'unhealthy':
      return '❌';
    default:
      return '❓';
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  });
}

export { main as runCLI, parseArguments, CLIOptions };