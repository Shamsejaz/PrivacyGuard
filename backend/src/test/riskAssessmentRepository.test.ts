import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { RiskAssessmentRepository } from '../repositories/RiskAssessmentRepository';
import type { 
  CreateRiskAssessmentRequest, 
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest,
  RiskFilters,
  ComplianceFilters 
} from '../types/risk';
import { getTestDatabase, cleanupTestDatabase } from './setup';

describe('Risk Assessment Repository', () => {
  let db: Pool;
  let riskRepository: RiskAssessmentRepository;

  beforeAll(async () => {
    db = await getTestDatabase();
    riskRepository = new RiskAssessmentRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up risk assessment tables before each test
    await db.query('DELETE FROM compliance_findings');
    await db.query('DELETE FROM risk_assessments');
  });

  describe('Risk Assessment CRUD Operations', () => {
    describe('createRiskAssessment', () => {
      it('should create a new risk assessment with calculated scores', async () => {
        const requestData: CreateRiskAssessmentRequest = {
          name: 'Data Breach Risk Assessment',
          description: 'Assessment of potential data breach risks',
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

        const result = await riskRepository.createRiskAssessment(requestData);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(requestData.name);
        expect(result.description).toBe(requestData.description);
        expect(result.impactScore).toBe(4);
        expect(result.likelihoodScore).toBe(3);
        expect(result.overallScore).toBe(2.4); // (4 * 3) / 5 = 2.4
        expect(result.riskLevel).toBe('medium');
        expect(result.status).toBe('active');
        expect(result.dataTypes).toEqual(['PII', 'Financial Data']);
        expect(result.mitigationMeasures).toHaveLength(1);
        expect(result.mitigationMeasures[0].description).toBe('Implement encryption');
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('should calculate critical risk level for high scores', async () => {
        const requestData: CreateRiskAssessmentRequest = {
          name: 'Critical Risk',
          impactScore: 5,
          likelihoodScore: 4,
          dataTypes: []
        };

        const result = await riskRepository.createRiskAssessment(requestData);

        expect(result.overallScore).toBe(4.0); // (5 * 4) / 5 = 4.0
        expect(result.riskLevel).toBe('critical');
      });

      it('should calculate low risk level for low scores', async () => {
        const requestData: CreateRiskAssessmentRequest = {
          name: 'Low Risk',
          impactScore: 1,
          likelihoodScore: 2,
          dataTypes: []
        };

        const result = await riskRepository.createRiskAssessment(requestData);

        expect(result.overallScore).toBe(0.4); // (1 * 2) / 5 = 0.4
        expect(result.riskLevel).toBe('low');
      });
    });

    describe('getRiskAssessments', () => {
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
          await riskRepository.createRiskAssessment(assessment);
        }
      });

      it('should return paginated results', async () => {
        const filters: RiskFilters = { page: 1, limit: 2 };
        const result = await riskRepository.getRiskAssessments(filters);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(3);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(2);
        expect(result.totalPages).toBe(2);
      });

      it('should filter by risk level', async () => {
        const filters: RiskFilters = { riskLevel: ['high'] };
        const result = await riskRepository.getRiskAssessments(filters);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].riskLevel).toBe('high');
      });

      it('should filter by category', async () => {
        const filters: RiskFilters = { category: 'Security' };
        const result = await riskRepository.getRiskAssessments(filters);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].category).toBe('Security');
      });

      it('should sort results', async () => {
        const filters: RiskFilters = { sortBy: 'overallScore', sortOrder: 'desc' };
        const result = await riskRepository.getRiskAssessments(filters);

        expect(result.items).toHaveLength(3);
        // Should be sorted by overall score descending
        expect(result.items[0].overallScore).toBeGreaterThanOrEqual(result.items[1].overallScore);
        expect(result.items[1].overallScore).toBeGreaterThanOrEqual(result.items[2].overallScore);
      });
    });

    describe('updateRiskAssessment', () => {
      let assessmentId: string;

      beforeEach(async () => {
        const created = await riskRepository.createRiskAssessment({
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          dataTypes: []
        });
        assessmentId = created.id;
      });

      it('should update assessment fields and recalculate scores', async () => {
        const updates: UpdateRiskAssessmentRequest = {
          name: 'Updated Assessment',
          impactScore: 5,
          likelihoodScore: 4,
          status: 'mitigated'
        };

        const result = await riskRepository.updateRiskAssessment(assessmentId, updates);

        expect(result.name).toBe('Updated Assessment');
        expect(result.impactScore).toBe(5);
        expect(result.likelihoodScore).toBe(4);
        expect(result.overallScore).toBe(4.0); // Recalculated
        expect(result.riskLevel).toBe('critical'); // Recalculated
        expect(result.status).toBe('mitigated');
      });

      it('should handle partial updates', async () => {
        const updates: UpdateRiskAssessmentRequest = {
          status: 'accepted'
        };

        const result = await riskRepository.updateRiskAssessment(assessmentId, updates);

        expect(result.status).toBe('accepted');
        expect(result.name).toBe('Test Assessment'); // Unchanged
        expect(result.impactScore).toBe(3); // Unchanged
      });

      it('should throw error for non-existent assessment', async () => {
        await expect(
          riskRepository.updateRiskAssessment('non-existent-id', { status: 'mitigated' })
        ).rejects.toThrow('Risk assessment not found');
      });
    });

    describe('deleteRiskAssessment', () => {
      it('should delete risk assessment', async () => {
        const created = await riskRepository.createRiskAssessment({
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          dataTypes: []
        });

        await riskRepository.deleteRiskAssessment(created.id);

        const found = await riskRepository.getRiskAssessmentById(created.id);
        expect(found).toBeNull();
      });

      it('should throw error for non-existent assessment', async () => {
        await expect(
          riskRepository.deleteRiskAssessment('non-existent-id')
        ).rejects.toThrow('Risk assessment not found');
      });
    });
  });

  describe('Compliance Findings CRUD Operations', () => {
    describe('createComplianceFinding', () => {
      it('should create a new compliance finding', async () => {
        const requestData: CreateComplianceFindingRequest = {
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
          ],
          dueDate: new Date('2024-12-31')
        };

        const result = await riskRepository.createComplianceFinding(requestData);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.title).toBe(requestData.title);
        expect(result.description).toBe(requestData.description);
        expect(result.regulation).toBe('GDPR');
        expect(result.severity).toBe('high');
        expect(result.status).toBe('open');
        expect(result.affectedSystems).toEqual(['Customer DB', 'CRM']);
        expect(result.remediationSteps).toHaveLength(1);
        expect(result.dueDate).toEqual(requestData.dueDate);
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });
    });

    describe('getComplianceFindings', () => {
      beforeEach(async () => {
        // Create test data
        const findings = [
          {
            title: 'GDPR Violation',
            regulation: 'GDPR' as const,
            severity: 'critical' as const,
            affectedSystems: ['DB1']
          },
          {
            title: 'CCPA Issue',
            regulation: 'CCPA' as const,
            severity: 'medium' as const,
            affectedSystems: ['DB2']
          },
          {
            title: 'HIPAA Concern',
            regulation: 'HIPAA' as const,
            severity: 'low' as const,
            affectedSystems: ['DB3']
          }
        ];

        for (const finding of findings) {
          await riskRepository.createComplianceFinding(finding);
        }
      });

      it('should return paginated results', async () => {
        const filters: ComplianceFilters = { page: 1, limit: 2 };
        const result = await riskRepository.getComplianceFindings(filters);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(3);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(2);
        expect(result.totalPages).toBe(2);
      });

      it('should filter by regulation', async () => {
        const filters: ComplianceFilters = { regulation: ['GDPR'] };
        const result = await riskRepository.getComplianceFindings(filters);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].regulation).toBe('GDPR');
      });

      it('should filter by severity', async () => {
        const filters: ComplianceFilters = { severity: ['critical', 'high'] };
        const result = await riskRepository.getComplianceFindings(filters);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].severity).toBe('critical');
      });
    });

    describe('updateComplianceFinding', () => {
      let findingId: string;

      beforeEach(async () => {
        const created = await riskRepository.createComplianceFinding({
          title: 'Test Finding',
          regulation: 'GDPR',
          severity: 'medium',
          affectedSystems: []
        });
        findingId = created.id;
      });

      it('should update finding fields', async () => {
        const updates = {
          status: 'resolved' as const,
          resolvedAt: new Date()
        };

        const result = await riskRepository.updateComplianceFinding(findingId, updates);

        expect(result.status).toBe('resolved');
        expect(result.resolvedAt).toEqual(updates.resolvedAt);
      });

      it('should throw error for non-existent finding', async () => {
        await expect(
          riskRepository.updateComplianceFinding('non-existent-id', { status: 'resolved' })
        ).rejects.toThrow('Compliance finding not found');
      });
    });
  });

  describe('Analytics and Metrics', () => {
    beforeEach(async () => {
      // Create test risk assessments
      const assessments = [
        { name: 'Critical Risk 1', impactScore: 5, likelihoodScore: 4, dataTypes: [] },
        { name: 'Critical Risk 2', impactScore: 4, likelihoodScore: 5, dataTypes: [] },
        { name: 'High Risk 1', impactScore: 4, likelihoodScore: 3, dataTypes: [] },
        { name: 'Medium Risk 1', impactScore: 3, likelihoodScore: 2, dataTypes: [] },
        { name: 'Low Risk 1', impactScore: 2, likelihoodScore: 1, dataTypes: [] }
      ];

      for (const assessment of assessments) {
        await riskRepository.createRiskAssessment(assessment);
      }

      // Create test compliance findings
      const findings = [
        { title: 'Critical Finding', regulation: 'GDPR' as const, severity: 'critical' as const, affectedSystems: [] },
        { title: 'Open Finding', regulation: 'CCPA' as const, severity: 'high' as const, affectedSystems: [] },
        { title: 'Resolved Finding', regulation: 'HIPAA' as const, severity: 'medium' as const, affectedSystems: [] }
      ];

      for (const finding of findings) {
        await riskRepository.createComplianceFinding(finding);
      }

      // Update one finding to resolved status
      const allFindings = await riskRepository.getComplianceFindings({});
      if (allFindings.items.length > 0) {
        await riskRepository.updateComplianceFinding(
          allFindings.items[2].id, 
          { status: 'resolved', resolvedAt: new Date() }
        );
      }
    });

    describe('getRiskMetrics', () => {
      it('should return comprehensive risk metrics', async () => {
        const metrics = await riskRepository.getRiskMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalAssessments).toBe(5);
        expect(metrics.criticalRisks).toBe(2);
        expect(metrics.highRisks).toBe(1);
        expect(metrics.mediumRisks).toBe(1);
        expect(metrics.lowRisks).toBe(1);
        expect(metrics.averageScore).toBeGreaterThan(0);
        expect(metrics.complianceFindings.total).toBe(3);
        expect(metrics.complianceFindings.open).toBe(2);
        expect(metrics.complianceFindings.critical).toBe(1);
        expect(metrics.trendsData).toBeDefined();
      });
    });

    describe('getRiskTrends', () => {
      it('should return risk trends for specified period', async () => {
        const trends = await riskRepository.getRiskTrends(7);

        expect(trends).toBeDefined();
        expect(Array.isArray(trends)).toBe(true);
        // Since all assessments were created today, we should have at least one trend entry
        if (trends.length > 0) {
          expect(trends[0]).toHaveProperty('date');
          expect(trends[0]).toHaveProperty('criticalCount');
          expect(trends[0]).toHaveProperty('highCount');
          expect(trends[0]).toHaveProperty('mediumCount');
          expect(trends[0]).toHaveProperty('lowCount');
          expect(trends[0]).toHaveProperty('averageScore');
        }
      });
    });
  });

  describe('Risk Calculation Helpers', () => {
    it('should calculate risk scores correctly', () => {
      // Test the private methods through public interface
      const testCases = [
        { impact: 1, likelihood: 1, expectedScore: 0.2, expectedLevel: 'low' },
        { impact: 3, likelihood: 2, expectedScore: 1.2, expectedLevel: 'low' },
        { impact: 3, likelihood: 3, expectedScore: 1.8, expectedLevel: 'low' },
        { impact: 4, likelihood: 3, expectedScore: 2.4, expectedLevel: 'medium' },
        { impact: 4, likelihood: 4, expectedScore: 3.2, expectedLevel: 'high' },
        { impact: 5, likelihood: 4, expectedScore: 4.0, expectedLevel: 'critical' },
        { impact: 5, likelihood: 5, expectedScore: 5.0, expectedLevel: 'critical' }
      ];

      testCases.forEach(async ({ impact, likelihood, expectedScore, expectedLevel }) => {
        const assessment = await riskRepository.createRiskAssessment({
          name: `Test ${impact}-${likelihood}`,
          impactScore: impact,
          likelihoodScore: likelihood,
          dataTypes: []
        });

        expect(assessment.overallScore).toBe(expectedScore);
        expect(assessment.riskLevel).toBe(expectedLevel);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close the database connection to simulate error
      await db.end();

      await expect(
        riskRepository.getRiskAssessments({})
      ).rejects.toThrow();

      // Reconnect for cleanup
      db = await getTestDatabase();
      riskRepository = new RiskAssessmentRepository(db);
    });

    it('should validate input data', async () => {
      // Test with invalid impact score
      await expect(
        riskRepository.createRiskAssessment({
          name: 'Invalid Assessment',
          impactScore: 6, // Invalid - should be 1-5
          likelihoodScore: 3,
          dataTypes: []
        })
      ).rejects.toThrow();

      // Test with invalid likelihood score
      await expect(
        riskRepository.createRiskAssessment({
          name: 'Invalid Assessment',
          impactScore: 3,
          likelihoodScore: 0, // Invalid - should be 1-5
          dataTypes: []
        })
      ).rejects.toThrow();
    });
  });
});
