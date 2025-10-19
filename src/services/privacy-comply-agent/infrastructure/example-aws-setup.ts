/**
 * AWS Service Configuration Example
 * Demonstrates how to set up AWS service configurations for Privacy Comply Agent
 * Requirements: 1.5, 3.5, 4.4
 */

import { AWSServiceConfigurator, setupAWSServiceConfigurations, validateAWSServiceConfigurations } from './aws-service-configurator';

/**
 * Example: Complete AWS service setup workflow
 */
async function exampleCompleteSetup(): Promise<void> {
  console.log('🚀 Privacy Comply Agent - AWS Service Setup Example');
  console.log('=' .repeat(60));

  try {
    // Method 1: Using utility function (recommended for simple setup)
    console.log('\n📋 Method 1: Using utility function');
    console.log('-' .repeat(40));
    
    const setupResult = await setupAWSServiceConfigurations();
    
    if (setupResult.success) {
      console.log('✅ Setup completed successfully!');
      console.log(`   Duration: ${setupResult.duration}ms`);
      console.log(`   IAM Roles: ${setupResult.details.iam.rolesCreated.length}`);
      console.log(`   DynamoDB Tables: ${setupResult.details.dynamodb.tablesCreated.length}`);
      console.log(`   S3 Buckets: ${setupResult.details.s3.bucketsCreated.length}`);
    } else {
      console.log('❌ Setup failed:', setupResult.message);
      return;
    }

    // Validate the setup
    console.log('\n🔍 Validating configuration...');
    const validationResult = await validateAWSServiceConfigurations();
    
    if (validationResult.valid) {
      console.log('✅ All configurations are valid!');
    } else {
      console.log('⚠️ Configuration issues detected:');
      Object.entries(validationResult.services).forEach(([service, config]) => {
        if (!config.valid) {
          console.log(`   ❌ ${service}: ${config.issues.join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

/**
 * Example: Advanced setup with detailed control
 */
async function exampleAdvancedSetup(): Promise<void> {
  console.log('\n📋 Method 2: Using AWSServiceConfigurator class');
  console.log('-' .repeat(40));

  const configurator = new AWSServiceConfigurator();

  try {
    // Step 1: Test connectivity first
    console.log('🔗 Testing AWS service connectivity...');
    const connectivityResult = await configurator.testServiceConnectivity();
    
    if (!connectivityResult.success) {
      console.log('⚠️ Some services are unreachable:');
      Object.entries(connectivityResult.services).forEach(([service, reachable]) => {
        if (!reachable) {
          console.log(`   ❌ ${service}: unreachable`);
        }
      });
      console.log('Continuing with setup anyway...');
    } else {
      console.log('✅ All services are reachable');
    }

    // Step 2: Configure all services
    console.log('\n🏗️ Configuring AWS services...');
    const configResult = await configurator.configureAllServices();
    
    if (configResult.success) {
      console.log('✅ Configuration completed successfully!');
      
      // Show detailed results
      console.log('\n📊 Configuration Details:');
      console.log('IAM Roles Created:');
      configResult.details.iam.rolesCreated.forEach(role => {
        console.log(`   ✓ ${role}`);
      });
      
      console.log('DynamoDB Tables Created:');
      configResult.details.dynamodb.tablesCreated.forEach(table => {
        console.log(`   ✓ ${table}`);
      });
      
      console.log('S3 Buckets Created:');
      configResult.details.s3.bucketsCreated.forEach(bucket => {
        console.log(`   ✓ ${bucket}`);
      });
      
    } else {
      console.log('❌ Configuration failed:', configResult.message);
      
      // Show specific errors
      if (!configResult.details.iam.success) {
        console.log(`   IAM Error: ${configResult.details.iam.errors?.join(', ')}`);
      }
      if (!configResult.details.dynamodb.success) {
        console.log(`   DynamoDB Error: ${configResult.details.dynamodb.errors?.join(', ')}`);
      }
      if (!configResult.details.s3.success) {
        console.log(`   S3 Error: ${configResult.details.s3.errors?.join(', ')}`);
      }
      return;
    }

    // Step 3: Get service status
    console.log('\n📊 Getting service status...');
    const statusResult = await configurator.getServiceStatus();
    
    console.log(`Overall Status: ${statusResult.overall.toUpperCase()}`);
    console.log('Service Status:');
    Object.entries(statusResult.services).forEach(([service, status]) => {
      const emoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
      console.log(`   ${emoji} ${service.toUpperCase()}: ${status}`);
    });

    // Step 4: Generate comprehensive report
    console.log('\n📋 Generating configuration report...');
    const report = await configurator.generateConfigurationReport();
    
    console.log('Configuration Report Generated:');
    console.log(`   Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`   Configuration Valid: ${report.configuration.success ? '✅' : '❌'}`);
    console.log(`   Validation Passed: ${report.validation.valid ? '✅' : '❌'}`);
    console.log(`   Connectivity OK: ${report.connectivity.success ? '✅' : '❌'}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

  } catch (error) {
    console.error('❌ Advanced setup failed:', error);
  }
}

/**
 * Example: Monitoring and maintenance workflow
 */
async function exampleMonitoringWorkflow(): Promise<void> {
  console.log('\n📋 Method 3: Monitoring and Maintenance');
  console.log('-' .repeat(40));

  const configurator = new AWSServiceConfigurator();

  try {
    // Regular health check
    console.log('🏥 Performing health check...');
    const status = await configurator.getServiceStatus();
    
    if (status.overall === 'healthy') {
      console.log('✅ All services are healthy');
    } else if (status.overall === 'degraded') {
      console.log('⚠️ Some services are degraded');
      
      // Identify degraded services
      Object.entries(status.services).forEach(([service, serviceStatus]) => {
        if (serviceStatus !== 'healthy') {
          console.log(`   ⚠️ ${service.toUpperCase()}: ${serviceStatus}`);
        }
      });
      
      // Attempt to fix issues
      console.log('\n🔧 Attempting to fix configuration issues...');
      const updateResult = await configurator.updateServiceConfiguration();
      
      if (updateResult.success) {
        console.log('✅ Configuration issues resolved');
      } else {
        console.log('❌ Failed to resolve all issues');
      }
      
    } else {
      console.log('❌ Services are unhealthy - manual intervention required');
    }

    // Periodic validation
    console.log('\n🔍 Performing periodic validation...');
    const validation = await configurator.validateServiceConfiguration();
    
    if (!validation.valid) {
      console.log('⚠️ Configuration drift detected:');
      Object.entries(validation.services).forEach(([service, config]) => {
        if (!config.valid) {
          console.log(`   ❌ ${service}: ${config.issues.join(', ')}`);
        }
      });
      
      console.log('\n💡 Recommended actions:');
      validation.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    } else {
      console.log('✅ No configuration drift detected');
    }

  } catch (error) {
    console.error('❌ Monitoring workflow failed:', error);
  }
}

/**
 * Example: Error handling and recovery
 */
async function exampleErrorHandling(): Promise<void> {
  console.log('\n📋 Method 4: Error Handling and Recovery');
  console.log('-' .repeat(40));

  const configurator = new AWSServiceConfigurator();

  try {
    // Attempt configuration with error handling
    console.log('🔧 Attempting configuration with error handling...');
    
    const result = await configurator.configureAllServices();
    
    if (!result.success) {
      console.log('❌ Configuration failed, analyzing errors...');
      
      // Analyze specific failures
      const failedServices = [];
      
      if (!result.details.iam.success) {
        failedServices.push('IAM');
        console.log(`   IAM Issues: ${result.details.iam.errors?.join(', ')}`);
      }
      
      if (!result.details.dynamodb.success) {
        failedServices.push('DynamoDB');
        console.log(`   DynamoDB Issues: ${result.details.dynamodb.errors?.join(', ')}`);
      }
      
      if (!result.details.s3.success) {
        failedServices.push('S3');
        console.log(`   S3 Issues: ${result.details.s3.errors?.join(', ')}`);
      }
      
      // Provide recovery suggestions
      console.log('\n🔧 Recovery Suggestions:');
      
      if (failedServices.includes('IAM')) {
        console.log('   - Check IAM permissions for role creation');
        console.log('   - Verify AWS credentials have sufficient privileges');
      }
      
      if (failedServices.includes('DynamoDB')) {
        console.log('   - Check DynamoDB service limits');
        console.log('   - Verify region availability');
      }
      
      if (failedServices.includes('S3')) {
        console.log('   - Check S3 bucket naming conflicts');
        console.log('   - Verify S3 service permissions');
      }
      
      console.log('   - Review AWS CloudTrail logs for detailed error information');
      console.log('   - Contact AWS support if issues persist');
    }

  } catch (error) {
    console.error('❌ Unexpected error during configuration:', error);
    
    // Provide general recovery guidance
    console.log('\n🔧 General Recovery Steps:');
    console.log('   1. Check AWS credentials and configuration');
    console.log('   2. Verify network connectivity to AWS services');
    console.log('   3. Check AWS service status page');
    console.log('   4. Review application logs for detailed error information');
    console.log('   5. Retry configuration after resolving underlying issues');
  }
}

/**
 * Main example runner
 */
async function runExamples(): Promise<void> {
  console.log('🎯 Privacy Comply Agent - AWS Service Configuration Examples');
  console.log('=' .repeat(80));
  
  // Check if we should run examples based on environment
  const runExamples = process.env.RUN_AWS_EXAMPLES === 'true';
  
  if (!runExamples) {
    console.log('ℹ️  Set RUN_AWS_EXAMPLES=true to run actual AWS configuration examples');
    console.log('ℹ️  These examples will create real AWS resources and may incur costs');
    return;
  }

  try {
    // Run all examples
    await exampleCompleteSetup();
    await exampleAdvancedSetup();
    await exampleMonitoringWorkflow();
    await exampleErrorHandling();
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export examples for use in other modules
export {
  exampleCompleteSetup,
  exampleAdvancedSetup,
  exampleMonitoringWorkflow,
  exampleErrorHandling,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error('❌ Failed to run examples:', error);
    process.exit(1);
  });
}