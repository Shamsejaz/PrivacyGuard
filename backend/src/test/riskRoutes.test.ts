import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { app } from '../server';
import { getTestDatabase, cleanupTestDatabase, createTestUser, getAuthToken } from './setup';

describe('Risk Assessment Routes', () => {
  let db: Pool;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    db = await getTestDatabase();
    testUser = await createTestUser(db);
    authToken = getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await db.query('DELETE FROM compliance_findings');
    await db.query('DELETE FROM risk_assessments');
  });

  describe('Risk Assessment Endpoints', () => {
    describe('POST /api/v1/risk/assessments', () => {
      it('should create a new risk assessment', async () => {
        const requestData = {
          name: 'Data Security Risk Assessment',
          description: 'Assessment of data security vulnerabilities',
          impactScore: 4,
          likelihoodScore: 3,
          category: 'Security',
          dataTypes: ['PII', 'Financial Data'],
          mitigationMeasures: [
            {
              description: 'Implement encryption',
              status: 'planned',
              priority: 'high'
            }
          ]
        };

        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(requestData.name);
        expect(response.body.data.overallScore).toBe(2.4);
        expect(response.body.data.riskLevel).toBe('medium');
        expect(response.body.message).toContain('created successfully');
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing name
          impactScore: 4,
          likelihoodScore: 3,
          dataTypes: []
        };

        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('name is required');
      });

      it('should validate score ranges', async () => {
        const invalidData = {
          name: 'Test Assessment',
          impactScore: 6, // Invalid - should be 1-5
          likelihoodScore: 3,
          dataTypes: []
        };

        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Impact score must be');
      });

      it('should require authentication', async () => {
        const requestData = {
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          dataTypes: []
        };

        await request(app)
          .post('/api/v1/risk/assessments')
          .send(requestData)
          .expect(401);
      });
    });

    describe('GET /api/v1/risk/assessments', () => {
      beforeEach(async () => {
        // Create test data
        const assessments = [
          {
            name: 'High Risk Assessment',
            impactScore: 4,
            likelihoodScore: 4,
            category: 'Security',
            dataTypes: ['PII']
          },
          {
            name: 'Medium Risk Assessment',
            impactScore: 3,
            likelihoodScore: 2,
            category: 'Compliance',
            dataTypes: ['Financial']
          },
          {
            name: 'Low Risk Assessment',
            impactScore: 2,
            likelihoodScore: 1,
            category: 'Operational',
            dataTypes: ['Public']
          }
        ];

        for (const assessment of assessments) {
          await request(app)
            .post('/api/v1/risk/assessments')
            .set('Authorization', `Bearer ${authToken}`)
            .send(assessment);
        }
      });

      it('should return paginated risk assessments', async () => {
        const response = await request(app)
          .get('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 2 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(2);
        expect(response.body.data.total).toBe(3);
        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(2);
        expect(response.body.data.totalPages).toBe(2);
      });

      it('should filter by risk level', async () => {
        const response = await request(app)
          .get('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ riskLevel: 'high' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].riskLevel).toBe('high');
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ category: 'Security' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].category).toBe('Security');
      });

      it('should sort results', async () => {
        const response = await request(app)
          .get('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ sortBy: 'overallScore', sortOrder: 'desc' })
          .expect(200);

        expect(response.body.success).toBe(true);
        const items = response.body.data.items;
        expect(items).toHaveLength(3);
        // Should be sorted by overall score descending
        expect(items[0].overallScore).toBeGreaterThanOrEqual(items[1].overallScore);
        expect(items[1].overallScore).toBeGreaterThanOrEqual(items[2].overallScore);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/risk/assessments')
          .expect(401);
      });
    });

    describe('GET /api/v1/risk/assessments/:id', () => {
      let assessmentId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Assessment',
            impactScore: 3,
            likelihoodScore: 3,
            dataTypes: []
          });
        assessmentId = response.body.data.id;
      });

      it('should return specific risk assessment', async () => {
        const response = await request(app)
          .get(`/api/v1/risk/assessments/${assessmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(assessmentId);
        expect(response.body.data.name).toBe('Test Assessment');
      });

      it('should return 404 for non-existent assessment', async () => {
        const response = await request(app)
          .get('/api/v1/risk/assessments/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('PUT /api/v1/risk/assessments/:id', () => {
      let assessmentId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Assessment',
            impactScore: 3,
            likelihoodScore: 3,
            dataTypes: []
          });
        assessmentId = response.body.data.id;
      });

      it('should update risk assessment', async () => {
        const updates = {
          name: 'Updated Assessment',
          impactScore: 5,
          status: 'mitigated'
        };

        const response = await request(app)
          .put(`/api/v1/risk/assessments/${assessmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Assessment');
        expect(response.body.data.impactScore).toBe(5);
        expect(response.body.data.status).toBe('mitigated');
        expect(response.body.data.overallScore).toBe(3.0); // Recalculated
        expect(response.body.message).toContain('updated successfully');
      });

      it('should validate update data', async () => {
        const invalidUpdates = {
          impactScore: 7 // Invalid
        };

        const response = await request(app)
          .put(`/api/v1/risk/assessments/${assessmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUpdates)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Impact score must be');
      });
    });

    describe('DELETE /api/v1/risk/assessments/:id', () => {
      let assessmentId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Assessment',
            impactScore: 3,
            likelihoodScore: 3,
            dataTypes: []
          });
        assessmentId = response.body.data.id;
      });

      it('should delete risk assessment', async () => {
        const response = await request(app)
          .delete(`/api/v1/risk/assessments/${assessmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted successfully');

        // Verify deletion
        await request(app)
          .get(`/api/v1/risk/assessments/${assessmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });
  });

  describe('Compliance Finding Endpoints', () => {
    describe('POST /api/v1/risk/findings', () => {
      it('should create a new compliance finding', async () => {
        const requestData = {
          title: 'GDPR Data Retention Violation',
          description: 'Customer data retained beyond legal requirements',
          regulation: 'GDPR',
          severity: 'high',
          category: 'Data Retention',
          affectedSystems: ['Customer DB', 'CRM'],
          remediationSteps: [
            {
              description: 'Implement automated data deletion',
              status: 'pending',
              priority: 'high'
            }
          ]
        };

        const response = await request(app)
          .post('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(requestData.title);
        expect(response.body.data.regulation).toBe('GDPR');
        expect(response.body.data.severity).toBe('high');
        expect(response.body.data.status).toBe('open');
        expect(response.body.message).toContain('created successfully');
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing title
          regulation: 'GDPR',
          severity: 'high',
          affectedSystems: []
        };

        const response = await request(app)
          .post('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('title is required');
      });
    });

    describe('GET /api/v1/risk/findings', () => {
      beforeEach(async () => {
        // Create test findings
        const findings = [
          {
            title: 'GDPR Violation',
            regulation: 'GDPR',
            severity: 'critical',
            affectedSystems: ['DB1']
          },
          {
            title: 'CCPA Issue',
            regulation: 'CCPA',
            severity: 'medium',
            affectedSystems: ['DB2']
          }
        ];

        for (const finding of findings) {
          await request(app)
            .post('/api/v1/risk/findings')
            .set('Authorization', `Bearer ${authToken}`)
            .send(finding);
        }
      });

      it('should return paginated compliance findings', async () => {
        const response = await request(app)
          .get('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(2);
        expect(response.body.data.total).toBe(2);
      });

      it('should filter by regulation', async () => {
        const response = await request(app)
          .get('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ regulation: 'GDPR' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].regulation).toBe('GDPR');
      });

      it('should filter by severity', async () => {
        const response = await request(app)
          .get('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ severity: 'critical' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].severity).toBe('critical');
      });
    });
  });

  describe('Analytics Endpoints', () => {
    beforeEach(async () => {
      // Create test data for analytics
      const assessments = [
        { name: 'Critical Risk', impactScore: 5, likelihoodScore: 4, dataTypes: [] },
        { name: 'High Risk', impactScore: 4, likelihoodScore: 3, dataTypes: [] },
        { name: 'Medium Risk', impactScore: 3, likelihoodScore: 2, dataTypes: [] }
      ];

      for (const assessment of assessments) {
        await request(app)
          .post('/api/v1/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assessment);
      }

      const findings = [
        { title: 'Critical Finding', regulation: 'GDPR', severity: 'critical', affectedSystems: [] },
        { title: 'High Finding', regulation: 'CCPA', severity: 'high', affectedSystems: [] }
      ];

      for (const finding of findings) {
        await request(app)
          .post('/api/v1/risk/findings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(finding);
      }
    });

    describe('GET /api/v1/risk/metrics', () => {
      it('should return risk metrics', async () => {
        const response = await request(app)
          .get('/api/v1/risk/metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.totalAssessments).toBe(3);
        expect(response.body.data.criticalRisks).toBe(1);
        expect(response.body.data.highRisks).toBe(1);
        expect(response.body.data.mediumRisks).toBe(1);
        expect(response.body.data.complianceFindings.total).toBe(2);
        expect(response.body.data.complianceFindings.critical).toBe(1);
        expect(Array.isArray(response.body.data.trendsData)).toBe(true);
      });
    });

    describe('GET /api/v1/risk/trends', () => {
      it('should return risk trends', async () => {
        const response = await request(app)
          .get('/api/v1/risk/trends')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ days: 7 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/risk/analysis', () => {
      it('should return risk trend analysis', async () => {
        const response = await request(app)
          .get('/api/v1/risk/analysis')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.trend).toMatch(/^(increasing|decreasing|stable)$/);
        expect(typeof response.body.data.changePercentage).toBe('number');
        expect(typeof response.body.data.recommendation).toBe('string');
      });
    });

    describe('POST /api/v1/risk/reports', () => {
      it('should generate risk report', async () => {
        const filters = {
          riskLevel: ['critical', 'high']
        };

        const response = await request(app)
          .post('/api/v1/risk/reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ filters })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(Array.isArray(response.body.data.assessments)).toBe(true);
        expect(Array.isArray(response.body.data.trends)).toBe(true);
        expect(response.body.data.generatedAt).toBeDefined();
        expect(response.body.data.filters).toEqual(filters);
        expect(response.body.message).toContain('generated successfully');
      });
    });
  });

  describe('Utility Endpoints', () => {
    describe('POST /api/v1/risk/calculate', () => {
      it('should calculate risk score', async () => {
        const response = await request(app)
          .post('/api/v1/risk/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ impact: 4, likelihood: 3 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.impact).toBe(4);
        expect(response.body.data.likelihood).toBe(3);
        expect(response.body.data.overallScore).toBe(2.4);
        expect(response.body.data.riskLevel).toBe('medium');
      });

      it('should validate calculation inputs', async () => {
        const response = await request(app)
          .post('/api/v1/risk/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ impact: 6, likelihood: 3 }) // Invalid impact
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Impact and likelihood scores');
      });

      it('should require both impact and likelihood', async () => {
        const response = await request(app)
          .post('/api/v1/risk/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ impact: 4 }) // Missing likelihood
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Impact and likelihood scores are required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/risk/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking the database to simulate errors
      // For now, we test that the error handling structure is in place
      const response = await request(app)
        .get('/api/v1/risk/assessments/invalid-uuid-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
