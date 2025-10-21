import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import express from 'express';
import gdprRoutes from '../routes/gdpr';
import { errorHandler } from '../middleware/errorHandler';
import { getTestDatabase, cleanupTestDatabase, createTestUser, getAuthToken } from './setup';

describe('GDPR Routes', () => {
  let pool: Pool;
  let app: express.Application;
  let authToken: string;

  beforeAll(async () => {
    pool = await getTestDatabase();
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/gdpr', gdprRoutes);
    app.use(errorHandler);

    // Create test user and get auth token
    const testUser = await createTestUser(pool);
    authToken = getAuthToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await pool.query('DELETE FROM lawful_basis_records');
    await pool.query('DELETE FROM processing_records');
    await pool.query('DELETE FROM dpias');
    await pool.query('DELETE FROM data_breaches');
    await pool.query('DELETE FROM data_portability_requests');
  });

  describe('Dashboard Endpoints', () => {
    it('should get dashboard stats', async () => {
      const response = await request(app)
        .get('/api/v1/gdpr/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.overallScore).toBeDefined();
      expect(response.body.lawfulBasisCoverage).toBeDefined();
      expect(response.body.dpiasCompleted).toBeDefined();
      expect(response.body.recentActivities).toBeDefined();
      expect(Array.isArray(response.body.recentActivities)).toBe(true);
    });

    it('should require authentication for dashboard', async () => {
      await request(app)
        .get('/api/v1/gdpr/dashboard')
        .expect(401);
    });

    it('should generate compliance report', async () => {
      const response = await request(app)
        .get('/api/v1/gdpr/reports/compliance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.details).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should generate compliance report with date filters', async () => {
      const dateFrom = new Date('2024-01-01').toISOString();
      const dateTo = new Date('2024-12-31').toISOString();

      const response = await request(app)
        .get(`/api/v1/gdpr/reports/compliance?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.reportPeriod).toBeDefined();
      expect(response.body.reportPeriod.from).toBeDefined();
      expect(response.body.reportPeriod.to).toBeDefined();
    });
  });

  describe('Lawful Basis Endpoints', () => {
    it('should create a lawful basis record', async () => {
      const data = {
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      };

      const response = await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.processingActivity).toBe(data.processingActivity);
      expect(response.body.lawfulBasis).toBe(data.lawfulBasis);
      expect(response.body.status).toBe('active');
    });

    it('should get lawful basis records', async () => {
      // Create a test record first
      await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          processingActivity: 'Test Activity',
          lawfulBasis: 'consent',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        });

      const response = await request(app)
        .get('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].processingActivity).toBe('Test Activity');
    });

    it('should filter lawful basis records by status', async () => {
      await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          processingActivity: 'Test Activity',
          lawfulBasis: 'consent',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        });

      const response = await request(app)
        .get('/api/v1/gdpr/lawful-basis?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('active');
    });

    it('should update a lawful basis record', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          processingActivity: 'Test Activity',
          lawfulBasis: 'consent',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        });

      const recordId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/v1/gdpr/lawful-basis/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'review' })
        .expect(200);

      expect(updateResponse.body.status).toBe('review');
    });

    it('should delete a lawful basis record', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          processingActivity: 'Test Activity',
          lawfulBasis: 'consent',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        });

      const recordId = createResponse.body.id;

      await request(app)
        .delete(`/api/v1/gdpr/lawful-basis/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      const getResponse = await request(app)
        .get('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toHaveLength(0);
    });

    it('should validate lawful basis input', async () => {
      const response = await request(app)
        .post('/api/v1/gdpr/lawful-basis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          processingActivity: 'Test Activity',
          lawfulBasis: 'invalid_basis',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid lawful basis');
    });
  });

  describe('Processing Records Endpoints', () => {
    it('should create a processing record', async () => {
      const data = {
        activityName: 'Test Processing Activity',
        controller: 'Test Controller',
        purposes: ['Testing'],
        lawfulBasis: 'Contract (Article 6(1)(b))',
        dataCategories: ['Personal Data'],
        dataSubjects: ['Customers'],
        recipients: ['Internal Team'],
        thirdCountryTransfers: false,
        retentionPeriod: '5 years',
        technicalMeasures: ['Encryption'],
        organisationalMeasures: ['Access Controls']
      };

      const response = await request(app)
        .post('/api/v1/gdpr/processing-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data)
        .expect(201);

      expect(response.body.activityName).toBe(data.activityName);
      expect(response.body.controller).toBe(data.controller);
      expect(response.body.thirdCountryTransfers).toBe(false);
    });

    it('should get processing records', async () => {
      await request(app)
        .post('/api/v1/gdpr/processing-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          activityName: 'Test Activity',
          controller: 'Test Controller',
          purposes: ['Testing'],
          lawfulBasis: 'Contract (Article 6(1)(b))',
          dataCategories: ['Personal Data'],
          dataSubjects: ['Customers'],
          recipients: ['Internal Team'],
          thirdCountryTransfers: false,
          retentionPeriod: '5 years',
          technicalMeasures: ['Encryption'],
          organisationalMeasures: ['Access Controls']
        });

      const response = await request(app)
        .get('/api/v1/gdpr/processing-records')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should export processing records as CSV', async () => {
      await request(app)
        .post('/api/v1/gdpr/processing-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          activityName: 'Test Activity',
          controller: 'Test Controller',
          purposes: ['Testing'],
          lawfulBasis: 'Contract (Article 6(1)(b))',
          dataCategories: ['Personal Data'],
          dataSubjects: ['Customers'],
          recipients: ['Internal Team'],
          thirdCountryTransfers: false,
          retentionPeriod: '5 years',
          technicalMeasures: ['Encryption'],
          organisationalMeasures: ['Access Controls']
        });

      const response = await request(app)
        .get('/api/v1/gdpr/processing-records/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Activity Name');
      expect(response.text).toContain('Test Activity');
    });
  });

  describe('DPIA Endpoints', () => {
    it('should create a DPIA', async () => {
      const data = {
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      };

      const response = await request(app)
        .post('/api/v1/gdpr/dpias')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data)
        .expect(201);

      expect(response.body.title).toBe(data.title);
      expect(response.body.processingType).toBe(data.processingType);
      expect(response.body.status).toBe('draft');
    });

    it('should get DPIAs', async () => {
      await request(app)
        .post('/api/v1/gdpr/dpias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test DPIA',
          description: 'Test Description',
          processingType: 'Automated Decision Making',
          dataCategories: ['Personal Data'],
          mitigationMeasures: ['Data Minimization']
        });

      const response = await request(app)
        .get('/api/v1/gdpr/dpias')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should update a DPIA', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/dpias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test DPIA',
          description: 'Test Description',
          processingType: 'Automated Decision Making',
          dataCategories: ['Personal Data'],
          mitigationMeasures: ['Data Minimization']
        });

      const dpiaId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/v1/gdpr/dpias/${dpiaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(updateResponse.body.status).toBe('approved');
      expect(updateResponse.body.completedDate).toBeDefined();
    });

    it('should assess DPIA risk', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/dpias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test DPIA',
          description: 'Test Description',
          processingType: 'Automated Decision Making',
          dataCategories: ['Personal Data'],
          mitigationMeasures: ['Data Minimization']
        });

      const dpiaId = createResponse.body.id;

      const assessResponse = await request(app)
        .post(`/api/v1/gdpr/dpias/${dpiaId}/assess-risk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ riskLevel: 'high' })
        .expect(200);

      expect(assessResponse.body.riskLevel).toBe('high');
      expect(assessResponse.body.status).toBe('requires_consultation');
    });
  });

  describe('Data Breach Endpoints', () => {
    it('should create a data breach', async () => {
      const data = {
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date().toISOString(),
        severity: 'high',
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      };

      const response = await request(app)
        .post('/api/v1/gdpr/breaches')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data)
        .expect(201);

      expect(response.body.title).toBe(data.title);
      expect(response.body.severity).toBe(data.severity);
      expect(response.body.status).toBe('discovered');
    });

    it('should get data breaches', async () => {
      await request(app)
        .post('/api/v1/gdpr/breaches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Breach',
          description: 'Test breach description',
          discoveryDate: new Date().toISOString(),
          severity: 'high',
          affectedDataSubjects: 100,
          dataCategories: ['Email addresses'],
          likelyConsequences: 'Spam emails',
          mitigationMeasures: ['Password reset'],
          assignedTo: 'Security Team'
        });

      const response = await request(app)
        .get('/api/v1/gdpr/breaches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should notify supervisory authority', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/breaches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Breach',
          description: 'Test breach description',
          discoveryDate: new Date().toISOString(),
          severity: 'high',
          affectedDataSubjects: 100,
          dataCategories: ['Email addresses'],
          likelyConsequences: 'Spam emails',
          mitigationMeasures: ['Password reset'],
          assignedTo: 'Security Team'
        });

      const breachId = createResponse.body.id;

      const notifyResponse = await request(app)
        .post(`/api/v1/gdpr/breaches/${breachId}/notify-authority`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(notifyResponse.body.supervisoryAuthorityNotified).toBe(true);
      expect(notifyResponse.body.status).toBe('reported');
    });

    it('should notify data subjects', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/breaches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Breach',
          description: 'Test breach description',
          discoveryDate: new Date().toISOString(),
          severity: 'high',
          affectedDataSubjects: 100,
          dataCategories: ['Email addresses'],
          likelyConsequences: 'Spam emails',
          mitigationMeasures: ['Password reset'],
          assignedTo: 'Security Team'
        });

      const breachId = createResponse.body.id;

      const notifyResponse = await request(app)
        .post(`/api/v1/gdpr/breaches/${breachId}/notify-subjects`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(notifyResponse.body.dataSubjectsNotified).toBe(true);
    });
  });

  describe('Data Portability Endpoints', () => {
    it('should create a data portability request', async () => {
      const data = {
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json',
        deliveryMethod: 'email',
        notes: 'Test request'
      };

      const response = await request(app)
        .post('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(data)
        .expect(201);

      expect(response.body.dataSubject.name).toBe(data.dataSubjectName);
      expect(response.body.dataSubject.email).toBe(data.dataSubjectEmail);
      expect(response.body.status).toBe('pending');
    });

    it('should get data portability requests', async () => {
      await request(app)
        .post('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataSubjectName: 'John Doe',
          dataSubjectEmail: 'john@example.com',
          dataSubjectUserId: 'user123',
          dataCategories: ['Profile Data'],
          format: 'json',
          deliveryMethod: 'email'
        });

      const response = await request(app)
        .get('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should process data portability request', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataSubjectName: 'John Doe',
          dataSubjectEmail: 'john@example.com',
          dataSubjectUserId: 'user123',
          dataCategories: ['Profile Data'],
          format: 'json',
          deliveryMethod: 'email'
        });

      const requestId = createResponse.body.id;

      const processResponse = await request(app)
        .post(`/api/v1/gdpr/portability-requests/${requestId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(processResponse.body.status).toBe('processing');
    });

    it('should complete data portability request', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataSubjectName: 'John Doe',
          dataSubjectEmail: 'john@example.com',
          dataSubjectUserId: 'user123',
          dataCategories: ['Profile Data'],
          format: 'json',
          deliveryMethod: 'email'
        });

      const requestId = createResponse.body.id;

      const completeResponse = await request(app)
        .post(`/api/v1/gdpr/portability-requests/${requestId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileSize: '2.5 MB' })
        .expect(200);

      expect(completeResponse.body.status).toBe('ready');
      expect(completeResponse.body.fileSize).toBe('2.5 MB');
    });

    it('should deliver data portability request', async () => {
      const createResponse = await request(app)
        .post('/api/v1/gdpr/portability-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataSubjectName: 'John Doe',
          dataSubjectEmail: 'john@example.com',
          dataSubjectUserId: 'user123',
          dataCategories: ['Profile Data'],
          format: 'json',
          deliveryMethod: 'email'
        });

      const requestId = createResponse.body.id;

      const deliverResponse = await request(app)
        .post(`/api/v1/gdpr/portability-requests/${requestId}/deliver`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deliverResponse.body.status).toBe('delivered');
      expect(deliverResponse.body.downloadCount).toBe(1);
    });
  });
});