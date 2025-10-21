import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient, Db, Collection } from 'mongodb';
import { PolicyRepository } from '../repositories/PolicyRepository';
import type { CreatePolicyRequest, PolicyDocument, CreateTemplateRequest } from '../models/Policy';

// Mock MongoDB
vi.mock('mongodb');
vi.mock('../config/database');
vi.mock('../utils/logger');

describe('PolicyRepository', () => {
  let policyRepository: PolicyRepository;
  let mockDb: vi.Mocked<Db>;
  let mockPoliciesCollection: vi.Mocked<Collection>;
  let mockTemplatesCollection: vi.Mocked<Collection>;
  let mockAnalyticsCollection: vi.Mocked<Collection>;
  let mockReviewsCollection: vi.Mocked<Collection>;
  let mockRelationshipsCollection: vi.Mocked<Collection>;

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

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock collections
    mockPoliciesCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      createIndex: vi.fn(),
      indexes: vi.fn()
    } as any;

    mockTemplatesCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      createIndex: vi.fn()
    } as any;

    mockAnalyticsCollection = {
      insertOne: vi.fn(),
      find: vi.fn(),
      createIndex: vi.fn()
    } as any;

    mockReviewsCollection = {
      insertOne: vi.fn(),
      find: vi.fn(),
      createIndex: vi.fn()
    } as any;

    mockRelationshipsCollection = {
      insertOne: vi.fn(),
      find: vi.fn(),
      createIndex: vi.fn()
    } as any;

    // Mock database
    mockDb = {
      collection: vi.fn((name: string) => {
        switch (name) {
          case 'policy_documents': return mockPoliciesCollection;
          case 'policy_templates': return mockTemplatesCollection;
          case 'policy_analytics': return mockAnalyticsCollection;
          case 'policy_reviews': return mockReviewsCollection;
          case 'policy_relationships': return mockRelationshipsCollection;
          default: return mockPoliciesCollection;
        }
      })
    } as any;

    // Mock the mongoClient
    const mockMongoClient = {
      db: vi.fn().mockReturnValue(mockDb)
    } as any;

    // Mock the database import
    vi.doMock('../config/database', () => ({
      mongoClient: mockMongoClient
    }));

    policyRepository = new PolicyRepository();
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

      const insertResult = { insertedId: '507f1f77bcf86cd799439011' };
      mockPoliciesCollection.insertOne.mockResolvedValue(insertResult as any);
      mockPoliciesCollection.findOne.mockResolvedValue(mockPolicy);

      const result = await policyRepository.createPolicy(createRequest, 'user123');

      expect(mockPoliciesCollection.insertOne).toHaveBeenCalled();
      expect(mockPoliciesCollection.findOne).toHaveBeenCalledWith({ _id: insertResult.insertedId });
      expect(result).toEqual(mockPolicy);
    });

    it('should throw error if policy creation fails', async () => {
      const createRequest: CreatePolicyRequest = {
        title: 'Test Privacy Policy',
        type: 'privacy_policy',
        content: 'Content',
        language: 'en',
        jurisdiction: 'US'
      };

      mockPoliciesCollection.insertOne.mockRejectedValue(new Error('Database error'));

      await expect(policyRepository.createPolicy(createRequest, 'user123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findPolicyById', () => {
    it('should find policy by ID successfully', async () => {
      mockPoliciesCollection.findOne.mockResolvedValue(mockPolicy);

      const result = await policyRepository.findPolicyById('507f1f77bcf86cd799439011');

      expect(mockPoliciesCollection.findOne).toHaveBeenCalledWith({ 
        _id: expect.any(Object) // ObjectId
      });
      expect(result).toEqual(mockPolicy);
    });

    it('should return null when policy not found', async () => {
      mockPoliciesCollection.findOne.mockResolvedValue(null);

      const result = await policyRepository.findPolicyById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle invalid ObjectId', async () => {
      mockPoliciesCollection.findOne.mockRejectedValue(new Error('Invalid ObjectId'));

      await expect(policyRepository.findPolicyById('invalid-id'))
        .rejects.toThrow('Invalid ObjectId');
    });
  });

  describe('updatePolicy', () => {
    it('should update policy successfully', async () => {
      const updates = {
        title: 'Updated Privacy Policy',
        content: 'Updated content'
      };

      const updatedPolicy = { ...mockPolicy, ...updates };

      mockPoliciesCollection.findOne.mockResolvedValue(mockPolicy);
      mockPoliciesCollection.findOneAndUpdate.mockResolvedValue({ value: updatedPolicy });

      const result = await policyRepository.updatePolicy('507f1f77bcf86cd799439011', updates, 'user123');

      expect(mockPoliciesCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toEqual(updatedPolicy);
    });

    it('should return null when policy not found', async () => {
      mockPoliciesCollection.findOne.mockResolvedValue(null);

      const result = await policyRepository.updatePolicy('nonexistent', {}, 'user123');

      expect(result).toBeNull();
    });

    it('should increment version when content changes', async () => {
      const updates = {
        content: 'New content'
      };

      mockPoliciesCollection.findOne.mockResolvedValue(mockPolicy);
      mockPoliciesCollection.findOneAndUpdate.mockResolvedValue({ value: mockPolicy });

      await policyRepository.updatePolicy('507f1f77bcf86cd799439011', updates, 'user123');

      expect(mockPoliciesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            version: '1.1.0' // Should increment minor version
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('deletePolicy', () => {
    it('should delete policy successfully', async () => {
      mockPoliciesCollection.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);
      mockAnalyticsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      mockReviewsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);
      mockRelationshipsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await policyRepository.deletePolicy('507f1f77bcf86cd799439011');

      expect(mockPoliciesCollection.deleteOne).toHaveBeenCalled();
      expect(mockAnalyticsCollection.deleteMany).toHaveBeenCalledWith({ policy_id: '507f1f77bcf86cd799439011' });
      expect(mockReviewsCollection.deleteMany).toHaveBeenCalledWith({ policy_id: '507f1f77bcf86cd799439011' });
      expect(mockRelationshipsCollection.deleteMany).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when policy not found', async () => {
      mockPoliciesCollection.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

      const result = await policyRepository.deletePolicy('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('searchPolicies', () => {
    it('should search policies with filters', async () => {
      const mockCursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([mockPolicy])
      };

      mockPoliciesCollection.find.mockReturnValue(mockCursor as any);
      mockPoliciesCollection.countDocuments.mockResolvedValue(1);

      const filters = {
        type: 'privacy_policy' as const,
        status: 'draft' as const,
        search_text: 'privacy',
        page: 1,
        limit: 20
      };

      const result = await policyRepository.searchPolicies(filters);

      expect(mockPoliciesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'privacy_policy',
          status: 'draft',
          $text: { $search: 'privacy' }
        })
      );
      expect(result).toEqual({
        policies: [mockPolicy],
        total: 1,
        page: 1,
        limit: 20
      });
    });

    it('should handle date range filters', async () => {
      const mockCursor = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      };

      mockPoliciesCollection.find.mockReturnValue(mockCursor as any);
      mockPoliciesCollection.countDocuments.mockResolvedValue(0);

      const filters = {
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      await policyRepository.searchPolicies(filters);

      expect(mockPoliciesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: {
            $gte: filters.date_range.start,
            $lte: filters.date_range.end
          }
        })
      );
    });
  });

  describe('updatePolicyStatus', () => {
    it('should update policy status successfully', async () => {
      const updatedPolicy = { ...mockPolicy, status: 'approved' as const };
      mockPoliciesCollection.findOneAndUpdate.mockResolvedValue({ value: updatedPolicy });

      const result = await policyRepository.updatePolicyStatus('507f1f77bcf86cd799439011', 'approved', 'approver123');

      expect(mockPoliciesCollection.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'approved',
            approved_by: 'approver123',
            approval_date: expect.any(Date)
          })
        }),
        expect.any(Object)
      );
      expect(result).toEqual(updatedPolicy);
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const createRequest: CreateTemplateRequest = {
        name: 'GDPR Privacy Policy Template',
        description: 'Standard GDPR compliant privacy policy template',
        category: 'privacy',
        regulation: 'GDPR',
        language: 'en',
        jurisdiction: 'EU',
        content: 'Template content',
        variables: []
      };

      const mockTemplate = {
        _id: '507f1f77bcf86cd799439012',
        ...createRequest,
        is_active: true,
        created_by: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertResult = { insertedId: '507f1f77bcf86cd799439012' };
      mockTemplatesCollection.insertOne.mockResolvedValue(insertResult as any);
      mockTemplatesCollection.findOne.mockResolvedValue(mockTemplate);

      const result = await policyRepository.createTemplate(createRequest, 'admin');

      expect(mockTemplatesCollection.insertOne).toHaveBeenCalled();
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findTemplateById', () => {
    it('should find template by ID successfully', async () => {
      const mockTemplate = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Template',
        description: 'Test description',
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
      };

      mockTemplatesCollection.findOne.mockResolvedValue(mockTemplate);

      const result = await policyRepository.findTemplateById('507f1f77bcf86cd799439012');

      expect(mockTemplatesCollection.findOne).toHaveBeenCalledWith({ 
        _id: expect.any(Object) 
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findTemplates', () => {
    it('should find templates with filters', async () => {
      const mockTemplate = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Template',
        category: 'privacy',
        regulation: 'GDPR' as const,
        language: 'en',
        jurisdiction: 'EU'
      };

      const mockCursor = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([mockTemplate])
      };

      mockTemplatesCollection.find.mockReturnValue(mockCursor as any);

      const filters = {
        category: 'privacy',
        regulation: 'GDPR',
        is_active: true
      };

      const result = await policyRepository.findTemplates(filters);

      expect(mockTemplatesCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'privacy',
          regulation: 'GDPR',
          is_active: true
        })
      );
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report successfully', async () => {
      mockPoliciesCollection.findOne.mockResolvedValue(mockPolicy);

      const result = await policyRepository.generateComplianceReport('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result?.policy_id).toBe('507f1f77bcf86cd799439011');
      expect(result?.policy_title).toBe('Test Privacy Policy');
      expect(typeof result?.compliance_score).toBe('number');
      expect(Array.isArray(result?.gaps)).toBe(true);
      expect(Array.isArray(result?.recommendations)).toBe(true);
    });

    it('should return null when policy not found', async () => {
      mockPoliciesCollection.findOne.mockResolvedValue(null);

      const result = await policyRepository.generateComplianceReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createAnalytics', () => {
    it('should create analytics successfully', async () => {
      const analyticsData = {
        policy_id: '507f1f77bcf86cd799439011',
        metric_type: 'views' as const,
        period: 'daily' as const,
        date_range: {
          start: new Date(),
          end: new Date()
        },
        data: {
          total_count: 10
        },
        generated_by: 'system',
        generated_at: new Date()
      };

      const insertResult = { insertedId: '507f1f77bcf86cd799439013' };
      const createdAnalytics = { _id: '507f1f77bcf86cd799439013', ...analyticsData };

      mockAnalyticsCollection.insertOne.mockResolvedValue(insertResult as any);
      mockAnalyticsCollection.findOne.mockResolvedValue(createdAnalytics);

      const result = await policyRepository.createAnalytics(analyticsData);

      expect(mockAnalyticsCollection.insertOne).toHaveBeenCalledWith(analyticsData);
      expect(result).toEqual(createdAnalytics);
    });
  });

  describe('findAnalyticsByPolicyId', () => {
    it('should find analytics by policy ID', async () => {
      const mockAnalytics = [{
        _id: '507f1f77bcf86cd799439013',
        policy_id: '507f1f77bcf86cd799439011',
        metric_type: 'views',
        data: { total_count: 10 }
      }];

      const mockCursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockAnalytics)
      };

      mockAnalyticsCollection.find.mockReturnValue(mockCursor as any);

      const result = await policyRepository.findAnalyticsByPolicyId('507f1f77bcf86cd799439011');

      expect(mockAnalyticsCollection.find).toHaveBeenCalledWith({ 
        policy_id: '507f1f77bcf86cd799439011' 
      });
      expect(result).toEqual(mockAnalytics);
    });

    it('should filter by metric type when provided', async () => {
      const mockCursor = {
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      };

      mockAnalyticsCollection.find.mockReturnValue(mockCursor as any);

      await policyRepository.findAnalyticsByPolicyId('507f1f77bcf86cd799439011', 'views');

      expect(mockAnalyticsCollection.find).toHaveBeenCalledWith({ 
        policy_id: '507f1f77bcf86cd799439011',
        metric_type: 'views'
      });
    });
  });
});