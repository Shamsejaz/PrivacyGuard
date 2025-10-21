import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyService } from '../services/PolicyService';
import { PolicyRepository } from '../repositories/PolicyRepository';
import type { CreatePolicyRequest, UpdatePolicyRequest, PolicyApprovalRequest } from '../models/Policy';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

// Mock the repository
vi.mock('../repositories/PolicyRepository');
vi.mock('../utils/logger');

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mockPolicyRepository: vi.Mocked<PolicyRepository>;

  const mockPolicy = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Privacy Policy',
    type: 'privacy_policy' as const,
    content: 'This is a test privacy policy content.',
    version: '1.0.0',
    status: 'draft' as const,
    language: 'en',
    jurisdiction: 'US',
    created_by: 'user123',
    tags: ['test', 'privacy'],
    metadata: {
      word_count: 8,
      compliance_frameworks: ['GDPR', 'CCPA'],
      category: 'privacy',
      priority: 'medium' as const,
      review_frequency: 'annual' as const,
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

  const mockTemplate = {
    _id: '507f1f77bcf86cd799439012',
    name: 'GDPR Privacy Policy Template',
    description: 'Standard GDPR compliant privacy policy template',
    category: 'privacy',
    regulation: 'GDPR' as const,
    language: 'en',
    jurisdiction: 'EU',
    content: 'Template content with {{company_name}} variable',
    variables: [{
      name: 'company_name',
      type: 'text' as const,
      label: 'Company Name',
      required: true,
      default_value: ''
    }],
    is_active: true,
    created_by: 'admin',
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicyRepository = vi.mocked(new PolicyRepository());
    policyService = new PolicyService();
    // Replace the repository instance
    (policyService as any).policyRepository = mockPolicyRepository;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPolicy', () => {
    it('should create a policy successfully', async () => {
      const createRequest: CreatePolicyRequest = {
        title: 'Test Privacy Policy',
        type: 'privacy_policy',
        content: 'This is a test privacy policy content.',
        language: 'en',
        jurisdiction: 'US',
        tags: ['test', 'privacy'],
        metadata: {
          compliance_frameworks: ['GDPR', 'CCPA']
        }
      };

      mockPolicyRepository.createPolicy.mockResolvedValue(mockPolicy);
      // Mock the schedule review call that happens after policy creation
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.createReview.mockResolvedValue({
        _id: '507f1f77bcf86cd799439013',
        policy_id: '507f1f77bcf86cd799439011',
        reviewer_id: 'user123',
        review_type: 'scheduled',
        status: 'pending',
        scheduled_date: new Date(),
        findings: [],
        recommendations: [],
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await policyService.createPolicy(createRequest, 'user123');

      expect(mockPolicyRepository.createPolicy).toHaveBeenCalledWith(createRequest, 'user123');
      expect(result).toEqual(mockPolicy);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidRequest = {
        title: '',
        type: 'privacy_policy' as const,
        content: '',
        language: '',
        jurisdiction: ''
      };

      await expect(policyService.createPolicy(invalidRequest, 'user123'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing language and jurisdiction', async () => {
      const invalidRequest: CreatePolicyRequest = {
        title: 'Test Policy',
        type: 'privacy_policy',
        content: 'Content',
        language: '',
        jurisdiction: ''
      };

      await expect(policyService.createPolicy(invalidRequest, 'user123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getPolicyById', () => {
    it('should return policy when found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);

      const result = await policyService.getPolicyById('507f1f77bcf86cd799439011');

      expect(mockPolicyRepository.findPolicyById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockPolicy);
    });

    it('should return null when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      const result = await policyService.getPolicyById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePolicy', () => {
    it('should update policy successfully', async () => {
      const updateRequest: UpdatePolicyRequest = {
        title: 'Updated Privacy Policy',
        content: 'Updated content'
      };

      const updatedPolicy = { ...mockPolicy, ...updateRequest };

      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.updatePolicyStatus.mockResolvedValue(updatedPolicy);
      mockPolicyRepository.updatePolicy.mockResolvedValue(updatedPolicy);

      const result = await policyService.updatePolicy('507f1f77bcf86cd799439011', updateRequest, 'user123');

      expect(result).toEqual(updatedPolicy);
    });

    it('should throw NotFoundError when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      await expect(policyService.updatePolicy('nonexistent', {}, 'user123'))
        .rejects.toThrow(NotFoundError);
    });

    it('should reset status to draft when updating approved policy content', async () => {
      const approvedPolicy = { ...mockPolicy, status: 'approved' as const };
      const updateRequest: UpdatePolicyRequest = {
        content: 'New content'
      };

      mockPolicyRepository.findPolicyById.mockResolvedValue(approvedPolicy);
      mockPolicyRepository.updatePolicyStatus.mockResolvedValue(approvedPolicy);
      mockPolicyRepository.updatePolicy.mockResolvedValue(approvedPolicy);

      await policyService.updatePolicy('507f1f77bcf86cd799439011', updateRequest, 'user123');

      expect(mockPolicyRepository.updatePolicyStatus).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'draft', 'user123');
    });
  });

  describe('deletePolicy', () => {
    it('should delete policy successfully', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.deletePolicy.mockResolvedValue(true);

      const result = await policyService.deletePolicy('507f1f77bcf86cd799439011', 'user123');

      expect(result).toBe(true);
    });

    it('should throw NotFoundError when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      await expect(policyService.deletePolicy('nonexistent', 'user123'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when trying to delete active policy', async () => {
      const activePolicy = { ...mockPolicy, status: 'active' as const };
      mockPolicyRepository.findPolicyById.mockResolvedValue(activePolicy);

      await expect(policyService.deletePolicy('507f1f77bcf86cd799439011', 'user123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('approvePolicy', () => {
    it('should approve policy successfully', async () => {
      const approvalRequest: PolicyApprovalRequest = {
        policy_id: '507f1f77bcf86cd799439011',
        action: 'approve',
        comments: 'Looks good'
      };

      const approvedPolicy = { ...mockPolicy, status: 'approved' as const };

      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.updatePolicyStatus.mockResolvedValue(approvedPolicy);

      const result = await policyService.approvePolicy(approvalRequest, 'approver123');

      expect(mockPolicyRepository.updatePolicyStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'approved',
        'approver123',
        'Looks good'
      );
      expect(result).toEqual(approvedPolicy);
    });

    it('should reject policy successfully', async () => {
      const approvalRequest: PolicyApprovalRequest = {
        policy_id: '507f1f77bcf86cd799439011',
        action: 'reject',
        comments: 'Needs revision'
      };

      const rejectedPolicy = { ...mockPolicy, status: 'rejected' as const };

      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.updatePolicyStatus.mockResolvedValue(rejectedPolicy);

      const result = await policyService.approvePolicy(approvalRequest, 'approver123');

      expect(mockPolicyRepository.updatePolicyStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'rejected',
        'approver123',
        'Needs revision'
      );
      expect(result).toEqual(rejectedPolicy);
    });

    it('should throw ValidationError for invalid action', async () => {
      const invalidRequest = {
        policy_id: '507f1f77bcf86cd799439011',
        action: 'invalid' as any,
        comments: 'Test'
      };

      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);

      await expect(policyService.approvePolicy(invalidRequest, 'approver123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const createRequest = {
        name: 'GDPR Privacy Policy Template',
        description: 'Standard GDPR compliant privacy policy template',
        category: 'privacy',
        regulation: 'GDPR' as const,
        language: 'en',
        jurisdiction: 'EU',
        content: 'Template content',
        variables: []
      };

      mockPolicyRepository.createTemplate.mockResolvedValue(mockTemplate);

      const result = await policyService.createTemplate(createRequest, 'admin');

      expect(mockPolicyRepository.createTemplate).toHaveBeenCalledWith(createRequest, 'admin');
      expect(result).toEqual(mockTemplate);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidRequest = {
        name: '',
        description: '',
        category: '',
        regulation: 'GDPR' as const,
        language: 'en',
        jurisdiction: 'EU',
        content: '',
        variables: []
      };

      await expect(policyService.createTemplate(invalidRequest, 'admin'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('generatePolicyFromTemplate', () => {
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
        content: 'Template content with Test Company variable'
      };

      mockPolicyRepository.findTemplateById.mockResolvedValue(mockTemplate);
      mockPolicyRepository.createPolicy.mockResolvedValue(generatedPolicy);
      // Mock the schedule review call that happens after policy creation
      mockPolicyRepository.findPolicyById.mockResolvedValue(generatedPolicy);
      mockPolicyRepository.createReview.mockResolvedValue({
        _id: '507f1f77bcf86cd799439013',
        policy_id: '507f1f77bcf86cd799439011',
        reviewer_id: 'user123',
        review_type: 'scheduled',
        status: 'pending',
        scheduled_date: new Date(),
        findings: [],
        recommendations: [],
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await policyService.generatePolicyFromTemplate(generateRequest, 'user123');

      expect(mockPolicyRepository.findTemplateById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(result).toEqual(generatedPolicy);
    });

    it('should throw NotFoundError when template not found', async () => {
      const generateRequest = {
        template_id: 'nonexistent',
        title: 'Generated Privacy Policy',
        variable_values: {}
      };

      mockPolicyRepository.findTemplateById.mockResolvedValue(null);

      await expect(policyService.generatePolicyFromTemplate(generateRequest, 'user123'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for missing required variables', async () => {
      const generateRequest = {
        template_id: '507f1f77bcf86cd799439012',
        title: 'Generated Privacy Policy',
        variable_values: {} // Missing required company_name
      };

      mockPolicyRepository.findTemplateById.mockResolvedValue(mockTemplate);

      await expect(policyService.generatePolicyFromTemplate(generateRequest, 'user123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('searchPolicies', () => {
    it('should search policies successfully', async () => {
      const searchResult = {
        policies: [mockPolicy],
        total: 1,
        page: 1,
        limit: 20
      };

      mockPolicyRepository.searchPolicies.mockResolvedValue(searchResult);

      const result = await policyService.searchPolicies({
        search_text: 'privacy',
        status: 'draft'
      });

      expect(result).toEqual(searchResult);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report successfully', async () => {
      const complianceReport = {
        policy_id: '507f1f77bcf86cd799439011',
        policy_title: 'Test Privacy Policy',
        compliance_score: 85,
        framework_scores: { GDPR: 90, CCPA: 80 },
        gaps: [],
        recommendations: [],
        status: 'minor_gaps' as const
      };

      mockPolicyRepository.generateComplianceReport.mockResolvedValue(complianceReport);

      const result = await policyService.generateComplianceReport('507f1f77bcf86cd799439011');

      expect(result).toEqual(complianceReport);
    });
  });

  describe('scheduleReview', () => {
    it('should schedule review successfully', async () => {
      const mockReview = {
        _id: '507f1f77bcf86cd799439013',
        policy_id: '507f1f77bcf86cd799439011',
        reviewer_id: 'reviewer123',
        review_type: 'scheduled' as const,
        status: 'pending' as const,
        scheduled_date: new Date(),
        findings: [],
        recommendations: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPolicyRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockPolicyRepository.createReview.mockResolvedValue(mockReview);

      const result = await policyService.scheduleReview('507f1f77bcf86cd799439011', 'reviewer123');

      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundError when policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValue(null);

      await expect(policyService.scheduleReview('nonexistent', 'reviewer123'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createPolicyRelationship', () => {
    it('should create policy relationship successfully', async () => {
      const mockRelationship = {
        _id: '507f1f77bcf86cd799439014',
        source_policy_id: '507f1f77bcf86cd799439011',
        target_policy_id: '507f1f77bcf86cd799439015',
        relationship_type: 'references' as const,
        description: 'Test relationship',
        created_by: 'user123',
        created_at: new Date()
      };

      const targetPolicy = { ...mockPolicy, _id: '507f1f77bcf86cd799439015' };

      mockPolicyRepository.findPolicyById
        .mockResolvedValueOnce(mockPolicy)
        .mockResolvedValueOnce(targetPolicy);
      mockPolicyRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await policyService.createPolicyRelationship(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439015',
        'references',
        'Test relationship',
        'user123'
      );

      expect(result).toEqual(mockRelationship);
    });

    it('should throw NotFoundError when source policy not found', async () => {
      mockPolicyRepository.findPolicyById.mockResolvedValueOnce(null);

      await expect(policyService.createPolicyRelationship(
        'nonexistent',
        '507f1f77bcf86cd799439015',
        'references',
        'Test relationship',
        'user123'
      )).rejects.toThrow(NotFoundError);
    });
  });
});