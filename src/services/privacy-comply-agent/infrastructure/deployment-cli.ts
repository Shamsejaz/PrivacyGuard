#!/usr/bin/env node

/**
 * Privacy Comply Agent Deployment CLI
 * Command-line interface for deploying and managing Lambda functions and triggers
 */

import { DeploymentOrchestrator, DeploymentPlan } from './deployment-orchestrator';
import { InfrastructureManager } from './infrastructure-manager';
import { AWSConfigManager } from '../config/aws-config';

interface CLIOptions {
  command: string;
  options: {
    skipIAM?: boolean;
    skipLambda?: boolean;
    skipMonitoring?: boolean;
    skipIntegrations?: boolean;
    skipValidation?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
    region?: string;
    profile?: string;
  };
}

/**
 * Privacy Comply Agent Deployment CLI
 */
class DeploymentCLI {
  private orchestrator: DeploymentOrchestrator;
  private infrastructureManager: InfrastructureManager;
  private configManager: AWSConfigManager;

  constructor() {
    this.orchestrator = new DeploymentOrchestrator();
    this.infrastructureManager = new InfrastructureManager();
    this.configManager = AWSConfigManager.getInstance();
  }

  /**
   * Main CLI entry point
   */
  public async run(args: string[]): Promise<void> {
    const options = this.parseArguments(args);
    
    // Configure AWS settings from CLI options
    if (options.options.region) {
      this.configManager.updateAWSConfig({ region: options.options.region });
    }
    if (options.options.profile) {
      this.configManager.updateAWSConfig({ profile: options.options.profile });
    }

    try {
      switch (options.command) {
        case 'deploy':
          await this.handleDeploy(options.options);
          break;
        case 'status':
          await this.handleStatus(options.options);
          break;
        case 'rollback':
          await this.handleRollback(options.options);
          break;
        case 'test':
          await this.handleTest(options.options);
          break;
        case 'update':
          await this.handleUpdate(options.options);
          break;
        case 'validate':
          await this.handleValidate(options.options);
          break;
        case 'infrastructure':
          await this.handleInfrastructure(options.options);
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          console.error(`Unknown command: ${options.command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('CLI Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  /**
   * Handle deploy command
   */
  private async handleDeploy(options: CLIOptions['options']): Promise<void> {
    console.log('🚀 Starting Privacy Comply Agent deployment...\n');

    const plan: DeploymentPlan = {
      setupInfrastructure: !options.skipIAM,
      deployLambdaFunctions: !options.skipLambda,
      configureMonitoring: !options.skipMonitoring,
      configureIntegrations: !options.skipIntegrations,
      validateDeployment: !options.skipValidation
    };

    if (options.dryRun) {
      console.log('🔍 Dry run mode - showing deployment plan:');
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    const result = await this.orchestrator.executeDeployment(plan);

    // Display results
    console.log('\n📊 Deployment Results:');
    console.log(`Overall Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Duration: ${result.summary.duration}ms`);
    console.log(`Successful Phases: ${result.summary.successfulPhases}/${result.summary.totalPhases}`);

    if (options.verbose) {
      console.log('\n📋 Phase Details:');
      result.phases.forEach(phase => {
        const icon = phase.success ? '✅' : '❌';
        console.log(`${icon} ${phase.phase}: ${phase.message}`);
        if (phase.details && options.verbose) {
          console.log(`   Details: ${JSON.stringify(phase.details, null, 2)}`);
        }
      });
    }

    if (!result.success) {
      const failedPhases = result.phases.filter(p => !p.success);
      console.log('\n❌ Failed Phases:');
      failedPhases.forEach(phase => {
        console.log(`- ${phase.phase}: ${phase.message}`);
      });
      process.exit(1);
    }

    console.log('\n🎉 Deployment completed successfully!');
  }

  /**
   * Handle status command
   */
  private async handleStatus(options: CLIOptions['options']): Promise<void> {
    console.log('📊 Checking deployment status...\n');

    const status = await this.orchestrator.getDeploymentStatus();

    // Lambda Functions Status
    console.log('🔧 Lambda Functions:');
    status.lambdaFunctions.forEach(func => {
      const icon = func.deployed ? '✅' : '❌';
      console.log(`${icon} ${func.functionName}`);
      if (options.verbose && func.deployed) {
        console.log(`   Version: ${func.version}`);
        console.log(`   Last Modified: ${func.lastModified?.toISOString()}`);
      }
    });

    // Monitoring Status
    console.log('\n📈 Monitoring:');
    status.monitoring.forEach(monitor => {
      const logIcon = monitor.logGroupExists ? '✅' : '❌';
      const alarmIcon = monitor.alarmsConfigured > 0 ? '✅' : '❌';
      const dashIcon = monitor.dashboardExists ? '✅' : '❌';
      
      console.log(`${monitor.functionName}:`);
      console.log(`  ${logIcon} Log Group`);
      console.log(`  ${alarmIcon} Alarms (${monitor.alarmsConfigured})`);
      console.log(`  ${dashIcon} Dashboard`);
    });

    // Integrations Status
    console.log('\n🔗 Service Integrations:');
    Object.entries(status.integrations).forEach(([service, enabled]) => {
      const icon = enabled ? '✅' : '❌';
      console.log(`${icon} ${service}`);
    });
  }

  /**
   * Handle rollback command
   */
  private async handleRollback(options: CLIOptions['options']): Promise<void> {
    console.log('⏪ Starting deployment rollback...\n');

    if (options.dryRun) {
      console.log('🔍 Dry run mode - would perform rollback operations');
      return;
    }

    const result = await this.orchestrator.rollbackDeployment();

    if (result.success) {
      console.log('✅ Rollback completed successfully');
    } else {
      console.error('❌ Rollback failed:', result.message);
      process.exit(1);
    }
  }

  /**
   * Handle test command
   */
  private async handleTest(options: CLIOptions['options']): Promise<void> {
    console.log('🧪 Testing AWS connectivity...\n');

    const connectivity = await this.orchestrator.testConnectivity();

    console.log('🔗 Connectivity Test Results:');
    Object.entries(connectivity).forEach(([service, connected]) => {
      const icon = connected ? '✅' : '❌';
      console.log(`${icon} ${service.toUpperCase()}`);
    });

    const allConnected = Object.values(connectivity).every(Boolean);
    if (!allConnected) {
      console.log('\n❌ Some services are not reachable. Check your AWS configuration.');
      process.exit(1);
    }

    console.log('\n✅ All services are reachable!');
  }

  /**
   * Handle update command
   */
  private async handleUpdate(options: CLIOptions['options']): Promise<void> {
    console.log('🔄 Updating Lambda functions...\n');

    if (options.dryRun) {
      console.log('🔍 Dry run mode - would update Lambda functions');
      return;
    }

    const results = await this.orchestrator.updateLambdaFunctions();

    console.log('📊 Update Results:');
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.message}`);
      
      if (options.verbose && result.triggers) {
        result.triggers.forEach(trigger => {
          const triggerIcon = trigger.success ? '✅' : '❌';
          console.log(`  ${triggerIcon} Trigger: ${trigger.ruleName}`);
        });
      }
    });

    const allSuccessful = results.every(r => r.success);
    if (!allSuccessful) {
      console.log('\n❌ Some updates failed');
      process.exit(1);
    }

    console.log('\n✅ All functions updated successfully!');
  }

