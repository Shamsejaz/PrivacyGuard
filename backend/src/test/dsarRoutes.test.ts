import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import express from 'express';
import dsarRoutes from '../routes/dsar';
import { errorHandler } from '../middleware/errorHandler';
import { getTestDatabase, cleanupTestDatabase, createTestUser, getAuthToken } from './setup';

describe('DSAR Routes', () => {
  let app: express.Application;
  let db: Pool;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    db = await getTestDatabase();
    
    // Create test user and get auth token
    const testUser = await createTestUser(db);
    userId = testUser.id;
    authToken = getAuthToken(testUser);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/dsar', dsarRoutes);
    app.use(errorHandler);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up DSAR tables before each test
    await db.query('DELETE FROM dsar_status_history');
    await db.query('DELETE FROM dsar_requests');
  });

  describe('POST /submit', () => {
    it('should submit a new DSAR request', async () => {
      const requestData = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        subjectPhone: '+1234567890',
        requestType: 'access',
        description: 'I want to access my personal data',
        dataCategories: ['personal_info'],
        processingPurposes: ['marketing']
      };

      const response = await request(app)
        .post('/api/dsar/submit')
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('DSAR request submitted successfully');
      expect(response.body.data.requestId).toMatch(/^DSAR-/);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submittedAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        subjectName: '',
        subjectEmail: 'invalid-email',
        requestType: 'access'
      };

      const response = await request(app)
        .post('/api/dsar/submit')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBeFalsy();
    });

    it('should prevent duplicate submissions within 24 hours', async () => {
      const requestData = {
        subjectName: 'John Doe',
        subjectEmail: 'john.doe@example.com',
        requestType: 'access'
      };

      // First submission
      await request(app)
        .post('/api/dsar/submit')
        .send(requestData)
        .expect(201);

      // Second submission (should fail)
      const response = await request(app)
        .post('/api/dsar/submit')
        .send(requestData)
        .expect(400);

      expect(response.body.message).toContain('already submitted within the last 24 hours');
    });
  });

  describe('GET /status/:requestId', () => {
    let requestId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/dsar/submit')
        .send({
          subjectName: 'John Doe',
          subjectEmail: 'john.doe@example.com',
          requestType: 'access'
        });
      
      requestId = response.body.data.requestId;
    });

    it('should return request status', async () => {
      const response = await request(app)
        .get(`/api/dsar/status/${requestId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBe(requestId);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submittedAt).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should return 404 for non-existent request', async () => {
      await request(app)
        .get('/api/dsar/status/DSAR-NONEXISTENT')
        .expect(404);
    });
  });

  describe('Protected Routes', () => {
    describe('GET /', () => {
      beforeEach(async () => {
        // Create test requests
        const requests = [
          {
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          },
          {
            subjectName: 'Jane Smith',
            subjectEmail: 'jane.smith@example.com',
            requestType: 'erasure'
          }
        ];

        for (const req of requests) {
          await request(app)
            .post('/api/dsar/submit')
            .send(req);
        }
      });

      it('should return paginated DSAR requests', async () => {
        const response = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(2);
        expect(response.body.data.total).toBe(2);
        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(10);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/dsar?status=submitted')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.data).toHaveLength(2);
        response.body.data.data.forEach((req: any) => {
          expect(req.status).toBe('submitted');
        });
      });

      it('should filter by request type', async () => {
        const response = await request(app)
          .get('/api/dsar?requestType=access')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.data).toHaveLength(1);
        expect(response.body.data.data[0].requestType).toBe('access');
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/dsar')
          .expect(401);
      });
    });

    describe('GET /statistics', () => {
      beforeEach(async () => {
        // Create requests with different statuses
        const requests = [
          { name: 'User 1', email: 'user1@example.com', type: 'access' },
          { name: 'User 2', email: 'user2@example.com', type: 'erasure' },
          { name: 'User 3', email: 'user3@example.com', type: 'access' }
        ];

        for (const req of requests) {
          await request(app)
            .post('/api/dsar/submit')
            .send({
              subjectName: req.name,
              subjectEmail: req.email,
              requestType: req.type
            });
        }
      });

      it('should return DSAR statistics', async () => {
        const response = await request(app)
          .get('/api/dsar/statistics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(3);
        expect(response.body.data.submitted).toBe(3);
        expect(response.body.data.inProgress).toBe(0);
        expect(response.body.data.completed).toBe(0);
        expect(response.body.data.completionRate).toBe(0);
      });
    });

    describe('GET /:id', () => {
      let requestId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        // Get the actual database ID (not the requestId)
        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;
      });

      it('should return specific DSAR request', async () => {
        const response = await request(app)
          .get(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(requestId);
        expect(response.body.data.subjectName).toBe('John Doe');
      });

      it('should return 404 for non-existent request', async () => {
        await request(app)
          .get('/api/dsar/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('PUT /:id', () => {
      let requestId: string;

      beforeEach(async () => {
        await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;
      });

      it('should update DSAR request', async () => {
        const updates = {
          priority: 'high',
          legalBasis: 'Legitimate interest'
        };

        const response = await request(app)
          .put(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.priority).toBe('high');
        expect(response.body.data.legalBasis).toBe('Legitimate interest');
      });

      it('should validate update data', async () => {
        const invalidUpdates = {
          priority: 'invalid-priority'
        };

        await request(app)
          .put(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUpdates)
          .expect(400);
      });
    });

    describe('POST /:id/status', () => {
      let requestId: string;

      beforeEach(async () => {
        await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;
      });

      it('should update DSAR status', async () => {
        const statusUpdate = {
          status: 'in_progress',
          comment: 'Starting processing'
        };

        const response = await request(app)
          .post(`/api/dsar/${requestId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(statusUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('in_progress');
      });

      it('should validate status transitions', async () => {
        // First update to completed
        await request(app)
          .post(`/api/dsar/${requestId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'completed' });

        // Try invalid transition
        const response = await request(app)
          .post(`/api/dsar/${requestId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'submitted' })
          .expect(400);

        expect(response.body.message).toContain('Invalid status transition');
      });
    });

    describe('POST /:id/assign', () => {
      let requestId: string;

      beforeEach(async () => {
        await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;
      });

      it('should assign DSAR request', async () => {
        const assignment = {
          assigneeId: 'assignee-user-id'
        };

        const response = await request(app)
          .post(`/api/dsar/${requestId}/assign`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(assignment)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assignedTo).toBe('assignee-user-id');
      });
    });

    describe('GET /:id/history', () => {
      let requestId: string;

      beforeEach(async () => {
        await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;

        // Add some status history
        await request(app)
          .post(`/api/dsar/${requestId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'in_progress', comment: 'Starting work' });
      });

      it('should return status history', async () => {
        const response = await request(app)
          .get(`/api/dsar/${requestId}/history`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('in_progress');
        expect(response.body.data[0].comment).toBe('Starting work');
      });
    });

    describe('DELETE /:id', () => {
      let requestId: string;

      beforeEach(async () => {
        await request(app)
          .post('/api/dsar/submit')
          .send({
            subjectName: 'John Doe',
            subjectEmail: 'john.doe@example.com',
            requestType: 'access'
          });

        const listResponse = await request(app)
          .get('/api/dsar')
          .set('Authorization', `Bearer ${authToken}`);
        
        requestId = listResponse.body.data.data[0].id;
      });

      it('should delete cancelled request', async () => {
        // First cancel the request
        await request(app)
          .post(`/api/dsar/${requestId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'cancelled' });

        // Then delete it
        const response = await request(app)
          .delete(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify it's deleted
        await request(app)
          .get(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should not delete active request', async () => {
        await request(app)
          .delete(`/api/dsar/${requestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });
  });
});
