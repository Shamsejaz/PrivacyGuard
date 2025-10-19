/**
 * Example deployment script for Privacy Comply Agent Lambda functions
 * Demonstrates task 10.2: Deploy Lambda functions and configure triggers
 */

import { 
  deployLambdaFunctionsAndConfigureTriggers,
  testDeployedLambdaFunctions,
  getDeploymentStatus,
  LambdaDeploymentReport
} from './deploy-lambda-functions';

/**
 * Example: Complete Lambda deployment workflow
 */
async function exampleCompleteDeployment(): Promise<void> {
  console.log('🚀 Starting complete Lambda deployment example...\n');

  try {
    // Step 1: Deploy Lambda functions and configure triggers
    console.log('📦 Step 1: Deploying Lambda functions and configuring triggers...');
    const deploymentReport: LambdaDeploymentReport = await deployLambdaFunctionsAndConfigureTriggers();
    
    console.log('✅ Deployment completed!');
    console.log(`   - Success: ${deploymentReport.success}`);
    console.log(`   - Functions deployed: ${deploymentReport.deployedFunctions.length}`);
    console.log(`   - Triggers configured: ${deploymentReport.triggersConfigured}`);
    console.log(`   - Execution time: ${deploymentReport.executionTime}ms\n`);

    if (!deploymentReport.success) {
      console.log('❌ Deployment failed. Stopping example.');
      return;
    }

    // Step 2: Test deployed functions
    console.log('🧪 Step 2: Testing deployed Lambda functions...');
    const testResults = await testDeployedLambdaFunctions();
    
    console.log('✅ Testing completed!');
    console.log(`   - Overall success: ${testResults.success}`);
    console.log(`   - Functions tested: ${testResults.testResults.length}`);
    
    testResults.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.functionName}: ${result.responseTime}ms`);
    });
    console.log('');

    // Step 3: Get comprehensive status
    console.log('📊 Step 3: Getting deployment status...');
    const status = await getDeploymentStatus();
    
    console.log('✅ Status retrieved!');
    console.log(`   - Lambda functions: ${status.lambdaFunctions.length}`);
    console.log(`   - Event triggers valid: ${status.eventTriggers.valid}`);
    console.log(`   - Monitoring valid: ${status.monitoring.valid}`);
    console.log(`   - All integrations: ${Object.values(status.integrations).every(Boolean)}`);

    console.log('\n🎉 Complete deployment example finished successfully!');

  } catch (error) {
    console.error('❌ Example deployment failed:', error);
    throw error;
  }
}

/**
 * Example: Deploy specific Lambda function with custom configuration
 */
async function exampleCustomLambdaDeployment(): Promise<void> {
  console.log('🔧 Starting custom Lambda deployment example...\n');

  const { LambdaDeploymentManager } = await import('./lambda-deployment');
  const deploymentManager = new LambdaDeploymentManager();

  try {
    // Custom deployment configuration
    const customConfig = {
      functionName: 'privacy-comply-s3-access-restriction',
      description: 'Custom S3 access restriction Lambda for Privacy Comply Agent',
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      role: 'arn:aws:iam::123456789012:role/PrivacyComplyLambdaExecutionRole',
      code: {
        ZipFile: Buffer.from('exports.handler = async (event) => { return { statusCode: 200, body: "Custom function" }; }')
      },
      environment: {
        Variables: {
          CUSTOM_ENV: 'example-value',
          AWS_REGION: 'us-east-1'
        }
      },
      timeout: 180,
      memorySize: 256,
      triggers: [
        {
          type: 'CLOUDWATCH_EVENT' as const,
          ruleName: 'custom-s3-event-rule',
          description: 'Custom S3 event trigger',
          eventPattern: {
            source: ['aws.s3'],
            'detail-type': ['AWS API Call via CloudTrail'],
            detail: {
              eventSource: ['s3.amazonaws.com'],
              eventName: ['PutBucketAcl', 'PutBucketPolicy']
            }
          },
          enabled: true
        }
      ]
    };

    console.log('📦 Deploying custom Lambda function...');
    const result = await deploymentManager.deployLambdaFunction(customConfig);
    
    console.log('✅ Custom deployment completed!');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Function ARN: ${result.functionArn}`);
    console.log(`   - Message: ${result.message}`);
    
    if (result.triggers) {
      console.log(`   - Triggers configured: ${result.triggers.filter(t => t.success).length}`);
    }

    console.log('\n🎉 Custom deployment example finished!');

  } catch (error) {
    console.error('❌ Custom deployment failed:', error);
    throw error;
  }
}

/**
 * Example: Monitor deployment health and performance
 */
