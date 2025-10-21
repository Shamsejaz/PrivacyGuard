import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import policyRoutes from '../routes/policy';
import { PolicyService } from '../services/PolicyService';
import { PolicyAnalyticsService } from '../services/PolicyAnalyticsService';
import type { PolicyDocument, CreatePolicyRequest } from '../models/Policy';

// Mock services
vi.mock('../services/PolicyService');
vi.mock('../services/PolicyAnalyticsService');
vi.mock('../middleware/auth');
vi.mock('../middleware/permissions');
vi.mock('../utils/logger');

describe('Policy Routes', () => {
  let app: express.Application;
  let mockPolicyService: vi.Mocked<PolicyService>;
  let mockPolicyAnalyticsService: vi.Mocked<PolicyAnalyticsService>;

  const mockPolicy: PolicyDocument = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Privacy Policy',
    type: 'privacy_policy',
    content: 'This is a test privacy policy content.',
    version: '1.0.0',
    status: 'draft',
    language: 'en',
    jurisdiction: 'US',
    created_by: 'user123',
    tags: ['test', 'privacy'],
    metadata: {
      word_count: 8,
      compliance_frameworks: ['GDPR', 'CCPA'],
      category: 'privacy',
      priority: 'medium',
      review_frequency: 'annual',
      stakeholders: [],
      related_policies: []
    },
    version_history: [{
      version: '1.0.0',
      changes: 'Initial version',
      changed_by: 'user123',
      changed_at: new Date()
    }],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    role: 'admin',
    permissions: ['policy:read', 'policy:create', 'policy:update', 'policy:delete']
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authentication middleware
    vi.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = mockUser;
        next();
      }
    }));

    // Mock permissions middleware
    vi.doMock('../middleware/permissions', () => ({
      validatePermission: () => (req: any, res: any, next: any) => next()
    }));

    // Create mocked services
    mockPolicyService = vi.mocked(new PolicyService());
    mockPolicyAnalyticsService = vi.mocked(new PolicyAnalyticsService());

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/policy', policyRoutes);

    // Mock service instances in the routes
    vi.doMock('../services/PolicyService', () => ({
      PolicyService: vi.fn(() => mockPolicyService)
    }));

    vi.doMock('../services/PolicyAnalyticsService', () => ({
      PolicyAnalyticsService: vi.fn(() => mockPolicyAnalyticsService)
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/policy', () => {
    it('should search policies successfully', async () => {
      const searchResult = {
        policies: [mockPolicy],
        total: 1,
        page: 1,
        limit: 20
      };

      mockPolicyService.searchPolicies.mockResolvedValue(searchResult);

      const response = await request(app)
        .get('/api/policy')
        .query({
          type: 'privacy_policy',
          status: 'draft',
          search_text: 'privacy'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(searchResult);
      expect(mockPolicyService.searchPolicies).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'privacy_policy',
          status: 'draft',
          search_text: 'privacy'
        })
      );
    });

    it('should handle date range filters', async () => {
      const searchResult = {
        policies: [],
        total: 0,
        page: 1,
        limit: 20
      };

      mockPolicyService.searchPolicies.mockResolvedValue(searchResult);

      const response = await request(app)
        .get('/api/policy')
        .query({
          date_range_start: '2024-01-01T00:00:00.000Z',
          date_range_end: '2024-12-31T23:59:59.999Z'
        });

      expect(response.status).toBe(200);
      expect(mockPolicyService.searchPolicies).toHaveBeenCalledWith(
        expect.objectContaining({
          date_range: {
            start: new Date('2024-01-01T00:00:00.000Z'),
            end: new Date('2024-12-31T23:59:59.999Z')
          }
        })
      );
    });

    it('should handle service errors', async () => {
      mockPolicyService.searchPolicies.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/policy');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to search policies' });
    });
  });

  describe('POST /api/policy', () => {
    it('should create policy successfully', async () => {
      const createRequest: CreatePolicyRequest = {
        title: 'Test Privacy Policy',
        type: 'privacy_policy',
        content: 'This is a test privacy policy content.',
        language: 'en',
        jurisdiction: 'US',
        tags: ['test', 'privacy']
      };

      mockPolicyService.createPolicy.mockResolvedValue(mockPolicy);

      const response = await request(app)
        .post('/api/policy')
        .send(createRequest);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockPolicy);
      expect(mockPolicyService.createPolicy).toHaveBeenCalledWith(createRequest, 'user123');
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        title: '',
        type: 'privacy_policy',
        content: '',
        language: '',
        jurisdiction: ''
      };

      mockPolicyService.createPolicy.mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .post('/api/policy')
        .send(invalidRequest);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create policy' });
    });
  });

  describe('GET /api/policy/:id', () => {
    it('should get policy by ID successfully', async () => {
      mockPolicyService.getPolicyById.mockResolvedValue(mockPolicy);

      const response = await request(app)
        .get('/api/policy/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPolicy);
      expect(mockPolicyService.getPolicyById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return 404 when policy not found', async () => {
      mockPolicyService.getPolicyById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/policy/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Policy not found' });
    });
  });

  describe('PUT /api/policy/:id', () => {
    it('should update policy successfully', async () => {
      const updateRequest = {
        title: 'Updated Privacy Policy',
        content: 'Updated content'
      };

      const updatedPolicy = { ...mockPolicy, ...updateRequest };
      mockPolicyService.updatePolicy.mockResolvedValue(updatedPolicy);

      const response = await request(app)
        .put('/api/policy/507f1f77bcf86cd799439011')
        .send(updateRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedPolicy);
      expect(mockPolicyService.updatePolicy).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateRequest,
        'user123'
      );
    });

    it('should return 404 when policy not found', async () => {
      mockPolicyService.updatePolicy.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/policy/nonexistent')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Policy not found' });
    });
  });

  describe('DELETE /api/policy/:id', () => {
    it('should delete policy successfully', async () => {
      mockPolicyService.deletePolicy.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/policy/507f1f77bcf86cd799439011');

      expect(response.status).toBe(204);
      expect(mockPolicyService.deletePolicy).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'user123');
    });

    it('should return 404 when policy not found', async () => {
      mockPolicyService.deletePolicy.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/policy/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Policy not found' });
    });
  });

  describe('POST /api/policy/:id/approve', () => {
    it('should approve policy successfully', async () => {
      const approvalRequest = {
        action: 'approve',
        comments: 'Looks good'
      };

      const approvedPolicy = { ...mockPolicy, status: 'approved' as const };
      mockPolicyService.approvePolicy.mockResolvedValue(approvedPolicy);

      const response = await request(app)
        .post('/api/policy/507f1f77bcf86cd799439011/approve')
        .send(approvalRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(approvedPolicy);
      expect(mockPolicyService.approvePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          policy_id: '507f1f77bcf86cd799439011',
          action: 'approve',
          comments: 'Looks good'
        }),
        'user123'
      );
    });
  });

  describe('POST /api/policy/:id/version', () => {
    it('should create new version successfully', async () => {
      const versionRequest = {
        changes: 'Updated content for compliance',
        major_version: false
      };

      const newVersionPolicy = { ...mockPolicy, version: '1.1.0' };
      mockPolicyService.createNewVersion.mockResolvedValue(newVersionPolicy);

      const response = await request(app)
        .post('/api/policy/507f1f77bcf86cd799439011/version')
        .send(versionRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(newVersionPolicy);
      expect(mockPolicyService.createNewVersion).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        versionRequest,
        'user123'
      );
    });
  });

  describe('GET /api/policy/:id/analytics', () => {
    it('should get policy analytics successfully', async () => {
      const mockAnalytics = [
        {
          _id: '507f1f77bcf86cd799439013',
          policy_id: '507f1f77bcf86cd799439011',
          metric_type: 'views',
          data: { total_count: 100 }
        }
      ];

      mockPolicyService.getPolicyAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/policy/507f1f77bcf86cd799439011/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockPolicyService.getPolicyAnalytics).toHaveBeenCalledWith('507f1f77bcf86cd799439011', undefined);
    });

    it('should filter by metric type', async () => {
      mockPolicyService.getPolicyAnalytics.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/policy/507f1f77bcf86cd799439011/analytics')
        .query({ metric_type: 'views' });

      expect(response.status).toBe(200);
      expect(mockPolicyService.getPolicyAnalytics).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'views');
    });
  });

  describe('GET /api/policy/:id/compliance-report', () => {
    it('should generate compliance report successfully', async () => {
      const mockReport = {
        policy_id: '507f1f77bcf86cd799439011',
        policy_title: 'Test Privacy Policy',
        compliance_score: 85,
        framework_scores: { GDPR: 90, CCPA: 80 },
        gaps: [],
        recommendations: [],
        status: 'compliant' as const
      };

      mockPolicyService.generateComplianceReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/policy/507f1f77bcf86cd799439011/compliance-report');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });

    it('should return 404 when policy not found', async () => {
      mockPolicyService.generateComplianceReport.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/policy/nonexistent/compliance-report');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Policy not found' });
    });
  });

  describe('GET /api/policy/templates', () => {
    it('should get templates successfully', async () => {
      const mockTemplates = [
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'GDPR Privacy Policy Template',
          description: 'Standard GDPR template',
          category: 'privacy',
          regulation: 'GDPR' as const,
          language: 'en',
          jurisdiction: 'EU',
          content: 'Template content',
          variables: [],
          is_active: true,
          created_by: 'admin',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPolicyService.getTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app)
        .get('/api/policy/templates')
        .query({
          category: 'privacy',
          regulation: 'GDPR'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTemplates);
      expect(mockPolicyService.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'privacy',
          regulation: 'GDPR'
        })
      );
    });
  });

  describe('POST /api/policy/generate-from-template', () => {
    it('should generate policy from template successfully', async () => {
      const generateRequest = {
        template_id: '507f1f77bcf86cd799439012',
        title: 'Generated Privacy Policy',
        variable_values: {
          company_name: 'Test Company'
        }
      };

      const generatedPolicy = {
        ...mockPolicy,
        title: 'Generated Privacy Policy',
        content: 'Template content with Test Company'
      };

      mockPolicyService.generatePolicyFromTemplate.mockResolvedValue(generatedPolicy);

      const response = await request(app)
        .post('/api/policy/generate-from-template')
        .send(generateRequest);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(generatedPolicy);
      expect(mockPolicyService.generatePolicyFromTemplate).toHaveBeenCalledWith(generateRequest, 'user123');
    });
  });

  describe('Analytics Routes', () => {
    describe('GET /api/policy/analytics/dashboard', () => {
      it('should get dashboard analytics successfully', async () => {
        const mockDashboardAnalytics = {
          overview: {
            total_policies: 5,
            active_policies: 3,
            pending_reviews: 2,
            compliance_score: 85
          },
          policy_distribution: {
            privacy_policy: 3,
            cookie_policy: 2
          },
          compliance_trends: [],
          effectiveness_metrics: {
            average_effectiveness: 80,
            top_performing_policies: [],
            underperforming_policies: []
          },
          gap_analysis: {
            critical_gaps: 0,
            high_gaps: 1,
            medium_gaps: 2,
            low_gaps: 3
          }
        };

        mockPolicyAnalyticsService.generateDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

        const response = await request(app)
          .get('/api/policy/analytics/dashboard');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockDashboardAnalytics);
      });

      it('should handle filters in dashboard analytics', async () => {
        mockPolicyAnalyticsService.generateDashboardAnalytics.mockResolvedValue({
          overview: { total_policies: 0, active_policies: 0, pending_reviews: 0, compliance_score: 0 },
          policy_distribution: {},
          compliance_trends: [],
          effectiveness_metrics: { average_effectiveness: 0, top_performing_policies: [], underperforming_policies: [] },
          gap_analysis: { critical_gaps: 0, high_gaps: 0, medium_gaps: 0, low_gaps: 0 }
        });

        const response = await request(app)
          .get('/api/policy/analytics/dashboard')
          .query({
            date_range_start: '2024-01-01T00:00:00.000Z',
            date_range_end: '2024-12-31T23:59:59.999Z',
            policy_types: 'privacy_policy,cookie_policy',
            jurisdictions: 'US,EU',
            compliance_frameworks: 'GDPR,CCPA'
          });

        expect(response.status).toBe(200);
        expect(mockPolicyAnalyticsService.generateDashboardAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            date_range: {
              start: new Date('2024-01-01T00:00:00.000Z'),
              end: new Date('2024-12-31T23:59:59.999Z')
            },
            policy_types: ['privacy_policy', 'cookie_policy'],
            jurisdictions: ['US', 'EU'],
            compliance_frameworks: ['GDPR', 'CCPA']
          })
        );
      });
    });

    describe('GET /api/policy/:id/gap-analysis', () => {
      it('should get gap analysis successfully', async () => {
        const mockGaps = [
          {
            requirement: 'Effective Date',
            current_coverage: 0,
            target_coverage: 100,
            gap_severity: 'medium' as const,
            remediation_steps: ['Set an effective date for the policy']
          }
        ];

        mockPolicyAnalyticsService.generateComplianceGapAnalysis.mockResolvedValue(mockGaps);

        const response = await request(app)
          .get('/api/policy/507f1f77bcf86cd799439011/gap-analysis');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockGaps);
        expect(mockPolicyAnalyticsService.generateComplianceGapAnalysis).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      });
    });

    describe('GET /api/policy/:id/relationship-map', () => {
      it('should get relationship map successfully', async () => {
        const mockRelationshipMap = {
          policy: mockPolicy,
          relationships: [
            {
              type: 'outgoing',
              related_policy: { ...mockPolicy, _id: '507f1f77bcf86cd799439016', title: 'Related Policy' },
              relationship_type: 'references',
              description: 'Test relationship'
            }
          ]
        };

        mockPolicyAnalyticsService.generateRelationshipMap.mockResolvedValue(mockRelationshipMap);

        const response = await request(app)
          .get('/api/policy/507f1f77bcf86cd799439011/relationship-map');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockRelationshipMap);
      });

      it('should return 404 when policy not found', async () => {
        mockPolicyAnalyticsService.generateRelationshipMap.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/policy/nonexistent/relationship-map');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Policy not found' });
      });
    });

    describe('POST /api/policy/schedule-review-notifications', () => {
      it('should schedule review notifications successfully', async () => {
        mockPolicyAnalyticsService.scheduleReviewNotifications.mockResolvedValue();

        const response = await request(app)
          .post('/api/policy/schedule-review-notifications');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Review notifications scheduled successfully' });
        expect(mockPolicyAnalyticsService.scheduleReviewNotifications).toHaveBeenCalled();
      });
    });
  });
});