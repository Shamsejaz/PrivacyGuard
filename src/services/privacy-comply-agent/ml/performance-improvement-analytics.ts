import { AWSServiceClients } from '../config/service-clients';
import { FeedbackCollectionService } from './feedback-collection-service';
import { DecisionTrailTracker } from './decision-trail-tracker';

/**
 * Performance Improvement Analytics
 * Analyzes system performance and provides insights for continuous improvement
 */
export class PerformanceImprovementAnalytics {
  private awsClients: AWSServiceClients;
  private feedbackService: FeedbackCollectionService;
  private decisionTracker: DecisionTrailTracker;
  private s3Client: any;

  constructor() {
    this.awsClients = AWSServiceClients.getInstance();
    this.feedbackService = new FeedbackCollectionService();
    this.decisionTracker = new DecisionTrailTracker();
    this.s3Client = this.awsClients.getS3Client();
  }

  /**
   * Analyze overall system performance
   */
  async analyzeSystemPerformance(timeRange: { startDate: Date; endDate: Date }): Promise<{
    overallScore: number;
    accuracyMetrics: {
      assessmentAccuracy: number;
      remediationEffectiveness: number;
      falsePositiveRate: number;
      falseNegativeRate: number;
    };
    performanceMetrics: {
      averageProcessingTime: number;
      throughput: number;
      systemUptime: number;
      errorRate: number;
    };
    userSatisfaction: {
      averageRating: number;
      feedbackVolume: number;
      satisfactionTrend: Array<{ date: string; rating: number }>;
    };
    improvementOpportunities: Array<{
      area: string;
      currentScore: number;
      targetScore: number;
      recommendations: string[];
    }>;
  }> {
    try {
      // Get feedback statistics
      const feedbackStats = await this.feedbackService.getFeedbackStatistics(timeRange);
      
      // Calculate accuracy metrics
      const accuracyMetrics = await this.calculateAccuracyMetrics(timeRange);
      
      // Calculate performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(timeRange);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(accuracyMetrics, performanceMetrics, feedbackStats);

      // Identify improvement opportunities
      const improvementOpportunities = this.identifyImprovementOpportunities(
        accuracyMetrics,
        performanceMetrics,
        feedbackStats
      );

      return {
        overallScore,
        accuracyMetrics,
        performanceMetrics,
        userSatisfaction: {
          averageRating: feedbackStats.averageRating,
          feedbackVolume: feedbackStats.totalFeedback,
          satisfactionTrend: feedbackStats.recentTrends.map(trend => ({
            date: trend.date,
            rating: trend.averageRating
          }))
        },
        improvementOpportunities
      };
    } catch (error) {
      console.error('Error analyzing system performance:', error);
      throw new Error(`Failed to analyze system performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze model performance trends
   */
  async analyzeModelPerformanceTrends(
    modelName: string,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<{
    modelName: string;
    performanceTrend: Array<{
      date: string;
      accuracy: number;
      confidence: number;
      processingTime: number;
      predictionCount: number;
    }>;
    accuracyImprovement: number;
    confidenceImprovement: number;
    speedImprovement: number;
    recommendations: string[];
  }> {
    try {
      // Get model predictions from decision trail
      const predictions = await this.decisionTracker.getDecisionTrailByType('MODEL_PREDICTION', timeRange);
      const modelPredictions = predictions.filter(p => p.modelName === modelName);

      // Group by date
      const dailyMetrics: Record<string, {
        accuracySum: number;
        confidenceSum: number;
        processingTimeSum: number;
        count: number;
      }> = {};

      modelPredictions.forEach(prediction => {
        const date = new Date(prediction.timestamp).toISOString().split('T')[0];
        
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            accuracySum: 0,
            confidenceSum: 0,
            processingTimeSum: 0,
            count: 0
          };
        }

        // Calculate accuracy based on feedback (simplified)
        const accuracy = this.estimateAccuracyFromPrediction(prediction);
        
        dailyMetrics[date].accuracySum += accuracy;
        dailyMetrics[date].confidenceSum += prediction.confidence || 0;
        dailyMetrics[date].processingTimeSum += prediction.processingTime || 0;
        dailyMetrics[date].count++;
      });

      // Calculate daily averages
      const performanceTrend = Object.keys(dailyMetrics)
        .sort()
        .map(date => {
          const metrics = dailyMetrics[date];
          return {
            date,
            accuracy: metrics.accuracySum / metrics.count,
            confidence: metrics.confidenceSum / metrics.count,
            processingTime: metrics.processingTimeSum / metrics.count,
            predictionCount: metrics.count
          };
        });

      // Calculate improvements
      const improvements = this.calculateTrendImprovements(performanceTrend);
      
      // Generate recommendations
      const recommendations = this.generateModelRecommendations(performanceTrend, improvements);

      return {
        modelName,
        performanceTrend,
        accuracyImprovement: improvements.accuracy,
        confidenceImprovement: improvements.confidence,
        speedImprovement: improvements.speed,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing model performance trends:', error);
      throw new Error(`Failed to analyze model performance trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate improvement recommendations
   */
  async generateImprovementRecommendations(timeRange: { startDate: Date; endDate: Date }): Promise<{
    prioritizedRecommendations: Array<{
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category: 'ACCURACY' | 'PERFORMANCE' | 'USABILITY' | 'RELIABILITY';
      recommendation: string;
      expectedImpact: string;
      implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
      metrics: Record<string, number>;
    }>;
    quickWins: string[];
    longTermInitiatives: string[];
  }> {
    try {
      const systemPerformance = await this.analyzeSystemPerformance(timeRange);
      const feedbackStats = await this.feedbackService.getFeedbackStatistics(timeRange);
      
      const recommendations: Array<{
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        category: 'ACCURACY' | 'PERFORMANCE' | 'USABILITY' | 'RELIABILITY';
        recommendation: string;
        expectedImpact: string;
        implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
        metrics: Record<string, number>;
      }> = [];

      // Accuracy recommendations
      if (systemPerformance.accuracyMetrics.assessmentAccuracy < 0.85) {
        recommendations.push({
          priority: 'HIGH',
          category: 'ACCURACY',
          recommendation: 'Improve assessment accuracy by retraining models with recent feedback data',
          expectedImpact: 'Increase assessment accuracy by 10-15%',
          implementationEffort: 'MEDIUM',
          metrics: { currentAccuracy: systemPerformance.accuracyMetrics.assessmentAccuracy }
        });
      }

      if (systemPerformance.accuracyMetrics.falsePositiveRate > 0.1) {
        recommendations.push({
          priority: 'HIGH',
          category: 'ACCURACY',
          recommendation: 'Reduce false positive rate by implementing confidence thresholds',
          expectedImpact: 'Reduce false positives by 20-30%',
          implementationEffort: 'LOW',
          metrics: { currentFalsePositiveRate: systemPerformance.accuracyMetrics.falsePositiveRate }
        });
      }

      // Performance recommendations
      if (systemPerformance.performanceMetrics.averageProcessingTime > 30) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'PERFORMANCE',
          recommendation: 'Optimize processing pipeline to reduce response times',
          expectedImpact: 'Reduce processing time by 25-40%',
          implementationEffort: 'MEDIUM',
          metrics: { currentProcessingTime: systemPerformance.performanceMetrics.averageProcessingTime }
        });
      }

      // Usability recommendations
      if (feedbackStats.averageRating < 4.0) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'USABILITY',
          recommendation: 'Improve user interface based on feedback comments',
          expectedImpact: 'Increase user satisfaction by 15-20%',
          implementationEffort: 'HIGH',
          metrics: { currentRating: feedbackStats.averageRating }
        });
      }

      // Reliability recommendations
      if (systemPerformance.performanceMetrics.errorRate > 0.05) {
        recommendations.push({
          priority: 'HIGH',
          category: 'RELIABILITY',
          recommendation: 'Implement better error handling and retry mechanisms',
          expectedImpact: 'Reduce error rate by 50-70%',
          implementationEffort: 'MEDIUM',
          metrics: { currentErrorRate: systemPerformance.performanceMetrics.errorRate }
        });
      }

      // Sort by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Categorize recommendations
      const quickWins = recommendations
        .filter(r => r.implementationEffort === 'LOW')
        .map(r => r.recommendation);

      const longTermInitiatives = recommendations
        .filter(r => r.implementationEffort === 'HIGH')
        .map(r => r.recommendation);

      return {
        prioritizedRecommendations: recommendations,
        quickWins,
        longTermInitiatives
      };
    } catch (error) {
      console.error('Error generating improvement recommendations:', error);
      throw new Error(`Failed to generate improvement recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track improvement progress
   */
  async trackImprovementProgress(
    baselineDate: Date,
    currentDate: Date
  ): Promise<{
    progressMetrics: {
      accuracyImprovement: number;
      performanceImprovement: number;
      userSatisfactionImprovement: number;
      reliabilityImprovement: number;
    };
    achievedGoals: string[];
    pendingGoals: string[];
    newIssues: string[];
  }> {
    try {
      // Get baseline metrics
      const baselineRange = { 
        startDate: new Date(baselineDate.getTime() - 7 * 24 * 60 * 60 * 1000), 
        endDate: baselineDate 
      };
      const baselinePerformance = await this.analyzeSystemPerformance(baselineRange);

      // Get current metrics
      const currentRange = { 
        startDate: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), 
        endDate: currentDate 
      };
      const currentPerformance = await this.analyzeSystemPerformance(currentRange);

      // Calculate improvements
      const progressMetrics = {
        accuracyImprovement: (currentPerformance.accuracyMetrics.assessmentAccuracy - 
                             baselinePerformance.accuracyMetrics.assessmentAccuracy) * 100,
        performanceImprovement: ((baselinePerformance.performanceMetrics.averageProcessingTime - 
                                 currentPerformance.performanceMetrics.averageProcessingTime) / 
                                baselinePerformance.performanceMetrics.averageProcessingTime) * 100,
        userSatisfactionImprovement: (currentPerformance.userSatisfaction.averageRating - 
                                     baselinePerformance.userSatisfaction.averageRating) * 100 / 5,
        reliabilityImprovement: ((baselinePerformance.performanceMetrics.errorRate - 
                                 currentPerformance.performanceMetrics.errorRate) / 
                                baselinePerformance.performanceMetrics.errorRate) * 100
      };

      // Determine achieved and pending goals
      const achievedGoals: string[] = [];
      const pendingGoals: string[] = [];
      const newIssues: string[] = [];

      // Check accuracy goals
      if (progressMetrics.accuracyImprovement >= 5) {
        achievedGoals.push('Improved assessment accuracy by 5%+');
      } else {
        pendingGoals.push('Achieve 5% improvement in assessment accuracy');
      }

      // Check performance goals
      if (progressMetrics.performanceImprovement >= 20) {
        achievedGoals.push('Improved processing speed by 20%+');
      } else {
        pendingGoals.push('Achieve 20% improvement in processing speed');
      }

      // Check user satisfaction goals
      if (progressMetrics.userSatisfactionImprovement >= 10) {
        achievedGoals.push('Improved user satisfaction by 10%+');
      } else {
        pendingGoals.push('Achieve 10% improvement in user satisfaction');
      }

      // Identify new issues
      if (currentPerformance.performanceMetrics.errorRate > baselinePerformance.performanceMetrics.errorRate * 1.2) {
        newIssues.push('Error rate has increased significantly');
      }

      if (currentPerformance.accuracyMetrics.falsePositiveRate > baselinePerformance.accuracyMetrics.falsePositiveRate * 1.1) {
        newIssues.push('False positive rate has increased');
      }

      return {
        progressMetrics,
        achievedGoals,
        pendingGoals,
        newIssues
      };
    } catch (error) {
      console.error('Error tracking improvement progress:', error);
      throw new Error(`Failed to track improvement progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeRange: { startDate: Date; endDate: Date }): Promise<string> {
    try {
      const systemPerformance = await this.analyzeSystemPerformance(timeRange);
      const recommendations = await this.generateImprovementRecommendations(timeRange);

      const report = {
        reportId: `perf-report-${Date.now()}`,
        generatedAt: new Date(),
        timeRange,
        systemPerformance,
        recommendations,
        summary: {
          overallHealth: systemPerformance.overallScore >= 80 ? 'EXCELLENT' : 
                        systemPerformance.overallScore >= 60 ? 'GOOD' : 
                        systemPerformance.overallScore >= 40 ? 'FAIR' : 'POOR',
          keyFindings: this.extractKeyFindings(systemPerformance),
          priorityActions: recommendations.prioritizedRecommendations
            .filter(r => r.priority === 'HIGH')
            .map(r => r.recommendation)
        }
      };

      // Store report in S3
      const reportKey = `performance-reports/${report.reportId}.json`;
      const bucketName = this.awsClients.getS3ReportsBucket();

      await this.s3Client.putObject({
        Bucket: bucketName,
        Key: reportKey,
        Body: JSON.stringify(report, null, 2),
        ContentType: 'application/json'
      }).promise();

      console.log(`Performance report generated: s3://${bucketName}/${reportKey}`);
      return reportKey;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error(`Failed to generate performance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate accuracy metrics from feedback and decision data
   */
  private async calculateAccuracyMetrics(timeRange: { startDate: Date; endDate: Date }): Promise<{
    assessmentAccuracy: number;
    remediationEffectiveness: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  }> {
    // Get feedback data
    const feedback = await this.feedbackService.getUnprocessedFeedback(1000);
    const relevantFeedback = feedback.filter(f => 
      new Date(f.timestamp) >= timeRange.startDate && 
      new Date(f.timestamp) <= timeRange.endDate
    );

    // Calculate assessment accuracy
    const assessmentFeedback = relevantFeedback.filter(f => f.type === 'ASSESSMENT_FEEDBACK');
    const correctAssessments = assessmentFeedback.filter(f => f.correctAssessment).length;
    const assessmentAccuracy = assessmentFeedback.length > 0 ? 
      correctAssessments / assessmentFeedback.length : 0.8; // Default if no feedback

    // Calculate remediation effectiveness
    const remediationFeedback = relevantFeedback.filter(f => f.type === 'REMEDIATION_FEEDBACK');
    const effectiveRemediations = remediationFeedback.filter(f => f.effectiveRemediation).length;
    const remediationEffectiveness = remediationFeedback.length > 0 ? 
      effectiveRemediations / remediationFeedback.length : 0.75; // Default if no feedback

    // Calculate false positive/negative rates
    const detectionFeedback = relevantFeedback.filter(f => f.type === 'DETECTION_FEEDBACK');
    const falsePositives = detectionFeedback.filter(f => f.falsePositive).length;
    const falseNegatives = detectionFeedback.filter(f => f.falseNegative).length;
    
    const falsePositiveRate = detectionFeedback.length > 0 ? 
      falsePositives / detectionFeedback.length : 0.05; // Default if no feedback
    const falseNegativeRate = detectionFeedback.length > 0 ? 
      falseNegatives / detectionFeedback.length : 0.03; // Default if no feedback

    return {
      assessmentAccuracy,
      remediationEffectiveness,
      falsePositiveRate,
      falseNegativeRate
    };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(timeRange: { startDate: Date; endDate: Date }): Promise<{
    averageProcessingTime: number;
    throughput: number;
    systemUptime: number;
    errorRate: number;
  }> {
    // Get decision data for processing time analysis
    const decisions = await this.decisionTracker.getDecisionTrailByType('ASSESSMENT_DECISION', timeRange);
    
    const processingTimes = decisions
      .filter(d => d.processingTime)
      .map(d => d.processingTime);
    
    const averageProcessingTime = processingTimes.length > 0 ? 
      processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 15; // Default

    // Calculate throughput (decisions per hour)
    const timeRangeHours = (timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60);
    const throughput = decisions.length / timeRangeHours;

    // Mock system uptime and error rate (in real implementation, these would come from CloudWatch)
    const systemUptime = 0.995; // 99.5% uptime
    const errorRate = 0.02; // 2% error rate

    return {
      averageProcessingTime,
      throughput,
      systemUptime,
      errorRate
    };
  }

  /**
   * Calculate overall system score
   */
  private calculateOverallScore(
    accuracyMetrics: any,
    performanceMetrics: any,
    feedbackStats: any
  ): number {
    const accuracyScore = (accuracyMetrics.assessmentAccuracy * 0.4 + 
                          accuracyMetrics.remediationEffectiveness * 0.3 + 
                          (1 - accuracyMetrics.falsePositiveRate) * 0.3) * 100;

    const performanceScore = (performanceMetrics.systemUptime * 0.4 + 
                             (1 - performanceMetrics.errorRate) * 0.3 + 
                             Math.min(1, 30 / performanceMetrics.averageProcessingTime) * 0.3) * 100;

    const satisfactionScore = (feedbackStats.averageRating / 5) * 100;

    return (accuracyScore * 0.5 + performanceScore * 0.3 + satisfactionScore * 0.2);
  }

  /**
   * Identify improvement opportunities
   */
  private identifyImprovementOpportunities(
    accuracyMetrics: any,
    performanceMetrics: any,
    feedbackStats: any
  ): Array<{
    area: string;
    currentScore: number;
    targetScore: number;
    recommendations: string[];
  }> {
    const opportunities = [];

    if (accuracyMetrics.assessmentAccuracy < 0.9) {
      opportunities.push({
        area: 'Assessment Accuracy',
        currentScore: accuracyMetrics.assessmentAccuracy * 100,
        targetScore: 90,
        recommendations: [
          'Retrain models with recent feedback data',
          'Implement ensemble methods for better accuracy',
          'Add more diverse training examples'
        ]
      });
    }

    if (performanceMetrics.averageProcessingTime > 20) {
      opportunities.push({
        area: 'Processing Speed',
        currentScore: Math.max(0, 100 - performanceMetrics.averageProcessingTime),
        targetScore: 85,
        recommendations: [
          'Optimize model inference pipeline',
          'Implement caching for frequent queries',
          'Use faster hardware or parallel processing'
        ]
      });
    }

    if (feedbackStats.averageRating < 4.5) {
      opportunities.push({
        area: 'User Satisfaction',
        currentScore: (feedbackStats.averageRating / 5) * 100,
        targetScore: 90,
        recommendations: [
          'Improve user interface design',
          'Add more helpful explanations',
          'Reduce false positive notifications'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Estimate accuracy from prediction data
   */
  private estimateAccuracyFromPrediction(prediction: any): number {
    // Simplified accuracy estimation based on confidence and prediction type
    // In real implementation, this would be based on actual feedback
    return Math.min(1, prediction.confidence * 0.9 + 0.1);
  }

  /**
   * Calculate trend improvements
   */
  private calculateTrendImprovements(performanceTrend: any[]): {
    accuracy: number;
    confidence: number;
    speed: number;
  } {
    if (performanceTrend.length < 2) {
      return { accuracy: 0, confidence: 0, speed: 0 };
    }

    const first = performanceTrend[0];
    const last = performanceTrend[performanceTrend.length - 1];

    return {
      accuracy: ((last.accuracy - first.accuracy) / first.accuracy) * 100,
      confidence: ((last.confidence - first.confidence) / first.confidence) * 100,
      speed: ((first.processingTime - last.processingTime) / first.processingTime) * 100
    };
  }

  /**
   * Generate model-specific recommendations
   */
  private generateModelRecommendations(performanceTrend: any[], improvements: any): string[] {
    const recommendations = [];

    if (improvements.accuracy < 0) {
      recommendations.push('Model accuracy is declining - consider retraining with fresh data');
    }

    if (improvements.confidence < 0) {
      recommendations.push('Model confidence is decreasing - review training data quality');
    }

    if (improvements.speed < 0) {
      recommendations.push('Processing speed is degrading - optimize model architecture');
    }

    if (performanceTrend.some(t => t.accuracy < 0.8)) {
      recommendations.push('Accuracy below threshold - implement model validation checks');
    }

    return recommendations;
  }

  /**
   * Extract key findings from performance data
   */
  private extractKeyFindings(systemPerformance: any): string[] {
    const findings = [];

    if (systemPerformance.accuracyMetrics.assessmentAccuracy > 0.9) {
      findings.push('Assessment accuracy is excellent (>90%)');
    } else if (systemPerformance.accuracyMetrics.assessmentAccuracy < 0.8) {
      findings.push('Assessment accuracy needs improvement (<80%)');
    }

    if (systemPerformance.performanceMetrics.averageProcessingTime < 15) {
      findings.push('Processing speed is optimal (<15 seconds)');
    } else if (systemPerformance.performanceMetrics.averageProcessingTime > 30) {
      findings.push('Processing speed is slow (>30 seconds)');
    }

    if (systemPerformance.userSatisfaction.averageRating > 4.5) {
      findings.push('User satisfaction is high (>4.5/5)');
    } else if (systemPerformance.userSatisfaction.averageRating < 3.5) {
      findings.push('User satisfaction needs attention (<3.5/5)');
    }

    return findings;
  }
}