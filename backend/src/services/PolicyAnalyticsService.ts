import { PolicyRepository } from '../repositories/PolicyRepository';
import type {
  PolicyDocument,
  PolicyAnalytics,
  PolicyGap,
  PolicyComplianceReport,
  PolicyEffectivenessMetrics
} from '../models/Policy';
import { logger } from '../utils/logger';

export class PolicyAnalyticsService {
  private policyRepository: PolicyRepository;

  constructor() {
    this.policyRepository = new PolicyRepository();
  }

  // Policy Effectiveness Monitoring
  async generateEffectivenessReport(policyId: string): Promise<PolicyEffectivenessMetrics | null> {
    try {
      const policy = await this.policyRepository.findPolicyById(policyId);
      if (!policy) {
        return null;
      }

      const analytics = await this.policyRepository.findAnalyticsByPolicyId(policyId);
      
      // Calculate metrics
      const views = this.calculateTotalMetric(analytics, 'views');
      const downloads = this.calculateTotalMetric(analytics, 'downloads');
      const userFeedbackScore = this.calculateAverageScore(analytics, 'user_feedback');
      const complianceIncidents = this.calculateTotalMetric(analytics, 'compliance_incidents');
      const trainingCompletionRate = this.calculateAverageScore(analytics, 'training_completion');

      // Calculate effectiveness score
      const effectivenessScore = this.calculateEffectivenessScore({
        policy,
        views,
        downloads,
        userFeedbackScore,
        complianceIncidents,
        trainingCompletionRate
      });

      return {
        policy_id: policyId,
        views,
        downloads,
        user_feedback_score: userFeedbackScore,
        compliance_incidents: complianceIncidents,
        training_completion_rate: trainingCompletionRate,
        last_updated: policy.updated_at,
        effectiveness_score: effectivenessScore
      };

    } catch (error) {
      logger.error('Error generating effectiveness report:', error);
      throw error;
    }
  }

  // Policy Compliance Gap Analysis
  async generateComplianceGapAnalysis(policyId: string): Promise<PolicyGap[]> {
    try {
      const policy = await this.policyRepository.findPolicyById(policyId);
      if (!policy) {
        return [];
      }

      const gaps: PolicyGap[] = [];

      // Check basic policy requirements
      gaps.push(...this.checkBasicRequirements(policy));
      
      // Check framework-specific requirements
      for (const framework of policy.metadata.compliance_frameworks) {
        gaps.push(...this.checkFrameworkRequirements(policy, framework));
      }

      // Check policy lifecycle requirements
      gaps.push(...this.checkLifecycleRequirements(policy));

      return gaps.filter(gap => gap.current_coverage < gap.target_coverage);

    } catch (error) {
      logger.error('Error generating compliance gap analysis:', error);
      throw error;
    }
  }

