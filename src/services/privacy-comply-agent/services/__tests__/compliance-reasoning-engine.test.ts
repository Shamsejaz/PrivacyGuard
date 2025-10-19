import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceReasoningEngineService } from '../compliance-reasoning-engine';
import { ComplianceFinding, LegalMapping, ComplianceAssessment } from '../../types';

// Mock the AWS service clients
vi.mock('../../config/service-clients', () => ({
  AWSServiceClients: {
    getInstance: vi.fn(() => ({
      getBedrockClient: vi.fn(() => ({
        config: {},
        serviceName: 'bedrock',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
      }))
    }))
  }
}));

describe('ComplianceReasoningEngineService', () => {
  let reasoningEngine: ComplianceReasoningEngineService;
  let mockFinding: ComplianceFinding;

  beforeEach(() => {
    reasoningEngine = new ComplianceReasoningEngineService();
    
    mockFinding = {
      id: 'test-finding-1',
      resourceArn: 'arn:aws:s3:::test-bucket',
      findingType: 'ENCRYPTION',
      severity: 'HIGH',
      description: 'S3 bucket does not have server-side encryption enabled',
      detectedAt: new Date('2024-01-01T00:00:00Z'),
      rawData: {
        bucketName: 'test-bucket',
        region: 'us-east-1'
      }
    };
  });

  describe('mapToLegalArticles', () => {
    it('should map encryption findings to relevant GDPR articles', async () => {
      const mappings = await reasoningEngine.mapToLegalArticles(mockFinding);
      
      expect(mappings).toBeDefined();
      expect(mappings.length).toBeGreaterThan(0);
      
      // Should include GDPR Article 32 (Security of processing)
      const gdprArticle32 = mappings.find(m => 
        m.regulation === 'GDPR' && m.article === 'Article 32'
      );
      expect(gdprArticle32).toBeDefined();
      expect(gdprArticle32?.applicability).toBeGreaterThan(0.3);
    });

    it('should map access control findings to relevant articles', async () => {
      const accessFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'access-finding-1',
        findingType: 'ACCESS_CONTROL',
        description: 'S3 bucket allows public read access'
      };

      const mappings = await reasoningEngine.mapToLegalArticles(accessFinding);
      
      expect(mappings).toBeDefined();
      expect(mappings.length).toBeGreaterThan(0);
      
      // Should include GDPR Article 25 (Data protection by design and by default)
      const gdprArticle25 = mappings.find(m => 
        m.regulation === 'GDPR' && m.article === 'Article 25'
      );
      expect(gdprArticle25).toBeDefined();
    });

    it('should return mappings sorted by applicability', async () => {
      const mappings = await reasoningEngine.mapToLegalArticles(mockFinding);
      
      // Verify mappings are sorted by applicability (highest first)
      for (let i = 1; i < mappings.length; i++) {
        expect(mappings[i - 1].applicability).toBeGreaterThanOrEqual(mappings[i].applicability);
      }
    });

    it('should limit results to top 5 mappings', async () => {
      const mappings = await reasoningEngine.mapToLegalArticles(mockFinding);
      expect(mappings.length).toBeLessThanOrEqual(5);
    });
  });

  describe('analyzeFinding', () => {
    it('should create a complete compliance assessment', async () => {
      const assessment = await reasoningEngine.analyzeFinding(mockFinding);
      
      expect(assessment).toBeDefined();
      expect(assessment.findingId).toBe(mockFinding.id);
      expect(assessment.legalMappings).toBeDefined();
      expect(assessment.legalMappings.length).toBeGreaterThan(0);
      expect(assessment.riskScore).toBeGreaterThan(0);
      expect(assessment.confidenceScore).toBeGreaterThan(0);
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.reasoning).toBeDefined();
      expect(assessment.assessedAt).toBeInstanceOf(Date);
    });

    it('should cache assessments for repeated calls', async () => {
      const assessment1 = await reasoningEngine.analyzeFinding(mockFinding);
      const assessment2 = await reasoningEngine.analyzeFinding(mockFinding);
      
      expect(assessment1).toBe(assessment2); // Should be the same object reference
    });

    it('should handle different finding types appropriately', async () => {
      const piiExposureFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'pii-finding-1',
        findingType: 'PII_EXPOSURE',
        severity: 'CRITICAL',
        description: 'S3 bucket contains exposed PII data'
      };

      const assessment = await reasoningEngine.analyzeFinding(piiExposureFinding);
      
      expect(assessment.riskScore).toBeGreaterThanOrEqual(60); // PII exposure should have high risk
      expect(assessment.recommendations.some(r => r.priority === 'CRITICAL')).toBe(true);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate higher risk scores for critical findings', async () => {
      const criticalAssessment: ComplianceAssessment = {
        findingId: 'critical-finding',
        legalMappings: [{
          regulation: 'GDPR',
          article: 'Article 32',
          description: 'Security of processing',
          applicability: 0.9
        }],
        riskScore: 0,
        confidenceScore: 0.8,
        recommendations: [],
        reasoning: 'Test reasoning',
        assessedAt: new Date()
      };

      // Mock the getFindingById method to return a critical finding
      const criticalFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'critical-finding',
        severity: 'CRITICAL',
        findingType: 'PII_EXPOSURE'
      };

      // Create a spy on the private method
      const getFindingByIdSpy = vi.spyOn(reasoningEngine as any, 'getFindingById');
      getFindingByIdSpy.mockResolvedValue(criticalFinding);

      const riskScore = await reasoningEngine.calculateRiskScore(criticalAssessment);
      
      expect(riskScore).toBeGreaterThan(70);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    it('should calculate lower risk scores for low severity findings', async () => {
      const lowAssessment: ComplianceAssessment = {
        findingId: 'low-finding',
        legalMappings: [{
          regulation: 'GDPR',
          article: 'Article 32',
          description: 'Security of processing',
          applicability: 0.3
        }],
        riskScore: 0,
        confidenceScore: 0.5,
        recommendations: [],
        reasoning: 'Test reasoning',
        assessedAt: new Date()
      };

      const lowFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'low-finding',
        severity: 'LOW',
        findingType: 'LOGGING'
      };

      const getFindingByIdSpy = vi.spyOn(reasoningEngine as any, 'getFindingById');
      getFindingByIdSpy.mockResolvedValue(lowFinding);

      const riskScore = await reasoningEngine.calculateRiskScore(lowAssessment);
      
      expect(riskScore).toBeLessThan(50);
      expect(riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate encryption recommendations for encryption findings', async () => {
      const encryptionAssessment: ComplianceAssessment = {
        findingId: 'encrypt-finding',
        legalMappings: [],
        riskScore: 75,
        confidenceScore: 0.8,
        recommendations: [],
        reasoning: 'Test reasoning',
        assessedAt: new Date()
      };

      const encryptionFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'encrypt-finding',
        findingType: 'ENCRYPTION',
        resourceArn: 'arn:aws:s3:::test-bucket'
      };

      const getFindingByIdSpy = vi.spyOn(reasoningEngine as any, 'getFindingById');
      getFindingByIdSpy.mockResolvedValue(encryptionFinding);

      const recommendations = await reasoningEngine.generateRecommendations(encryptionAssessment);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      const encryptionRec = recommendations.find(r => r.action === 'ENABLE_ENCRYPTION');
      expect(encryptionRec).toBeDefined();
      expect(encryptionRec?.automatable).toBe(true);
      expect(encryptionRec?.lambdaFunction).toBe('enable-s3-encryption');
    });

    it('should generate access control recommendations for access control findings', async () => {
      const accessAssessment: ComplianceAssessment = {
        findingId: 'access-finding',
        legalMappings: [],
        riskScore: 85,
        confidenceScore: 0.9,
        recommendations: [],
        reasoning: 'Test reasoning',
        assessedAt: new Date()
      };

      const accessFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'access-finding',
        findingType: 'ACCESS_CONTROL',
        severity: 'CRITICAL',
        resourceArn: 'arn:aws:s3:::public-bucket'
      };

      const getFindingByIdSpy = vi.spyOn(reasoningEngine as any, 'getFindingById');
      getFindingByIdSpy.mockResolvedValue(accessFinding);

      const recommendations = await reasoningEngine.generateRecommendations(accessAssessment);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      const accessRec = recommendations.find(r => r.action === 'RESTRICT_ACCESS');
      expect(accessRec).toBeDefined();
      expect(accessRec?.priority).toBe('CRITICAL');
    });

    it('should prioritize critical recommendations first', async () => {
      const piiAssessment: ComplianceAssessment = {
        findingId: 'pii-finding',
        legalMappings: [],
        riskScore: 95,
        confidenceScore: 0.9,
        recommendations: [],
        reasoning: 'Test reasoning',
        assessedAt: new Date()
      };

      const piiFinding: ComplianceFinding = {
        ...mockFinding,
        id: 'pii-finding',
        findingType: 'PII_EXPOSURE',
        severity: 'CRITICAL'
      };

      const getFindingByIdSpy = vi.spyOn(reasoningEngine as any, 'getFindingById');
      getFindingByIdSpy.mockResolvedValue(piiFinding);

      const recommendations = await reasoningEngine.generateRecommendations(piiAssessment);
      
      expect(recommendations[0].priority).toBe('CRITICAL');
    });
  });

  describe('analyzeFindings', () => {
    it('should process multiple findings in batches', async () => {
      const findings: ComplianceFinding[] = [
        { ...mockFinding, id: 'finding-1' },
        { ...mockFinding, id: 'finding-2' },
        { ...mockFinding, id: 'finding-3' }
      ];

      const assessments = await reasoningEngine.analyzeFindings(findings);
      
      expect(assessments).toBeDefined();
      expect(assessments.length).toBe(3);
      expect(assessments[0].findingId).toBe('finding-1');
      expect(assessments[1].findingId).toBe('finding-2');
      expect(assessments[2].findingId).toBe('finding-3');
    });

    it('should handle empty findings array', async () => {
      const assessments = await reasoningEngine.analyzeFindings([]);
      expect(assessments).toEqual([]);
    });
  });

  describe('getConfidenceScore', () => {
    it('should return the applicability score as confidence', async () => {
      const mapping: LegalMapping = {
        regulation: 'GDPR',
        article: 'Article 32',
        description: 'Security of processing',
        applicability: 0.85
      };

      const confidence = await reasoningEngine.getConfidenceScore(mapping, mockFinding);
      expect(confidence).toBe(0.85);
    });
  });

  describe('explainReasoning', () => {
    it('should provide detailed explanation for cached assessments', async () => {
      // First analyze a finding to cache it
      const assessment = await reasoningEngine.analyzeFinding(mockFinding);
      
      const explanation = await reasoningEngine.explainReasoning(assessment.findingId);
      
      expect(explanation).toBeDefined();
      expect(explanation).toContain('Assessment Explanation');
      expect(explanation).toContain('Legal Mappings');
      expect(explanation).toContain('Confidence Score');
      expect(explanation).toContain('AI Reasoning');
    });

    it('should throw error for non-existent assessment', async () => {
      await expect(reasoningEngine.explainReasoning('non-existent-id'))
        .rejects.toThrow('Assessment non-existent-id not found');
    });
  });

  describe('error handling', () => {
    it('should handle Bedrock service errors gracefully', async () => {
      // Mock Bedrock client to throw an error
      const mockServiceClients = {
        getBedrockClient: vi.fn(() => {
          throw new Error('Bedrock service unavailable');
        })
      };

      // Create a new instance with mocked service clients
      const reasoningEngineWithError = new ComplianceReasoningEngineService();
      (reasoningEngineWithError as any).serviceClients = mockServiceClients;

      // Should still work with fallback reasoning
      const assessment = await reasoningEngineWithError.analyzeFinding(mockFinding);
      
      expect(assessment).toBeDefined();
      expect(assessment.reasoning).toContain('Rule-based');
    });

    it('should handle invalid finding data', async () => {
      const invalidFinding: ComplianceFinding = {
        id: '',
        resourceArn: '',
        findingType: 'ENCRYPTION',
        severity: 'LOW',
        description: '',
        detectedAt: new Date(),
        rawData: {}
      };

      const assessment = await reasoningEngine.analyzeFinding(invalidFinding);
      
      expect(assessment).toBeDefined();
      expect(assessment.confidenceScore).toBeLessThan(0.5); // Low confidence for invalid data
    });
  });

  describe('legal article database', () => {
    it('should have comprehensive GDPR articles', () => {
      const database = (reasoningEngine as any).legalArticleDatabase;
      
      expect(database.GDPR).toBeDefined();
      expect(database.GDPR['Article 5']).toBeDefined();
      expect(database.GDPR['Article 6']).toBeDefined();
      expect(database.GDPR['Article 25']).toBeDefined();
      expect(database.GDPR['Article 32']).toBeDefined();
      expect(database.GDPR['Article 33']).toBeDefined();
      expect(database.GDPR['Article 34']).toBeDefined();
    });

    it('should have PDPL articles', () => {
      const database = (reasoningEngine as any).legalArticleDatabase;
      
      expect(database.PDPL).toBeDefined();
      expect(database.PDPL['Article 6']).toBeDefined();
      expect(database.PDPL['Article 22']).toBeDefined();
      expect(database.PDPL['Article 46']).toBeDefined();
    });

    it('should have CCPA sections', () => {
      const database = (reasoningEngine as any).legalArticleDatabase;
      
      expect(database.CCPA).toBeDefined();
      expect(database.CCPA['Section 1798.100']).toBeDefined();
      expect(database.CCPA['Section 1798.105']).toBeDefined();
      expect(database.CCPA['Section 1798.150']).toBeDefined();
    });
  });
});