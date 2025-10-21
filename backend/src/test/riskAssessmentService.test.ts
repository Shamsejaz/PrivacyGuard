import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import { RiskAssessmentService } from '../services/RiskAssessmentService';
import { RiskAssessmentRepository } from '../repositories/RiskAssessmentRepository';
import type { 
  CreateRiskAssessmentRequest, 
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest,
  RiskFilters,
  ComplianceFilters 
} from '../types/risk';
import { getTestDatabase, cleanupTestDatabase } from './setup';

describe('Risk Assessment Service', () => {
  let db: Pool;
  let riskRepository: RiskAssessmentRepository;
  let riskService: RiskAssessmentService;

  beforeAll(async () => {
    db = await getTestDatabase();
    riskRepository = new RiskAssessmentRepository(db);
    riskService = new RiskAssessmentService(riskRepository);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await db.query('DELETE FROM compliance_findings');
    await db.query('DELETE FROM risk_assessments');
  });

  describe('Risk Assessment Business Logic', () => {
    describe('createRiskAssessment', () => {
      it('should create risk assessment with proper validation', async () => {
        const requestData: CreateRiskAssessmentRequest = {
          name: 'Data Security Risk',
          description: 'Assessment of data security vulnerabilities',
          impactScore: 4,
          likelihoodScore: 3,
          category: 'Security',
          dataTypes: ['PII', 'Financial'],
          mitigationMeasures: [
            {
              description: 'Implement encryption',
              status: 'planned',
              priority: 'high'
            }
          ]
        };

        const result = await riskService.createRiskAssessment(requestData);

        expect(result).toBeDefined();
        expect(result.name).toBe(requestData.name);
        expect(result.overallScore).toBe(2.4); // (4 * 3) / 5
        expect(result.riskLevel).toBe('medium');
        expect(result.mitigationMeasures).toHaveLength(1);
        expect(result.mitigationMeasures[0].id).toBeDefined(); // Should have generated ID
      });

      it('should validate required fields', async () => {
        const invalidData = {
          name: '', // Empty name should fail
          impactScore: 4,
          likelihoodScore: 3,
          dataTypes: []
        } as CreateRiskAssessmentRequest;

        await expect(
          riskService.createRiskAssessment(invalidData)
        ).rejects.toThrow('Risk assessment name is required');
      });

      it('should validate impact score range', async () => {
        const invalidData: CreateRiskAssessmentRequest = {
          name: 'Test Assessment',
          impactScore: 6, // Invalid - should be 1-5
          likelihoodScore: 3,
          dataTypes: []
        };

        await expect(
          riskService.createRiskAssessment(invalidData)
        ).rejects.toThrow('Impact score must be an integer between 1 and 5');
      });

      it('should validate likelihood score range', async () => {
        const invalidData: CreateRiskAssessmentRequest = {
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 0, // Invalid - should be 1-5
          dataTypes: []
        };

        await expect(
          riskService.createRiskAssessment(invalidData)
        ).rejects.toThrow('Likelihood score must be an integer between 1 and 5');
      });

      it('should validate data types array', async () => {
        const invalidData = {
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          dataTypes: 'not-an-array' // Should be array
        } as any;

        await expect(
          riskService.createRiskAssessment(invalidData)
        ).rejects.toThrow('Data types must be an array');
      });
    });

    describe('updateRiskAssessment', () => {
      let assessmentId: string;

      beforeEach(async () => {
        const created = await riskService.createRiskAssessment({
          name: 'Test Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          dataTypes: []
        });
        assessmentId = created.id;
      });

      it('should update assessment with validation', async () => {
        const updates: UpdateRiskAssessmentRequest = {
          name: 'Updated Assessment',
          impactScore: 5,
          status: 'mitigated'
        };

        const result = await riskService.updateRiskAssessment(assessmentId, updates);

        expect(result.name).toBe('Updated Assessment');
        expect(result.impactScore).toBe(5);
        expect(result.status).toBe('mitigated');
        expect(result.overallScore).toBe(3.0); // Recalculated with new impact
        expect(result.riskLevel).toBe('high'); // Recalculated
      });

      it('should validate score updates', async () => {
        const invalidUpdates: UpdateRiskAssessmentRequest = {
          impactScore: 7 // Invalid
        };

        await expect(
          riskService.updateRiskAssessment(assessmentId, invalidUpdates)
        ).rejects.toThrow('Impact score must be an integer between 1 and 5');
      });

      it('should handle non-existent assessment', async () => {
        await expect(
          riskService.updateRiskAssessment('non-existent-id', { name: 'Updated' })
        ).rejects.toThrow('Risk assessment not found');
      });
    });

    describe('getRiskAssessments', () => {
      beforeEach(async () => {
        // Create test data
        const assessments = [
          { name: 'High Risk', impactScore: 4, likelihoodScore: 4, category: 'Security', dataTypes: [] },
          { name: 'Medium Risk', impactScore: 3, likelihoodScore: 2, category: 'Compliance', dataTypes: [] },
          { name: 'Low Risk', impactScore: 2, likelihoodScore: 1, category: 'Operational', dataTypes: [] }
        ];

        for (const assessment of assessments) {
          await riskService.createRiskAssessment(assessment);
        }
      });

      it('should return filtered and paginated results', async () => {
        const filters: RiskFilters = {
          riskLevel: ['high'],
          page: 1,
          limit: 10
        };

        const result = await riskService.getRiskAssessments(filters);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].riskLevel).toBe('high');
        expect(result.total).toBe(1);
      });

      it('should handle empty results', async () => {
        const filters: RiskFilters = {
          riskLevel: ['critical']
        };

        const result = await riskService.getRiskAssessments(filters);

        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });
  });

  describe('Compliance Finding Business Logic', () => {
    describe('createComplianceFinding', () => {
      it('should create compliance finding with validation', async () => {
        const requestData: CreateComplianceFindingRequest = {
          title: 'GDPR Compliance Gap',
          description: 'Missing privacy notices',
          regulation: 'GDPR',
          severity: 'high',
          category: 'Privacy',
          affectedSystems: ['Website', 'Mobile App'],
          remediationSteps: [
            {
              description: 'Update privacy notices',
              status: 'pending',
              priority: 'high'
            }
          ]
        };

        const result = await riskService.createComplianceFinding(requestData);

        expect(result).toBeDefined();
        expect(result.title).toBe(requestData.title);
        expect(result.regulation).toBe('GDPR');
        expect(result.severity).toBe('high');
        expect(result.status).toBe('open');
        expect(result.remediationSteps).toHaveLength(1);
        expect(result.remediationSteps[0].id).toBeDefined(); // Should have generated ID
      });

      it('should validate required fields', async () => {
        const invalidData = {
          title: '', // Empty title
          regulation: 'GDPR',
          severity: 'high',
          affectedSystems: []
        } as CreateComplianceFindingRequest;

        await expect(
          riskService.createComplianceFinding(invalidData)
        ).rejects.toThrow('Compliance finding title is required');
      });

      it('should validate regulation field', async () => {
        const invalidData = {
          title: 'Test Finding',
          regulation: undefined, // Missing regulation
          severity: 'high',
          affectedSystems: []
        } as any;

        await expect(
          riskService.createComplianceFinding(invalidData)
        ).rejects.toThrow('Regulation is required');
      });

      it('should validate affected systems array', async () => {
        const invalidData = {
          title: 'Test Finding',
          regulation: 'GDPR',
          severity: 'high',
          affectedSystems: 'not-an-array' // Should be array
        } as any;

        await expect(
          riskService.createComplianceFinding(invalidData)
        ).rejects.toThrow('Affected systems must be an array');
      });
    });

    describe('updateComplianceFinding', () => {
      let findingId: string;

      beforeEach(async () => {
        const created = await riskService.createComplianceFinding({
          title: 'Test Finding',
          regulation: 'GDPR',
          severity: 'medium',
          affectedSystems: []
        });
        findingId = created.id;
      });

      it('should update finding successfully', async () => {
        const updates = {
          status: 'resolved' as const,
          resolvedAt: new Date()
        };

        const result = await riskService.updateComplianceFinding(findingId, updates);

        expect(result.status).toBe('resolved');
        expect(result.resolvedAt).toEqual(updates.resolvedAt);
      });

      it('should handle non-existent finding', async () => {
        await expect(
          riskService.updateComplianceFinding('non-existent-id', { status: 'resolved' })
        ).rejects.toThrow('Compliance finding not found');
      });
    });
  });

  describe('Risk Calculation and Analysis', () => {
    describe('calculateRiskScore', () => {
      it('should calculate risk scores correctly', () => {
        const testCases = [
          { impact: 1, likelihood: 1, expected: 0.2 },
          { impact: 3, likelihood: 3, expected: 1.8 },
          { impact: 5, likelihood: 4, expected: 4.0 },
          { impact: 5, likelihood: 5, expected: 5.0 }
        ];

        testCases.forEach(({ impact, likelihood, expected }) => {
          const score = riskService.calculateRiskScore(impact, likelihood);
          expect(score).toBe(expected);
        });
      });

      it('should validate score inputs', () => {
        expect(() => riskService.calculateRiskScore(0, 3)).toThrow();
        expect(() => riskService.calculateRiskScore(6, 3)).toThrow();
        expect(() => riskService.calculateRiskScore(3, 0)).toThrow();
        expect(() => riskService.calculateRiskScore(3, 6)).toThrow();
        expect(() => riskService.calculateRiskScore(2.5, 3)).toThrow(); // Non-integer
      });
    });

    describe('determineRiskLevel', () => {
      it('should determine risk levels correctly', () => {
        expect(riskService.determineRiskLevel(0.5)).toBe('low');
        expect(riskService.determineRiskLevel(1.9)).toBe('low');
        expect(riskService.determineRiskLevel(2.0)).toBe('medium');
        expect(riskService.determineRiskLevel(2.9)).toBe('medium');
        expect(riskService.determineRiskLevel(3.0)).toBe('high');
        expect(riskService.determineRiskLevel(3.9)).toBe('high');
        expect(riskService.determineRiskLevel(4.0)).toBe('critical');
        expect(riskService.determineRiskLevel(5.0)).toBe('critical');
      });
    });

    describe('analyzeRiskTrends', () => {
      beforeEach(async () => {
        // Create historical data by creating assessments
        const assessments = [
          { name: 'Risk 1', impactScore: 3, likelihoodScore: 3, dataTypes: [] },
          { name: 'Risk 2', impactScore: 4, likelihoodScore: 2, dataTypes: [] },
          { name: 'Risk 3', impactScore: 2, likelihoodScore: 4, dataTypes: [] }
        ];

        for (const assessment of assessments) {
          await riskService.createRiskAssessment(assessment);
        }
      });

      it('should analyze risk trends', async () => {
        const analysis = await riskService.analyzeRiskTrends();

        expect(analysis).toBeDefined();
        expect(analysis.trend).toMatch(/^(increasing|decreasing|stable)$/);
        expect(typeof analysis.changePercentage).toBe('number');
        expect(typeof analysis.recommendation).toBe('string');
        expect(analysis.recommendation.length).toBeGreaterThan(0);
      });

      it('should handle insufficient data', async () => {
        // Clear all data
        await db.query('DELETE FROM risk_assessments');

        const analysis = await riskService.analyzeRiskTrends();

        expect(analysis.trend).toBe('stable');
        expect(analysis.changePercentage).toBe(0);
        expect(analysis.recommendation).toContain('Insufficient data');
      });
    });
  });

  describe('Analytics and Reporting', () => {
    beforeEach(async () => {
      // Create comprehensive test data
      const assessments = [
        { name: 'Critical Risk 1', impactScore: 5, likelihoodScore: 4, dataTypes: [] },
        { name: 'High Risk 1', impactScore: 4, likelihoodScore: 3, dataTypes: [] },
        { name: 'Medium Risk 1', impactScore: 3, likelihoodScore: 2, dataTypes: [] },
        { name: 'Low Risk 1', impactScore: 2, likelihoodScore: 1, dataTypes: [] }
      ];

      for (const assessment of assessments) {
        await riskService.createRiskAssessment(assessment);
      }

      const findings = [
        { title: 'Critical Finding', regulation: 'GDPR' as const, severity: 'critical' as const, affectedSystems: [] },
        { title: 'High Finding', regulation: 'CCPA' as const, severity: 'high' as const, affectedSystems: [] }
      ];

      for (const finding of findings) {
        await riskService.createComplianceFinding(finding);
      }
    });

    describe('getRiskMetrics', () => {
      it('should return comprehensive metrics', async () => {
        const metrics = await riskService.getRiskMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalAssessments).toBe(4);
        expect(metrics.criticalRisks).toBe(1);
        expect(metrics.highRisks).toBe(1);
        expect(metrics.mediumRisks).toBe(1);
        expect(metrics.lowRisks).toBe(1);
        expect(metrics.averageScore).toBeGreaterThan(0);
        expect(metrics.complianceFindings.total).toBe(2);
        expect(metrics.complianceFindings.critical).toBe(1);
        expect(Array.isArray(metrics.trendsData)).toBe(true);
      });
    });

    describe('generateRiskReport', () => {
      it('should generate comprehensive risk report', async () => {
        const filters: RiskFilters = { riskLevel: ['critical', 'high'] };
        const report = await riskService.generateRiskReport(filters);

        expect(report).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(Array.isArray(report.assessments)).toBe(true);
        expect(Array.isArray(report.trends)).toBe(true);
        expect(report.generatedAt).toBeDefined();
        expect(report.filters).toEqual(filters);
        
        // Should only include critical and high risk assessments
        expect(report.assessments.length).toBe(2);
        report.assessments.forEach((assessment: any) => {
          expect(['critical', 'high']).toContain(assessment.riskLevel);
        });
      });

      it('should handle empty filter results', async () => {
        const filters: RiskFilters = { riskLevel: ['nonexistent'] };
        const report = await riskService.generateRiskReport(filters);

        expect(report.assessments).toHaveLength(0);
        expect(report.summary).toBeDefined();
      });
    });
  });

  describe('Alert Generation', () => {
    describe('checkForRiskAlerts', () => {
      it('should generate critical risk alert', async () => {
        const criticalAssessment = await riskService.createRiskAssessment({
          name: 'Critical Security Risk',
          impactScore: 5,
          likelihoodScore: 4,
          dataTypes: []
        });

        const alerts = await riskService.checkForRiskAlerts(criticalAssessment);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].type).toBe('new_critical_risk');
        expect(alerts[0].severity).toBe('critical');
        expect(alerts[0].resourceId).toBe(criticalAssessment.id);
      });

      it('should generate overdue review alert', async () => {
        const overdueAssessment = await riskService.createRiskAssessment({
          name: 'Overdue Assessment',
          impactScore: 3,
          likelihoodScore: 3,
          reviewDate: new Date('2023-01-01'), // Past date
          dataTypes: []
        });

        const alerts = await riskService.checkForRiskAlerts(overdueAssessment);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].type).toBe('overdue_review');
        expect(alerts[0].severity).toBe('medium');
      });

      it('should not generate alerts for low risk assessments', async () => {
        const lowRiskAssessment = await riskService.createRiskAssessment({
          name: 'Low Risk Assessment',
          impactScore: 2,
          likelihoodScore: 1,
          dataTypes: []
        });

        const alerts = await riskService.checkForRiskAlerts(lowRiskAssessment);

        expect(alerts).toHaveLength(0);
      });
    });

    describe('checkForComplianceAlerts', () => {
      it('should generate critical compliance alert', async () => {
        const criticalFinding = await riskService.createComplianceFinding({
          title: 'Critical GDPR Violation',
          regulation: 'GDPR',
          severity: 'critical',
          affectedSystems: []
        });

        const alerts = await riskService.checkForComplianceAlerts(criticalFinding);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].type).toBe('compliance_gap');
        expect(alerts[0].severity).toBe('critical');
        expect(alerts[0].resourceId).toBe(criticalFinding.id);
      });

      it('should generate overdue remediation alert', async () => {
        const overdueFinding = await riskService.createComplianceFinding({
          title: 'Overdue Finding',
          regulation: 'GDPR',
          severity: 'high',
          dueDate: new Date('2023-01-01'), // Past date
          affectedSystems: []
        });

        const alerts = await riskService.checkForComplianceAlerts(overdueFinding);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].type).toBe('overdue_review');
        expect(alerts[0].severity).toBe('high');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Mock repository to throw error
      const mockRepository = {
        getRiskAssessments: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any;

      const serviceWithMockRepo = new RiskAssessmentService(mockRepository);

      await expect(
        serviceWithMockRepo.getRiskAssessments({})
      ).rejects.toThrow('Database error');
    });

    it('should log errors appropriately', async () => {
      // This would test logging functionality
      // For now, we just ensure errors are thrown properly
      await expect(
        riskService.getRiskAssessmentById('non-existent-id')
      ).rejects.toThrow('Risk assessment not found');
    });
  });
});