  // Policy Review Scheduling and Notifications
  async scheduleReviewNotifications(): Promise<void> {
    try {
      const policies = await this.policyRepository.searchPolicies({
        status: 'active',
        limit: 1000 // Get all active policies
      });

      const now = new Date();
      const upcomingReviews: PolicyDocument[] = [];

      for (const policy of policies.policies) {
        if (policy.metadata.next_review_date) {
          const daysUntilReview = Math.ceil(
            (policy.metadata.next_review_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Notify 30, 14, 7, and 1 days before review
          if ([30, 14, 7, 1].includes(daysUntilReview)) {
            upcomingReviews.push(policy);
          }
        }
      }

      // Create notifications for upcoming reviews
      for (const policy of upcomingReviews) {
        await this.createReviewNotification(policy);
      }

      logger.info(`Scheduled ${upcomingReviews.length} review notifications`);

    } catch (error) {
      logger.error('Error scheduling review notifications:', error);
      throw error;
    }
  }

  // Policy Document Relationship Mapping
  async generateRelationshipMap(policyId: string): Promise<{
    policy: PolicyDocument;
    relationships: Array<{
      type: string;
      related_policy: PolicyDocument;
      relationship_type: string;
      description?: string;
    }>;
  } | null> {
    try {
      const policy = await this.policyRepository.findPolicyById(policyId);
      if (!policy) {
        return null;
      }

      const relationships = await this.policyRepository.findRelationshipsByPolicyId(policyId);
      const relationshipMap: any[] = [];

      for (const relationship of relationships) {
        const relatedPolicyId = relationship.source_policy_id === policyId 
          ? relationship.target_policy_id 
          : relationship.source_policy_id;
        
        const relatedPolicy = await this.policyRepository.findPolicyById(relatedPolicyId);
        
        if (relatedPolicy) {
          relationshipMap.push({
            type: relationship.source_policy_id === policyId ? 'outgoing' : 'incoming',
            related_policy: relatedPolicy,
            relationship_type: relationship.relationship_type,
            description: relationship.description
          });
        }
      }

      return {
        policy,
        relationships: relationshipMap
      };

    } catch (error) {
      logger.error('Error generating relationship map:', error);
      throw error;
    }
  }

  // Generate comprehensive analytics dashboard data
  async generateDashboardAnalytics(filters: {
    date_range?: { start: Date; end: Date };
    policy_types?: string[];
    jurisdictions?: string[];
    compliance_frameworks?: string[];
  } = {}): Promise<{
    overview: {
      total_policies: number;
      active_policies: number;
      pending_reviews: number;
      compliance_score: number;
    };
    policy_distribution: Record<string, number>;
    compliance_trends: Array<{
      date: Date;
      score: number;
      framework?: string;
    }>;
    effectiveness_metrics: {
      average_effectiveness: number;
      top_performing_policies: PolicyEffectivenessMetrics[];
      underperforming_policies: PolicyEffectivenessMetrics[];
    };
    gap_analysis: {
      critical_gaps: number;
      high_gaps: number;
      medium_gaps: number;
      low_gaps: number;
    };
  }> {
    try {
      // Get all policies based on filters
      const searchFilters: any = {
        limit: 1000,
        ...filters
      };

      const { policies } = await this.policyRepository.searchPolicies(searchFilters);

      // Calculate overview metrics
      const totalPolicies = policies.length;
      const activePolicies = policies.filter(p => p.status === 'active').length;
      const pendingReviews = await this.countPendingReviews();
      const overallComplianceScore = await this.calculateOverallComplianceScore(policies);

      // Policy distribution by type
      const policyDistribution = policies.reduce((acc, policy) => {
        acc[policy.type] = (acc[policy.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Compliance trends (simplified - would need historical data in production)
      const complianceTrends = await this.generateComplianceTrends(policies, filters.date_range);

      // Effectiveness metrics
      const effectivenessMetrics = await this.calculateEffectivenessMetrics(policies);

      // Gap analysis
      const gapAnalysis = await this.calculateGapAnalysis(policies);

      return {
        overview: {
          total_policies: totalPolicies,
          active_policies: activePolicies,
          pending_reviews: pendingReviews,
          compliance_score: overallComplianceScore
        },
        policy_distribution: policyDistribution,
        compliance_trends: complianceTrends,
        effectiveness_metrics: effectivenessMetrics,
        gap_analysis: gapAnalysis
      };

    } catch (error) {
      logger.error('Error generating dashboard analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateTotalMetric(analytics: PolicyAnalytics[], metricType: string): number {
    return analytics
      .filter(a => a.metric_type === metricType)
      .reduce((sum, a) => sum + (a.data.total_count || 0), 0);
  }

  private calculateAverageScore(analytics: PolicyAnalytics[], metricType: string): number | undefined {
    const scores = analytics
      .filter(a => a.metric_type === metricType)
      .map(a => a.data.score)
      .filter(score => score !== undefined) as number[];

    if (scores.length === 0) return undefined;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateEffectivenessScore(params: {
    policy: PolicyDocument;
    views: number;
    downloads: number;
    userFeedbackScore?: number;
    complianceIncidents: number;
    trainingCompletionRate?: number;
  }): number {
    let score = 50; // Base score

    // Factor in policy age and activity
    const daysSinceCreated = Math.floor(
      (Date.now() - params.policy.created_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated > 0) {
      const activityScore = Math.min((params.views + params.downloads) / daysSinceCreated * 10, 25);
      score += activityScore;
    }

    // Factor in user feedback
    if (params.userFeedbackScore) {
      score += (params.userFeedbackScore - 3) * 5; // Scale 1-5 rating to -10 to +10
    }

    // Factor in compliance incidents (negative impact)
    score -= Math.min(params.complianceIncidents * 5, 20);

    // Factor in training completion rate
    if (params.trainingCompletionRate) {
      score += (params.trainingCompletionRate - 50) * 0.2; // Scale 0-100% to -10 to +10
    }

    // Factor in policy status and approval
    if (params.policy.status === 'approved' || params.policy.status === 'active') {
      score += 10;
    }

    // Factor in recent review
    if (params.policy.metadata.last_review_date) {
      const daysSinceReview = Math.floor(
        (Date.now() - params.policy.metadata.last_review_date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReview < 90) {
        score += 5;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private checkBasicRequirements(policy: PolicyDocument): PolicyGap[] {
    const gaps: PolicyGap[] = [];

    // Check for effective date
    if (!policy.effective_date) {
      gaps.push({
        requirement: 'Effective Date',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'medium',
        remediation_steps: ['Set an effective date for the policy']
      });
    }

    // Check for approval
    if (policy.status !== 'approved' && policy.status !== 'active') {
      gaps.push({
        requirement: 'Policy Approval',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'high',
        remediation_steps: ['Submit policy for approval', 'Address any review comments']
      });
    }

    // Check for review schedule
    if (!policy.metadata.next_review_date) {
      gaps.push({
        requirement: 'Review Schedule',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'medium',
        remediation_steps: ['Schedule next policy review', 'Set review frequency']
      });
    }

    return gaps;
  }

  private checkFrameworkRequirements(policy: PolicyDocument, framework: string): PolicyGap[] {
    const gaps: PolicyGap[] = [];

    // Framework-specific requirements (simplified)
    switch (framework) {
      case 'GDPR':
        if (!policy.content.includes('lawful basis')) {
          gaps.push({
            requirement: 'GDPR Lawful Basis',
            current_coverage: 0,
            target_coverage: 100,
            gap_severity: 'critical',
            remediation_steps: ['Include lawful basis for processing in policy content']
          });
        }
        break;

      case 'CCPA':
        if (!policy.content.includes('consumer rights')) {
          gaps.push({
            requirement: 'CCPA Consumer Rights',
            current_coverage: 0,
            target_coverage: 100,
            gap_severity: 'high',
            remediation_steps: ['Include consumer rights information in policy content']
          });
        }
        break;

      case 'HIPAA':
        if (!policy.content.includes('protected health information')) {
          gaps.push({
            requirement: 'HIPAA PHI Protection',
            current_coverage: 0,
            target_coverage: 100,
            gap_severity: 'critical',
            remediation_steps: ['Include PHI protection measures in policy content']
          });
        }
        break;
    }

    return gaps;
  }

  private checkLifecycleRequirements(policy: PolicyDocument): PolicyGap[] {
    const gaps: PolicyGap[] = [];
    const now = new Date();

    // Check if policy is overdue for review
    if (policy.metadata.next_review_date && policy.metadata.next_review_date < now) {
      const daysOverdue = Math.floor(
        (now.getTime() - policy.metadata.next_review_date.getTime()) / (1000 * 60 * 60 * 24)
      );

      gaps.push({
        requirement: 'Overdue Review',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: daysOverdue > 90 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
        remediation_steps: [`Policy review is ${daysOverdue} days overdue`, 'Schedule immediate review']
      });
    }

    // Check if policy is expired
    if (policy.expiry_date && policy.expiry_date < now) {
      gaps.push({
        requirement: 'Policy Expiry',
        current_coverage: 0,
        target_coverage: 100,
        gap_severity: 'critical',
        remediation_steps: ['Policy has expired', 'Update or renew policy immediately']
      });
    }

    return gaps;
  }

  private async createReviewNotification(policy: PolicyDocument): Promise<void> {
    // This would integrate with a notification system
    // For now, just log the notification
    logger.info(`Review notification created for policy: ${policy.title}`, {
      policyId: policy._id,
      reviewDate: policy.metadata.next_review_date
    });
  }

  private async countPendingReviews(): Promise<number> {
    const reviews = await this.policyRepository.findPendingReviews();
    return reviews.length;
  }

  private async calculateOverallComplianceScore(policies: PolicyDocument[]): Promise<number> {
    if (policies.length === 0) return 0;

    let totalScore = 0;
    let validPolicies = 0;

    for (const policy of policies) {
      const report = await this.policyRepository.generateComplianceReport(policy._id?.toString() || '');
      if (report) {
        totalScore += report.compliance_score;
        validPolicies++;
      }
    }

    return validPolicies > 0 ? Math.round(totalScore / validPolicies) : 0;
  }

  private async generateComplianceTrends(
    policies: PolicyDocument[], 
    dateRange?: { start: Date; end: Date }
  ): Promise<Array<{ date: Date; score: number; framework?: string }>> {
    // Simplified implementation - in production, this would use historical analytics data
    const trends: any[] = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const score = await this.calculateOverallComplianceScore(policies);
      
      trends.push({
        date,
        score: score + Math.random() * 10 - 5 // Add some variation for demo
      });
    }

    return trends;
  }

  private async calculateEffectivenessMetrics(policies: PolicyDocument[]): Promise<{
    average_effectiveness: number;
    top_performing_policies: PolicyEffectivenessMetrics[];
    underperforming_policies: PolicyEffectivenessMetrics[];
  }> {
    const effectivenessMetrics: PolicyEffectivenessMetrics[] = [];

    for (const policy of policies) {
      const metrics = await this.generateEffectivenessReport(policy._id?.toString() || '');
      if (metrics) {
        effectivenessMetrics.push(metrics);
      }
    }

    const averageEffectiveness = effectivenessMetrics.length > 0
      ? effectivenessMetrics.reduce((sum, m) => sum + m.effectiveness_score, 0) / effectivenessMetrics.length
      : 0;

    const sortedMetrics = effectivenessMetrics.sort((a, b) => b.effectiveness_score - a.effectiveness_score);

    return {
      average_effectiveness: Math.round(averageEffectiveness),
      top_performing_policies: sortedMetrics.slice(0, 5),
      underperforming_policies: sortedMetrics.slice(-5).reverse()
    };
  }

  private async calculateGapAnalysis(policies: PolicyDocument[]): Promise<{
    critical_gaps: number;
    high_gaps: number;
    medium_gaps: number;
    low_gaps: number;
  }> {
    let criticalGaps = 0;
    let highGaps = 0;
    let mediumGaps = 0;
    let lowGaps = 0;

    for (const policy of policies) {
      const gaps = await this.generateComplianceGapAnalysis(policy._id?.toString() || '');
      
      for (const gap of gaps) {
        switch (gap.gap_severity) {
          case 'critical':
            criticalGaps++;
            break;
          case 'high':
            highGaps++;
            break;
          case 'medium':
            mediumGaps++;
            break;
          case 'low':
            lowGaps++;
            break;
        }
      }
    }

    return {
      critical_gaps: criticalGaps,
      high_gaps: highGaps,
      medium_gaps: mediumGaps,
      low_gaps: lowGaps
    };
  }
}