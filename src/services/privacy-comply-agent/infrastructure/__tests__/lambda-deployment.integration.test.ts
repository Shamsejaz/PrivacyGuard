/**
 * Integration tests for Lambda deployment (Task 10.2)
 */

import {
    deployLambdaFunctionsAndConfigureTriggers,
    testDeployedLambdaFunctions,
    getDeploymentStatus,
    LambdaDeploymentReport
} from '../deploy-lambda-functions';
import { LambdaDeploymentManager } from '../lambda-deployment';
import { CloudWatchMonitoringManager } from '../cloudwatch-monitoring';
import { ServiceIntegrationManager } from '../service-integration';

describe('Lambda Deployment Integration Tests (Task 10.2)', () => {
    let deploymentManager: LambdaDeploymentManager;
    let monitoringManager: CloudWatchMonitoringManager;
    let integrationManager: ServiceIntegrationManager;

    beforeAll(() => {
        deploymentManager = new LambdaDeploymentManager();
        monitoringManager = new CloudWatchMonitoringManager();
        integrationManager = new ServiceIntegrationManager();
    });

    describe('Lambda Function Deployment', () => {
        test('should deploy all remediation Lambda functions', async () => {
            const results = await deploymentManager.deployAllLambdaFunctions();

            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);

            // Check that all functions deployed successfully
            const successfulDeployments = results.filter(r => r.success);
            expect(successfulDeployments.length).toBe(results.length);

            // Verify function ARNs are returned
            successfulDeployments.forEach(result => {
                expect(result.functionArn).toBeDefined();
                expect(result.functionArn).toMatch(/^arn:aws:lambda:/);
            });
        }, 60000);

        test('should configure event triggers for Lambda functions', async () => {
            const results = await deploymentManager.deployAllLambdaFunctions();

            // Check that triggers are configured
            results.forEach(result => {
                if (result.success && result.triggers) {
                    expect(result.triggers.length).toBeGreaterThan(0);

                    result.triggers.forEach(trigger => {
                        expect(trigger.ruleName).toBeDefined();
                        expect(typeof trigger.success).toBe('boolean');
                    });
                }
            });
        }, 45000);

        test('should validate Lambda function deployment status', async () => {
            const status = await deploymentManager.getDeploymentStatus();

            expect(status).toBeDefined();
            expect(Array.isArray(status)).toBe(true);

            status.forEach(functionStatus => {
                expect(functionStatus.functionName).toBeDefined();
                expect(typeof functionStatus.deployed).toBe('boolean');

                if (functionStatus.deployed) {
                    expect(functionStatus.lastModified).toBeDefined();
                    expect(functionStatus.version).toBeDefined();
                }
            });
        }, 30000);
    });

    describe('CloudWatch Monitoring Configuration', () => {
        test('should set up monitoring for all Lambda functions', async () => {
            await monitoringManager.setupMonitoringForAllFunctions();

            const status = await monitoringManager.getMonitoringStatus();

            expect(status).toBeDefined();
            expect(Array.isArray(status)).toBe(true);

            status.forEach(monitoringStatus => {
                expect(monitoringStatus.functionName).toBeDefined();
                expect(monitoringStatus.logGroupExists).toBe(true);
                expect(monitoringStatus.alarmsConfigured).toBeGreaterThan(0);
            });
        }, 45000);

        test('should validate event triggers functionality', async () => {
            const validation = await monitoringManager.validateEventTriggers();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);
            expect(Array.isArray(validation.triggers)).toBe(true);

            validation.triggers.forEach(trigger => {
                expect(trigger.ruleName).toBeDefined();
                expect(typeof trigger.enabled).toBe('boolean');
                expect(typeof trigger.targets).toBe('number');
                expect(typeof trigger.successfulInvocations).toBe('number');
                expect(typeof trigger.failedInvocations).toBe('number');
            });
        }, 30000);

        test('should validate monitoring and alerting', async () => {
            const validation = await monitoringManager.validateMonitoring();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);
            expect(validation.metrics).toBeDefined();
            expect(Array.isArray(validation.alerts)).toBe(true);

            // Validate metrics
            const metrics = validation.metrics;
            expect(typeof metrics.lambdaInvocations).toBe('number');
            expect(typeof metrics.successfulRemediations).toBe('number');
            expect(typeof metrics.failedRemediations).toBe('number');
            expect(typeof metrics.averageResponseTime).toBe('number');
            expect(typeof metrics.errorRate).toBe('number');

            // Validate alerts
            validation.alerts.forEach(alert => {
                expect(alert.alertName).toBeDefined();
                expect(typeof alert.enabled).toBe('boolean');
                expect(typeof alert.threshold).toBe('number');
                expect(typeof alert.currentValue).toBe('number');
                expect(alert.status).toBeDefined();
            });
        }, 30000);
    });

    describe('Service Integration Configuration', () => {
        test('should configure all service integrations', async () => {
            await integrationManager.configureAllIntegrations();

            const status = await integrationManager.getIntegrationStatus();

            expect(status).toBeDefined();
            expect(status.lambdaIntegrations).toBe(true);
            expect(status.eventBridgeIntegrations).toBe(true);
            expect(status.notificationIntegrations).toBe(true);
            expect(status.securityHubIntegration).toBe(true);
            expect(status.macieIntegration).toBe(true);
            expect(status.bedrockIntegration).toBe(true);
        }, 60000);

        test('should validate service integrations', async () => {
            const validation = await integrationManager.validateIntegrations();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);
            expect(Array.isArray(validation.issues)).toBe(true);
            expect(validation.issues.length).toBe(0);
        }, 30000);

        test('should validate data flow between services', async () => {
            const validation = await integrationManager.validateDataFlow();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);
            expect(Array.isArray(validation.flows)).toBe(true);

            validation.flows.forEach(flow => {
                expect(flow.source).toBeDefined();
                expect(flow.target).toBeDefined();
                expect(typeof flow.success).toBe('boolean');
                expect(typeof flow.latency).toBe('number');
                expect(typeof flow.dataIntegrity).toBe('boolean');
            });
        }, 30000);
    });

    describe('End-to-End Deployment', () => {
        test('should complete full Lambda deployment and configuration', async () => {
            const report: LambdaDeploymentReport = await deployLambdaFunctionsAndConfigureTriggers();

            expect(report).toBeDefined();
            expect(report.success).toBe(true);
            expect(Array.isArray(report.deployedFunctions)).toBe(true);
            expect(Array.isArray(report.failedFunctions)).toBe(true);
            expect(typeof report.triggersConfigured).toBe('number');
            expect(report.monitoringSetup).toBe(true);
            expect(report.integrationStatus).toBe(true);
            expect(typeof report.executionTime).toBe('number');

            // Should have deployed at least 3 Lambda functions
            expect(report.deployedFunctions.length).toBeGreaterThanOrEqual(3);
            expect(report.failedFunctions.length).toBe(0);
            expect(report.triggersConfigured).toBeGreaterThan(0);

            // Validate deployment details
            expect(report.details).toBeDefined();
            expect(report.details.deploymentResults).toBeDefined();
            expect(report.details.validation).toBeDefined();
            expect(report.details.functionMetadata).toBeDefined();
        }, 120000);

        test('should test deployed Lambda functions', async () => {
            const testResult = await testDeployedLambdaFunctions();

            expect(testResult).toBeDefined();
            expect(testResult.success).toBe(true);
            expect(Array.isArray(testResult.testResults)).toBe(true);

            testResult.testResults.forEach(result => {
                expect(result.functionName).toBeDefined();
                expect(typeof result.success).toBe('boolean');
                expect(typeof result.responseTime).toBe('number');
                expect(typeof result.statusCode).toBe('number');
                expect(result.payload).toBeDefined();

                // Response time should be reasonable (less than 30 seconds)
                expect(result.responseTime).toBeLessThan(30000);

                // Status code should indicate success
                if (result.success) {
                    expect(result.statusCode).toBe(200);
                }
            });
        }, 90000);

        test('should get comprehensive deployment status', async () => {
            const status = await getDeploymentStatus();

            expect(status).toBeDefined();

            // Lambda functions status
            expect(Array.isArray(status.lambdaFunctions)).toBe(true);
            status.lambdaFunctions.forEach(func => {
                expect(func.functionName).toBeDefined();
                expect(typeof func.deployed).toBe('boolean');
            });

            // Event triggers status
            expect(status.eventTriggers).toBeDefined();
            expect(typeof status.eventTriggers.valid).toBe('boolean');
            expect(Array.isArray(status.eventTriggers.triggers)).toBe(true);

            // Monitoring status
            expect(status.monitoring).toBeDefined();
            expect(typeof status.monitoring.valid).toBe('boolean');
            expect(status.monitoring.metrics).toBeDefined();
            expect(Array.isArray(status.monitoring.alerts)).toBe(true);

            // Integrations status
            expect(status.integrations).toBeDefined();
            expect(typeof status.integrations.lambdaIntegrations).toBe('boolean');
            expect(typeof status.integrations.eventBridgeIntegrations).toBe('boolean');
            expect(typeof status.integrations.notificationIntegrations).toBe('boolean');
        }, 60000);
    });

    describe('Security and Compliance Validation', () => {
        test('should validate encryption at rest and in transit', async () => {
            const validation = await integrationManager.validateEncryption();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);

            // At rest encryption
            expect(validation.atRest).toBeDefined();
            expect(validation.atRest.s3Buckets.encrypted).toBe(true);
            expect(validation.atRest.dynamodbTables.encrypted).toBe(true);
            expect(validation.atRest.lambdaEnvironmentVariables.encrypted).toBe(true);

            // In transit encryption
            expect(validation.inTransit).toBeDefined();
            expect(validation.inTransit.apiEndpoints.tlsVersion).toBeDefined();
            expect(validation.inTransit.apiEndpoints.certificateValid).toBe(true);
            expect(validation.inTransit.serviceConnections.encrypted).toBe(true);
            expect(validation.inTransit.lambdaInvocations.encrypted).toBe(true);
        }, 30000);

        test('should validate access controls and least privilege', async () => {
            const validation = await integrationManager.validateAccessControls();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);

            // IAM roles validation
            expect(Array.isArray(validation.iamRoles)).toBe(true);
            validation.iamRoles.forEach(role => {
                expect(role.roleName).toBeDefined();
                expect(role.leastPrivilege).toBe(true);
                expect(Array.isArray(role.unnecessaryPermissions)).toBe(true);
                expect(Array.isArray(role.missingPermissions)).toBe(true);
                expect(role.unnecessaryPermissions.length).toBe(0);
                expect(role.missingPermissions.length).toBe(0);
            });

            // Resource policies validation
            expect(validation.resourcePolicies).toBeDefined();
            expect(validation.resourcePolicies.s3BucketsPublicAccess).toBe(false);
            expect(validation.resourcePolicies.lambdaFunctionPublicAccess).toBe(false);
            expect(validation.resourcePolicies.dynamodbTablePublicAccess).toBe(false);
        }, 30000);

        test('should validate audit logging functionality', async () => {
            const validation = await monitoringManager.validateAuditLogging();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);

            // CloudTrail validation
            expect(validation.cloudTrail).toBeDefined();
            expect(validation.cloudTrail.enabled).toBe(true);
            expect(validation.cloudTrail.logFileValidation).toBe(true);
            expect(validation.cloudTrail.multiRegion).toBe(true);
            expect(validation.cloudTrail.includeGlobalServices).toBe(true);

            // Lambda logs validation
            expect(validation.lambdaLogs).toBeDefined();
            expect(validation.lambdaLogs.enabled).toBe(true);
            expect(validation.lambdaLogs.retentionPeriod).toBeGreaterThan(0);
            expect(validation.lambdaLogs.encrypted).toBe(true);

            // Compliance reports validation
            expect(validation.complianceReports).toBeDefined();
            expect(validation.complianceReports.generated).toBe(true);
            expect(validation.complianceReports.encrypted).toBe(true);
        }, 30000);
    });

    describe('Performance and Scalability Validation', () => {
        test('should validate system performance', async () => {
            const validation = await monitoringManager.validatePerformance();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);

            // Lambda performance
            expect(validation.lambdaPerformance).toBeDefined();
            expect(validation.lambdaPerformance.coldStartTime).toBeLessThan(5000);
            expect(validation.lambdaPerformance.warmExecutionTime).toBeLessThan(10000);
            expect(validation.lambdaPerformance.memoryUtilization).toBeLessThan(1);
            expect(validation.lambdaPerformance.concurrentExecutions).toBeGreaterThan(0);

            // Database performance
            expect(validation.databasePerformance).toBeDefined();
            expect(validation.databasePerformance.readLatency).toBeLessThan(100);
            expect(validation.databasePerformance.writeLatency).toBeLessThan(100);
            expect(validation.databasePerformance.throughputUtilization).toBeLessThan(1);

            // API performance
            expect(validation.apiPerformance).toBeDefined();
            expect(validation.apiPerformance.averageResponseTime).toBeLessThan(5000);
            expect(validation.apiPerformance.errorRate).toBeLessThan(0.05);
        }, 30000);

        test('should validate auto-scaling capabilities', async () => {
            const validation = await monitoringManager.validateAutoScaling();

            expect(validation).toBeDefined();
            expect(validation.valid).toBe(true);

            // Lambda scaling
            expect(validation.lambdaScaling).toBeDefined();
            expect(validation.lambdaScaling.maxConcurrency).toBeGreaterThan(0);
            expect(validation.lambdaScaling.throttlingEvents).toBe(0);

            // DynamoDB scaling
            expect(validation.dynamodbScaling).toBeDefined();
            expect(validation.dynamodbScaling.autoScalingEnabled).toBe(true);
            expect(validation.dynamodbScaling.readCapacityUtilization).toBeLessThan(1);
            expect(validation.dynamodbScaling.writeCapacityUtilization).toBeLessThan(1);
        }, 30000);
    });
});