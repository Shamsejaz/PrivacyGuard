/**
 * Example usage of SageMaker Training Pipeline
 * This file demonstrates how to use the ML components for training and deploying models
 */

import { 
  SageMakerPipelineOrchestrator,
  TrainingDataCollector,
  ModelTrainingPipeline,
  ModelDeploymentManager
} from './index';
import { FeedbackLearningSystem } from './feedback-learning-system';

/**
 * Example 1: Complete ML Pipeline Execution
 */
async function executeCompletePipeline() {
  console.log('=== Complete ML Pipeline Example ===');
  
  const orchestrator = new SageMakerPipelineOrchestrator();
  
  const config = {
    taskType: 'risk_prediction' as const,
    algorithm: 'xgboost' as const,
    dataTimeRange: {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    },
    executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerExecutionRole',
    trainingInstanceType: 'ml.m5.large',
    deploymentInstanceType: 'ml.t2.medium',
    deploymentInstanceCount: 1,
    maxTrainingTime: 3600, // 1 hour
    performanceCriteria: {
      minAccuracy: 0.85,
      minPrecision: 0.80,
      minRecall: 0.75
    },
    retrainingSchedule: 'weekly',
    enableAutoScaling: true
  };

  try {
    const result = await orchestrator.executeCompletePipeline(config);
    
    console.log('Pipeline completed successfully!');
    console.log(`Pipeline ID: ${result.pipelineId}`);
    console.log(`Training Status: ${result.trainingResult.trainingStatus}`);
    console.log(`Model Version: ${result.trainingResult.modelVersion}`);
    console.log(`Overall Status: ${result.overallStatus}`);
    
    if (result.deploymentResult) {
      console.log(`Endpoint Name: ${result.deploymentResult.endpointName}`);
      console.log(`Deployment Status: ${result.deploymentResult.deploymentStatus}`);
      console.log(`Validation Tests Passed: ${result.deploymentResult.validationResults.passedTests}/${result.deploymentResult.validationResults.totalTests}`);
    }
    
    return result;
  } catch (error) {
    console.error('Pipeline execution failed:', error);
    throw error;
  }
}

/**
 * Example 2: Training Data Collection and Analysis
 */
async function collectAndAnalyzeTrainingData() {
  console.log('=== Training Data Collection Example ===');
  
  const collector = new TrainingDataCollector();
  
  const timeRange = {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31')
  };

  try {
    // Collect training data
    const trainingData = await collector.collectTrainingData(timeRange);
    console.log(`Collected ${trainingData.length} training samples`);
    
    // Get statistics
    const stats = await collector.getTrainingDataStats(trainingData);
    console.log('Training Data Statistics:');
    console.log(`- Total Samples: ${stats.totalSamples}`);
    console.log(`- Samples with Feedback: ${stats.samplesWithFeedback}`);
    console.log(`- Samples with Remediation: ${stats.samplesWithRemediation}`);
    console.log(`- Average Risk Score: ${stats.averageRiskScore.toFixed(2)}`);
    console.log(`- Average Confidence Score: ${stats.averageConfidenceScore.toFixed(2)}`);
    
    // Prepare data for different tasks
    const riskPredictionData = await collector.prepareDataForTask(trainingData, 'risk_prediction');
    const falsePositiveData = await collector.prepareDataForTask(trainingData, 'false_positive_detection');
    const remediationData = await collector.prepareDataForTask(trainingData, 'remediation_success_prediction');
    
    console.log(`Risk Prediction Dataset: ${riskPredictionData.length} samples`);
    console.log(`False Positive Detection Dataset: ${falsePositiveData.length} samples`);
    console.log(`Remediation Success Dataset: ${remediationData.length} samples`);
    
    // Store datasets
    await collector.storeTrainingData(trainingData, 'compliance-training-2023');
    console.log('Training data stored successfully');
    
    return { trainingData, stats };
  } catch (error) {
    console.error('Training data collection failed:', error);
    throw error;
  }
}

/**
 * Example 3: Model Training Only
 */
