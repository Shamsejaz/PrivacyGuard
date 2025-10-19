import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackLearningSystem } from '../feedback-learning-system';
import { FeedbackCollectionService } from '../feedback-collection-service';
import { DecisionTrailTracker } from '../decision-trail-tracker';
import { PerformanceImprovementAnalytics } from '../performance-improvement-analytics';
import { TrainingDataCollector } from '../training-data-collector';

// Mock the dependencies
vi.mock('../feedback-collection-service');
vi.mock('../decision-trail-tracker');
vi.mock('../performance-improvement-analytics');
vi.mock('../training-data-collector');

describe('FeedbackLearningSystem', () => {
  let feedbackLearningSystem: FeedbackLearningSystem;
  let mockFeedbackService: any;
  let mockDecisionTracker: any;
  let mockPerformanceAnalytics: any;
  let mockTrainingDataCollector: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create system instance
    feedbackLearningSystem = new FeedbackLearningSystem();

    // Get mock instances
    mockFeedbackService = (feedbackLearningSystem as any).feedbackService;
    mockDecisionTracker = (feedbackLearningSystem as any).decisionTracker;
    mockPerformanceAnalytics = (feedbackLearningSystem as any).performanceAnalytics;
    mockTrainingDataCollector = (feedbackLearningSystem as any).trainingDataCollector;
  });

  describe('initialize', () => {
    it('should initialize the feedback and learning system successfully', async () => {
      await expect(feedbackLearningSystem.initialize()).resolves.not.toThrow();
    });
  });

  describe('recordComplianceWorkflow', () => {
    it('should record assessment and remediation decisions', async () => {
      const mockWorkflow = {
        finding: {
          id: 'finding-1',
          resourceArn: 'arn:aws:s3:::test-bucket',
          findingType: 'ENCRYPTION' as const,
          severity: 'HIGH' as const,
          description: 'Test finding',
          detectedAt: new Date(),
          rawData: {}
        },
        assessment: {
          findingId: 'finding-1',
          legalMappings: [],
          riskScore: 8.5,
          confidenceScore: 0.9,
          recommendations: [],
          reasoning: 'Test reasoning',
          assessedAt: new Date()
        },
        recommendations: [
          {
            id: 'rec-1',
            findingId: 'finding-1',
            action: 'ENABLE_ENCRYPTION' as const,
            priority: 'HIGH' as const,
            automatable: true,
            lambdaFunction: 'encryption-enablement',
            parameters: {},
            estimatedImpact: 'Low impact'
          }
        ],
        modelUsed: 'claude-3-sonnet',
        processingTime: 15.5
      };

      mockDecisionTracker.recordAssessmentDecision = vi.fn().mockResolvedValue('trail-1');
      mockDecisionTracker.recordRemediationDecision = vi.fn().mockResolvedValue('trail-2');

      const result = await feedbackLearningSystem.recordComplianceWorkflow(mockWorkflow);

      expect(result.assessmentTrailId).toBe('trail-1');
      expect(result.remediationTrailIds).toEqual(['trail-2']);
      expect(mockDecisionTracker.recordAssessmentDecision).toHaveBeenCalledTimes(1);
      expect(mockDecisionTracker.recordRemediationDecision).toHaveBeenCalledTimes(1);
    });
  });

  describe('collectWorkflowFeedback', () => {
    it('should collect comprehensive feedback for a workflow', async () => {
      const mockFeedback = {
        findingId: 'finding-1',
        assessmentId: 'assessment-1',
        userId: 'user-1',
        assessmentFeedback: {
          correctAssessment: true,
          correctRiskScore: 8.0,
          comments: 'Good assessment'
        },
        remediationFeedback: {
          remediationId: 'rem-1',
          recommendationId: 'rec-1',
          effectiveRemediation: true,
          actualOutcome: 'SUCCESS' as const,
          comments: 'Worked well'
        },
        detectionFeedback: {
          falsePositive: false,
          actualSeverity: 'HIGH' as const,
          comments: 'Correct detection'
        }
      };

      mockFeedbackService.collectAssessmentFeedback = vi.fn().mockResolvedValue('feedback-1');
      mockFeedbackService.collectRemediationFeedback = vi.fn().mockResolvedValue('feedback-2');
      mockFeedbackService.collectDetectionFeedback = vi.fn().mockResolvedValue('feedback-3');

      const result = await feedbackLearningSystem.collectWorkflowFeedback(mockFeedback);

      expect(result.assessmentFeedbackId).toBe('feedback-1');
      expect(result.remediationFeedbackId).toBe('feedback-2');
      expect(result.detectionFeedbackId).toBe('feedback-3');
      expect(mockFeedbackService.collectAssessmentFeedback).toHaveBeenCalledTimes(1);
      expect(mockFeedbackService.collectRemediationFeedback).toHaveBeenCalledTimes(1);
      expect(mockFeedbackService.collectDetectionFeedback).toHaveBeenCalledTimes(1);
    });

    it('should handle optional feedback components', async () => {
      const mockFeedback = {
        findingId: 'finding-1',
        assessmentId: 'assessment-1',
        userId: 'user-1',
        assessmentFeedback: {
          correctAssessment: true
        }
      };

      mockFeedbackService.collectAssessmentFeedback = vi.fn().mockResolvedValue('feedback-1');

      const result = await feedbackLearningSystem.collectWorkflowFeedback(mockFeedback);

      expect(result.assessmentFeedbackId).toBe('feedback-1');
      expect(result.remediationFeedbackId).toBeUndefined();
      expect(result.detectionFeedbackId).toBeUndefined();
      expect(mockFeedbackService.collectAssessmentFeedback).toHaveBeenCalledTimes(1);
      expect(mockFeedbackService.collectRemediationFeedback).not.toHaveBeenCalled();
      expect(mockFeedbackService.collectDetectionFeedback).not.toHaveBeenCalled();
    });
  });

  describe('processFeedbackForLearning', () => {
    it('should process feedback and generate training data', async () => {
      const mockUnprocessedFeedback = [
        { id: 'feedback-1', type: 'ASSESSMENT_FEEDBACK' },
        { id: 'feedback-2', type: 'REMEDIATION_FEEDBACK' }
      ];

      const mockTrainingData = [
        {
          findingId: 'finding-1',
          features: { severity: 'HIGH', findingType: 'ENCRYPTION' },
          outcome: { remediationSuccess: true, falsePositive: false }
        }
      ];

      const mockRecommendations = {
        prioritizedRecommendations: [
          {
            priority: 'HIGH' as const,
            recommendation: 'Improve model accuracy',
            category: 'ACCURACY' as const,
            expectedImpact: 'High impact',
            implementationEffort: 'MEDIUM' as const,
            metrics: {}
          }
        ]
      };

      mockFeedbackService.getUnprocessedFeedback = vi.fn().mockResolvedValue(mockUnprocessedFeedback);
      mockTrainingDataCollector.collectTrainingData = vi.fn().mockResolvedValue(mockTrainingData);
      mockTrainingDataCollector.storeTrainingData = vi.fn().mockResolvedValue('training-data-key');
      mockPerformanceAnalytics.generateImprovementRecommendations = vi.fn().mockResolvedValue(mockRecommendations);
      mockFeedbackService.markFeedbackProcessed = vi.fn().mockResolvedValue();

      const result = await feedbackLearningSystem.processFeedbackForLearning();

      expect(result.processedFeedbackCount).toBe(2);
      expect(result.trainingDataGenerated).toBe(true);
      expect(result.improvementRecommendations).toEqual(['Improve model accuracy']);
      expect(mockFeedbackService.markFeedbackProcessed).toHaveBeenCalledWith(['feedback-1', 'feedback-2']);
    });

    it('should handle no unprocessed feedback', async () => {
      mockFeedbackService.getUnprocessedFeedback = vi.fn().mockResolvedValue([]);

      const result = await feedbackLearningSystem.processFeedbackForLearning();

      expect(result.processedFeedbackCount).toBe(0);
      expect(result.trainingDataGenerated).toBe(false);
      expect(result.improvementRecommendations).toEqual([]);
    });
  });

  describe('generateLearningInsights', () => {
    it('should generate comprehensive learning insights', async () => {
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockSystemPerformance = {
        overallScore: 85,
        accuracyMetrics: { assessmentAccuracy: 0.9 },
        performanceMetrics: { averageProcessingTime: 12 }
      };

      const mockModelPerformance = {
        accuracyImprovement: 5,
        confidenceImprovement: 3,
        speedImprovement: 10
      };

      const mockImprovementProgress = {
        progressMetrics: { accuracyImprovement: 5 },
        newIssues: []
      };

      const mockRecommendations = {
        prioritizedRecommendations: [
          {
            recommendation: 'Optimize processing speed',
            priority: 'HIGH' as const,
            expectedImpact: 'Reduce latency by 20%'
          }
        ]
      };

      mockPerformanceAnalytics.analyzeSystemPerformance = vi.fn().mockResolvedValue(mockSystemPerformance);
      mockPerformanceAnalytics.analyzeModelPerformanceTrends = vi.fn().mockResolvedValue(mockModelPerformance);
      mockPerformanceAnalytics.trackImprovementProgress = vi.fn().mockResolvedValue(mockImprovementProgress);
      mockPerformanceAnalytics.generateImprovementRecommendations = vi.fn().mockResolvedValue(mockRecommendations);

      const result = await feedbackLearningSystem.generateLearningInsights(timeRange);

      expect(result.systemPerformance).toBe(mockSystemPerformance);
      expect(result.modelPerformance['claude-3-sonnet']).toBe(mockModelPerformance);
      expect(result.improvementProgress).toBe(mockImprovementProgress);
      expect(result.actionableInsights).toBeInstanceOf(Array);
      expect(result.recommendedActions).toHaveLength(1);
      expect(result.recommendedActions[0].action).toBe('Optimize processing speed');
    });
  });

  describe('exportLearningData', () => {
    it('should export all learning data components', async () => {
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockFeedbackService.exportFeedbackData = vi.fn().mockResolvedValue('feedback-export.json');
      mockDecisionTracker.exportDecisionTrail = vi.fn().mockResolvedValue('decision-trail-export.json');
      mockPerformanceAnalytics.generatePerformanceReport = vi.fn().mockResolvedValue('performance-report.json');

      const result = await feedbackLearningSystem.exportLearningData(timeRange);

      expect(result.feedbackExportPath).toBe('feedback-export.json');
      expect(result.decisionTrailExportPath).toBe('decision-trail-export.json');
      expect(result.performanceReportPath).toBe('performance-report.json');
    });
  });

  describe('getSystemHealthStatus', () => {
    it('should return system health status', async () => {
      const mockSystemPerformance = {
        overallScore: 85,
        performanceMetrics: {
          errorRate: 0.02,
          averageProcessingTime: 15
        },
        accuracyMetrics: {
          falsePositiveRate: 0.05
        }
      };

      const mockFeedbackStats = {
        totalFeedback: 50,
        averageRating: 4.2
      };

      const mockDecisionPatterns = {
        totalDecisions: 100
      };

      mockPerformanceAnalytics.analyzeSystemPerformance = vi.fn().mockResolvedValue(mockSystemPerformance);
      mockFeedbackService.getFeedbackStatistics = vi.fn().mockResolvedValue(mockFeedbackStats);
      mockDecisionTracker.analyzeDecisionPatterns = vi.fn().mockResolvedValue(mockDecisionPatterns);

      const result = await feedbackLearningSystem.getSystemHealthStatus();

      expect(result.overallHealth).toBe('EXCELLENT');
      expect(result.feedbackSystemStatus).toBe('ACTIVE');
      expect(result.decisionTrackingStatus).toBe('ACTIVE');
      expect(result.learningSystemStatus).toBe('ACTIVE');
      expect(result.recentMetrics.feedbackVolume).toBe(50);
      expect(result.recentMetrics.decisionVolume).toBe(100);
      expect(result.alerts).toHaveLength(0);
    });

    it('should handle system health check failure', async () => {
      mockPerformanceAnalytics.analyzeSystemPerformance = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const result = await feedbackLearningSystem.getSystemHealthStatus();

      expect(result.overallHealth).toBe('POOR');
      expect(result.feedbackSystemStatus).toBe('OFFLINE');
      expect(result.decisionTrackingStatus).toBe('OFFLINE');
      expect(result.learningSystemStatus).toBe('OFFLINE');
      expect(result.alerts).toContain('System health check failed');
    });
  });

  describe('error handling', () => {
    it('should handle errors in recordComplianceWorkflow', async () => {
      const mockWorkflow = {
        finding: {
          id: 'finding-1',
          resourceArn: 'arn:aws:s3:::test-bucket',
          findingType: 'ENCRYPTION' as const,
          severity: 'HIGH' as const,
          description: 'Test finding',
          detectedAt: new Date(),
          rawData: {}
        },
        assessment: {
          findingId: 'finding-1',
          legalMappings: [],
          riskScore: 8.5,
          confidenceScore: 0.9,
          recommendations: [],
          reasoning: 'Test reasoning',
          assessedAt: new Date()
        },
        recommendations: [],
        modelUsed: 'claude-3-sonnet',
        processingTime: 15.5
      };

      mockDecisionTracker.recordAssessmentDecision = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(feedbackLearningSystem.recordComplianceWorkflow(mockWorkflow))
        .rejects.toThrow('Failed to record compliance workflow: Database error');
    });

    it('should handle errors in collectWorkflowFeedback', async () => {
      const mockFeedback = {
        findingId: 'finding-1',
        assessmentId: 'assessment-1',
        userId: 'user-1',
        assessmentFeedback: {
          correctAssessment: true
        }
      };

      mockFeedbackService.collectAssessmentFeedback = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(feedbackLearningSystem.collectWorkflowFeedback(mockFeedback))
        .rejects.toThrow('Failed to collect workflow feedback: Storage error');
    });

    it('should handle errors in processFeedbackForLearning', async () => {
      mockFeedbackService.getUnprocessedFeedback = vi.fn().mockRejectedValue(new Error('Query error'));

      await expect(feedbackLearningSystem.processFeedbackForLearning())
        .rejects.toThrow('Failed to process feedback for learning: Query error');
    });
  });
});