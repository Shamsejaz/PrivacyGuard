// Simple Report Storage Service Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportStorageServiceImpl } from '../report-storage-service';
import { AWSServiceClients } from '../../config/service-clients';
import { ComplianceReport } from '../../types';

// Mock AWS clients
vi.mock('../../config/service-clients');

describe('ReportStorageService - Core Functionality', () => {
  let service: ReportStorageServiceImpl;
  let mockAWSClients: any;

  const mockReport: ComplianceReport = {
    id: 'test-report-1',
    type: 'AUDIT',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    scope: {
      regulations: ['GDPR'],
      departments: ['IT']
    },
    findings: [
      {
        id: 'finding-1',
        resourceArn: 'arn:aws:s3:::test-bucket',
        findingType: 'ENCRYPTION',
        severity: 'HIGH',
        description: 'S3 bucket not encrypted',
        detectedAt: new Date('2024-01-15T09:00:00Z'),
        rawData: {}
      }
    ],
    assessments: [],
    recommendations: [],
    executiveSummary: 'Test audit report'
  };

  beforeEach(() => {
    mockAWSClients = {
      s3: {
        putObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({ ETag: '"mock-etag"' })
        }),
        getObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Body: Buffer.from(JSON.stringify(mockReport)),
            ContentType: 'application/json'
          })
        }),
        deleteObject: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        })
      },
      dynamodb: {
        put: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        }),
        get: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Item: {
              reportId: 'test-report-1',
              s3Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
              reportType: 'AUDIT',
              generatedAt: '2024-01-15T10:00:00.000Z',
              findingsCount: 1,
              status: 'ACTIVE'
            }
          })
        }),
        scan: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: []
          })
        }),
        delete: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        })
      },
      getS3ReportsBucket: vi.fn().mockReturnValue('test-reports-bucket'),
      getDynamoDBTableName: vi.fn().mockReturnValue('test-reports-table')
    };

    service = new ReportStorageServiceImpl(mockAWSClients);
  });

  describe('storeReport', () => {
    it('should store report successfully', async () => {
      const result = await service.storeReport(mockReport);

      expect(result).toEqual({
        s3Key: expect.stringContaining('compliance-reports/audit/2024/01/15'),
        reportId: 'test-report-1',
        storageLocation: expect.stringContaining('s3://test-reports-bucket'),
        encryptionStatus: 'ENCRYPTED',
        metadataIndexed: true
      });

      expect(mockAWSClients.s3.putObject).toHaveBeenCalled();
      expect(mockAWSClients.dynamodb.put).toHaveBeenCalled();
    });
  });

  describe('getReport', () => {
    it('should retrieve report successfully', async () => {
      const result = await service.getReport('test-report-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'test-report-1',
        type: 'AUDIT'
      }));

      expect(mockAWSClients.dynamodb.get).toHaveBeenCalled();
      expect(mockAWSClients.s3.getObject).toHaveBeenCalled();
    });
  });

  describe('getReportMetadata', () => {
    it('should retrieve metadata successfully', async () => {
      const result = await service.getReportMetadata('test-report-1');

      expect(result).toEqual(expect.objectContaining({
        reportId: 'test-report-1',
        type: 'AUDIT',
        status: 'ACTIVE'
      }));
    });
  });

  describe('searchReports', () => {
    it('should search reports with basic criteria', async () => {
      const result = await service.searchReports({
        type: 'AUDIT',
        limit: 10
      });

      expect(result).toEqual(expect.objectContaining({
        reports: expect.any(Array),
        totalCount: expect.any(Number),
        hasMore: expect.any(Boolean),
        searchMetadata: expect.objectContaining({
          queryTime: expect.any(Number),
          indexesUsed: expect.any(Array)
        })
      }));
    });
  });

  describe('getStorageMetrics', () => {
    it('should return storage metrics', async () => {
      const result = await service.getStorageMetrics();

      expect(result).toEqual(expect.objectContaining({
        totalReports: expect.any(Number),
        totalStorageSize: expect.any(Number),
        reportsByType: expect.any(Object),
        reportsByStatus: expect.any(Object),
        storageHealth: expect.stringMatching(/^(HEALTHY|WARNING|CRITICAL)$/)
      }));
    });
  });

  describe('validateReportIntegrity', () => {
    it('should validate report integrity', async () => {
      const result = await service.validateReportIntegrity('test-report-1');

      expect(result).toEqual(expect.objectContaining({
        valid: expect.any(Boolean),
        issues: expect.any(Array),
        s3Exists: expect.any(Boolean),
        metadataExists: expect.any(Boolean),
        checksumMatch: expect.any(Boolean),
        lastValidated: expect.any(Date)
      }));
    });
  });
});