async function exampleMonitoringValidation(): Promise<void> {
  console.log('📊 Starting monitoring validation example...\n');

  const { CloudWatchMonitoringManager } = await import('./cloudwatch-monitoring');
  const monitoringManager = new CloudWatchMonitoringManager();

  try {
    // Validate event triggers
    console.log('⚡ Validating event triggers...');
    const triggerValidation = await monitoringManager.validateEventTriggers();
    
    console.log('✅ Event trigger validation completed!');
    console.log(`   - Valid: ${triggerValidation.valid}`);
    console.log(`   - Triggers found: ${triggerValidation.triggers.length}`);
    
    triggerValidation.triggers.forEach(trigger => {
      console.log(`   - ${trigger.ruleName}: ${trigger.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`     Successful invocations: ${trigger.successfulInvocations}`);
      console.log(`     Failed invocations: ${trigger.failedInvocations}`);
    });

    // Validate monitoring metrics
    console.log('\n📈 Validating monitoring metrics...');
    const monitoringValidation = await monitoringManager.validateMonitoring();
    
    console.log('✅ Monitoring validation completed!');
    console.log(`   - Valid: ${monitoringValidation.valid}`);
    console.log(`   - Lambda invocations: ${monitoringValidation.metrics.lambdaInvocations}`);
    console.log(`   - Successful remediations: ${monitoringValidation.metrics.successfulRemediations}`);
    console.log(`   - Average response time: ${monitoringValidation.metrics.averageResponseTime}ms`);
    console.log(`   - Error rate: ${(monitoringValidation.metrics.errorRate * 100).toFixed(2)}%`);

    // Validate performance
    console.log('\n🚀 Validating system performance...');
    const performanceValidation = await monitoringManager.validatePerformance();
    
    console.log('✅ Performance validation completed!');
    console.log(`   - Valid: ${performanceValidation.valid}`);
    console.log(`   - Cold start time: ${performanceValidation.lambdaPerformance.coldStartTime}ms`);
    console.log(`   - Warm execution time: ${performanceValidation.lambdaPerformance.warmExecutionTime}ms`);
    console.log(`   - Memory utilization: ${(performanceValidation.lambdaPerformance.memoryUtilization * 100).toFixed(1)}%`);

    console.log('\n🎉 Monitoring validation example finished!');

  } catch (error) {
    console.error('❌ Monitoring validation failed:', error);
    throw error;
  }
}

/**
 * Example: Validate security and compliance
 */
async function exampleSecurityValidation(): Promise<void> {
  console.log('🔒 Starting security validation example...\n');

  const { ServiceIntegrationManager } = await import('./service-integration');
  const integrationManager = new ServiceIntegrationManager();

  try {
    // Validate encryption
    console.log('🔐 Validating encryption...');
    const encryptionValidation = await integrationManager.validateEncryption();
    
    console.log('✅ Encryption validation completed!');
    console.log(`   - Valid: ${encryptionValidation.valid}`);
    console.log('   At Rest Encryption:');
    console.log(`     - S3 buckets: ${encryptionValidation.atRest.s3Buckets.encrypted ? '✅' : '❌'}`);
    console.log(`     - DynamoDB tables: ${encryptionValidation.atRest.dynamodbTables.encrypted ? '✅' : '❌'}`);
    console.log(`     - Lambda env vars: ${encryptionValidation.atRest.lambdaEnvironmentVariables.encrypted ? '✅' : '❌'}`);
    console.log('   In Transit Encryption:');
    console.log(`     - API endpoints: ${encryptionValidation.inTransit.apiEndpoints.certificateValid ? '✅' : '❌'}`);
    console.log(`     - Service connections: ${encryptionValidation.inTransit.serviceConnections.encrypted ? '✅' : '❌'}`);

    // Validate access controls
    console.log('\n🛡️ Validating access controls...');
    const accessValidation = await integrationManager.validateAccessControls();
    
    console.log('✅ Access control validation completed!');
    console.log(`   - Valid: ${accessValidation.valid}`);
    console.log('   IAM Roles:');
    accessValidation.iamRoles.forEach(role => {
      console.log(`     - ${role.roleName}: ${role.leastPrivilege ? '✅' : '❌'} Least Privilege`);
      if (role.unnecessaryPermissions.length > 0) {
        console.log(`       Unnecessary permissions: ${role.unnecessaryPermissions.join(', ')}`);
      }
    });

    // Validate data flow
    console.log('\n🔄 Validating data flow...');
    const dataFlowValidation = await integrationManager.validateDataFlow();
    
    console.log('✅ Data flow validation completed!');
    console.log(`   - Valid: ${dataFlowValidation.valid}`);
    dataFlowValidation.flows.forEach(flow => {
      const status = flow.success ? '✅' : '❌';
      console.log(`   ${status} ${flow.source} → ${flow.target}: ${flow.latency}ms`);
    });

    console.log('\n🎉 Security validation example finished!');

  } catch (error) {
    console.error('❌ Security validation failed:', error);
    throw error;
  }
}

/**
 * Run all examples
 */
async function runAllExamples(): Promise<void> {
  console.log('🌟 Running all Privacy Comply Agent deployment examples...\n');

  try {
    await exampleCompleteDeployment();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await exampleCustomLambdaDeployment();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await exampleMonitoringValidation();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await exampleSecurityValidation();
    
    console.log('\n🎉 All examples completed successfully!');

  } catch (error) {
    console.error('❌ Examples failed:', error);
    process.exit(1);
  }
}

// Export examples for individual use
export {
  exampleCompleteDeployment,
  exampleCustomLambdaDeployment,
  exampleMonitoringValidation,
  exampleSecurityValidation,
  runAllExamples
};

// Run all examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}