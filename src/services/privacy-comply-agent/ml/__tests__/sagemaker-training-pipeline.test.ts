import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrainingDataCollector } from '../training-data-collector';
import { ModelTrainingPipeline } from '../model-training-pipeline';
import { ModelDeploymentManager } from '../model-deployment-manager';
import { SageMakerPipelineOrchestrator } from '../sagemaker-pipeline-orchestrator';
import { AWSServiceClients } from '../../config/service-clients';

// Mock AWS Service Clients
vi.mock('../../config/service-clients');

describe('SageMaker Training Pipeline', () => {
  let trainingDataCollector: TrainingDataCollector;
  let modelTrainingPipeline: ModelTrainingPipeline;
  let modelDeploymentManager: ModelDeploymentManager;
  let pipelineOrchestrator: SageMakerPipelineOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AWS clients
    const mockAWSClients = {
      getInstance: vi.fn().mockReturnValue({
        getS3Client: vi.fn().mockReturnValue({
          putObject: vi.fn().mockReturnValue({
            promise: vi.fn().mockResolvedValue({ ETag: 'mock-etag' })
          }),
          getObject: vi.fn().mockReturnValue({
            promise: vi.fn().mockResolvedValue({
              Body: Buffer.from('{"mock": "data"}')
            })
          })
        }),
        getSageMakerClient: vi.fn().mockReturnValue({
          createTrainingJob: vi.fn().mockResolvedValue({}),
          describeTrainingJob: vi.fn().mockResolvedValue({
            TrainingJobStatus: 'Completed'
          })
        }),
        getDynamoDBClient: vi.fn().mockReturnValue({
          query: vi.fn().mockReturnValue({
            promise: vi.fn().mockResolvedValue({ Items: [] })
          }),
          put: vi.fn().mockReturnValue({
            promise: vi.fn().mockResolvedValue({})
          })
        }),
        getS3ReportsBucket: vi.fn().mockReturnValue('test-bucket')
      })
    };

    (AWSServiceClients.getInstance as any).mockReturnValue(mockAWSClients.getInstance());

    trainingDataCollector = new TrainingDataCollector();
    modelTrainingPipeline = new ModelTrainingPipeline();
    modelDeploymentManager = new ModelDeploymentManager();
    pipelineOrchestrator = new SageMakerPipelineOrchestrator();
  });

  describe('TrainingDataCollector', () => {
    it('should collect training data successfully', async () => {
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const trainingData = await trainingDataCollector.collectTrainingData(timeRange);

      expect(trainingData).toBeDefined();
      expect(Array.isArray(trainingData)).toBe(true);
      expect(trainingData.length).toBeGreaterThan(0);
      
      // Verify training data structure
      const sample = trainingData[0];
      expect(sample).toHaveProperty('findingId');
      expect(sample).toHaveProperty('features');
      expect(sample).toHaveProperty('outcome');
      expect(sample.features).toHaveProperty('findingType');
      expect(sample.features).toHaveProperty('severity');
      expect(sample.features).toHaveProperty('riskScore');
    });

    it('should extract features correctly', async () => {
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const trainingData = await trainingDataCollector.collectTrainingData(timeRange);
      const features = trainingData[0].features;

      // Verify feature extraction
      expect(features).toHaveProperty('findingType');
      expect(features).toHaveProperty('severity');
      expect(features).toHaveProperty('resourceType');
      expect(features).toHaveProperty('riskScore');
      expect(features).toHaveProperty('confidenceScore');
      expect(features).toHaveProperty('legalMappingsCount');
      expect(features).toHaveProperty('gdprMappings');
      expect(features).toHaveProperty('pdplMappings');
      expect(features).toHaveProperty('ccpaMappings');
    });

    it('should prepare data for different ML tasks', async () => {
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const trainingData = await trainingDataCollector.collectTrainingData(timeRange);

      // Test risk prediction data preparation
      const riskData = await trainingDataCollector.prepareDataForTask(trainingData, 'risk_prediction');
      expect(riskData).toBeDefined();
      expect(riskData.length).toBeGreaterThan(0);
      expect(riskData[0]).toHaveProperty('features');
      expect(riskData[0]).toHaveProperty('target');

      // Test false positive detection data preparation
      const fpData = await trainingDataCollector.prepareDataForTask(trainingData, 'false_positive_detection');
      expect(fpData).toBeDefined();

      // Test remediation success prediction data preparation
      const remData = await trainingDataCollector.prepareDataForTask(trainingData, 'remediation_success_prediction');
      expect(remData).toBeDefined();
    });

    it('should store training data in S3', async () => {
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const trainingData = await trainingDataCollector.collectTrainingData(timeRange);
      const s3Key = await trainingDataCollector.storeTrainingData(trainingData, 'test-dataset');

      expect(s3Key).toBeDefined();
      expect(s3Key).toContain('training-data/test-dataset/');
      expect(s3Key).toContain('.json');
    });

    it('should generate training data statistics', async () => {
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const trainingData = await trainingDataCollector.collectTrainingData(timeRange);
      const stats = await trainingDataCollector.getTrainingDataStats(trainingData);

      expect(stats).toHaveProperty('totalSamples');
      expect(stats).toHaveProperty('samplesWithFeedback');
      expect(stats).toHaveProperty('samplesWithRemediation');
      expect(stats).toHaveProperty('findingTypeDistribution');
      expect(stats).toHaveProperty('severityDistribution');
      expect(stats).toHaveProperty('averageRiskScore');
      expect(stats).toHaveProperty('averageConfidenceScore');
      expect(stats.totalSamples).toBeGreaterThan(0);
    });
  });

  describe('ModelTrainingPipeline', () => {
    it('should execute training pipeline successfully', async () => {
      const config = {
        taskType: 'risk_prediction' as const,
        algorithm: 'xgboost' as const,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole',
        performanceCriteria: {
          minAccuracy: 0.8,
          minPrecision: 0.75,
          minRecall: 0.75
        }
      };

      const result = await modelTrainingPipeline.executeTrainingPipeline(config);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('trainingJobName');
      expect(result).toHaveProperty('taskType');
      expect(result).toHaveProperty('datasetS3Key');
      expect(result).toHaveProperty('trainingStatus');
      expect(result).toHaveProperty('evaluation');
      expect(result).toHaveProperty('completedAt');
      expect(result.taskType).toBe('risk_prediction');
    });

    it('should evaluate model performance correctly', async () => {
      const config = {
        taskType: 'false_positive_detection' as const,
        algorithm: 'sklearn' as const,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole'
      };

      const result = await modelTrainingPipeline.executeTrainingPipeline(config);

      expect(result.evaluation).toBeDefined();
      expect(result.evaluation).toHaveProperty('metrics');
      expect(result.evaluation).toHaveProperty('meetsPerformanceCriteria');
      expect(result.evaluation).toHaveProperty('evaluatedAt');
      expect(result.evaluation.metrics).toHaveProperty('accuracy');
      expect(result.evaluation.metrics).toHaveProperty('precision');
      expect(result.evaluation.metrics).toHaveProperty('recall');
      expect(result.evaluation.metrics).toHaveProperty('f1Score');
    });

    it('should list available models', async () => {
      const models = await modelTrainingPipeline.listAvailableModels();

      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      const model = models[0];
      expect(model).toHaveProperty('modelName');
      expect(model).toHaveProperty('version');
      expect(model).toHaveProperty('taskType');
      expect(model).toHaveProperty('status');
      expect(model).toHaveProperty('accuracy');
    });

    it('should filter models by task type', async () => {
      const riskModels = await modelTrainingPipeline.listAvailableModels('risk_prediction');
      
      expect(riskModels).toBeDefined();
      expect(Array.isArray(riskModels)).toBe(true);
      riskModels.forEach(model => {
        expect(model.taskType).toBe('risk_prediction');
      });
    });
  });

  describe('ModelDeploymentManager', () => {
    it('should deploy model successfully', async () => {
      const config = {
        modelName: 'privacy-comply-risk-prediction',
        modelVersion: 'v1640995200000',
        taskType: 'risk_prediction',
        algorithm: 'xgboost',
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole',
        instanceType: 'ml.t2.medium',
        instanceCount: 1
      };

      const result = await modelDeploymentManager.deployModel(config);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('modelName');
      expect(result).toHaveProperty('modelVersion');
      expect(result).toHaveProperty('endpointName');
      expect(result).toHaveProperty('deploymentStatus');
      expect(result).toHaveProperty('validationResults');
      expect(result).toHaveProperty('deployedAt');
      expect(result.deploymentStatus).toBe('SUCCESS');
    });

    it('should validate deployment correctly', async () => {
      const config = {
        modelName: 'privacy-comply-false-positive-detection',
        modelVersion: 'v1640995300000',
        taskType: 'false_positive_detection',
        algorithm: 'sklearn',
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole'
      };

      const result = await modelDeploymentManager.deployModel(config);

      expect(result.validationResults).toBeDefined();
      expect(result.validationResults).toHaveProperty('totalTests');
      expect(result.validationResults).toHaveProperty('passedTests');
      expect(result.validationResults).toHaveProperty('failedTests');
      expect(result.validationResults).toHaveProperty('averageLatency');
      expect(result.validationResults.totalTests).toBeGreaterThan(0);
    });

    it('should list deployed models', async () => {
      const deployedModels = await modelDeploymentManager.listDeployedModels();

      expect(deployedModels).toBeDefined();
      expect(Array.isArray(deployedModels)).toBe(true);
      expect(deployedModels.length).toBeGreaterThan(0);
      
      const model = deployedModels[0];
      expect(model).toHaveProperty('modelName');
      expect(model).toHaveProperty('modelVersion');
      expect(model).toHaveProperty('endpointName');
      expect(model).toHaveProperty('taskType');
      expect(model).toHaveProperty('deploymentStatus');
      expect(model).toHaveProperty('deployedAt');
    });

    it('should get endpoint metrics', async () => {
      const metrics = await modelDeploymentManager.getEndpointMetrics('test-endpoint');

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('endpointName');
      expect(metrics).toHaveProperty('invocationsPerMinute');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('cpuUtilization');
      expect(metrics).toHaveProperty('memoryUtilization');
      expect(metrics).toHaveProperty('lastUpdated');
    });

    it('should scale endpoint', async () => {
      await expect(
        modelDeploymentManager.scaleEndpoint('test-endpoint', 3)
      ).resolves.not.toThrow();
    });

    it('should rollback model', async () => {
      await expect(
        modelDeploymentManager.rollbackModel('test-endpoint', 'v1640995100000')
      ).resolves.not.toThrow();
    });
  });

  describe('SageMakerPipelineOrchestrator', () => {
    it('should execute complete pipeline successfully', async () => {
      const config = {
        taskType: 'risk_prediction' as const,
        algorithm: 'xgboost' as const,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole',
        performanceCriteria: {
          minAccuracy: 0.8
        }
      };

      const result = await pipelineOrchestrator.executeCompletePipeline(config);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('pipelineId');
      expect(result).toHaveProperty('taskType');
      expect(result).toHaveProperty('trainingResult');
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('completedAt');
      expect(result.taskType).toBe('risk_prediction');
    });

    it('should schedule periodic retraining', async () => {
      const config = {
        taskType: 'false_positive_detection',
        frequency: 'weekly' as const,
        pipelineConfig: {
          taskType: 'false_positive_detection' as const,
          algorithm: 'sklearn' as const,
          dataTimeRange: {
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-31')
          },
          executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole'
        }
      };

      const scheduleId = await pipelineOrchestrator.schedulePeriodicRetraining(config);

      expect(scheduleId).toBeDefined();
      expect(scheduleId).toContain('retrain-schedule');
      expect(scheduleId).toContain('false_positive_detection');
    });

    it('should monitor model performance', async () => {
      const result = await pipelineOrchestrator.monitorModelPerformance('test-endpoint');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('endpointName');
      expect(result).toHaveProperty('currentMetrics');
      expect(result).toHaveProperty('performanceTrend');
      expect(result).toHaveProperty('accuracyDrift');
      expect(result).toHaveProperty('retrainingRecommended');
      expect(result).toHaveProperty('lastMonitored');
      expect(result.endpointName).toBe('test-endpoint');
    });

    it('should get pipeline execution history', async () => {
      const history = await pipelineOrchestrator.getPipelineExecutionHistory();

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      const execution = history[0];
      expect(execution).toHaveProperty('pipelineId');
      expect(execution).toHaveProperty('taskType');
      expect(execution).toHaveProperty('executionDate');
      expect(execution).toHaveProperty('status');
      expect(execution).toHaveProperty('trainingAccuracy');
    });

    it('should get active retraining schedules', async () => {
      const schedules = await pipelineOrchestrator.getActiveRetrainingSchedules();

      expect(schedules).toBeDefined();
      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBeGreaterThan(0);
      
      const schedule = schedules[0];
      expect(schedule).toHaveProperty('scheduleId');
      expect(schedule).toHaveProperty('taskType');
      expect(schedule).toHaveProperty('frequency');
      expect(schedule).toHaveProperty('nextExecution');
      expect(schedule).toHaveProperty('enabled');
    });

    it('should get pipeline status', async () => {
      const status = await pipelineOrchestrator.getPipelineStatus('test-pipeline-id');

      expect(status).toBeDefined();
      expect(status).toHaveProperty('pipelineId');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('currentPhase');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('startedAt');
      expect(status).toHaveProperty('phases');
      expect(Array.isArray(status.phases)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle training data collection errors', async () => {
      // Mock error in data collection
      const mockCollector = new TrainingDataCollector();
      vi.spyOn(mockCollector as any, 'getComplianceFindings').mockRejectedValue(new Error('Database error'));

      await expect(
        mockCollector.collectTrainingData({
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        })
      ).rejects.toThrow('Failed to collect training data');
    });

    it('should handle training pipeline errors gracefully', async () => {
      const config = {
        taskType: 'risk_prediction' as const,
        algorithm: 'invalid_algorithm' as any,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'invalid-role-arn'
      };

      // This should not throw but handle gracefully
      const result = await modelTrainingPipeline.executeTrainingPipeline(config);
      expect(result).toBeDefined();
    });

    it('should handle deployment failures', async () => {
      const config = {
        modelName: 'non-existent-model',
        modelVersion: 'v0',
        taskType: 'risk_prediction',
        algorithm: 'xgboost',
        executionRoleArn: 'invalid-role-arn'
      };

      // Mock deployment failure
      const mockManager = new ModelDeploymentManager();
      vi.spyOn(mockManager as any, 'createSageMakerModel').mockRejectedValue(new Error('Model not found'));

      await expect(
        mockManager.deployModel(config)
      ).rejects.toThrow('Model deployment failed');
    });
  });

  describe('Integration Tests', () => {
    it('should execute end-to-end training and deployment', async () => {
      const config = {
        taskType: 'remediation_success_prediction' as const,
        algorithm: 'pytorch' as const,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole',
        performanceCriteria: {
          minAccuracy: 0.75
        }
      };

      const result = await pipelineOrchestrator.executeCompletePipeline(config);

      expect(result).toBeDefined();
      expect(result.trainingResult).toBeDefined();
      expect(result.overallStatus).toMatch(/TRAINING_COMPLETED|DEPLOYED/);
      
      if (result.deploymentResult) {
        expect(result.deploymentResult.deploymentStatus).toBe('SUCCESS');
        expect(result.deploymentResult.validationResults.totalTests).toBeGreaterThan(0);
      }
    });

    it('should handle complete pipeline with performance criteria not met', async () => {
      const config = {
        taskType: 'risk_prediction' as const,
        algorithm: 'sklearn' as const,
        dataTimeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        executionRoleArn: 'arn:aws:iam::123456789012:role/SageMakerRole',
        performanceCriteria: {
          minAccuracy: 0.99, // Unrealistically high threshold
          minPrecision: 0.99,
          minRecall: 0.99
        }
      };

      const result = await pipelineOrchestrator.executeCompletePipeline(config);

      expect(result).toBeDefined();
      expect(result.trainingResult).toBeDefined();
      // Should complete training but not deploy due to performance criteria
      expect(result.overallStatus).toBe('TRAINING_COMPLETED');
      expect(result.deploymentResult).toBeNull();
    });
  });
});