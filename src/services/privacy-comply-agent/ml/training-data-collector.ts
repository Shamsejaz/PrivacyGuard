import { AWSServiceClients } from '../config/service-clients';
import { 
  TrainingData, 
  ComplianceFinding, 
  ComplianceAssessment, 
  RemediationResult 
} from '../types';

/**
 * Training Data Collector
 * Collects and prepares training data for machine learning models
 */
export class TrainingDataCollector {
  private awsClients: AWSServiceClients;
  private s3Client: any;
  private dynamoClient: any;

  constructor() {
    this.awsClients = AWSServiceClients.getInstance();
    this.s3Client = this.awsClients.getS3Client();
    this.dynamoClient = this.awsClients.getDynamoDBClient();
  }

  /**
   * Collect training data from compliance assessments and outcomes
   */
  async collectTrainingData(timeRange: { startDate: Date; endDate: Date }): Promise<TrainingData[]> {
    try {
      // Get compliance findings and assessments from the specified time range
      const findings = await this.getComplianceFindings(timeRange);
      const assessments = await this.getComplianceAssessments(timeRange);
      const remediationResults = await this.getRemediationResults(timeRange);
      const humanFeedback = await this.getHumanFeedback(timeRange);

      // Combine data into training samples
      const trainingData: TrainingData[] = [];

      for (const finding of findings) {
        const assessment = assessments.find(a => a.findingId === finding.id);
        const remediation = remediationResults.find(r => r.remediationId.includes(finding.id));
        const feedback = humanFeedback.find(f => f.findingId === finding.id);

        if (assessment) {
          const features = this.extractFeatures(finding, assessment);
          const outcome = this.determineOutcome(remediation, feedback);

          trainingData.push({
            findingId: finding.id,
            features,
            humanFeedback: feedback,
            outcome
          });
        }
      }

      return trainingData;
    } catch (error) {
      console.error('Error collecting training data:', error);
      throw new Error(`Failed to collect training data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract features from compliance findings and assessments
   */
  private extractFeatures(finding: ComplianceFinding, assessment: ComplianceAssessment): Record<string, any> {
    return {
      // Finding characteristics
      findingType: finding.findingType,
      severity: finding.severity,
      resourceType: finding.resourceArn.split(':')[2], // Extract service from ARN
      region: finding.resourceArn.split(':')[3],
      
      // Assessment characteristics
      riskScore: assessment.riskScore,
      confidenceScore: assessment.confidenceScore,
      legalMappingsCount: assessment.legalMappings.length,
      recommendationsCount: assessment.recommendations.length,
      
      // Legal mapping features
      gdprMappings: assessment.legalMappings.filter(m => m.regulation === 'GDPR').length,
      pdplMappings: assessment.legalMappings.filter(m => m.regulation === 'PDPL').length,
      ccpaMappings: assessment.legalMappings.filter(m => m.regulation === 'CCPA').length,
      
      // Recommendation features
      automatableRecommendations: assessment.recommendations.filter(r => r.automatable).length,
      highPriorityRecommendations: assessment.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').length,
      
      // Temporal features
      detectionHour: finding.detectedAt.getHours(),
      detectionDayOfWeek: finding.detectedAt.getDay(),
      assessmentDelay: assessment.assessedAt.getTime() - finding.detectedAt.getTime(),
      
      // Raw data complexity (simplified measure)
      rawDataComplexity: JSON.stringify(finding.rawData).length
    };
  }

  /**
   * Determine outcome from remediation results and feedback
   */
  private determineOutcome(remediation?: RemediationResult, feedback?: any): {
    remediationSuccess: boolean;
    falsePositive: boolean;
  } {
    return {
      remediationSuccess: remediation?.success ?? false,
      falsePositive: (feedback?.correctAssessment === false) ?? false
    };
  }

  /**
   * Get compliance findings from DynamoDB
   */
  private async getComplianceFindings(timeRange: { startDate: Date; endDate: Date }): Promise<ComplianceFinding[]> {
    // Mock implementation - in real scenario, this would query DynamoDB
    return [
      {
        id: 'finding-1',
        resourceArn: 'arn:aws:s3:::example-bucket',
        findingType: 'ENCRYPTION',
        severity: 'HIGH',
        description: 'S3 bucket lacks encryption',
        detectedAt: new Date(),
        rawData: { bucketName: 'example-bucket', encryption: false }
      },
      {
        id: 'finding-2',
        resourceArn: 'arn:aws:iam::123456789012:role/AdminRole',
        findingType: 'ACCESS_CONTROL',
        severity: 'CRITICAL',
        description: 'Overprivileged IAM role',
        detectedAt: new Date(),
        rawData: { roleName: 'AdminRole', policies: ['AdministratorAccess'] }
      }
    ];
  }

  /**
   * Get compliance assessments from DynamoDB
   */
  private async getComplianceAssessments(timeRange: { startDate: Date; endDate: Date }): Promise<ComplianceAssessment[]> {
    // Mock implementation - in real scenario, this would query DynamoDB
    return [
      {
        findingId: 'finding-1',
        legalMappings: [
          { regulation: 'GDPR', article: 'Article 32', description: 'Security of processing', applicability: 0.9 }
        ],
        riskScore: 8.5,
        confidenceScore: 0.85,
        recommendations: [
          {
            id: 'rec-1',
            findingId: 'finding-1',
            action: 'ENABLE_ENCRYPTION',
            priority: 'HIGH',
            automatable: true,
            lambdaFunction: 'encryption-enablement',
            parameters: { bucketName: 'example-bucket' },
            estimatedImpact: 'Low operational impact'
          }
        ],
        reasoning: 'Unencrypted S3 bucket violates GDPR security requirements',
        assessedAt: new Date()
      }
    ];
  }

  /**
   * Get remediation results from DynamoDB
   */
  private async getRemediationResults(timeRange: { startDate: Date; endDate: Date }): Promise<RemediationResult[]> {
    // Mock implementation - in real scenario, this would query DynamoDB
    return [
      {
        remediationId: 'rem-finding-1',
        success: true,
        message: 'Successfully enabled S3 bucket encryption',
        executedAt: new Date(),
        rollbackAvailable: true
      }
    ];
  }

  /**
   * Get human feedback from DynamoDB
   */
  private async getHumanFeedback(timeRange: { startDate: Date; endDate: Date }): Promise<any[]> {
    // Mock implementation - in real scenario, this would query DynamoDB
    return [
      {
        findingId: 'finding-1',
        correctAssessment: true,
        correctRemediation: true,
        comments: 'Assessment and remediation were accurate'
      }
    ];
  }

  /**
   * Store training data in S3 for SageMaker consumption
   */
  async storeTrainingData(trainingData: TrainingData[], datasetName: string): Promise<string> {
    try {
      const s3Key = `training-data/${datasetName}/${Date.now()}.json`;
      const bucketName = this.awsClients.getS3ReportsBucket();

      // Convert training data to format suitable for ML training
      const mlData = trainingData.map(sample => ({
        features: sample.features,
        labels: {
          remediation_success: sample.outcome.remediationSuccess ? 1 : 0,
          false_positive: sample.outcome.falsePositive ? 1 : 0,
          risk_score: sample.features.riskScore,
          confidence_score: sample.features.confidenceScore
        },
        metadata: {
          finding_id: sample.findingId,
          has_feedback: !!sample.humanFeedback
        }
      }));

      await this.s3Client.putObject({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(mlData, null, 2),
        ContentType: 'application/json'
      }).promise();

      console.log(`Training data stored at s3://${bucketName}/${s3Key}`);
      return s3Key;
    } catch (error) {
      console.error('Error storing training data:', error);
      throw new Error(`Failed to store training data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare data for specific ML tasks
   */
  async prepareDataForTask(
    trainingData: TrainingData[], 
    task: 'risk_prediction' | 'false_positive_detection' | 'remediation_success_prediction'
  ): Promise<any[]> {
    switch (task) {
      case 'risk_prediction':
        return trainingData.map(sample => ({
          features: this.selectRiskPredictionFeatures(sample.features),
          target: sample.features.riskScore
        }));

      case 'false_positive_detection':
        return trainingData
          .filter(sample => sample.humanFeedback)
          .map(sample => ({
            features: this.selectFalsePositiveFeatures(sample.features),
            target: sample.outcome.falsePositive ? 1 : 0
          }));

      case 'remediation_success_prediction':
        return trainingData
          .filter(sample => sample.outcome.remediationSuccess !== undefined)
          .map(sample => ({
            features: this.selectRemediationFeatures(sample.features),
            target: sample.outcome.remediationSuccess ? 1 : 0
          }));

      default:
        throw new Error(`Unknown ML task: ${task}`);
    }
  }

  /**
   * Select features relevant for risk prediction
   */
  private selectRiskPredictionFeatures(features: Record<string, any>): Record<string, any> {
    return {
      findingType: features.findingType,
      severity: features.severity,
      resourceType: features.resourceType,
      legalMappingsCount: features.legalMappingsCount,
      gdprMappings: features.gdprMappings,
      pdplMappings: features.pdplMappings,
      ccpaMappings: features.ccpaMappings,
      rawDataComplexity: features.rawDataComplexity
    };
  }

  /**
   * Select features relevant for false positive detection
   */
  private selectFalsePositiveFeatures(features: Record<string, any>): Record<string, any> {
    return {
      confidenceScore: features.confidenceScore,
      findingType: features.findingType,
      severity: features.severity,
      assessmentDelay: features.assessmentDelay,
      legalMappingsCount: features.legalMappingsCount,
      recommendationsCount: features.recommendationsCount
    };
  }

  /**
   * Select features relevant for remediation success prediction
   */
  private selectRemediationFeatures(features: Record<string, any>): Record<string, any> {
    return {
      findingType: features.findingType,
      severity: features.severity,
      resourceType: features.resourceType,
      automatableRecommendations: features.automatableRecommendations,
      highPriorityRecommendations: features.highPriorityRecommendations,
      riskScore: features.riskScore
    };
  }

  /**
   * Get training data statistics
   */
  async getTrainingDataStats(trainingData: TrainingData[]): Promise<{
    totalSamples: number;
    samplesWithFeedback: number;
    samplesWithRemediation: number;
    findingTypeDistribution: Record<string, number>;
    severityDistribution: Record<string, number>;
    averageRiskScore: number;
    averageConfidenceScore: number;
  }> {
    const stats = {
      totalSamples: trainingData.length,
      samplesWithFeedback: trainingData.filter(s => s.humanFeedback).length,
      samplesWithRemediation: trainingData.filter(s => s.outcome.remediationSuccess !== undefined).length,
      findingTypeDistribution: {} as Record<string, number>,
      severityDistribution: {} as Record<string, number>,
      averageRiskScore: 0,
      averageConfidenceScore: 0
    };

    // Calculate distributions
    trainingData.forEach(sample => {
      const findingType = sample.features.findingType;
      const severity = sample.features.severity;
      
      stats.findingTypeDistribution[findingType] = (stats.findingTypeDistribution[findingType] || 0) + 1;
      stats.severityDistribution[severity] = (stats.severityDistribution[severity] || 0) + 1;
    });

    // Calculate averages
    if (trainingData.length > 0) {
      stats.averageRiskScore = trainingData.reduce((sum, s) => sum + s.features.riskScore, 0) / trainingData.length;
      stats.averageConfidenceScore = trainingData.reduce((sum, s) => sum + s.features.confidenceScore, 0) / trainingData.length;
    }

    return stats;
  }
}