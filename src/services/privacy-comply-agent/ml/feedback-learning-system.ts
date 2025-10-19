import { FeedbackCollectionService } from './feedback-collection-service';
import { DecisionTrailTracker } from './decision-trail-tracker';
import { PerformanceImprovementAnalytics } from './performance-improvement-analytics';
import { TrainingDataCollector } from './training-data-collector';
import { 
  ComplianceFinding, 
  ComplianceAssessment, 
  RemediationRecommendation,
  RemediationResult 
} from '../types';

/**
 * Feedback and Learning System
 * Orchestrates feedback collection, decision tracking, and performance improvement
 */
export class FeedbackLearningSystem {
  private feedbackService: FeedbackCollectionService;
  private decisionTracker: DecisionTrailTracker;
  private performanceAnalytics: PerformanceImprovementAnalytics;
  private trainingDataCollector: TrainingDataCollector;

  constructor() {
    this.feedbackService = new FeedbackCollectionService();
    this.decisionTracker = new DecisionTrailTracker();
    this.performanceAnalytics = new PerformanceImprovementAnalytics();
    this.trainingDataCollector = new TrainingDataCollector();
  }

  /**
   * Initialize the feedback and learning system
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Feedback and Learning System...');
      
      // Set up periodic performance analysis
      this.schedulePerformanceAnalysis();
      
      // Set up feedback processing
      this.scheduleFeedbackProcessing();
      
      console.log('Feedback and Learning System initialized successfully');
    } catch (error) {
      console.error('Error initializing feedback and learning system:', error);
      throw new Error(`Failed to initialize feedback and learning system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a complete compliance workflow with decision tracking
   */
  async recordComplianceWorkflow(workflow: {
    finding: ComplianceFinding;
    assessment: ComplianceAssessment;
    recommendations: RemediationRecommendation[];
    remediationResults?: RemediationResult[];
    modelUsed: string;
    processingTime: number;
  }): Promise<{
    assessmentTrailId: string;
    remediationTrailIds: string[];
  }> {
    try {
      // Record assessment decision
      const assessmentTrailId = await this.decisionTracker.recordAssessmentDecision({
        findingId: workflow.finding.id,
        assessmentId: workflow.assessment.findingId,
        modelUsed: workflow.modelUsed,
        inputData: {
          finding: workflow.finding,
          resourceType: workflow.finding.resourceArn.split(':')[2],
          severity: workflow.finding.severity
        },
        reasoning: workflow.assessment.reasoning,
        confidence: workflow.assessment.confidenceScore,
        legalMappings: workflow.assessment.legalMappings,
        riskScore: workflow.assessment.riskScore,
        recommendations: workflow.recommendations.map(r => r.id),
        processingTime: workflow.processingTime
      });

      // Record remediation decisions
      const remediationTrailIds: string[] = [];
      for (const recommendation of workflow.recommendations) {
        const trailId = await this.decisionTracker.recordRemediationDecision({
          remediationId: `rem-${recommendation.id}`,
          recommendationId: recommendation.id,
          findingId: workflow.finding.id,
          action: recommendation.action,
          parameters: recommendation.parameters,
          riskAssessment: `Risk level: ${recommendation.priority}`,
          approvalRequired: !recommendation.automatable,
          estimatedImpact: recommendation.estimatedImpact,
          rollbackPlan: recommendation.automatable ? 'Automated rollback available' : 'Manual rollback required'
        });
        remediationTrailIds.push(trailId);
      }

      return {
        assessmentTrailId,
        remediationTrailIds
      };
    } catch (error) {
      console.error('Error recording compliance workflow:', error);
      throw new Error(`Failed to record compliance workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect comprehensive feedback for a compliance workflow
   */
  async collectWorkflowFeedback(feedback: {
    findingId: string;
    assessmentId: string;
    userId: string;
    assessmentFeedback: {
      correctAssessment: boolean;
      correctRiskScore?: number;
      correctLegalMappings?: string[];
      comments?: string;
    };
    remediationFeedback?: {
      remediationId: string;
      recommendationId: string;
      effectiveRemediation: boolean;
      actualOutcome?: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
      sideEffects?: string[];
      alternativeApproach?: string;
      comments?: string;
    };
    detectionFeedback?: {
      falsePositive: boolean;
      falseNegative?: boolean;
      actualSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      actualFindingType?: string;
      missedFindings?: string[];
      comments?: string;
    };
  }): Promise<{
    assessmentFeedbackId: string;
    remediationFeedbackId?: string;
    detectionFeedbackId?: string;
  }> {
    try {
      // Collect assessment feedback
      const assessmentFeedbackId = await this.feedbackService.collectAssessmentFeedback({
        findingId: feedback.findingId,
        assessmentId: feedback.assessmentId,
        userId: feedback.userId,
        correctAssessment: feedback.assessmentFeedback.correctAssessment,
        correctRiskScore: feedback.assessmentFeedback.correctRiskScore,
        correctLegalMappings: feedback.assessmentFeedback.correctLegalMappings,
        comments: feedback.assessmentFeedback.comments
      });

      let remediationFeedbackId: string | undefined;
      if (feedback.remediationFeedback) {
        remediationFeedbackId = await this.feedbackService.collectRemediationFeedback({
          remediationId: feedback.remediationFeedback.remediationId,
          recommendationId: feedback.remediationFeedback.recommendationId,
          userId: feedback.userId,
          effectiveRemediation: feedback.remediationFeedback.effectiveRemediation,
          actualOutcome: feedback.remediationFeedback.actualOutcome,
          sideEffects: feedback.remediationFeedback.sideEffects,
          alternativeApproach: feedback.remediationFeedback.alternativeApproach,
          comments: feedback.remediationFeedback.comments
        });
      }

      let detectionFeedbackId: string | undefined;
      if (feedback.detectionFeedback) {
        detectionFeedbackId = await this.feedbackService.collectDetectionFeedback({
          findingId: feedback.findingId,
          userId: feedback.userId,
          falsePositive: feedback.detectionFeedback.falsePositive,
          falseNegative: feedback.detectionFeedback.falseNegative,
          actualSeverity: feedback.detectionFeedback.actualSeverity,
          actualFindingType: feedback.detectionFeedback.actualFindingType,
          missedFindings: feedback.detectionFeedback.missedFindings,
          comments: feedback.detectionFeedback.comments
        });
      }

      return {
        assessmentFeedbackId,
        remediationFeedbackId,
        detectionFeedbackId
      };
    } catch (error) {
      console.error('Error collecting workflow feedback:', error);
      throw new Error(`Failed to collect workflow feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process feedback for machine learning improvement
   */
  async processFeedbackForLearning(): Promise<{
    processedFeedbackCount: number;
    trainingDataGenerated: boolean;
    improvementRecommendations: string[];
  }> {
    try {
      // Get unprocessed feedback
      const unprocessedFeedback = await this.feedbackService.getUnprocessedFeedback(100);
      
      if (unprocessedFeedback.length === 0) {
        return {
          processedFeedbackCount: 0,
          trainingDataGenerated: false,
          improvementRecommendations: []
        };
      }

      // Generate training data from feedback
      const timeRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      };

      const trainingData = await this.trainingDataCollector.collectTrainingData(timeRange);
      
      // Store training data for ML pipeline
      if (trainingData.length > 0) {
        await this.trainingDataCollector.storeTrainingData(
          trainingData, 
          `feedback-training-${Date.now()}`
        );
      }

      // Generate improvement recommendations
      const recommendations = await this.performanceAnalytics.generateImprovementRecommendations(timeRange);

      // Mark feedback as processed
      const feedbackIds = unprocessedFeedback.map(f => f.id);
      await this.feedbackService.markFeedbackProcessed(feedbackIds);

      return {
        processedFeedbackCount: unprocessedFeedback.length,
        trainingDataGenerated: trainingData.length > 0,
        improvementRecommendations: recommendations.prioritizedRecommendations
          .filter(r => r.priority === 'HIGH')
          .map(r => r.recommendation)
      };
    } catch (error) {
      console.error('Error processing feedback for learning:', error);
      throw new Error(`Failed to process feedback for learning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive learning insights
   */
  async generateLearningInsights(timeRange: { startDate: Date; endDate: Date }): Promise<{
    systemPerformance: any;
    modelPerformance: Record<string, any>;
    improvementProgress: any;
    actionableInsights: string[];
    recommendedActions: Array<{
      action: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      expectedImpact: string;
    }>;
  }> {
    try {
      // Analyze overall system performance
      const systemPerformance = await this.performanceAnalytics.analyzeSystemPerformance(timeRange);

      // Analyze model performance for key models
      const modelNames = ['claude-3-sonnet', 'risk-prediction-model', 'false-positive-detector'];
      const modelPerformance: Record<string, any> = {};

      for (const modelName of modelNames) {
        try {
          modelPerformance[modelName] = await this.performanceAnalytics.analyzeModelPerformanceTrends(
            modelName, 
            timeRange
          );
        } catch (error) {
          console.warn(`Could not analyze performance for model ${modelName}:`, error);
          modelPerformance[modelName] = null;
        }
      }

      // Track improvement progress
      const baselineDate = new Date(timeRange.startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const improvementProgress = await this.performanceAnalytics.trackImprovementProgress(
        baselineDate,
        timeRange.endDate
      );

      // Generate actionable insights
      const actionableInsights = this.generateActionableInsights(
        systemPerformance,
        modelPerformance,
        improvementProgress
      );

      // Generate recommended actions
      const recommendations = await this.performanceAnalytics.generateImprovementRecommendations(timeRange);
      const recommendedActions = recommendations.prioritizedRecommendations.map(r => ({
        action: r.recommendation,
        priority: r.priority,
        expectedImpact: r.expectedImpact
      }));

      return {
        systemPerformance,
        modelPerformance,
        improvementProgress,
        actionableInsights,
        recommendedActions
      };
    } catch (error) {
      console.error('Error generating learning insights:', error);
      throw new Error(`Failed to generate learning insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export comprehensive learning data
   */
  async exportLearningData(timeRange: { startDate: Date; endDate: Date }): Promise<{
    feedbackExportPath: string;
    decisionTrailExportPath: string;
    performanceReportPath: string;
  }> {
    try {
      // Export feedback data
      const feedbackExportPath = await this.feedbackService.exportFeedbackData(timeRange);

      // Export decision trail
      const decisionTrailExportPath = await this.decisionTracker.exportDecisionTrail(timeRange);

      // Generate performance report
      const performanceReportPath = await this.performanceAnalytics.generatePerformanceReport(timeRange);

      return {
        feedbackExportPath,
        decisionTrailExportPath,
        performanceReportPath
      };
    } catch (error) {
      console.error('Error exporting learning data:', error);
      throw new Error(`Failed to export learning data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system health and learning status
   */
  async getSystemHealthStatus(): Promise<{
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    feedbackSystemStatus: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
    decisionTrackingStatus: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
    learningSystemStatus: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
    recentMetrics: {
      feedbackVolume: number;
      decisionVolume: number;
      processingLatency: number;
      errorRate: number;
    };
    alerts: string[];
  }> {
    try {
      const timeRange = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate: new Date()
      };

      // Get recent performance data
      const systemPerformance = await this.performanceAnalytics.analyzeSystemPerformance(timeRange);
      const feedbackStats = await this.feedbackService.getFeedbackStatistics(timeRange);
      const decisionPatterns = await this.decisionTracker.analyzeDecisionPatterns(timeRange);

      // Determine overall health
      const overallHealth = systemPerformance.overallScore >= 80 ? 'EXCELLENT' :
                           systemPerformance.overallScore >= 60 ? 'GOOD' :
                           systemPerformance.overallScore >= 40 ? 'FAIR' : 'POOR';

      // Check component status
      const feedbackSystemStatus = feedbackStats.totalFeedback > 0 ? 'ACTIVE' : 'DEGRADED';
      const decisionTrackingStatus = decisionPatterns.totalDecisions > 0 ? 'ACTIVE' : 'DEGRADED';
      const learningSystemStatus = systemPerformance.performanceMetrics.errorRate < 0.1 ? 'ACTIVE' : 'DEGRADED';

      // Generate alerts
      const alerts: string[] = [];
      if (systemPerformance.performanceMetrics.errorRate > 0.1) {
        alerts.push('High error rate detected');
      }
      if (systemPerformance.accuracyMetrics.falsePositiveRate > 0.15) {
        alerts.push('False positive rate is elevated');
      }
      if (feedbackStats.averageRating < 3.0) {
        alerts.push('User satisfaction is low');
      }

      return {
        overallHealth,
        feedbackSystemStatus,
        decisionTrackingStatus,
        learningSystemStatus,
        recentMetrics: {
          feedbackVolume: feedbackStats.totalFeedback,
          decisionVolume: decisionPatterns.totalDecisions,
          processingLatency: systemPerformance.performanceMetrics.averageProcessingTime,
          errorRate: systemPerformance.performanceMetrics.errorRate
        },
        alerts
      };
    } catch (error) {
      console.error('Error getting system health status:', error);
      return {
        overallHealth: 'POOR',
        feedbackSystemStatus: 'OFFLINE',
        decisionTrackingStatus: 'OFFLINE',
        learningSystemStatus: 'OFFLINE',
        recentMetrics: {
          feedbackVolume: 0,
          decisionVolume: 0,
          processingLatency: 0,
          errorRate: 1
        },
        alerts: ['System health check failed']
      };
    }
  }

  /**
   * Schedule periodic performance analysis
   */
  private schedulePerformanceAnalysis(): void {
    // In a real implementation, this would set up a scheduled job
    console.log('Performance analysis scheduled for periodic execution');
  }

  /**
   * Schedule periodic feedback processing
   */
  private scheduleFeedbackProcessing(): void {
    // In a real implementation, this would set up a scheduled job
    console.log('Feedback processing scheduled for periodic execution');
  }

  /**
   * Generate actionable insights from performance data
   */
  private generateActionableInsights(
    systemPerformance: any,
    modelPerformance: Record<string, any>,
    improvementProgress: any
  ): string[] {
    const insights: string[] = [];

    // System performance insights
    if (systemPerformance.overallScore < 70) {
      insights.push('System performance is below target - immediate attention required');
    }

    if (systemPerformance.accuracyMetrics.assessmentAccuracy < 0.8) {
      insights.push('Assessment accuracy is low - consider model retraining');
    }

    // Model performance insights
    Object.entries(modelPerformance).forEach(([modelName, performance]) => {
      if (performance && performance.accuracyImprovement < -5) {
        insights.push(`${modelName} accuracy is declining - review training data`);
      }
    });

    // Improvement progress insights
    if (improvementProgress.progressMetrics.accuracyImprovement < 0) {
      insights.push('Accuracy improvements have stalled - new optimization strategies needed');
    }

    if (improvementProgress.newIssues.length > 0) {
      insights.push(`New issues detected: ${improvementProgress.newIssues.join(', ')}`);
    }

    return insights;
  }
}