async function trainModelOnly() {
  console.log('=== Model Training Only Example ===');
  
  const trainingPipeline = new ModelTrainingPipeline();
  
  const config = {
    taskType: 'false_positive_detection' as const,
    algorithm: 'sklearn' as const,
    dataTimeRange: {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31')
    },
    executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerExecutionRole',
    instanceType: 'ml.m5.large',
    maxRuntimeSeconds: 1800, // 30 minutes
    performanceCriteria: {
      minAccuracy: 0.80,
      minPrecision: 0.75,
      minRecall: 0.70
    }
  };

  try {
    const result = await trainingPipeline.executeTrainingPipeline(config);
    
    console.log('Training completed successfully!');
    console.log(`Training Job: ${result.trainingJobName}`);
    console.log(`Training Status: ${result.trainingStatus}`);
    console.log(`Model Performance:`);
    console.log(`- Accuracy: ${result.evaluation.metrics.accuracy.toFixed(3)}`);
    console.log(`- Precision: ${result.evaluation.metrics.precision.toFixed(3)}`);
    console.log(`- Recall: ${result.evaluation.metrics.recall.toFixed(3)}`);
    console.log(`- F1 Score: ${result.evaluation.metrics.f1Score.toFixed(3)}`);
    console.log(`- Meets Criteria: ${result.evaluation.meetsPerformanceCriteria}`);
    
    if (result.modelVersion) {
      console.log(`Model Version: ${result.modelVersion}`);
    }
    
    return result;
  } catch (error) {
    console.error('Model training failed:', error);
    throw error;
  }
}

/**
 * Example 4: Model Deployment and Management
 */
