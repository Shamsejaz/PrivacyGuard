import { TrainingDataCollector } from './training-data-collector';
import { ModelTrainingPipeline, TrainingPipelineConfig, TrainingPipelineResult } from './model-training-pipeline';
import { ModelDeploymentManager, ModelDeploymentConfig, ModelDeploymentResult } from './model-deployment-manager';
import { AWSServiceClients } from '../config/service-clients';

/**
 * SageMaker Pipeline Orchestrator
 * Coordinates the complete ML pipeline from data collection to model deployment
 */
export class SageMakerPipelineOrchestrator {
  private trainingDataCollector: TrainingDataCollector;
  private modelTrainingPipeline: ModelTrainingPipeline;
  private modelDeploymentManager: ModelDeploymentManager;
  private awsClients: AWSServiceClients;

  constructor() {
    this.trainingDataCollector = new TrainingDataCollector();
    this.modelTrainingPipeline = new ModelTrainingPipeline();
    this.modelDeploymentManager = new ModelDeploymentManager();
    this.awsClients = AWSServiceClients.getInstance();
  }

  /**
   * Execute complete ML pipeline from training to deployment
   */
  async executeCompletePipeline(config: CompletePipelineConfig): Promise<CompletePipelineResult> {
    try {
      console.log(`Starting complete ML pipeline for task: ${config.taskType}`);

      // Step 1: Training Phase
      console.log('Phase 1: Model Training');
      const trainingResult = await this.modelTrainingPipeline.executeTrainingPipeline({
        taskType: config.taskType,
        algorithm: config.algorithm,
        dataTimeRange: config.dataTimeRange,
        executionRoleArn: config.executionRoleArn,
        instanceType: config.trainingInstanceType,
        maxRuntimeSeconds: config.maxTrainingTime,
        performanceCriteria: config.performanceCriteria
      });

      // Step 2: Deployment Phase (only if training was successful and model meets criteria)
      let deploymentResult: ModelDeploymentResult | null = null;
      if (trainingResult.evaluation.meetsPerformanceCriteria && trainingResult.modelVersion) {
        console.log('Phase 2: Model Deployment');
        deploymentResult = await this.modelDeploymentManager.deployModel({
          modelName: `privacy-comply-${config.taskType}`,
          modelVersion: trainingResult.modelVersion,
          taskType: config.taskType,
          algorithm: config.algorithm,
          executionRoleArn: config.executionRoleArn,
          instanceType: config.deploymentInstanceType,
          instanceCount: config.deploymentInstanceCount
        });
      }

      // Step 3: Post-deployment validation and monitoring setup
      if (deploymentResult) {
        console.log('Phase 3: Post-deployment Setup');
        await this.setupPostDeploymentMonitoring(deploymentResult.endpointName, config);
      }

      return {
        pipelineId: `pipeline-${Date.now()}`,
        taskType: config.taskType,
        trainingResult,
        deploymentResult,
        overallStatus: deploymentResult ? 'DEPLOYED' : 'TRAINING_COMPLETED',
        completedAt: new Date(),
        nextRetrainingScheduled: this.calculateNextRetrainingDate(config.retrainingSchedule)
      };

    } catch (error) {
      console.error('Complete pipeline execution failed:', error);
      throw new Error(`Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute training-only pipeline (without deployment)
   */
  async executeTrainingOnlyPipeline(config: TrainingPipelineConfig): Promise<TrainingPipelineResult> {
    console.log(`Starting training-only pipeline for task: ${config.taskType}`);
    return await this.modelTrainingPipeline.executeTrainingPipeline(config);
  }

  /**
   * Deploy existing model
   */
  async deployExistingModel(config: ModelDeploymentConfig): Promise<ModelDeploymentResult> {
    console.log(`Deploying existing model: ${config.modelName}:${config.modelVersion}`);
    return await this.modelDeploymentManager.deployModel(config);
  }

  /**
   * Schedule periodic retraining
   */
  async schedulePeriodicRetraining(config: RetrainingScheduleConfig): Promise<string> {
    console.log(`Scheduling periodic retraining for task: ${config.taskType}`);
    
    const scheduleId = `retrain-schedule-${config.taskType}-${Date.now()}`;
    
    // Mock implementation - in real scenario, this would use AWS EventBridge or similar
    const scheduleConfig = {
      scheduleId,
      taskType: config.taskType,
      frequency: config.frequency,
      nextExecution: this.calculateNextRetrainingDate(config.frequency),
      pipelineConfig: config.pipelineConfig,
      enabled: true
    };

    console.log('Retraining schedule created:', JSON.stringify(scheduleConfig, null, 2));
    
    // Store schedule configuration
    await this.storeRetrainingSchedule(scheduleConfig);
    
    return scheduleId;
  }

  /**
   * Monitor model performance and trigger retraining if needed
   */
  async monitorModelPerformance(endpointName: string): Promise<PerformanceMonitoringResult> {
    console.log(`Monitoring performance for endpoint: ${endpointName}`);

    // Get current model metrics
    const metrics = await this.modelDeploymentManager.getEndpointMetrics(endpointName);
    
    // Analyze performance trends (mock implementation)
    const performanceAnalysis = await this.analyzePerformanceTrends(endpointName);
    
    // Check if retraining is needed
    const retrainingNeeded = this.shouldTriggerRetraining(performanceAnalysis);
    
    const result: PerformanceMonitoringResult = {
      endpointName,
      currentMetrics: metrics,
      performanceTrend: performanceAnalysis.trend,
      accuracyDrift: performanceAnalysis.accuracyDrift,
      retrainingRecommended: retrainingNeeded,
      lastMonitored: new Date()
    };

    if (retrainingNeeded) {
      console.log(`Performance degradation detected for ${endpointName}. Retraining recommended.`);
      // Optionally trigger automatic retraining
      if (performanceAnalysis.autoRetrain) {
        await this.triggerAutomaticRetraining(endpointName);
      }
    }

    return result;
  }

  /**
   * Get pipeline execution history
   */
  async getPipelineExecutionHistory(taskType?: string): Promise<PipelineExecutionHistory[]> {
    // Mock implementation - in real scenario, this would query DynamoDB or similar
    const history: PipelineExecutionHistory[] = [
      {
        pipelineId: 'pipeline-1640995200000',
        taskType: 'risk_prediction',
        executionDate: new Date('2023-01-01'),
        status: 'DEPLOYED',
        trainingAccuracy: 0.87,
        deploymentStatus: 'SUCCESS',
        modelVersion: 'v1640995200000'
      },
      {
        pipelineId: 'pipeline-1640995300000',
        taskType: 'false_positive_detection',
        executionDate: new Date('2023-01-02'),
        status: 'TRAINING_COMPLETED',
        trainingAccuracy: 0.82,
        deploymentStatus: 'PENDING',
        modelVersion: 'v1640995300000'
      }
    ];

    return taskType ? history.filter(h => h.taskType === taskType) : history;
  }

  /**
   * Get active retraining schedules
   */
  async getActiveRetrainingSchedules(): Promise<RetrainingScheduleInfo[]> {
    // Mock implementation - in real scenario, this would query stored schedules
    return [
      {
        scheduleId: 'retrain-schedule-risk-prediction-1640995200000',
        taskType: 'risk_prediction',
        frequency: 'weekly',
        nextExecution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastExecution: new Date('2023-01-01'),
        enabled: true
      },
      {
        scheduleId: 'retrain-schedule-false-positive-detection-1640995300000',
        taskType: 'false_positive_detection',
        frequency: 'monthly',
        nextExecution: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastExecution: new Date('2023-01-01'),
        enabled: true
      }
    ];
  }

  /**
   * Setup post-deployment monitoring
   */
  private async setupPostDeploymentMonitoring(endpointName: string, config: CompletePipelineConfig): Promise<void> {
    console.log(`Setting up monitoring for endpoint: ${endpointName}`);
    
    // Mock implementation - in real scenario, this would:
    // 1. Create CloudWatch alarms for endpoint metrics
    // 2. Setup data capture for model monitoring
    // 3. Configure automatic scaling policies
    // 4. Setup performance degradation alerts
    
    const monitoringConfig = {
      endpointName,
      alarms: [
        { metric: 'InvocationLatency', threshold: 1000, comparison: 'GreaterThanThreshold' },
        { metric: 'ModelLatency', threshold: 500, comparison: 'GreaterThanThreshold' },
        { metric: 'Invocation4XXErrors', threshold: 10, comparison: 'GreaterThanThreshold' }
      ],
      dataCaptureEnabled: true,
      autoScalingEnabled: config.enableAutoScaling || false
    };

    console.log('Monitoring configuration:', JSON.stringify(monitoringConfig, null, 2));
  }

  /**
   * Analyze performance trends
   */
  private async analyzePerformanceTrends(endpointName: string): Promise<{
    trend: 'improving' | 'stable' | 'degrading';
    accuracyDrift: number;
    autoRetrain: boolean;
  }> {
    // Mock implementation - in real scenario, this would analyze historical metrics
    const trends = ['improving', 'stable', 'degrading'] as const;
    const trend = trends[Math.floor(Math.random() * trends.length)];
    const accuracyDrift = (Math.random() - 0.5) * 0.2; // -0.1 to +0.1
    
    return {
      trend,
      accuracyDrift,
      autoRetrain: trend === 'degrading' && Math.abs(accuracyDrift) > 0.05
    };
  }

  /**
   * Check if retraining should be triggered
   */
  private shouldTriggerRetraining(analysis: { trend: string; accuracyDrift: number }): boolean {
    return analysis.trend === 'degrading' && Math.abs(analysis.accuracyDrift) > 0.05;
  }

  /**
   * Trigger automatic retraining
   */
  private async triggerAutomaticRetraining(endpointName: string): Promise<void> {
    console.log(`Triggering automatic retraining for endpoint: ${endpointName}`);
    
    // Mock implementation - in real scenario, this would:
    // 1. Get current model configuration
    // 2. Collect new training data
    // 3. Start new training pipeline
    // 4. Deploy new model if training is successful
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Automatic retraining initiated for ${endpointName}`);
  }

  /**
   * Calculate next retraining date based on frequency
   */
  private calculateNextRetrainingDate(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'quarterly':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Store retraining schedule configuration
   */
  private async storeRetrainingSchedule(scheduleConfig: any): Promise<void> {
    // Mock implementation - in real scenario, this would store in DynamoDB
    console.log('Storing retraining schedule:', scheduleConfig);
  }

  /**
   * Get pipeline status and progress
   */
  async getPipelineStatus(pipelineId: string): Promise<PipelineStatus> {
    // Mock implementation - in real scenario, this would query pipeline state
    return {
      pipelineId,
      status: 'COMPLETED',
      currentPhase: 'DEPLOYED',
      progress: 100,
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      estimatedCompletion: new Date(),
      phases: [
        { name: 'Data Collection', status: 'COMPLETED', duration: 300 },
        { name: 'Model Training', status: 'COMPLETED', duration: 1800 },
        { name: 'Model Evaluation', status: 'COMPLETED', duration: 120 },
        { name: 'Model Deployment', status: 'COMPLETED', duration: 600 }
      ]
    };
  }
}

// Type definitions
export interface CompletePipelineConfig {
  taskType: 'risk_prediction' | 'false_positive_detection' | 'remediation_success_prediction';
  algorithm: 'xgboost' | 'sklearn' | 'pytorch' | 'tensorflow';
  dataTimeRange: {
    startDate: Date;
    endDate: Date;
  };
  executionRoleArn: string;
  trainingInstanceType?: string;
  deploymentInstanceType?: string;
  deploymentInstanceCount?: number;
  maxTrainingTime?: number;
  performanceCriteria?: {
    minAccuracy?: number;
    minPrecision?: number;
    minRecall?: number;
  };
  retrainingSchedule?: string;
  enableAutoScaling?: boolean;
}

export interface CompletePipelineResult {
  pipelineId: string;
  taskType: string;
  trainingResult: TrainingPipelineResult;
  deploymentResult: ModelDeploymentResult | null;
  overallStatus: 'TRAINING_COMPLETED' | 'DEPLOYED' | 'FAILED';
  completedAt: Date;
  nextRetrainingScheduled?: Date;
}

export interface RetrainingScheduleConfig {
  taskType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  pipelineConfig: CompletePipelineConfig;
}

export interface RetrainingScheduleInfo {
  scheduleId: string;
  taskType: string;
  frequency: string;
  nextExecution: Date;
  lastExecution?: Date;
  enabled: boolean;
}

export interface PerformanceMonitoringResult {
  endpointName: string;
  currentMetrics: any;
  performanceTrend: 'improving' | 'stable' | 'degrading';
  accuracyDrift: number;
  retrainingRecommended: boolean;
  lastMonitored: Date;
}

export interface PipelineExecutionHistory {
  pipelineId: string;
  taskType: string;
  executionDate: Date;
  status: string;
  trainingAccuracy: number;
  deploymentStatus: string;
  modelVersion: string;
}

export interface PipelineStatus {
  pipelineId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentPhase: string;
  progress: number;
  startedAt: Date;
  estimatedCompletion: Date;
  phases: {
    name: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    duration: number;
  }[];
}