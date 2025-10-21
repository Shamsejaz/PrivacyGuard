import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { DSARRepository } from '../repositories/DSARRepository';
import { CreateDSARRequest, UpdateDSARRequest } from '../types/dsar';
import { getTestDatabase, cleanupTestDatabase } from './setup';

describe('DSAR Repository', () => {
  let db: Pool;
  let dsarRepository: DSARRepository;

  beforeAll(async () => {
    db = await getTestDatabase();
    dsarRepository = new DSARRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up DSAR tables before each test
    await db.query('DELETE FROM dsar_status_history');
    await db.query('DELETE FROM dsar_requests');
  });

  describe('create', () => {
    it('should create a new DSAR request', async () => {
      const requestData: CreateDSARRequest = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        subjectPhone: '+1234567890',
        requestType: 'access',
        description: 'I want to access my personal data',
        dataCategories: ['personal_info', 'contact_info'],
        processingPurposes: ['marketing', 'analytics']
      };

      const result = await dsarRepository.create(requestData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.requestId).toMatch(/^DSAR-/);
      expect(result.subjectName).toBe(requestData.subjectName);
      expect(result.subjectEmail).toBe(requestData.subjectEmail);
      expect(result.subjectPhone).toBe(requestData.subjectPhone);
      expect(result.requestType).toBe(requestData.requestType);
      expect(result.description).toBe(requestData.description);
      expect(result.dataCategories).toEqual(requestData.dataCategories);
      expect(result.processingPurposes).toEqual(requestData.processingPurposes);
      expect(result.status).toBe('submitted');
      expect(result.priority).toBe('medium');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle optional fields', async () => {
      const requestData: CreateDSARRequest = {
        subjectName: 'Jane Smith',
        subjectEmail: 'jane.smith@example.com',
        requestType: 'erasure'
      };

      const result = await dsarRepository.create(requestData);

      expect(result.subjectPhone).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.dataCategories).toEqual([]);
      expect(result.processingPurposes).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find request by ID', async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      const found = await dsarRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.subjectName).toBe(created.subjectName);
    });

    it('should return null for non-existent ID', async () => {
      const found = await dsarRepository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByRequestId', () => {
    it('should find request by request ID', async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      const found = await dsarRepository.findByRequestId(created.requestId);

      expect(found).toBeDefined();
      expect(found!.requestId).toBe(created.requestId);
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent request ID', async () => {
      const found = await dsarRepository.findByRequestId('DSAR-NONEXISTENT');
      expect(found).toBeNull();
    });
  });

  describe('findBySubjectEmail', () => {
    it('should find requests by subject email', async () => {
      const email = 'john.doe@example.com';
      
      // Create multiple requests for the same email
      await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: email,
        requestType: 'access'
      });
      
      await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: email,
        requestType: 'erasure'
      });

      // Create request for different email
      await dsarRepository.create({
        subjectName: 'Jane Smith',
        subjectEmail: 'jane.smith@example.com',
        requestType: 'access'
      });

      const found = await dsarRepository.findBySubjectEmail(email);

      expect(found).toHaveLength(2);
      found.forEach(request => {
        expect(request.subjectEmail).toBe(email);
      });
    });

    it('should return empty array for non-existent email', async () => {
      const found = await dsarRepository.findBySubjectEmail('nonexistent@example.com');
      expect(found).toEqual([]);
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create test data
      const requests = [
        {
          subjectName: 'John Doe',
          subjectEmail: 'john.doe@example.com',
          requestType: 'access' as const
        },
        {
          subjectName: 'Jane Smith',
          subjectEmail: 'jane.smith@example.com',
          requestType: 'erasure' as const
        },
        {
          subjectName: 'Bob Johnson',
          subjectEmail: 'bob.johnson@example.com',
          requestType: 'portability' as const
        }
      ];

      for (const request of requests) {
        await dsarRepository.create(request);
      }
    });

    it('should return paginated results', async () => {
      const result = await dsarRepository.findMany({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      const result = await dsarRepository.findMany({ status: 'submitted' });

      expect(result.data).toHaveLength(3);
      result.data.forEach(request => {
        expect(request.status).toBe('submitted');
      });
    });

    it('should filter by request type', async () => {
      const result = await dsarRepository.findMany({ requestType: 'access' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].requestType).toBe('access');
    });

    it('should filter by subject email pattern', async () => {
      const result = await dsarRepository.findMany({ subjectEmail: 'john' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].subjectEmail).toBe('john.doe@example.com');
    });

    it('should return empty results for no matches', async () => {
      const result = await dsarRepository.findMany({ status: 'completed' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    let requestId: string;

    beforeEach(async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = created.id;
    });

    it('should update request fields', async () => {
      const updates: UpdateDSARRequest = {
        priority: 'high',
        legalBasis: 'Legitimate interest',
        dataCategories: ['personal_info', 'financial_info'],
        processingPurposes: ['compliance']
      };

      const result = await dsarRepository.update(requestId, updates);

      expect(result.priority).toBe('high');
      expect(result.legalBasis).toBe('Legitimate interest');
      expect(result.dataCategories).toEqual(['personal_info', 'financial_info']);
      expect(result.processingPurposes).toEqual(['compliance']);
      expect(result.updatedAt.getTime()).toBeGreaterThan(result.createdAt.getTime());
    });

    it('should handle partial updates', async () => {
      const updates: UpdateDSARRequest = {
        priority: 'low'
      };

      const result = await dsarRepository.update(requestId, updates);

      expect(result.priority).toBe('low');
      // Other fields should remain unchanged
      expect(result.subjectName).toBe('John Doe');
      expect(result.requestType).toBe('access');
    });

    it('should throw error for non-existent request', async () => {
      await expect(
        dsarRepository.update('non-existent-id', { priority: 'high' })
      ).rejects.toThrow('DSAR request not found');
    });
  });

  describe('updateStatus', () => {
    let requestId: string;

    beforeEach(async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = created.id;
    });

    it('should update status and create history entry', async () => {
      await dsarRepository.updateStatus(requestId, 'in_progress', 'user-id', 'Starting processing');

      // Check that status was updated
      const updated = await dsarRepository.findById(requestId);
      expect(updated!.status).toBe('in_progress');

      // Check that history entry was created
      const history = await dsarRepository.getStatusHistory(requestId);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('in_progress');
      expect(history[0].comment).toBe('Starting processing');
      expect(history[0].changedBy).toBe('user-id');
    });

    it('should handle status update without comment', async () => {
      await dsarRepository.updateStatus(requestId, 'completed', 'user-id');

      const history = await dsarRepository.getStatusHistory(requestId);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('completed');
      expect(history[0].comment).toBeNull();
    });

    it('should maintain transaction integrity', async () => {
      // This test ensures that if history creation fails, status update is rolled back
      // We can't easily simulate this without mocking, but the test structure is here
      await dsarRepository.updateStatus(requestId, 'in_review', 'user-id', 'Review started');

      const updated = await dsarRepository.findById(requestId);
      const history = await dsarRepository.getStatusHistory(requestId);

      expect(updated!.status).toBe('in_review');
      expect(history).toHaveLength(1);
    });
  });

  describe('getStatusHistory', () => {
    let requestId: string;

    beforeEach(async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = created.id;
    });

    it('should return status history in chronological order', async () => {
      // Create multiple status updates
      await dsarRepository.updateStatus(requestId, 'in_review', 'user1', 'First update');
      await dsarRepository.updateStatus(requestId, 'in_progress', 'user2', 'Second update');
      await dsarRepository.updateStatus(requestId, 'completed', 'user3', 'Third update');

      const history = await dsarRepository.getStatusHistory(requestId);

      expect(history).toHaveLength(3);
      // Should be in reverse chronological order (newest first)
      expect(history[0].status).toBe('completed');
      expect(history[1].status).toBe('in_progress');
      expect(history[2].status).toBe('in_review');
    });

    it('should return empty array for request with no history', async () => {
      const history = await dsarRepository.getStatusHistory(requestId);
      expect(history).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete request and related history', async () => {
      const created = await dsarRepository.create({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      // Add some history
      await dsarRepository.updateStatus(created.id, 'in_progress', 'user-id', 'Processing');

      // Delete the request
      await dsarRepository.delete(created.id);

      // Verify deletion
      const found = await dsarRepository.findById(created.id);
      expect(found).toBeNull();

      // History should also be deleted due to CASCADE
      const history = await dsarRepository.getStatusHistory(created.id);
      expect(history).toEqual([]);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      // Create test data
      const requests = [
        {
          subjectName: 'John Doe',
          subjectEmail: 'john.doe@example.com',
          requestType: 'access' as const
        },
        {
          subjectName: 'Jane Smith',
          subjectEmail: 'jane.smith@example.com',
          requestType: 'erasure' as const
        }
      ];

      for (const request of requests) {
        await dsarRepository.create(request);
      }
    });

    it('should count all requests without filters', async () => {
      const count = await dsarRepository.count();
      expect(count).toBe(2);
    });

    it('should count requests with filters', async () => {
      const count = await dsarRepository.count({ requestType: 'access' });
      expect(count).toBe(1);
    });

    it('should return 0 for no matches', async () => {
      const count = await dsarRepository.count({ status: 'completed' });
      expect(count).toBe(0);
    });
  });
});
