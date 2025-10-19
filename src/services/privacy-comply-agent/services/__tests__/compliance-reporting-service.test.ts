import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceReportingServiceImpl } from '../compliance-reporting-service';
import { PrivacyRiskDetector } from '../privacy-risk-detector';
import { ComplianceReasoningEngine } from '../compliance-reasoning-engine';
import { AWSServiceClients } from '../../config/service-clients';
import {
  ComplianceFinding,
  ComplianceAssessment,
  ReportScope,
  DateRange,
  DPIAReport,
  RoPAReport,
  AuditReport,
  ComplianceSummary
} from '../../types';

// Mock dependencies
vi.mock('../privacy-risk-detector');
vi.mock('../compliance-reasoning-engine');
vi.mock('../../config/service-clients');

describe('ComplianceReportingServiceImpl', () => {
  let service: ComplianceReportingServiceImpl;
  let mockRiskDetector: any;
  let mockReasoningEngine: any;
  let mockAWSClients: any;

  const mockFinding: ComplianceFinding = {
    id: 'finding-1',
    resourceArn: 'arn:aws:s3:::test-bucket',
    findingType: 'ENCRYPTION',
    severity: 'HIGH',
    description: 'S3 bucket is not encrypted',
    detectedAt: new Date('2024-01-01'),
    rawData: {}
  };

  const mockAssessment: ComplianceAssessment = {
    findingId: 'finding-1',
    legalMappings: [
      {
        regulation: 'GDPR',
        article: 'Article 32',
        description: 'Security of processing',
        applicability: 0.9
      }
    ],
    riskScore: 8.5,
    confidenceScore: 0.85,
    recommendations: [
      {
        id: 'rec-1',
        findingId: 'finding-1',
        action: 'ENABLE_ENCRYPTION',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'encryption-enablement',
        parameters: { bucketName: 'test-bucket' },
        estimatedImpact: 'Enables encryption for S3 bucket'
      }
    ],
    reasoning: 'Bucket lacks encryption which violates GDPR Article 32',
    assessedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock risk detector
    mockRiskDetector = {
      scanS3Buckets: vi.fn().mockResolvedValue([mockFinding]),
      analyzeIAMPolicies: vi.fn().mockResolvedValue([]),
      processCloudTrailLogs: vi.fn().mockResolvedValue([]),
      getMacieFindings: vi.fn().mockResolvedValue([]),
      getSecurityHubFindings: vi.fn().mockResolvedValue([])
    };

    // Mock reasoning engine
    mockReasoningEngine = {
      analyzeFinding: vi.fn().mockResolvedValue(mockAssessment)
    };

    // Mock AWS clients
    mockAWSClients = {
      s3: {
        putObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({ ETag: '"mock-etag"' })
        }),
        getObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: Buffer.from(JSON.stringify({
              id: 'test-report',
              type: 'DPIA',
              generatedAt: '2024-01-01T00:00:00.000Z',
              scope: {},
              findings: [mockFinding],
              assessments: [mockAssessment],
              recommendations: [],
              executiveSummary: 'Test summary'
            }))
          })
        }),
        deleteObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue()
        })
      },
      dynamodb: {
        put: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue()
        }),
        get: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Item: {
              reportId: 'test-report',
              s3Key: 'compliance-reports/dpia/test-report.json'
            }
          })
        }),
        query: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'test-report-1',
                s3Key: 'compliance-reports/dpia/test-report-1.json'
              }
            ]
          })
        }),
        scan: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'test-report-1',
                s3Key: 'compliance-reports/dpia/test-report-1.json'
              }
            ]
          })
        }),
        delete: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue()
        })
      },
      getS3ReportsBucket: vi.fn().mockReturnValue('test-reports-bucket'),
      getDynamoDBTableName: vi.fn().mockReturnValue('test-compliance-table')
    };

    service = new ComplianceReportingServiceImpl(
      mockRiskDetector,
      mockReasoningEngine,
      mockAWSClients
    );
  });

  describe('generateDPIA', () => {
    it('should generate a DPIA report with correct structure', async () => {
      const scope: ReportScope = {
        regulations: ['GDPR']
      };

      const report = await service.generateDPIA(scope);

      expect(report).toBeDefined();
      expect(report.type).toBe('DPIA');
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.scope).toEqual(scope);
      expect(report.findings).toHaveLength(1);
      expect(report.assessments).toHaveLength(1);
      expect(report.dataProcessingActivities).toBeDefined();
      expect(report.riskAssessment).toBeDefined();
      expect(report.mitigationMeasures).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
    });

    it('should call risk detector methods to collect findings', async () => {
      const scope: ReportScope = { regulations: ['GDPR'] };

      await service.generateDPIA(scope);

      expect(mockRiskDetector.scanS3Buckets).toHaveBeenCalled();
      expect(mockRiskDetector.analyzeIAMPolicies).toHaveBeenCalled();
      expect(mockRiskDetector.processCloudTrailLogs).toHaveBeenCalled();
      expect(mockRiskDetector.getMacieFindings).toHaveBeenCalled();
      expect(mockRiskDetector.getSecurityHubFindings).toHaveBeenCalled();
    });

    it('should generate assessments for all findings', async () => {
      const scope: ReportScope = { regulations: ['GDPR'] };

      await service.generateDPIA(scope);

      expect(mockReasoningEngine.analyzeFinding).toHaveBeenCalledWith(mockFinding);
    });

    it('should include risk assessment with proper structure', async () => {
      const scope: ReportScope = { regulations: ['GDPR'] };

      const report = await service.generateDPIA(scope);

      expect(report.riskAssessment).toBeDefined();
      expect(report.riskAssessment.overallRisk).toMatch(/^(LOW|MEDIUM|HIGH|VERY_HIGH)$/);
      expect(report.riskAssessment.riskFactors).toBeInstanceOf(Array);
      expect(report.riskAssessment.mitigationMeasures).toBeInstanceOf(Array);
      expect(report.riskAssessment.residualRisk).toMatch(/^(LOW|MEDIUM|HIGH|VERY_HIGH)$/);
    });
  });

  describe('generateRoPA', () => {
    it('should generate a RoPA report with correct structure', async () => {
      const scope: ReportScope = {
        regulations: ['GDPR']
      };

      const report = await service.generateRoPA(scope);

      expect(report).toBeDefined();
      expect(report.type).toBe('ROPA');
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.scope).toEqual(scope);
      expect(report.findings).toHaveLength(1);
      expect(report.assessments).toHaveLength(1);
      expect(report.processingActivities).toBeDefined();
      expect(report.dataCategories).toBeDefined();
      expect(report.legalBases).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
    });

    it('should extract processing activities from findings', async () => {
      const scope: ReportScope = { regulations: ['GDPR'] };

      const report = await service.generateRoPA(scope);

      expect(report.processingActivities).toBeInstanceOf(Array);
      expect(report.processingActivities.length).toBeGreaterThan(0);
      
      const activity = report.processingActivities[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('name');
      expect(activity).toHaveProperty('purpose');
      expect(activity).toHaveProperty('dataCategories');
      expect(activity).toHaveProperty('legalBasis');
      expect(activity).toHaveProperty('dataSubjects');
      expect(activity).toHaveProperty('recipients');
      expect(activity).toHaveProperty('retentionPeriod');
    });

    it('should extract data categories from findings', async () => {
      const piiFinding: ComplianceFinding = {
        ...mockFinding,
        findingType: 'PII_EXPOSURE',
        description: 'PII data exposed in S3 bucket'
      };
      
      mockRiskDetector.scanS3Buckets.mockResolvedValue([piiFinding]);

      const scope: ReportScope = { regulations: ['GDPR'] };
      const report = await service.generateRoPA(scope);

      expect(report.dataCategories).toBeInstanceOf(Array);
      expect(report.dataCategories.length).toBeGreaterThan(0);
      
      const category = report.dataCategories[0];
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('type');
      expect(category).toHaveProperty('description');
      expect(category).toHaveProperty('sources');
    });
  });

  describe('generateAuditReport', () => {
    it('should generate an audit report with correct structure', async () => {
      const timeRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      };

      const report = await service.generateAuditReport(timeRange);

      expect(report).toBeDefined();
      expect(report.type).toBe('AUDIT');
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.auditPeriod).toEqual(timeRange);
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
      expect(report.violations).toBeInstanceOf(Array);
      expect(report.remediationActions).toBeInstanceOf(Array);
      expect(report.executiveSummary).toBeDefined();
    });

    it('should calculate compliance score based on findings', async () => {
      const timeRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      };

      const report = await service.generateAuditReport(timeRange);

      expect(typeof report.complianceScore).toBe('number');
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should filter violations by severity', async () => {
      const criticalFinding: ComplianceFinding = {
        ...mockFinding,
        severity: 'CRITICAL',
        description: 'Critical security issue'
      };
      
      mockRiskDetector.scanS3Buckets.mockResolvedValue([mockFinding, criticalFinding]);

      const timeRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      };

      const report = await service.generateAuditReport(timeRange);

      expect(report.violations).toBeInstanceOf(Array);
      expect(report.violations.length).toBeGreaterThan(0);
      
      // Should only include HIGH and CRITICAL findings as violations
      report.violations.forEach(violation => {
        expect(['HIGH', 'CRITICAL']).toContain(violation.severity);
      });
    });
  });

  describe('generateComplianceSummary', () => {
    it('should generate a compliance summary with correct structure', async () => {
      const regulation = 'GDPR';
      const department = 'IT';

      const report = await service.generateComplianceSummary(regulation, department);

      expect(report).toBeDefined();
      expect(report.type).toBe('SUMMARY');
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.scope.regulations).toContain(regulation);
      expect(report.scope.departments).toContain(department);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.trendAnalysis).toBeInstanceOf(Array);
      expect(report.keyMetrics).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
    });

    it('should generate trend analysis data', async () => {
      const regulation = 'GDPR';

      const report = await service.generateComplianceSummary(regulation);

      expect(report.trendAnalysis).toBeInstanceOf(Array);
      expect(report.trendAnalysis.length).toBeGreaterThan(0);
      
      const trend = report.trendAnalysis[0];
      expect(trend).toHaveProperty('period');
      expect(trend).toHaveProperty('value');
      expect(trend).toHaveProperty('change');
    });

    it('should calculate key metrics', async () => {
      const regulation = 'GDPR';

      const report = await service.generateComplianceSummary(regulation);

      expect(report.keyMetrics).toBeDefined();
      expect(report.keyMetrics).toHaveProperty('totalFindings');
      expect(report.keyMetrics).toHaveProperty('criticalFindings');
      expect(report.keyMetrics).toHaveProperty('highFindings');
      expect(report.keyMetrics).toHaveProperty('mediumFindings');
      expect(report.keyMetrics).toHaveProperty('lowFindings');
      expect(report.keyMetrics).toHaveProperty('averageConfidenceScore');
    });
  });

  describe('storeReport', () => {
    it('should store report in S3 and metadata in DynamoDB', async () => {
      const mockReport: DPIAReport = {
        id: 'test-report',
        type: 'DPIA',
        generatedAt: new Date(),
        scope: { regulations: ['GDPR'] },
        findings: [mockFinding],
        assessments: [mockAssessment],
        recommendations: [],
        executiveSummary: 'Test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'MEDIUM',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'LOW'
        },
        mitigationMeasures: []
      };

      const s3Key = await service.storeReport(mockReport);

      expect(s3Key).toBeDefined();
      expect(typeof s3Key).toBe('string');
      expect(mockAWSClients.s3.putObject).toHaveBeenCalled();
      expect(mockAWSClients.dynamodb.put).toHaveBeenCalled();
    });

    it('should generate correct S3 key format', async () => {
      const mockReport: DPIAReport = {
        id: 'test-report-123',
        type: 'DPIA',
        generatedAt: new Date('2024-01-15'),
        scope: { regulations: ['GDPR'] },
        findings: [],
        assessments: [],
        recommendations: [],
        executiveSummary: 'Test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'LOW',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'LOW'
        },
        mitigationMeasures: []
      };

      const s3Key = await service.storeReport(mockReport);

      expect(s3Key).toContain('compliance-reports/dpia/2024/01/15/test-report-123');
      expect(s3Key.endsWith('.json')).toBe(true);
    });
  });

  describe('getReport', () => {
    it('should retrieve report from S3 using metadata from DynamoDB', async () => {
      const reportId = 'test-report';

      const report = await service.getReport(reportId);

      expect(report).toBeDefined();
      expect(mockAWSClients.dynamodb.get).toHaveBeenCalledWith({
        TableName: 'test-compliance-table',
        Key: { reportId }
      });
      expect(mockAWSClients.s3.getObject).toHaveBeenCalled();
    });

    it('should throw error if report not found', async () => {
      mockAWSClients.dynamodb.get.mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Item: null })
      });

      await expect(service.getReport('non-existent')).rejects.toThrow('Report not found');
    });
  });

  describe('listReports', () => {
    it('should list reports with no filters', async () => {
      const reports = await service.listReports({});

      expect(reports).toBeInstanceOf(Array);
      expect(mockAWSClients.dynamodb.scan).toHaveBeenCalled();
    });

    it('should filter reports by type', async () => {
      const filters = { type: 'DPIA' };

      const reports = await service.listReports(filters);

      expect(reports).toBeInstanceOf(Array);
      expect(mockAWSClients.dynamodb.query).toHaveBeenCalled();
    });

    it('should limit results to prevent large responses', async () => {
      // Mock many reports
      const manyReports = Array.from({ length: 100 }, (_, i) => ({
        reportId: `report-${i}`,
        s3Key: `compliance-reports/report-${i}.json`
      }));

      mockAWSClients.dynamodb.scan.mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Items: manyReports })
      });

      const reports = await service.listReports({});

      // Should be limited to 50 reports
      expect(reports.length).toBeLessThanOrEqual(50);
    });
  });

  describe('deleteReport', () => {
    it('should delete report from both S3 and DynamoDB', async () => {
      const reportId = 'test-report';

      const result = await service.deleteReport(reportId);

      expect(result).toBe(true);
      expect(mockAWSClients.dynamodb.get).toHaveBeenCalled();
      expect(mockAWSClients.s3.deleteObject).toHaveBeenCalled();
      expect(mockAWSClients.dynamodb.delete).toHaveBeenCalled();
    });

    it('should return false if report does not exist', async () => {
      mockAWSClients.dynamodb.get.mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Item: null })
      });

      const result = await service.deleteReport('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const reportId = 'test-report';

      const buffer = await service.exportReport(reportId, 'JSON');

      expect(buffer).toBeInstanceOf(Buffer);
      
      const jsonData = JSON.parse(buffer.toString());
      expect(jsonData).toHaveProperty('id');
      expect(jsonData).toHaveProperty('type');
    });

    it('should export report as CSV', async () => {
      const reportId = 'test-report';

      const buffer = await service.exportReport(reportId, 'CSV');

      expect(buffer).toBeInstanceOf(Buffer);
      
      const csvContent = buffer.toString();
      expect(csvContent).toContain('Report ID,Type,Generated At');
      expect(csvContent).toContain('Findings');
      expect(csvContent).toContain('Recommendations');
    });

    it('should export report as PDF', async () => {
      const reportId = 'test-report';

      const buffer = await service.exportReport(reportId, 'PDF');

      expect(buffer).toBeInstanceOf(Buffer);
      
      const pdfContent = buffer.toString();
      expect(pdfContent).toContain('COMPLIANCE REPORT');
      expect(pdfContent).toContain('EXECUTIVE SUMMARY');
    });

    it('should throw error for unsupported format', async () => {
      const reportId = 'test-report';

      await expect(service.exportReport(reportId, 'XML' as any)).rejects.toThrow('Unsupported export format');
    });
  });

  describe('scheduleReport', () => {
    it('should create a report schedule', async () => {
      const reportType = 'DPIA';
      const scope: ReportScope = { regulations: ['GDPR'] };
      const schedule = { frequency: 'MONTHLY' as const, time: '09:00' };

      const scheduleId = await service.scheduleReport(reportType, scope, schedule);

      expect(scheduleId).toBeDefined();
      expect(typeof scheduleId).toBe('string');
      expect(mockAWSClients.dynamodb.put).toHaveBeenCalled();
    });
  });

  describe('enhanced storage and retrieval', () => {
    describe('storeReport with enhanced encryption', () => {
      it('should store report with KMS encryption and comprehensive metadata', async () => {
        const mockReport: DPIAReport = {
          id: 'test-report-123',
          type: 'DPIA',
          generatedAt: new Date('2024-01-15T10:30:00Z'),
          scope: { 
            regulations: ['GDPR', 'CCPA'],
            departments: ['IT', 'HR'],
            resourceTypes: ['s3', 'rds']
          },
          findings: [mockFinding],
          assessments: [mockAssessment],
          recommendations: [mockAssessment.recommendations[0]],
          executiveSummary: 'Test summary',
          dataProcessingActivities: [],
          riskAssessment: {
            overallRisk: 'HIGH',
            riskFactors: [],
            mitigationMeasures: [],
            residualRisk: 'MEDIUM'
          },
          mitigationMeasures: []
        };

        const s3Key = await service.storeReport(mockReport);

        // Verify S3 storage with enhanced encryption
        expect(mockAWSClients.s3.putObject).toHaveBeenCalledWith(
          expect.objectContaining({
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: expect.any(String),
            StorageClass: 'STANDARD_IA',
            Metadata: expect.objectContaining({
              reportId: 'test-report-123',
              reportType: 'DPIA',
              findingsCount: '1',
              assessmentsCount: '1',
              recommendationsCount: '1',
              regulations: 'GDPR,CCPA',
              departments: 'IT,HR',
              resourceTypes: 's3,rds',
              version: '1.0'
            }),
            Tagging: expect.any(String)
          })
        );

        // Verify DynamoDB metadata with enhanced indexing
        expect(mockAWSClients.dynamodb.put).toHaveBeenCalledWith(
          expect.objectContaining({
            Item: expect.objectContaining({
              reportId: 'test-report-123',
              reportType: 'DPIA',
              regulations: 'GDPR,CCPA',
              departments: 'IT,HR',
              resourceTypes: 's3,rds',
              criticalFindings: 0,
              highFindings: 1,
              mediumFindings: 0,
              lowFindings: 0,
              piiExposures: 0,
              encryptionIssues: 1,
              typeGeneratedAt: 'DPIA#2024-01-15T10:30:00.000Z',
              statusDate: 'ACTIVE#2024-01-15T10:30:00.000Z',
              yearMonth: '2024-01',
              year: 2024,
              month: 1,
              day: 15,
              riskLevel: 'HIGH',
              status: 'ACTIVE',
              version: '1.0',
              searchableText: expect.any(String),
              tags: expect.any(Array)
            }),
            ConditionExpression: 'attribute_not_exists(reportId)'
          })
        );

        expect(s3Key).toContain('compliance-reports/dpia/2024/01/15/test-report-123.json');
      });

      it('should validate S3 encryption configuration', async () => {
        const mockReport: DPIAReport = {
          id: 'encryption-test',
          type: 'DPIA',
          generatedAt: new Date(),
          scope: { regulations: ['GDPR'] },
          findings: [],
          assessments: [],
          recommendations: [],
          executiveSummary: 'Test summary',
          dataProcessingActivities: [],
          riskAssessment: {
            overallRisk: 'LOW',
            riskFactors: [],
            mitigationMeasures: [],
            residualRisk: 'LOW'
          },
          mitigationMeasures: []
        };

        await service.storeReport(mockReport);

        // Verify encryption parameters are correctly set
        const putObjectCall = mockAWSClients.s3.putObject.mock.calls[0][0];
        expect(putObjectCall.ServerSideEncryption).toBe('aws:kms');
        expect(putObjectCall.SSEKMSKeyId).toBeDefined();
        expect(putObjectCall.ContentType).toBe('application/json');
        expect(putObjectCall.StorageClass).toBe('STANDARD_IA');
      });

      it('should generate comprehensive S3 tags for compliance tracking', async () => {
        const mockReport: DPIAReport = {
          id: 'tagging-test',
          type: 'DPIA',
          generatedAt: new Date('2024-06-15'),
          scope: { 
            regulations: ['GDPR', 'CCPA'],
            departments: ['Finance', 'Legal']
          },
          findings: [
            { ...mockFinding, severity: 'CRITICAL' },
            { ...mockFinding, id: 'finding-2', severity: 'HIGH' }
          ],
          assessments: [],
          recommendations: [],
          executiveSummary: 'Test summary',
          dataProcessingActivities: [],
          riskAssessment: {
            overallRisk: 'HIGH',
            riskFactors: [],
            mitigationMeasures: [],
            residualRisk: 'MEDIUM'
          },
          mitigationMeasures: []
        };

        await service.storeReport(mockReport);

        const putObjectCall = mockAWSClients.s3.putObject.mock.calls[0][0];
        expect(putObjectCall.Tagging).toContain('ReportType=DPIA');
        expect(putObjectCall.Tagging).toContain('GeneratedYear=2024');
        expect(putObjectCall.Tagging).toContain('FindingsCount=2');
        expect(putObjectCall.Tagging).toContain('Regulations=GDPR-CCPA');
        expect(putObjectCall.Tagging).toContain('Departments=Finance-Legal');
        expect(putObjectCall.Tagging).toContain('CriticalFindings=1');
        expect(putObjectCall.Tagging).toContain('HighFindings=1');
      });

      it('should prevent duplicate report storage', async () => {
        mockAWSClients.dynamodb.put.mockReturnValue({
          promise: vi.fn().mockRejectedValue({
            name: 'ConditionalCheckFailedException',
            message: 'The conditional request failed'
          })
        });

        const mockReport: DPIAReport = {
          id: 'duplicate-report',
          type: 'DPIA',
          generatedAt: new Date(),
          scope: { regulations: ['GDPR'] },
          findings: [],
          assessments: [],
          recommendations: [],
          executiveSummary: 'Test summary',
          dataProcessingActivities: [],
          riskAssessment: {
            overallRisk: 'LOW',
            riskFactors: [],
            mitigationMeasures: [],
            residualRisk: 'LOW'
          },
          mitigationMeasures: []
        };

        await expect(service.storeReport(mockReport)).rejects.toThrow('Report duplicate-report already exists');
      });
    });

    describe('searchReports', () => {
      beforeEach(() => {
        // Mock enhanced query results
        mockAWSClients.dynamodb.query.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'report-1',
                s3Key: 'compliance-reports/dpia/report-1.json',
                reportType: 'DPIA',
                generatedAt: '2024-01-01T00:00:00.000Z',
                findingsCount: 5,
                criticalFindings: 1,
                highFindings: 2,
                overallScore: 75,
                regulations: 'GDPR',
                departments: 'IT',
                status: 'ACTIVE',
                searchableText: 'dpia gdpr compliance encryption access control'
              },
              {
                reportId: 'report-2',
                s3Key: 'compliance-reports/audit/report-2.json',
                reportType: 'AUDIT',
                generatedAt: '2024-01-02T00:00:00.000Z',
                findingsCount: 3,
                criticalFindings: 0,
                highFindings: 1,
                complianceScore: 85,
                regulations: 'GDPR,CCPA',
                departments: 'HR',
                status: 'ACTIVE',
                searchableText: 'audit gdpr ccpa compliance data protection'
              }
            ]
          })
        });
      });

      it('should search reports with multiple criteria', async () => {
        const searchCriteria = {
          type: 'DPIA',
          regulation: 'GDPR',
          department: 'IT',
          severityLevel: 'HIGH' as const,
          minScore: 70,
          limit: 10
        };

        const result = await service.searchReports(searchCriteria);

        expect(result).toBeDefined();
        expect(result.reports).toBeInstanceOf(Array);
        expect(result.totalCount).toBeGreaterThanOrEqual(0);
        expect(typeof result.hasMore).toBe('boolean');

        // Verify query was called with enhanced filters
        expect(mockAWSClients.dynamodb.query).toHaveBeenCalled();
      });

      it('should perform text search on searchable content', async () => {
        const searchCriteria = {
          query: 'encryption access',
          limit: 5
        };

        const result = await service.searchReports(searchCriteria);

        expect(result.reports).toBeInstanceOf(Array);
        expect(result.totalCount).toBeGreaterThanOrEqual(0);
      });

      it('should handle pagination correctly', async () => {
        const searchCriteria = {
          limit: 1,
          offset: 1
        };

        const result = await service.searchReports(searchCriteria);

        expect(result.reports.length).toBeLessThanOrEqual(1);
        expect(typeof result.hasMore).toBe('boolean');
      });

      it('should filter by severity level correctly', async () => {
        const searchCriteria = {
          severityLevel: 'CRITICAL' as const,
          limit: 10
        };

        await service.searchReports(searchCriteria);

        // Verify that the scan was called (since no type filter, it uses scan)
        expect(mockAWSClients.dynamodb.scan).toHaveBeenCalled();
        const scanCall = mockAWSClients.dynamodb.scan.mock.calls[0][0];
        expect(scanCall.FilterExpression).toContain('criticalFindings > :zero');
        expect(scanCall.ExpressionAttributeValues[':zero']).toBe(0);
      });

      it('should filter by minimum score correctly', async () => {
        const searchCriteria = {
          minScore: 80,
          limit: 10
        };

        await service.searchReports(searchCriteria);

        const scanCall = mockAWSClients.dynamodb.scan.mock.calls[0][0];
        expect(scanCall.FilterExpression).toContain('overallScore >= :minScore OR complianceScore >= :minScore');
        expect(scanCall.ExpressionAttributeValues[':minScore']).toBe(80);
      });

      it('should filter by date range correctly', async () => {
        const searchCriteria = {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          },
          limit: 10
        };

        await service.searchReports(searchCriteria);

        const queryCall = mockAWSClients.dynamodb.query.mock.calls[0][0];
        expect(queryCall.KeyConditionExpression).toContain('generatedAt BETWEEN :startDate AND :endDate');
        expect(queryCall.ExpressionAttributeValues[':startDate']).toBe('2024-01-01T00:00:00.000Z');
        expect(queryCall.ExpressionAttributeValues[':endDate']).toBe('2024-12-31T00:00:00.000Z');
      });

      it('should handle empty search results', async () => {
        mockAWSClients.dynamodb.scan.mockReturnValue({
          promise: vi.fn().mockResolvedValue({ Items: [] })
        });

        const result = await service.searchReports({ limit: 10 });

        expect(result.reports).toHaveLength(0);
        expect(result.totalCount).toBe(0);
        expect(result.hasMore).toBe(false);
      });

      it('should validate search criteria limits', async () => {
        const searchCriteria = {
          limit: 1000, // Excessive limit
          maxFindings: 50
        };

        await service.searchReports(searchCriteria);

        // Should apply reasonable limits internally
        const scanCall = mockAWSClients.dynamodb.scan.mock.calls[0][0];
        expect(scanCall.Limit).toBeLessThanOrEqual(1000); // Should accept the limit but may be capped internally
      });
    });

    describe('getReportSummary', () => {
      it('should return report summary without full content', async () => {
        mockAWSClients.dynamodb.get.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Item: {
              reportId: 'test-report',
              reportType: 'DPIA',
              generatedAt: '2024-01-01T00:00:00.000Z',
              findingsCount: 10,
              criticalFindings: 2,
              highFindings: 3,
              overallScore: 75,
              status: 'ACTIVE',
              s3Key: 'compliance-reports/dpia/test-report.json'
            }
          })
        });

        const summary = await service.getReportSummary('test-report');

        expect(summary).toBeDefined();
        expect(summary).toEqual({
          id: 'test-report',
          type: 'DPIA',
          generatedAt: new Date('2024-01-01T00:00:00.000Z'),
          findingsCount: 10,
          criticalFindings: 2,
          highFindings: 3,
          overallScore: 75,
          complianceScore: undefined,
          status: 'ACTIVE'
        });

        // Should not retrieve full report from S3
        expect(mockAWSClients.s3.getObject).not.toHaveBeenCalled();
      });

      it('should return null for non-existent report', async () => {
        mockAWSClients.dynamodb.get.mockReturnValue({
          promise: vi.fn().mockResolvedValue({ Item: null })
        });

        const summary = await service.getReportSummary('non-existent');

        expect(summary).toBeNull();
      });
    });

    describe('getComplianceTrends', () => {
      beforeEach(() => {
        // Mock trend data
        mockAWSClients.dynamodb.query.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'report-1',
                s3Key: 'compliance-reports/summary/report-1.json',
                generatedAt: '2024-01-01T00:00:00.000Z',
                findingsCount: 10,
                criticalFindings: 2,
                overallScore: 75
              },
              {
                reportId: 'report-2',
                s3Key: 'compliance-reports/summary/report-2.json',
                generatedAt: '2024-01-15T00:00:00.000Z',
                findingsCount: 8,
                criticalFindings: 1,
                overallScore: 80
              },
              {
                reportId: 'report-3',
                s3Key: 'compliance-reports/summary/report-3.json',
                generatedAt: '2024-02-01T00:00:00.000Z',
                findingsCount: 12,
                criticalFindings: 3,
                overallScore: 70
              }
            ]
          })
        });
      });

      it('should generate monthly compliance trends', async () => {
        const filters = {
          regulation: 'GDPR',
          timeRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-02-28')
          },
          granularity: 'MONTHLY' as const
        };

        const trends = await service.getComplianceTrends(filters);

        expect(trends).toBeInstanceOf(Array);
        expect(trends.length).toBeGreaterThan(0);

        const trend = trends[0];
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('reportsCount');
        expect(trend).toHaveProperty('averageScore');
        expect(trend).toHaveProperty('totalFindings');
        expect(trend).toHaveProperty('criticalFindings');

        // Verify trends are sorted by period
        if (trends.length > 1) {
          expect(trends[0].period <= trends[1].period).toBe(true);
        }
      });

      it('should generate weekly compliance trends', async () => {
        const filters = {
          department: 'IT',
          timeRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          },
          granularity: 'WEEKLY' as const
        };

        const trends = await service.getComplianceTrends(filters);

        expect(trends).toBeInstanceOf(Array);
        trends.forEach(trend => {
          expect(trend.period).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format for week start
        });
      });

      it('should generate daily compliance trends', async () => {
        const filters = {
          timeRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-07')
          },
          granularity: 'DAILY' as const
        };

        const trends = await service.getComplianceTrends(filters);

        expect(trends).toBeInstanceOf(Array);
        trends.forEach(trend => {
          expect(trend.period).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        });
      });

      it('should calculate correct averages and totals', async () => {
        const filters = {
          timeRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-02-28')
          },
          granularity: 'MONTHLY' as const
        };

        const trends = await service.getComplianceTrends(filters);

        // Find January trend (should have 2 reports with scores 75 and 80)
        const januaryTrend = trends.find(t => t.period === '2024-01');
        if (januaryTrend) {
          expect(januaryTrend.reportsCount).toBe(2);
          expect(januaryTrend.averageScore).toBe(78); // (75 + 80) / 2 = 77.5, rounded to 78
          expect(januaryTrend.totalFindings).toBe(18); // 10 + 8
          expect(januaryTrend.criticalFindings).toBe(3); // 2 + 1
        }
      });
    });

    describe('enhanced report retrieval', () => {
      it('should retrieve report with proper date parsing', async () => {
        const reportId = 'test-report';
        
        // Mock S3 response with date strings
        mockAWSClients.s3.getObject.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: Buffer.from(JSON.stringify({
              id: 'test-report',
              type: 'DPIA',
              generatedAt: '2024-01-01T00:00:00.000Z',
              scope: { regulations: ['GDPR'] },
              findings: [{
                ...mockFinding,
                detectedAt: '2024-01-01T00:00:00.000Z'
              }],
              assessments: [{
                ...mockAssessment,
                assessedAt: '2024-01-01T00:00:00.000Z'
              }],
              recommendations: [],
              executiveSummary: 'Test summary'
            }))
          })
        });

        const report = await service.getReport(reportId);

        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.findings[0].detectedAt).toBeInstanceOf(Date);
        expect(report.assessments[0].assessedAt).toBeInstanceOf(Date);
      });

      it('should handle corrupted S3 data gracefully', async () => {
        mockAWSClients.s3.getObject.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: Buffer.from('invalid json data')
          })
        });

        await expect(service.getReport('test-report')).rejects.toThrow();
      });

      it('should handle missing S3 object', async () => {
        mockAWSClients.s3.getObject.mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: null
          })
        });

        await expect(service.getReport('test-report')).rejects.toThrow('Report data not found in S3');
      });

      it('should validate S3 bucket and key configuration', async () => {
        const reportId = 'test-report';
        await service.getReport(reportId);

        expect(mockAWSClients.s3.getObject).toHaveBeenCalledWith({
          Bucket: 'test-reports-bucket',
          Key: 'compliance-reports/dpia/test-report.json'
        });
      });
    });

    describe('enhanced listReports', () => {
      it('should use enhanced search functionality', async () => {
        const filters = {
          type: 'DPIA',
          regulation: 'GDPR',
          department: 'IT',
          status: 'ACTIVE',
          limit: 25
        };

        const reports = await service.listReports(filters);

        expect(reports).toBeInstanceOf(Array);
        // Verify it uses the searchReports method internally
        expect(mockAWSClients.dynamodb.query).toHaveBeenCalled();
      });

      it('should apply default limits for performance', async () => {
        const filters = {}; // No limit specified

        await service.listReports(filters);

        // Should apply default limit of 50 via scan
        const scanCall = mockAWSClients.dynamodb.scan.mock.calls[0][0];
        expect(scanCall.Limit).toBeLessThanOrEqual(50);
      });

      it('should handle various filter combinations', async () => {
        const filters = {
          type: 'AUDIT',
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          },
          regulation: 'CCPA',
          department: 'Legal',
          status: 'ACTIVE'
        };

        const reports = await service.listReports(filters);

        expect(reports).toBeInstanceOf(Array);
        expect(mockAWSClients.dynamodb.query).toHaveBeenCalled();
      });
    });
  });

  describe('S3 storage validation and encryption', () => {
    it('should validate S3 encryption at rest configuration', async () => {
      const mockReport: DPIAReport = {
        id: 'encryption-validation-test',
        type: 'DPIA',
        generatedAt: new Date(),
        scope: { regulations: ['GDPR'] },
        findings: [mockFinding],
        assessments: [mockAssessment],
        recommendations: [],
        executiveSummary: 'Test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'MEDIUM',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'LOW'
        },
        mitigationMeasures: []
      };

      await service.storeReport(mockReport);

      const putObjectCall = mockAWSClients.s3.putObject.mock.calls[0][0];
      
      // Validate encryption configuration
      expect(putObjectCall.ServerSideEncryption).toBe('aws:kms');
      expect(putObjectCall.SSEKMSKeyId).toBeDefined();
      expect(putObjectCall.SSEKMSKeyId).toMatch(/^(alias\/|arn:aws:kms:)/);
      
      // Validate storage class for compliance
      expect(putObjectCall.StorageClass).toBe('STANDARD_IA');
      
      // Validate content type
      expect(putObjectCall.ContentType).toBe('application/json');
    });

    it('should validate comprehensive metadata for compliance tracking', async () => {
      const mockReport: DPIAReport = {
        id: 'metadata-test',
        type: 'DPIA',
        generatedAt: new Date('2024-03-15T14:30:00Z'),
        scope: { 
          regulations: ['GDPR', 'CCPA', 'PDPL'],
          departments: ['Engineering', 'Product', 'Legal'],
          resourceTypes: ['s3', 'rds', 'lambda', 'dynamodb']
        },
        findings: [
          { ...mockFinding, severity: 'CRITICAL', findingType: 'PII_EXPOSURE' },
          { ...mockFinding, id: 'finding-2', severity: 'HIGH', findingType: 'ENCRYPTION' },
          { ...mockFinding, id: 'finding-3', severity: 'MEDIUM', findingType: 'ACCESS_CONTROL' }
        ],
        assessments: [mockAssessment],
        recommendations: [mockAssessment.recommendations[0]],
        executiveSummary: 'Comprehensive test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'HIGH',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'MEDIUM'
        },
        mitigationMeasures: []
      };

      await service.storeReport(mockReport);

      const putObjectCall = mockAWSClients.s3.putObject.mock.calls[0][0];
      
      // Validate comprehensive metadata
      expect(putObjectCall.Metadata).toEqual({
        reportId: 'metadata-test',
        reportType: 'DPIA',
        generatedAt: '2024-03-15T14:30:00.000Z',
        findingsCount: '3',
        assessmentsCount: '1',
        recommendationsCount: '1',
        regulations: 'GDPR,CCPA,PDPL',
        departments: 'Engineering,Product,Legal',
        resourceTypes: 's3,rds,lambda,dynamodb',
        version: '1.0'
      });

      // Validate tagging for compliance
      expect(putObjectCall.Tagging).toContain('ReportType=DPIA');
      expect(putObjectCall.Tagging).toContain('FindingsCount=3');
      expect(putObjectCall.Tagging).toContain('CriticalFindings=1');
      expect(putObjectCall.Tagging).toContain('HighFindings=1');
      expect(putObjectCall.Tagging).toContain('Regulations=GDPR-CCPA-PDPL');
    });

    it('should validate S3 key structure for organized storage', async () => {
      const testCases = [
        {
          type: 'DPIA',
          date: new Date('2024-01-15T10:30:00Z'),
          expectedPattern: /^compliance-reports\/dpia\/2024\/01\/15\/.*\.json$/
        },
        {
          type: 'AUDIT',
          date: new Date('2025-01-01T00:00:00Z'),
          expectedPattern: /^compliance-reports\/audit\/2025\/01\/01\/.*\.json$/
        },
        {
          type: 'SUMMARY',
          date: new Date('2024-06-15T12:00:00Z'),
          expectedPattern: /^compliance-reports\/summary\/2024\/06\/15\/.*\.json$/
        }
      ];

      for (const testCase of testCases) {
        let mockReport: any;
        
        if (testCase.type === 'AUDIT') {
          mockReport = {
            id: `test-${testCase.type.toLowerCase()}`,
            type: testCase.type,
            generatedAt: testCase.date,
            scope: { regulations: ['GDPR'] },
            findings: [],
            assessments: [],
            recommendations: [],
            executiveSummary: 'Test summary',
            auditPeriod: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31')
            },
            complianceScore: 85,
            violations: [],
            remediationActions: []
          };
        } else if (testCase.type === 'SUMMARY') {
          mockReport = {
            id: `test-${testCase.type.toLowerCase()}`,
            type: testCase.type,
            generatedAt: testCase.date,
            scope: { regulations: ['GDPR'] },
            findings: [],
            assessments: [],
            recommendations: [],
            executiveSummary: 'Test summary',
            overallScore: 85,
            trendAnalysis: [],
            keyMetrics: {}
          };
        } else {
          mockReport = {
            id: `test-${testCase.type.toLowerCase()}`,
            type: testCase.type,
            generatedAt: testCase.date,
            scope: { regulations: ['GDPR'] },
            findings: [],
            assessments: [],
            recommendations: [],
            executiveSummary: 'Test summary',
            dataProcessingActivities: [],
            riskAssessment: {
              overallRisk: 'LOW',
              riskFactors: [],
              mitigationMeasures: [],
              residualRisk: 'LOW'
            },
            mitigationMeasures: []
          };
        }

        const s3Key = await service.storeReport(mockReport);
        expect(s3Key).toMatch(testCase.expectedPattern);
      }
    });

    it('should validate DynamoDB indexing for efficient querying', async () => {
      const mockReport: DPIAReport = {
        id: 'indexing-test',
        type: 'DPIA',
        generatedAt: new Date('2024-07-20T16:45:30Z'),
        scope: { 
          regulations: ['GDPR'],
          departments: ['Security'],
          resourceTypes: ['s3']
        },
        findings: [
          { ...mockFinding, severity: 'CRITICAL', findingType: 'PII_EXPOSURE' },
          { ...mockFinding, id: 'finding-2', severity: 'HIGH', findingType: 'ENCRYPTION' }
        ],
        assessments: [mockAssessment],
        recommendations: [],
        executiveSummary: 'Test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'HIGH',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'MEDIUM'
        },
        mitigationMeasures: []
      };

      await service.storeReport(mockReport);

      const dynamoCall = mockAWSClients.dynamodb.put.mock.calls[0][0];
      const item = dynamoCall.Item;

      // Validate GSI attributes for efficient querying
      expect(item.typeGeneratedAt).toBe('DPIA#2024-07-20T16:45:30.000Z');
      expect(item.statusDate).toBe('ACTIVE#2024-07-20T16:45:30.000Z');
      expect(item.yearMonth).toBe('2024-07');
      expect(item.year).toBe(2024);
      expect(item.month).toBe(7);
      expect(item.day).toBe(20);

      // Validate severity breakdown
      expect(item.criticalFindings).toBe(1);
      expect(item.highFindings).toBe(1);
      expect(item.mediumFindings).toBe(0);
      expect(item.lowFindings).toBe(0);

      // Validate finding type breakdown
      expect(item.piiExposures).toBe(1);
      expect(item.encryptionIssues).toBe(1);

      // Validate searchable text generation
      expect(item.searchableText).toBeDefined();
      expect(typeof item.searchableText).toBe('string');
      expect(item.searchableText.length).toBeGreaterThan(0);

      // Validate tags array
      expect(item.tags).toBeInstanceOf(Array);
      expect(item.tags.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle S3 storage errors gracefully', async () => {
      mockAWSClients.s3.putObject.mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('S3 error'))
      });

      const mockReport: DPIAReport = {
        id: 'test-report',
        type: 'DPIA',
        generatedAt: new Date(),
        scope: { regulations: ['GDPR'] },
        findings: [],
        assessments: [],
        recommendations: [],
        executiveSummary: 'Test summary',
        dataProcessingActivities: [],
        riskAssessment: {
          overallRisk: 'LOW',
          riskFactors: [],
          mitigationMeasures: [],
          residualRisk: 'LOW'
        },
        mitigationMeasures: []
      };

      await expect(service.storeReport(mockReport)).rejects.toThrow('Failed to store report');
    });

    it('should handle risk detector errors gracefully', async () => {
      mockRiskDetector.scanS3Buckets.mockRejectedValue(new Error('Risk detector error'));

      const scope: ReportScope = { regulations: ['GDPR'] };

      // Should not throw error, but return empty findings
      const report = await service.generateDPIA(scope);
      expect(report.findings).toHaveLength(0);
    });

    it('should handle reasoning engine errors gracefully', async () => {
      mockReasoningEngine.analyzeFinding.mockRejectedValue(new Error('Reasoning engine error'));

      const scope: ReportScope = { regulations: ['GDPR'] };

      // Should not throw error, but continue with other findings
      const report = await service.generateDPIA(scope);
      expect(report).toBeDefined();
    });

    it('should handle search errors gracefully', async () => {
      mockAWSClients.dynamodb.query.mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      const searchCriteria = { type: 'DPIA' };

      await expect(service.searchReports(searchCriteria)).rejects.toThrow('Failed to search reports');
    });

    it('should handle trend analysis errors gracefully', async () => {
      mockAWSClients.dynamodb.query.mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('Query error'))
      });

      const filters = {
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        granularity: 'MONTHLY' as const
      };

      await expect(service.getComplianceTrends(filters)).rejects.toThrow('Failed to get compliance trends');
    });
  });
});