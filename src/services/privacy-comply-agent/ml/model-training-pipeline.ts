import { AWSServiceClients } from '../config/service-clients';
import { TrainingDataCollector } from './training-data-collector';

/**
 * SageMaker Model Training Pipeline
 * Manages the complete ML model training workflow
 */
export class ModelTrainingPipeline {
  private awsClients: AWSServiceClients;
  private sageMakerClient: any;
  private s3Client: any;
  private trainingDataCollector: TrainingDataCollector;

  constructor() {
    this.awsClients = AWSServiceClients.getInstance();
    this.sageMakerClient = this.awsClients.getSageMakerClient();
    this.s3Client = this.awsClients.getS3Client();
    this.trainingDataCollector = new TrainingDataCollector();
  }

  /**
   * Execute complete training pipeline for a specific ML task
   */
  async executeTrainingPipeline(config: TrainingPipelineConfig): Promise<TrainingPipelineResult> {
    try {
      console.log(`Starting training pipeline for task: ${config.taskType}`);

      // Step 1: Collect and prepare training data
      const trainingData = await this.trainingDataCollector.collectTrainingData(config.dataTimeRange);
      const preparedData = await this.trainingDataCollector.prepareDataForTask(trainingData, config.taskType);
      
      // Step 2: Store training data in S3
      const datasetS3Key = await this.storeTrainingDataset(preparedData, config);
      
      // Step 3: Create SageMaker training job
      const trainingJobName = await this.createTrainingJob(datasetS3Key, config);
      
      // Step 4: Monitor training job
      const trainingResult = await this.monitorTrainingJob(trainingJobName);
      
      // Step 5: Evaluate model performance
      const evaluation = await this.evaluateModel(trainingJobName, config);
      
      // Step 6: Register model if performance meets criteria
      let modelVersion = null;
      if (evaluation.meetsPerformanceCriteria) {
        modelVersion = await this.registerModel(trainingJobName, config, evaluation);
      }

      return {
        trainingJobName,
        taskType: config.taskType,
        datasetS3Key,
        trainingStatus: trainingResult.status,
        evaluation,
        modelVersion,
        completedAt: new Date()
      };

    } catch (error) {
      console.error('Training pipeline failed:', error);
      throw new Error(`Training pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store prepared training dataset in S3
   */
  private async storeTrainingDataset(
    preparedData: any[], 
    config: TrainingPipelineConfig
  ): Promise<string> {
    const timestamp = Date.now();
    const s3Key = `training-datasets/${config.taskType}/${timestamp}/dataset.json`;
    const bucketName = this.awsClients.getS3ReportsBucket();

    // Split data into train/validation sets
    const shuffled = preparedData.sort(() => 0.5 - Math.random());
    const splitIndex = Math.floor(shuffled.length * 0.8);
    const trainData = shuffled.slice(0, splitIndex);
    const validationData = shuffled.slice(splitIndex);

    // Store training data
    await this.s3Client.putObject({
      Bucket: bucketName,
      Key: `${s3Key.replace('.json', '')}/train.json`,
      Body: JSON.stringify(trainData, null, 2),
      ContentType: 'application/json'
    }).promise();

    // Store validation data
    await this.s3Client.putObject({
      Bucket: bucketName,
      Key: `${s3Key.replace('.json', '')}/validation.json`,
      Body: JSON.stringify(validationData, null, 2),
      ContentType: 'application/json'
    }).promise();

    // Store dataset metadata
    const metadata = {
      taskType: config.taskType,
      totalSamples: preparedData.length,
      trainSamples: trainData.length,
      validationSamples: validationData.length,
      features: Object.keys(preparedData[0]?.features || {}),
      createdAt: new Date().toISOString(),
      config
    };

    await this.s3Client.putObject({
      Bucket: bucketName,
      Key: `${s3Key.replace('.json', '')}/metadata.json`,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json'
    }).promise();

    console.log(`Training dataset stored at s3://${bucketName}/${s3Key}`);
    return s3Key;
  }

  /**
   * Create SageMaker training job
   */
  private async createTrainingJob(
    datasetS3Key: string, 
    config: TrainingPipelineConfig
  ): Promise<string> {
    const timestamp = Date.now();
    const trainingJobName = `privacy-comply-${config.taskType}-${timestamp}`;
    const bucketName = this.awsClients.getS3ReportsBucket();

    const trainingJobConfig = {
      TrainingJobName: trainingJobName,
      AlgorithmSpecification: {
        TrainingImage: this.getTrainingImage(config.algorithm),
        TrainingInputMode: 'File'
      },
      RoleArn: config.executionRoleArn,
      InputDataConfig: [
        {
          ChannelName: 'training',
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: `s3://${bucketName}/${datasetS3Key.replace('.json', '')}/train.json`,
              S3DataDistributionType: 'FullyReplicated'
            }
          },
          ContentType: 'application/json',
          CompressionType: 'None'
        },
        {
          ChannelName: 'validation',
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: `s3://${bucketName}/${datasetS3Key.replace('.json', '')}/validation.json`,
              S3DataDistributionType: 'FullyReplicated'
            }
          },
          ContentType: 'application/json',
          CompressionType: 'None'
        }
      ],
      OutputDataConfig: {
        S3OutputPath: `s3://${bucketName}/model-artifacts/${config.taskType}/`
      },
      ResourceConfig: {
        InstanceType: config.instanceType || 'ml.m5.large',
        InstanceCount: 1,
        VolumeSizeInGB: 30
      },
      StoppingCondition: {
        MaxRuntimeInSeconds: config.maxRuntimeSeconds || 3600
      },
      HyperParameters: this.getHyperParameters(config)
    };

    // Mock implementation - in real scenario, this would call SageMaker API
    console.log(`Creating SageMaker training job: ${trainingJobName}`);
    console.log('Training job configuration:', JSON.stringify(trainingJobConfig, null, 2));

    // Simulate training job creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return trainingJobName;
  }

  /**
   * Monitor training job progress
   */
  private async monitorTrainingJob(trainingJobName: string): Promise<{
    status: 'InProgress' | 'Completed' | 'Failed';
    metrics?: Record<string, number>;
  }> {
    console.log(`Monitoring training job: ${trainingJobName}`);

    // Mock implementation - in real scenario, this would poll SageMaker API
    const maxWaitTime = 3000; // 3 seconds for testing
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Simulate training progress
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / maxWaitTime, 1);

      console.log(`Training progress: ${Math.round(progress * 100)}%`);

      if (progress >= 1) {
        return {
          status: 'Completed',
          metrics: {
            accuracy: 0.85 + Math.random() * 0.1,
            precision: 0.82 + Math.random() * 0.1,
            recall: 0.78 + Math.random() * 0.1,
            f1Score: 0.80 + Math.random() * 0.1
          }
        };
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { status: 'Completed' };
  }

  /**
   * Evaluate trained model performance
   */
  private async evaluateModel(
    trainingJobName: string, 
    config: TrainingPipelineConfig
  ): Promise<ModelEvaluation> {
    console.log(`Evaluating model from training job: ${trainingJobName}`);

    // Mock evaluation - in real scenario, this would run evaluation on test data
    const metrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.1,
      recall: 0.78 + Math.random() * 0.1,
      f1Score: 0.80 + Math.random() * 0.1,
      auc: 0.88 + Math.random() * 0.08
    };

    // Check if model meets performance criteria
    const meetsPerformanceCriteria = 
      metrics.accuracy >= (config.performanceCriteria?.minAccuracy || 0.8) &&
      metrics.precision >= (config.performanceCriteria?.minPrecision || 0.75) &&
      metrics.recall >= (config.performanceCriteria?.minRecall || 0.75);

    return {
      metrics,
      meetsPerformanceCriteria,
      evaluatedAt: new Date(),
      testDataSize: 100, // Mock value
      confusionMatrix: this.generateMockConfusionMatrix()
    };
  }

  /**
   * Register model in SageMaker Model Registry
   */
  private async registerModel(
    trainingJobName: string,
    config: TrainingPipelineConfig,
    evaluation: ModelEvaluation
  ): Promise<string> {
    const modelVersion = `v${Date.now()}`;
    const modelPackageGroupName = `privacy-comply-${config.taskType}`;

    console.log(`Registering model: ${modelPackageGroupName}:${modelVersion}`);

    // Mock implementation - in real scenario, this would register with SageMaker Model Registry
    const modelRegistration = {
      ModelPackageGroupName: modelPackageGroupName,
      ModelPackageVersion: modelVersion,
      ModelPackageDescription: `Privacy compliance model for ${config.taskType}`,
      ModelApprovalStatus: evaluation.meetsPerformanceCriteria ? 'Approved' : 'PendingManualApproval',
      ModelMetrics: {
        ModelQuality: {
          Statistics: {
            ContentType: 'application/json',
            S3Uri: `s3://${this.awsClients.getS3ReportsBucket()}/model-metrics/${trainingJobName}/metrics.json`
          }
        }
      },
      InferenceSpecification: {
        Containers: [{
          Image: this.getInferenceImage(config.algorithm),
          ModelDataUrl: `s3://${this.awsClients.getS3ReportsBucket()}/model-artifacts/${config.taskType}/${trainingJobName}/model.tar.gz`
        }],
        SupportedContentTypes: ['application/json'],
        SupportedResponseMIMETypes: ['application/json']
      }
    };

    // Store model metrics
    await this.storeModelMetrics(trainingJobName, evaluation);

    console.log('Model registration configuration:', JSON.stringify(modelRegistration, null, 2));

    return modelVersion;
  }

  /**
   * Store model evaluation metrics
   */
  private async storeModelMetrics(trainingJobName: string, evaluation: ModelEvaluation): Promise<void> {
    const bucketName = this.awsClients.getS3ReportsBucket();
    const metricsKey = `model-metrics/${trainingJobName}/metrics.json`;

    await this.s3Client.putObject({
      Bucket: bucketName,
      Key: metricsKey,
      Body: JSON.stringify(evaluation, null, 2),
      ContentType: 'application/json'
    }).promise();

    console.log(`Model metrics stored at s3://${bucketName}/${metricsKey}`);
  }

  /**
   * Get training container image for algorithm
   */
  private getTrainingImage(algorithm: string): string {
    const images = {
      'xgboost': '246618743249.dkr.ecr.us-west-2.amazonaws.com/xgboost:latest',
      'sklearn': '246618743249.dkr.ecr.us-west-2.amazonaws.com/sagemaker-scikit-learn:0.23-1-cpu-py3',
      'pytorch': '246618743249.dkr.ecr.us-west-2.amazonaws.com/pytorch-training:1.8.1-cpu-py3',
      'tensorflow': '246618743249.dkr.ecr.us-west-2.amazonaws.com/tensorflow-training:2.4.1-cpu-py3'
    };
    return images[algorithm] || images['sklearn'];
  }

  /**
   * Get inference container image for algorithm
   */
  private getInferenceImage(algorithm: string): string {
    const images = {
      'xgboost': '246618743249.dkr.ecr.us-west-2.amazonaws.com/xgboost:latest',
      'sklearn': '246618743249.dkr.ecr.us-west-2.amazonaws.com/sagemaker-scikit-learn:0.23-1-cpu-py3',
      'pytorch': '246618743249.dkr.ecr.us-west-2.amazonaws.com/pytorch-inference:1.8.1-cpu-py3',
      'tensorflow': '246618743249.dkr.ecr.us-west-2.amazonaws.com/tensorflow-inference:2.4.1-cpu'
    };
    return images[algorithm] || images['sklearn'];
  }

  /**
   * Get hyperparameters for algorithm and task
   */
  private getHyperParameters(config: TrainingPipelineConfig): Record<string, string> {
    const baseParams = {
      'max_depth': '6',
      'eta': '0.3',
      'objective': 'reg:squarederror',
      'num_round': '100'
    };

    // Task-specific hyperparameters
    switch (config.taskType) {
      case 'risk_prediction':
        return {
          ...baseParams,
          'objective': 'reg:squarederror',
          'eval_metric': 'rmse'
        };
      
      case 'false_positive_detection':
      case 'remediation_success_prediction':
        return {
          ...baseParams,
          'objective': 'binary:logistic',
          'eval_metric': 'auc'
        };
      
      default:
        return baseParams;
    }
  }

  /**
   * Generate mock confusion matrix for evaluation
   */
  private generateMockConfusionMatrix(): number[][] {
    // Mock 2x2 confusion matrix for binary classification
    return [
      [85, 15], // True Negative, False Positive
      [12, 88]  // False Negative, True Positive
    ];
  }

  /**
   * List available models in registry
   */
  async listAvailableModels(taskType?: string): Promise<ModelInfo[]> {
    // Mock implementation - in real scenario, this would query SageMaker Model Registry
    const models: ModelInfo[] = [
      {
        modelName: 'privacy-comply-risk-prediction',
        version: 'v1640995200000',
        taskType: 'risk_prediction',
        status: 'Approved',
        accuracy: 0.87,
        createdAt: new Date('2023-01-01'),
        isActive: true
      },
      {
        modelName: 'privacy-comply-false-positive-detection',
        version: 'v1640995300000',
        taskType: 'false_positive_detection',
        status: 'Approved',
        accuracy: 0.82,
        createdAt: new Date('2023-01-02'),
        isActive: true
      }
    ];

    return taskType ? models.filter(m => m.taskType === taskType) : models;
  }

  /**
   * Get training pipeline status
   */
  async getTrainingPipelineStatus(trainingJobName: string): Promise<{
    status: string;
    progress: number;
    currentStep: string;
    estimatedTimeRemaining?: number;
  }> {
    // Mock implementation - in real scenario, this would query SageMaker API
    return {
      status: 'Completed',
      progress: 100,
      currentStep: 'Model Registration',
      estimatedTimeRemaining: 0
    };
  }
}

// Type definitions for the training pipeline
export interface TrainingPipelineConfig {
  taskType: 'risk_prediction' | 'false_positive_detection' | 'remediation_success_prediction';
  algorithm: 'xgboost' | 'sklearn' | 'pytorch' | 'tensorflow';
  dataTimeRange: {
    startDate: Date;
    endDate: Date;
  };
  executionRoleArn: string;
  instanceType?: string;
  maxRuntimeSeconds?: number;
  performanceCriteria?: {
    minAccuracy?: number;
    minPrecision?: number;
    minRecall?: number;
  };
}

export interface TrainingPipelineResult {
  trainingJobName: string;
  taskType: string;
  datasetS3Key: string;
  trainingStatus: string;
  evaluation: ModelEvaluation;
  modelVersion: string | null;
  completedAt: Date;
}

export interface ModelEvaluation {
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  meetsPerformanceCriteria: boolean;
  evaluatedAt: Date;
  testDataSize: number;
  confusionMatrix: number[][];
}

export interface ModelInfo {
  modelName: string;
  version: string;
  taskType: string;
  status: 'Approved' | 'PendingManualApproval' | 'Rejected';
  accuracy: number;
  createdAt: Date;
  isActive: boolean;
}