async function deployAndManageModel() {
  console.log('=== Model Deployment Example ===');
  
  const deploymentManager = new ModelDeploymentManager();
  
  const deployConfig = {
    modelName: 'privacy-comply-risk-prediction',
    modelVersion: 'v1640995200000',
    taskType: 'risk_prediction',
    algorithm: 'xgboost',
    executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerExecutionRole',
    instanceType: 'ml.t2.medium',
    instanceCount: 1
  };

  try {
    // Deploy model
    const deployResult = await deploymentManager.deployModel(deployConfig);
    console.log('Model deployed successfully!');
    console.log(`Endpoint Name: ${deployResult.endpointName}`);
    console.log(`Deployment Status: ${deployResult.deploymentStatus}`);
    console.log(`Validation Results: ${deployResult.validationResults.passedTests}/${deployResult.validationResults.totalTests} tests passed`);
    
    // Get endpoint metrics
    const metrics = await deploymentManager.getEndpointMetrics(deployResult.endpointName);
    console.log('Endpoint Metrics:');
    console.log(`- Invocations/min: ${metrics.invocationsPerMinute.toFixed(1)}`);
    console.log(`- Average Latency: ${metrics.averageLatency.toFixed(1)}ms`);
    console.log(`- Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`- CPU Utilization: ${metrics.cpuUtilization.toFixed(1)}%`);
    
    // List all deployed models
    const deployedModels = await deploymentManager.listDeployedModels();
    console.log(`\nTotal Deployed Models: ${deployedModels.length}`);
    deployedModels.forEach(model => {
      console.log(`- ${model.modelName}:${model.modelVersion} (${model.taskType}) - ${model.deploymentStatus}`);
    });
    
    return { deployResult, metrics, deployedModels };
  } catch (error) {
    console.error('Model deployment failed:', error);
    throw error;
  }
}

/**
 * Example 5: Monitoring and Retraining
 */
async function monitorAndRetrain() {
  console.log('=== Monitoring and Retraining Example ===');
  
  const orchestrator = new SageMakerPipelineOrchestrator();
  
  try {
    // Monitor model performance
    const monitoringResult = await orchestrator.monitorModelPerformance('privacy-comply-risk-prediction');
    console.log('Performance Monitoring Results:');
    console.log(`- Performance Trend: ${monitoringResult.performanceTrend}`);
    console.log(`- Accuracy Drift: ${(monitoringResult.accuracyDrift * 100).toFixed(2)}%`);
    console.log(`- Retraining Recommended: ${monitoringResult.retrainingRecommended}`);
    
    // Schedule periodic retraining
    const retrainingConfig = {
      taskType: 'risk_prediction',
      frequency: 'monthly' as const,
      pipelineConfig: {
        taskType: 'risk_prediction' as const,
        algorithm: 'xgboost' as const,
        dataTimeRange: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          endDate: new Date()
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerExecutionRole',
        performanceCriteria: {
          minAccuracy: 0.85
        }
      }
    };
    
    const scheduleId = await orchestrator.schedulePeriodicRetraining(retrainingConfig);
    console.log(`Retraining scheduled with ID: ${scheduleId}`);
    
    // Get active schedules
    const activeSchedules = await orchestrator.getActiveRetrainingSchedules();
    console.log(`\nActive Retraining Schedules: ${activeSchedules.length}`);
    activeSchedules.forEach(schedule => {
      console.log(`- ${schedule.taskType}: ${schedule.frequency} (Next: ${schedule.nextExecution.toISOString()})`);
    });
    
    // Get execution history
    const history = await orchestrator.getPipelineExecutionHistory();
    console.log(`\nPipeline Execution History: ${history.length} executions`);
    history.slice(0, 3).forEach(execution => {
      console.log(`- ${execution.pipelineId}: ${execution.taskType} (${execution.status}) - Accuracy: ${execution.trainingAccuracy.toFixed(3)}`);
    });
    
    return { monitoringResult, scheduleId, activeSchedules, history };
  } catch (error) {
    console.error('Monitoring and retraining setup failed:', error);
    throw error;
  }
}

/**
 * Example 6: A/B Testing Between Model Versions
 */
async function setupABTesting() {
  console.log('=== A/B Testing Example ===');
  
  const deploymentManager = new ModelDeploymentManager();
  
  const abTestConfig = {
    testName: 'risk-prediction-ab-test',
    modelA: {
      modelName: 'privacy-comply-risk-prediction',
      modelVersion: 'v1640995200000'
    },
    modelB: {
      modelName: 'privacy-comply-risk-prediction',
      modelVersion: 'v1640995300000'
    },
    trafficSplit: {
      variantA: 0.7, // 70% traffic to model A
      variantB: 0.3  // 30% traffic to model B
    },
    duration: 14 // 14 days
  };

  try {
    const abTestEndpointConfig = await deploymentManager.setupABTesting(abTestConfig);
    console.log('A/B test setup completed!');
    console.log(`A/B Test Endpoint Config: ${abTestEndpointConfig}`);
    console.log(`Traffic Split: ${abTestConfig.trafficSplit.variantA * 100}% / ${abTestConfig.trafficSplit.variantB * 100}%`);
    console.log(`Test Duration: ${abTestConfig.duration} days`);
    
    return abTestEndpointConfig;
  } catch (error) {
    console.error('A/B testing setup failed:', error);
    throw error;
  }
}

/**
 * Example 7: Feedback and Learning System
 */
async function demonstrateFeedbackLearning() {
  console.log('=== Feedback and Learning System Example ===');
  
  const feedbackLearningSystem = new FeedbackLearningSystem();
  
  try {
    // Initialize the system
    await feedbackLearningSystem.initialize();
    console.log('Feedback and Learning System initialized');
    
    // Simulate a compliance workflow
    const mockWorkflow = {
      finding: {
        id: 'finding-demo-1',
        resourceArn: 'arn:aws:s3:::demo-bucket',
        findingType: 'ENCRYPTION' as const,
        severity: 'HIGH' as const,
        description: 'S3 bucket lacks encryption',
        detectedAt: new Date(),
        rawData: { bucketName: 'demo-bucket', encryption: false }
      },
      assessment: {
        findingId: 'finding-demo-1',
        legalMappings: [
          { regulation: 'GDPR' as const, article: 'Article 32', description: 'Security of processing', applicability: 0.9 }
        ],
        riskScore: 8.5,
        confidenceScore: 0.85,
        recommendations: [],
        reasoning: 'Unencrypted S3 bucket violates GDPR security requirements',
        assessedAt: new Date()
      },
      recommendations: [
        {
          id: 'rec-demo-1',
          findingId: 'finding-demo-1',
          action: 'ENABLE_ENCRYPTION' as const,
          priority: 'HIGH' as const,
          automatable: true,
          lambdaFunction: 'encryption-enablement',
          parameters: { bucketName: 'demo-bucket' },
          estimatedImpact: 'Low operational impact'
        }
      ],
      modelUsed: 'claude-3-sonnet',
      processingTime: 15.5
    };
    
    // Record the workflow
    const workflowResult = await feedbackLearningSystem.recordComplianceWorkflow(mockWorkflow);
    console.log(`Workflow recorded - Assessment Trail: ${workflowResult.assessmentTrailId}`);
    console.log(`Remediation Trails: ${workflowResult.remediationTrailIds.join(', ')}`);
    
    // Collect feedback
    const feedbackResult = await feedbackLearningSystem.collectWorkflowFeedback({
      findingId: 'finding-demo-1',
      assessmentId: 'finding-demo-1',
      userId: 'demo-user',
      assessmentFeedback: {
        correctAssessment: true,
        correctRiskScore: 8.0,
        comments: 'Assessment was accurate'
      },
      remediationFeedback: {
        remediationId: 'rem-demo-1',
        recommendationId: 'rec-demo-1',
        effectiveRemediation: true,
        actualOutcome: 'SUCCESS',
        comments: 'Remediation worked perfectly'
      },
      detectionFeedback: {
        falsePositive: false,
        actualSeverity: 'HIGH',
        comments: 'Detection was correct'
      }
    });
    console.log(`Feedback collected - Assessment: ${feedbackResult.assessmentFeedbackId}`);
    console.log(`Remediation: ${feedbackResult.remediationFeedbackId}`);
    console.log(`Detection: ${feedbackResult.detectionFeedbackId}`);
    
    // Process feedback for learning
    const learningResult = await feedbackLearningSystem.processFeedbackForLearning();
    console.log(`Processed ${learningResult.processedFeedbackCount} feedback items`);
    console.log(`Training data generated: ${learningResult.trainingDataGenerated}`);
    console.log(`Improvement recommendations: ${learningResult.improvementRecommendations.length}`);
    
    // Generate learning insights
    const timeRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    };
    
    const insights = await feedbackLearningSystem.generateLearningInsights(timeRange);
    console.log(`System Performance Score: ${insights.systemPerformance.overallScore.toFixed(1)}`);
    console.log(`Actionable Insights: ${insights.actionableInsights.length}`);
    console.log(`Recommended Actions: ${insights.recommendedActions.length}`);
    
    // Get system health status
    const healthStatus = await feedbackLearningSystem.getSystemHealthStatus();
    console.log(`Overall Health: ${healthStatus.overallHealth}`);
    console.log(`Feedback System: ${healthStatus.feedbackSystemStatus}`);
    console.log(`Decision Tracking: ${healthStatus.decisionTrackingStatus}`);
    console.log(`Learning System: ${healthStatus.learningSystemStatus}`);
    console.log(`Recent Feedback Volume: ${healthStatus.recentMetrics.feedbackVolume}`);
    console.log(`Recent Decision Volume: ${healthStatus.recentMetrics.decisionVolume}`);
    console.log(`Alerts: ${healthStatus.alerts.length}`);
    
    // Export learning data
    const exportResult = await feedbackLearningSystem.exportLearningData(timeRange);
    console.log('Learning data exported:');
    console.log(`- Feedback: ${exportResult.feedbackExportPath}`);
    console.log(`- Decision Trail: ${exportResult.decisionTrailExportPath}`);
    console.log(`- Performance Report: ${exportResult.performanceReportPath}`);
    
    return {
      workflowResult,
      feedbackResult,
      learningResult,
      insights,
      healthStatus,
      exportResult
    };
  } catch (error) {
    console.error('Feedback and learning demonstration failed:', error);
    throw error;
  }
}

/**
 * Main execution function - runs all examples
 */
async function runAllExamples() {
  console.log('🚀 Starting SageMaker Training Pipeline Examples\n');
  
  try {
    // Example 1: Complete Pipeline
    await executeCompletePipeline();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 2: Data Collection
    await collectAndAnalyzeTrainingData();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 3: Training Only
    await trainModelOnly();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 4: Deployment
    await deployAndManageModel();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 5: Monitoring
    await monitorAndRetrain();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 6: A/B Testing
    await setupABTesting();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 7: Feedback and Learning
    await demonstrateFeedbackLearning();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export examples for individual use
export {
  executeCompletePipeline,
  collectAndAnalyzeTrainingData,
  trainModelOnly,
  deployAndManageModel,
  monitorAndRetrain,
  setupABTesting,
  demonstrateFeedbackLearning,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}