  /**
   * Handle infrastructure command
   */
  private async handleInfrastructure(options: CLIOptions['options']): Promise<void> {
    console.log('🏗️ Managing AWS infrastructure...\n');

    if (options.dryRun) {
      console.log('🔍 Dry run mode - would setup infrastructure');
      return;
    }

    const result = await this.infrastructureManager.setupInfrastructure();

    console.log('📊 Infrastructure Setup Results:');
    console.log(`Overall Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Duration: ${result.duration}ms`);

    // Show component results
    Object.entries(result.components).forEach(([component, componentResult]) => {
      const icon = componentResult.success ? '✅' : '❌';
      console.log(`${icon} ${component.toUpperCase()}: ${componentResult.message}`);
      
      if (options.verbose && componentResult.details) {
        console.log(`   Details: ${JSON.stringify(componentResult.details, null, 2)}`);
      }
    });

    if (!result.success) {
      console.log('\n❌ Infrastructure setup failed');
      process.exit(1);
    }

    console.log('\n🎉 Infrastructure setup completed successfully!');
  }

  /**
   * Handle validate command
   */
  private async handleValidate(options: CLIOptions['options']): Promise<void> {
    console.log('🔍 Validating deployment...\n');

    // Validate configuration
    const configValidation = this.configManager.validateConfig();
    console.log('⚙️ Configuration Validation:');
    if (configValidation.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration issues:');
      configValidation.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    // Get deployment status for validation
    const status = await this.orchestrator.getDeploymentStatus();
    
    // Validate Lambda functions
    const deployedFunctions = status.lambdaFunctions.filter(f => f.deployed).length;
    const totalFunctions = status.lambdaFunctions.length;
    
    console.log('\n🔧 Lambda Functions Validation:');
    if (deployedFunctions === totalFunctions) {
      console.log(`✅ All ${totalFunctions} functions deployed`);
    } else {
      console.log(`❌ Only ${deployedFunctions}/${totalFunctions} functions deployed`);
    }

    // Validate monitoring
    const monitoredFunctions = status.monitoring.filter(m => m.logGroupExists && m.alarmsConfigured > 0).length;
    
    console.log('\n📈 Monitoring Validation:');
    if (monitoredFunctions === totalFunctions) {
      console.log(`✅ All ${totalFunctions} functions have monitoring`);
    } else {
      console.log(`❌ Only ${monitoredFunctions}/${totalFunctions} functions have monitoring`);
    }

    // Validate integrations
    const integrationValues = Object.values(status.integrations);
    const successfulIntegrations = integrationValues.filter(Boolean).length;
    
    console.log('\n🔗 Integration Validation:');
    if (successfulIntegrations === integrationValues.length) {
      console.log(`✅ All ${integrationValues.length} integrations configured`);
    } else {
      console.log(`❌ Only ${successfulIntegrations}/${integrationValues.length} integrations configured`);
    }

    const overallValid = configValidation.valid && 
                        deployedFunctions === totalFunctions && 
                        monitoredFunctions === totalFunctions && 
                        successfulIntegrations === integrationValues.length;

    if (overallValid) {
      console.log('\n🎉 Deployment validation passed!');
    } else {
      console.log('\n❌ Deployment validation failed');
      process.exit(1);
    }
  }

  /**
   * Parse command line arguments
   */
  private parseArguments(args: string[]): CLIOptions {
    const command = args[2] || 'help';
    const options: CLIOptions['options'] = {};

    for (let i = 3; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--skip-iam':
          options.skipIAM = true;
          break;
        case '--skip-lambda':
          options.skipLambda = true;
          break;
        case '--skip-monitoring':
          options.skipMonitoring = true;
          break;
        case '--skip-integrations':
          options.skipIntegrations = true;
          break;
        case '--skip-validation':
          options.skipValidation = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--region':
          options.region = args[++i];
          break;
        case '--profile':
          options.profile = args[++i];
          break;
      }
    }

    return { command, options };
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
Privacy Comply Agent Deployment CLI

Usage: node deployment-cli.js <command> [options]

Commands:
  infrastructure  Set up AWS infrastructure (IAM, DynamoDB, S3)
  deploy          Deploy Lambda functions and configure triggers
  status          Show deployment status
  rollback        Rollback deployment
  test            Test AWS connectivity
  update          Update Lambda functions only
  validate        Validate deployment configuration
  help            Show this help message

Options:
  --skip-iam              Skip IAM role deployment
  --skip-lambda           Skip Lambda function deployment
  --skip-monitoring       Skip monitoring configuration
  --skip-integrations     Skip service integrations
  --skip-validation       Skip deployment validation
  --dry-run               Show what would be done without executing
  --verbose, -v           Show detailed output
  --region <region>       AWS region to use
  --profile <profile>     AWS profile to use

Examples:
  node deployment-cli.js infrastructure
  node deployment-cli.js deploy
  node deployment-cli.js deploy --skip-iam --verbose
  node deployment-cli.js status --verbose
  node deployment-cli.js test
  node deployment-cli.js update --dry-run
  node deployment-cli.js validate
`);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DeploymentCLI();
  cli.run(process.argv).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DeploymentCLI };