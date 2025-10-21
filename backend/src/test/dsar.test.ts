import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { DSARRepository } from '../repositories/DSARRepository';
import { DSARService } from '../services/DSARService';
import { CreateDSARRequest, UpdateDSARRequest } from '../types/dsar';
import { getTestDatabase, cleanupTestDatabase } from './setup';

describe('DSAR Service', () => {
  let db: Pool;
  let dsarRepository: DSARRepository;
  let dsarService: DSARService;

  beforeAll(async () => {
    db = await getTestDatabase();
    dsarRepository = new DSARRepository(db);
    dsarService = new DSARService(dsarRepository);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up DSAR tables before each test
    await db.query('DELETE FROM dsar_status_history');
    await db.query('DELETE FROM dsar_requests');
  });

  describe('createRequest', () => {
    it('should create a new DSAR request successfully', async () => {
      const requestData: CreateDSARRequest = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        subjectPhone: '+1234567890',
        requestType: 'access',
        description: 'I want to access my personal data',
        dataCategories: ['personal_info', 'contact_info'],
        processingPurposes: ['marketing', 'analytics']
      };

      const result = await dsarService.createRequest(requestData);

      expect(result).toBeDefined();
      expect(result.subjectName).toBe(requestData.subjectName);
      expect(result.subjectEmail).toBe(requestData.subjectEmail);
      expect(result.requestType).toBe(requestData.requestType);
      expect(result.status).toBe('submitted');
      expect(result.priority).toBe('medium');
      expect(result.requestId).toMatch(/^DSAR-/);
      expect(result.dataCategories).toEqual(requestData.dataCategories);
      expect(result.processingPurposes).toEqual(requestData.processingPurposes);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        subjectName: '',
        subjectEmail: 'invalid-email',
        requestType: 'access' as const
      };

      await expect(dsarService.createRequest(invalidRequest)).rejects.toThrow('Subject name is required');
    });

    it('should validate email format', async () => {
      const invalidRequest = {
        subjectName: 'John Doe',
        subjectEmail: 'invalid-email',
        requestType: 'access' as const
      };

      await expect(dsarService.createRequest(invalidRequest)).rejects.toThrow('Invalid email format');
    });

    it('should prevent duplicate requests within 24 hours', async () => {
      const requestData: CreateDSARRequest = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      };

      // Create first request
      await dsarService.createRequest(requestData);

      // Try to create duplicate request
      await expect(dsarService.createRequest(requestData)).rejects.toThrow(
        'A DSAR request from this email address was already submitted within the last 24 hours'
      );
    });

    it('should validate request type', async () => {
      const invalidRequest = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'invalid' as any
      };

      await expect(dsarService.createRequest(invalidRequest)).rejects.toThrow('Invalid request type');
    });
  });

  describe('getRequests', () => {
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
        await dsarService.createRequest(request);
      }
    });

    it('should return paginated results', async () => {
      const result = await dsarService.getRequests({ page: 1, limit: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      const result = await dsarService.getRequests({ status: 'submitted' });

      expect(result.data).toHaveLength(2);
      result.data.forEach(request => {
        expect(request.status).toBe('submitted');
      });
    });

    it('should filter by request type', async () => {
      const result = await dsarService.getRequests({ requestType: 'access' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].requestType).toBe('access');
    });

    it('should filter by subject email', async () => {
      const result = await dsarService.getRequests({ subjectEmail: 'john.doe' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].subjectEmail).toBe('john.doe@example.com');
    });
  });

  describe('updateRequest', () => {
    let requestId: string;

    beforeEach(async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = request.id;
    });

    it('should update request successfully', async () => {
      const updates: UpdateDSARRequest = {
        priority: 'high',
        legalBasis: 'Legitimate interest'
      };

      const result = await dsarService.updateRequest(requestId, updates, 'user-id');

      expect(result.priority).toBe('high');
      expect(result.legalBasis).toBe('Legitimate interest');
    });

    it('should validate status transitions', async () => {
      // First update to in_progress
      await dsarService.updateRequest(requestId, { status: 'in_progress' }, 'user-id');

      // Try invalid transition from in_progress to submitted
      await expect(
        dsarService.updateRequest(requestId, { status: 'submitted' }, 'user-id')
      ).rejects.toThrow('Invalid status transition');
    });

    it('should validate priority values', async () => {
      const invalidUpdates = {
        priority: 'invalid' as any
      };

      await expect(
        dsarService.updateRequest(requestId, invalidUpdates, 'user-id')
      ).rejects.toThrow('Invalid priority');
    });

    it('should throw error for non-existent request', async () => {
      await expect(
        dsarService.updateRequest('non-existent-id', { priority: 'high' }, 'user-id')
      ).rejects.toThrow('DSAR request not found');
    });
  });

  describe('updateRequestStatus', () => {
    let requestId: string;

    beforeEach(async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = request.id;
    });

    it('should update status and create history entry', async () => {
      const statusChange = {
        dsarId: requestId,
        status: 'in_review' as const,
        comment: 'Starting review process',
        changedBy: 'user-id'
      };

      const result = await dsarService.updateRequestStatus(statusChange);

      expect(result.status).toBe('in_review');

      // Check status history
      const history = await dsarService.getStatusHistory(requestId);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('in_review');
      expect(history[0].comment).toBe('Starting review process');
      expect(history[0].changedBy).toBe('user-id');
    });

    it('should validate status transitions', async () => {
      // Update to completed
      await dsarService.updateRequestStatus({
        dsarId: requestId,
        status: 'completed',
        changedBy: 'user-id'
      });

      // Try to update from completed (should fail)
      await expect(
        dsarService.updateRequestStatus({
          dsarId: requestId,
          status: 'in_progress',
          changedBy: 'user-id'
        })
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('assignRequest', () => {
    let requestId: string;

    beforeEach(async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });
      requestId = request.id;
    });

    it('should assign request and update status if submitted', async () => {
      const result = await dsarService.assignRequest(requestId, 'assignee-id', 'assigner-id');

      expect(result.assignedTo).toBe('assignee-id');
      expect(result.status).toBe('in_review'); // Should auto-update from submitted

      // Check status history
      const history = await dsarService.getStatusHistory(requestId);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('in_review');
      expect(history[0].comment).toContain('Assigned to user assignee-id');
    });

    it('should assign request without changing status if not submitted', async () => {
      // First update to in_progress
      await dsarService.updateRequestStatus({
        dsarId: requestId,
        status: 'in_progress',
        changedBy: 'user-id'
      });

      const result = await dsarService.assignRequest(requestId, 'assignee-id', 'assigner-id');

      expect(result.assignedTo).toBe('assignee-id');
      expect(result.status).toBe('in_progress'); // Should not change
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      // Create test requests with different statuses
      const requests = [
        { status: 'submitted' },
        { status: 'in_progress' },
        { status: 'in_progress' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' }
      ];

      for (const [index, { status }] of requests.entries()) {
        const request = await dsarService.createRequest({
          subjectName: `User ${index}`,
          subjectEmail: `user${index}@example.com`,
          requestType: 'access'
        });

        if (status !== 'submitted') {
          await dsarService.updateRequestStatus({
            dsarId: request.id,
            status: status as any,
            changedBy: 'user-id'
          });
        }
      }
    });

    it('should return correct statistics', async () => {
      const stats = await dsarService.getStatistics();

      expect(stats.total).toBe(6);
      expect(stats.submitted).toBe(1);
      expect(stats.inProgress).toBe(2);
      expect(stats.completed).toBe(3);
      expect(stats.completionRate).toBe(50); // 3/6 * 100
    });
  });

  describe('deleteRequest', () => {
    it('should delete cancelled request', async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      // Update to cancelled
      await dsarService.updateRequestStatus({
        dsarId: request.id,
        status: 'cancelled',
        changedBy: 'user-id'
      });

      await dsarService.deleteRequest(request.id);

      // Should not be able to find the request
      await expect(dsarService.getRequestById(request.id)).rejects.toThrow('DSAR request not found');
    });

    it('should not delete active request', async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      await expect(dsarService.deleteRequest(request.id)).rejects.toThrow(
        'Only cancelled or rejected DSAR requests can be deleted'
      );
    });
  });

  describe('generateReport', () => {
    it('should generate report for request', async () => {
      const request = await dsarService.createRequest({
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      });

      // Add some status history
      await dsarService.updateRequestStatus({
        dsarId: request.id,
        status: 'in_progress',
        comment: 'Starting processing',
        changedBy: 'user-id'
      });

      const report = await dsarService.generateReport(request.id);

      expect(report.request).toBeDefined();
      expect(report.request.id).toBe(request.id);
      expect(report.statusHistory).toBeDefined();
      expect(report.statusHistory).toHaveLength(1);
      expect(report.generatedAt).toBeDefined();
      expect(report.reportType).toBe('DSAR_SUMMARY');
    });
  });
});
