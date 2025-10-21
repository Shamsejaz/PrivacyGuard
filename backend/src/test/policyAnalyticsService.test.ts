import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyAnalyticsService } from '../services/PolicyAnalyticsService';
import { PolicyRepository } from '../repositories/PolicyRepository';
import type { PolicyDocument, PolicyAnalytics } from '../models/Policy';

// Mock the repository
vi.mock('../repositories/PolicyRepository');
vi.mock('../utils/logger');

describe('PolicyAnalyticsService', () => {
  let policyAnalyticsService: PolicyAnalyticsService;
  let mockPolicyRepository: vi.Mocked<PolicyRepository>;

  const mockPolicy: PolicyDocument = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Privacy Policy',
    type: 'privacy_policy',
    content: 'This is a test privacy policy content.',
    version: '1.0.0',
    status: 'active',
    language: 'en',
    jurisdiction: 'US',
    effective_date: new Date('2024-01-01'),
    created_by: 'user123',
    tags: ['test', 'privacy'],
    metadata: {
      word_count: 8,
      compliance_frameworks: ['GDPR', 'CCPA'],
      category: 'privacy',
      priority: 'medium',
      review_frequency: 'annual',
      last_review_date: new Date('2024-01-01'),
      next_review_date: new Date('2024-12-31'),
      stakeholders: [],
      related_policies: []
    },
    version_history: [{
      version: '1.0.0',
      changes: 'Initial version',
      changed_by: 'user123',
      changed_at: new Date()
    }],
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15')
  };

  const mockAnalytics: PolicyAnalytics[] = [
    {
      _id: '507f1f77bcf86cd799439013',
      policy_id: '507f1f77bcf86cd799439011',
      metric_type: 'views',
      period: 'daily',
      date_range: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-01')
      },
      data: {
        total_count: 100
      },
      generated_by: 'system',
      generated_at: new Date()
    },
    {
      _id: '507f1f77bcf86cd799439014',
      policy_id: '507f1f77bcf86cd799439011',
      metric_type: 'downloads',
      period: 'daily',
      date_range: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-01')
      },
      data: {
        total_count: 25
      },
      generated_by: 'system',
      generated_at: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicyRepository = vi.mocked(new PolicyRepository());
    policyAnalyticsService = new PolicyAnalyticsService();
    // Replace the repository instance
    (policyAnalyticsService as any).policyRepository = mockPolicyRepository;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEffectivenessReport', () => {
    it('should generate effectiveness report successfully', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.findAnalyticsByPolicyId.mockResolvedValue(mockAnalytics);

      const result = await policyAnalyticsService.generateEffectivenessReport('507f1f77bcf86cd799439011');

      expect(mockPolicyRepository.findPolicyById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPolicyRepository.findAnalyticsByPolicyId).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      
      expect(result).toBeDefined();
      expect(result?.policy_id).toBe('507f1f77bcf86cd799439011');
      expect(result?.views).toBe(100);
      expect(result?.downloads).toBe(25);
      expect(typeof result?.effectiveness_score).toBe('number');
      expect(result?.effectiveness_score).toBeGreaterThanOrEqual(0);
      expect(result?.effectiveness_score).toBeLessThanOrEqual(100);
    });

    it('should return null when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      const result = await policyAnalyticsService.generateEffectivenessReport('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle empty analytics data', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.findAnalyticsByPolicyId.mockResolvedValue([]);

      const result = await policyAnalyticsService.generateEffectivenessReport('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result?.views).toBe(0);
      expect(result?.downloads).toBe(0);
    });
  });

  describe('generateComplianceGapAnalysis', () => {
    it('should generate compliance gap analysis successfully', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      expect(mockPolicyRepository.findPolicyById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('nonexistent');

      expect(result).toEqual([]);
    });

    it('should identify gaps for policy without effective date', async () => {
      const policyWithoutEffectiveDate = { ...mockPolicy, effective_date: undefined };
      mockPolicyRepository.findPolicyById.mockResolvedValue(policyWithoutEffectiveDate);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      const effectiveDateGap = result.find(gap => gap.requirement === 'Effective Date');
      expect(effectiveDateGap).toBeDefined();
      expect(effectiveDateGap?.gap_severity).toBe('medium');
    });

    it('should identify gaps for unapproved policy', async () => {
      const draftPolicy = { ...mockPolicy, status: 'draft' as const };
      mockPolicyRepository.findPolicyById.mockResolvedValue(draftPolicy);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      const approvalGap = result.find(gap => gap.requirement === 'Policy Approval');
      expect(approvalGap).toBeDefined();
      expect(approvalGap?.gap_severity).toBe('high');
    });

    it.skip('should identify framework-specific gaps', async () => {
      const gdprPolicy = { 
        ...mockPolicy, 
        content: 'Policy without lawful basis mention',
        metadata: { 
          ...mockPolicy.metadata, 
          compliance_frameworks: ['GDPR'] 
        }
      };
      mockPolicyRepository.findPolicyById.mockResolvedValue(gdprPolicy);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      // The gap analysis should identify that the policy doesn't contain "lawful basis"
      const gdprGap = result.find(gap => gap.requirement === 'GDPR Lawful Basis');
      expect(gdprGap).toBeDefined();
      expect(gdprGap?.gap_severity).toBe('critical');
    });

    it('should identify overdue review gaps', async () => {
      const overduePolicy = { 
        ...mockPolicy, 
        metadata: { 
          ...mockPolicy.metadata, 
          next_review_date: new Date('2023-01-01') // Past date
        }
      };
      mockPolicyRepository.findPolicyById.mockResolvedValue(overduePolicy);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      const overdueGap = result.find(gap => gap.requirement === 'Overdue Review');
      expect(overdueGap).toBeDefined();
      expect(overdueGap?.gap_severity).toBe('critical');
    });

    it('should identify expired policy gaps', async () => {
      const expiredPolicy = { 
        ...mockPolicy, 
        expiry_date: new Date('2023-01-01') // Past date
      };
      mockPolicyRepository.findPolicyById.mockResolvedValue(expiredPolicy);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('507f1f77bcf86cd799439011');

      const expiredGap = result.find(gap => gap.requirement === 'Policy Expiry');
      expect(expiredGap).toBeDefined();
      expect(expiredGap?.gap_severity).toBe('critical');
    });
  });

  describe('scheduleReviewNotifications', () => {
    it('should schedule review notifications for upcoming reviews', async () => {
      const upcomingReviewPolicy = {
        ...mockPolicy,
        metadata: {
          ...mockPolicy.metadata,
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      };

      mockPolicyRepository.searchPolicies.mockResolvedValue({
        policies: [upcomingReviewPolicy],
        total: 1,
        page: 1,
        limit: 1000
      });

      await expect(policyAnalyticsService.scheduleReviewNotifications()).resolves.not.toThrow();

      expect(mockPolicyRepository.searchPolicies).toHaveBeenCalledWith({
        status: 'active',
        limit: 1000
      });
    });

    it('should handle policies without review dates', async () => {
      const policyWithoutReviewDate = {
        ...mockPolicy,
        metadata: {
          ...mockPolicy.metadata,
          next_review_date: undefined
        }
      };

      mockPolicyRepository.searchPolicies.mockResolvedValue({
        policies: [policyWithoutReviewDate],
        total: 1,
        page: 1,
        limit: 1000
      });

      await expect(policyAnalyticsService.scheduleReviewNotifications()).resolves.not.toThrow();
    });
  });

  describe('generateRelationshipMap', () => {
    it('should generate relationship map successfully', async () => {
      const mockRelationships = [
        {
          _id: '507f1f77bcf86cd799439015',
          source_policy_id: '507f1f77bcf86cd799439011',
          target_policy_id: '507f1f77bcf86cd799439016',
          relationship_type: 'references' as const,
          description: 'Test relationship',
          created_by: 'user123',
          created_at: new Date()
        }
      ];

      const relatedPolicy = { ...mockPolicy, _id: '507f1f77bcf86cd799439016', title: 'Related Policy' };

      mockPolicyRepository.findPolicyById
        .mockResolvedValueOnce(mockPolicy)
        .mockResolvedValueOnce(relatedPolicy);
      mockPolicyRepository.findRelationshipsByPolicyId.mockResolvedValue(mockRelationships);

      const result = await policyAnalyticsService.generateRelationshipMap('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result?.policy).toEqual(mockPolicy);
      expect(result?.relationships).toHaveLength(1);
      expect(result?.relationships[0].type).toBe('outgoing');
      expect(result?.relationships[0].related_policy).toEqual(relatedPolicy);
    });

    it('should return null when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      const result = await policyAnalyticsService.generateRelationshipMap('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle incoming relationships', async () => {
      const mockRelationships = [
        {
          _id: '507f1f77bcf86cd799439015',
          source_policy_id: '507f1f77bcf86cd799439016', // Different source
          target_policy_id: '507f1f77bcf86cd799439011', // Current policy as target
          relationship_type: 'references' as const,
          description: 'Incoming relationship',
          created_by: 'user123',
          created_at: new Date()
        }
      ];

      const sourcePolicy = { ...mockPolicy, _id: '507f1f77bcf86cd799439016', title: 'Source Policy' };

      mockPolicyRepository.findPolicyById
        .mockResolvedValueOnce(mockPolicy)
        .mockResolvedValueOnce(sourcePolicy);
      mockPolicyRepository.findRelationshipsByPolicyId.mockResolvedValue(mockRelationships);

      const result = await policyAnalyticsService.generateRelationshipMap('507f1f77bcf86cd799439011');

      expect(result?.relationships[0].type).toBe('incoming');
      expect(result?.relationships[0].related_policy).toEqual(sourcePolicy);
    });
  });

  describe('generateDashboardAnalytics', () => {
    it('should generate dashboard analytics successfully', async () => {
      const mockPolicies = [mockPolicy];
      
      mockPolicyRepository.searchPolicies.mockResolvedValue({
        policies: mockPolicies,
        total: 1,
        page: 1,
        limit: 1000
      });
      
      mockPolicyRepository.findPendingReviews.mockResolvedValue([]);
      mockPolicyRepository.generateComplianceReport.mockResolvedValue({
        policy_id: '507f1f77bcf86cd799439011',
        policy_title: 'Test Privacy Policy',
        compliance_score: 85,
        framework_scores: { GDPR: 90, CCPA: 80 },
        gaps: [],
        recommendations: [],
        status: 'compliant'
      });

      const result = await policyAnalyticsService.generateDashboardAnalytics();

      expect(result).toBeDefined();
      expect(result.overview.total_policies).toBe(1);
      expect(result.overview.active_policies).toBe(1);
      expect(typeof result.overview.compliance_score).toBe('number');
      expect(result.policy_distribution).toBeDefined();
      expect(Array.isArray(result.compliance_trends)).toBe(true);
      expect(result.effectiveness_metrics).toBeDefined();
      expect(result.gap_analysis).toBeDefined();
    });

    it('should handle empty policy list', async () => {
      mockPolicyRepository.searchPolicies.mockResolvedValue({
        policies: [],
        total: 0,
        page: 1,
        limit: 1000
      });
      
      mockPolicyRepository.findPendingReviews.mockResolvedValue([]);

      const result = await policyAnalyticsService.generateDashboardAnalytics();

      expect(result.overview.total_policies).toBe(0);
      expect(result.overview.active_policies).toBe(0);
      expect(result.overview.compliance_score).toBe(0);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        },
        policy_types: ['privacy_policy'],
        jurisdictions: ['US'],
        compliance_frameworks: ['GDPR']
      };

      mockPolicyRepository.searchPolicies.mockResolvedValue({
        policies: [],
        total: 0,
        page: 1,
        limit: 1000
      });
      
      mockPolicyRepository.findPendingReviews.mockResolvedValue([]);

      await policyAnalyticsService.generateDashboardAnalytics(filters);

      expect(mockPolicyRepository.searchPolicies).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000,
          ...filters
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockPolicyRepository.findPolicyById.mockRejectedValue(new Error('Database error'));

      await expect(policyAnalyticsService.generateEffectivenessReport('507f1f77bcf86cd799439011'))
        .rejects.toThrow('Database error');
    });

    it('should handle missing policy data gracefully', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      const result = await policyAnalyticsService.generateComplianceGapAnalysis('nonexistent');

      expect(result).toEqual([]);
    });
  });
});