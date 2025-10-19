// Report Storage Service Tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportStorageServiceImpl } from '../report-storage-service';
import { AWSServiceClients } from '../../config/service-clients';
import { ComplianceReport, DateRange } from '../../types';

// Mock AWS clients
vi.mock('../../config/service-clients');

describe('ReportStorageService', () => {
  let service: ReportStorageServiceImpl;
  let mockAWSClients: any;

  const mockReport: ComplianceReport = {
    id: 'test-report-1',
    type: 'AUDIT',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    scope: {
      regulations: ['GDPR'],
      departments: ['IT'],
      resourceTypes: ['s3']
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
    assessments: [
      {
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
        confidenceScore: 0.95,
        recommendations: [],
        reasoning: 'High risk due to unencrypted sensitive data',
        assessedAt: new Date('2024-01-15T09:30:00Z')
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        findingId: 'finding-1',
        action: 'ENABLE_ENCRYPTION',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'enable-s3-encryption',
        parameters: { bucketName: 'test-bucket' },
        estimatedImpact: 'Enable AES-256 encryption for S3 bucket'
      }
    ],
    executiveSummary: 'Test audit report with 1 high-severity finding'
  };

  beforeEach(() => {
    // Create mock AWS clients
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
              criticalFindings: 0,
              highFindings: 1,
              status: 'ACTIVE'
            }
          })
        }),
        query: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'test-report-1',
                s3Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json'
              }
            ]
          })
        }),
        scan: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({
            Items: [
              {
                reportId: 'test-report-1',
                s3Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
                reportType: 'AUDIT',
                generatedAt: '2024-01-15T10:00:00.000Z',
                findingsCount: 1,
                size: 1024
              }
            ]
          })
        }),
        delete: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        })
      },
      getS3ReportsBucket: vi.fn().mockReturnValue('test-reports-bucket'),
      getDynamoDBTableName: vi.fn().mockReturnValue('test-reports-table')
    } as any;

    service = new ReportStorageServiceImpl(mockAWSClients);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('storeReport', () => {
    it('should store report successfully with encryption', async () => {
      const result = await service.storeReport(mockReport);

      expect(result).toEqual({
        s3Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
        reportId: 'test-report-1',
        storageLocation: 's3://test-reports-bucket/compliance-reports/audit/2024/01/15/10/test-report-1.json',
        encryptionStatus: 'ENCRYPTED',
        metadataIndexed: true
      });

      // Verify S3 putObject was called with encryption
      expect(mockAWSClients.s3.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-reports-bucket',
          Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
          ServerSideEncryption: 'aws:kms',
          ContentType: 'application/json'
        })
      );

      // Verify DynamoDB put was called for metadata
      expect(mockAWSClients.dynamodb.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-reports-table',
          Item: expect.objectContaining({
            reportId: 'test-report-1',
            reportType: 'AUDIT',
            findingsCount: 1,
            highFindings: 1
          })
        })
      );
    });

    it('should handle S3 storage failure', async () => {
      mockAWSClients.s3.putObject = vi.fn().mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('S3 error'))
      });

      await expect(service.storeReport(mockReport)).rejects.toThrow('Failed to store report');
    });

    it('should handle DynamoDB metadata storage failure', async () => {
      mockAWSClients.dynamodb.put = vi.fn().mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      await expect(service.storeReport(mockReport)).rejects.toThrow('Failed to store report');
    });
  });

  describe('getReport', () => {
    it('should retrieve report successfully', async () => {
      const result = await service.getReport('test-report-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'test-report-1',
        type: 'AUDIT',
        findings: expect.arrayContaining([
          expect.objectContaining({
            id: 'finding-1',
            severity: 'HIGH'
          })
        ])
      }));

      // Verify metadata was retrieved first
      expect(mockAWSClients.dynamodb.get).toHaveBeenCalledWith({
        TableName: 'test-reports-table',
        Key: { reportId: 'test-report-1' }
      });

      // Verify S3 getObject was called
      expect(mockAWSClients.s3.getObject).toHaveBeenCalledWith({
        Bucket: 'test-reports-bucket',
        Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json'
      });
    });

    it('should handle report not found', async () => {
      mockAWSClients.dynamodb.get = vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Item: null })
      });

      await expect(service.getReport('nonexistent-report')).rejects.toThrow('Report not found');
    });

    it('should handle S3 retrieval failure', async () => {
      mockAWSClients.s3.getObject = vi.fn().mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('S3 error'))
      });

      await expect(service.getReport('test-report-1')).rejects.toThrow('Failed to retrieve report');
    });
  });

  describe('searchReports', () => {
    it('should search reports with basic criteria', async () => {
      const searchCriteria = {
        type: 'AUDIT',
        limit: 10,
        offset: 0
      };

      const result = await service.searchReports(searchCriteria);

      expect(result).toEqual({
        reports: expect.arrayContaining([
          expect.objectContaining({
            id: 'test-report-1',
            type: 'AUDIT'
          })
        ]),
        totalCount: expect.any(Number),
        hasMore: expect.any(Boolean),
        searchMetadata: expect.objectContaining({
          queryTime: expect.any(Number),
          indexesUsed: expect.any(Array)
        })
      });
    });

    it('should search reports with date range', async () => {
      const searchCriteria = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        limit: 10
      };

      const result = await service.searchReports(searchCriteria);

      expect(result.reports).toBeDefined();
      expect(result.searchMetadata.indexesUsed).toContain('StatusDateIndex');
    });

    it('should search reports with text query', async () => {
      const searchCriteria = {
        query: 'encryption',
        limit: 10
      };

      const result = await service.searchReports(searchCriteria);

      expect(result.reports).toBeDefined();
      expect(result.searchMetadata).toBeDefined();
    });

    it('should handle search with multiple filters', async () => {
      const searchCriteria = {
        type: 'AUDIT',
        regulation: 'GDPR',
        department: 'IT',
        severityLevel: 'HIGH' as const,
        minScore: 80,
        limit: 5
      };

      const result = await service.searchReports(searchCriteria);

      expect(result.reports).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReportMetadata', () => {
    it('should retrieve report metadata successfully', async () => {
      const result = await service.getReportMetadata('test-report-1');

      expect(result).toEqual({
        reportId: 'test-report-1',
        type: 'AUDIT',
        generatedAt: new Date('2024-01-15T10:00:00.000Z'),
        s3Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
        size: 0,
        findingsCount: 1,
        criticalFindings: 0,
        highFindings: 1,
        status: 'ACTIVE',
        tags: []
      });
    });

    it('should return null for non-existent report', async () => {
      mockAWSClients.dynamodb.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null })
      });

      const result = await service.getReportMetadata('nonexistent-report');

      expect(result).toBeNull();
    });
  });

  describe('deleteReport', () => {
    it('should delete report successfully with audit trail', async () => {
      const result = await service.deleteReport('test-report-1', 'Test deletion');

      expect(result).toEqual({
        deleted: true,
        auditTrail: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: expect.any(String),
          reason: 'Test deletion',
          s3KeyDeleted: 'compliance-reports/audit/2024/01/15/10/test-report-1.json',
          metadataDeleted: true
        })
      });

      // Verify S3 deleteObject was called
      expect(mockAWSClients.s3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-reports-bucket',
        Key: 'compliance-reports/audit/2024/01/15/10/test-report-1.json'
      });

      // Verify DynamoDB delete was called
      expect(mockAWSClients.dynamodb.delete).toHaveBeenCalledWith({
        TableName: 'test-reports-table',
        Key: { reportId: 'test-report-1' }
      });
    });

    it('should handle delete of non-existent report', async () => {
      mockAWSClients.dynamodb.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null })
      });

      await expect(service.deleteReport('nonexistent-report')).rejects.toThrow('Report not found');
    });
  });

  describe('bulkStoreReports', () => {
    it('should store multiple reports successfully', async () => {
      const reports = [
        { ...mockReport, id: 'bulk-report-1' },
        { ...mockReport, id: 'bulk-report-2' },
        { ...mockReport, id: 'bulk-report-3' }
      ];

      const result = await service.bulkStoreReports(reports);

      expect(result).toEqual({
        successful: ['bulk-report-1', 'bulk-report-2', 'bulk-report-3'],
        failed: [],
        totalProcessed: 3
      });

      // Verify S3 putObject was called for each report
      expect(mockAWSClients.s3.putObject).toHaveBeenCalledTimes(3);
      expect(mockAWSClients.dynamodb.put).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk operation', async () => {
      const reports = [
        { ...mockReport, id: 'bulk-report-1' },
        { ...mockReport, id: 'bulk-report-2' }
      ];

      // Make second report fail
      mockAWSClients.s3.putObject = jest.fn()
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({ ETag: '"mock-etag"' })
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockRejectedValue(new Error('S3 error'))
        });

      const result = await service.bulkStoreReports(reports);

      expect(result.successful).toContain('bulk-report-1');
      expect(result.failed).toEqual([
        {
          reportId: 'bulk-report-2',
          error: expect.stringContaining('Failed to store report')
        }
      ]);
      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('getStorageMetrics', () => {
    it('should return comprehensive storage metrics', async () => {
      const result = await service.getStorageMetrics();

      expect(result).toEqual({
        totalReports: expect.any(Number),
        totalStorageSize: expect.any(Number),
        reportsByType: expect.any(Object),
        reportsByStatus: expect.any(Object),
        averageReportSize: expect.any(Number),
        oldestReport: expect.any(Date),
        newestReport: expect.any(Date),
        storageHealth: expect.stringMatching(/^(HEALTHY|WARNING|CRITICAL)$/),
        recommendations: expect.any(Array)
      });
    });

    it('should handle empty storage metrics', async () => {
      mockAWSClients.dynamodb.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] })
      });

      const result = await service.getStorageMetrics();

      expect(result.totalReports).toBe(0);
      expect(result.totalStorageSize).toBe(0);
      expect(result.averageReportSize).toBe(0);
    });
  });

  describe('validateReportIntegrity', () => {
    it('should validate report integrity successfully', async () => {
      const result = await service.validateReportIntegrity('test-report-1');

      expect(result).toEqual({
        valid: expect.any(Boolean),
        issues: expect.any(Array),
        s3Exists: expect.any(Boolean),
        metadataExists: expect.any(Boolean),
        checksumMatch: expect.any(Boolean),
        lastValidated: expect.any(Date)
      });
    });

    it('should detect missing S3 object', async () => {
      mockAWSClients.s3.getObject = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('NoSuchKey'))
      });

      const result = await service.validateReportIntegrity('test-report-1');

      expect(result.valid).toBe(false);
      expect(result.s3Exists).toBe(false);
      expect(result.issues).toContain('Report file not found in S3');
    });

    it('should detect missing metadata', async () => {
      mockAWSClients.dynamodb.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null })
      });

      const result = await service.validateReportIntegrity('test-report-1');

      expect(result.valid).toBe(false);
      expect(result.metadataExists).toBe(false);
      expect(result.issues).toContain('Report metadata not found in DynamoDB');
    });
  });

  describe('archiveOldReports', () => {
    it('should archive old reports successfully', async () => {
      // Mock old reports
      mockAWSClients.dynamodb.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: [
            {
              reportId: 'old-report-1',
              s3Key: 'compliance-reports/audit/2023/01/15/10/old-report-1.json',
              generatedAt: '2023-01-15T10:00:00.000Z',
              size: 1024,
              status: 'ACTIVE'
            }
          ]
        })
      });

      const result = await service.archiveOldReports(365);

      expect(result).toEqual({
        archivedCount: expect.any(Number),
        totalSavings: expect.any(Number),
        archivedReports: expect.any(Array)
      });
    });

    it('should handle no old reports to archive', async () => {
      mockAWSClients.dynamodb.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] })
      });

      const result = await service.archiveOldReports(365);

      expect(result.archivedCount).toBe(0);
      expect(result.totalSavings).toBe(0);
      expect(result.archivedReports).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache retrieved reports', async () => {
      // First retrieval
      await service.getReport('test-report-1');
      
      // Second retrieval should use cache
      await service.getReport('test-report-1');

      // S3 should only be called once
      expect(mockAWSClients.s3.getObject).toHaveBeenCalledTimes(1);
    });

    it('should expire cached reports after TTL', async () => {
      // Mock Date.now to control cache expiration
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      try {
        // First retrieval
        await service.getReport('test-report-1');
        
        // Advance time beyond cache TTL (5 minutes = 300000ms)
        mockTime += 400000;
        
        // Second retrieval should not use cache
        await service.getReport('test-report-1');

        // S3 should be called twice
        expect(mockAWSClients.s3.getObject).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('error handling', () => {
    it('should handle AWS service errors gracefully', async () => {
      mockAWSClients.dynamodb.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB service error'))
      });

      await expect(service.getReportMetadata('test-report-1')).resolves.toBeNull();
    });

    it('should handle malformed report data', async () => {
      mockAWSClients.s3.getObject = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Body: Buffer.from('invalid json'),
          ContentType: 'application/json'
        })
      });

      await expect(service.getReport('test-report-1')).rejects.toThrow();
    });

    it('should handle missing S3 body', async () => {
      mockAWSClients.s3.getObject = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          ContentType: 'application/json'
          // Missing Body
        })
      });

      await expect(service.getReport('test-report-1')).rejects.toThrow('Report data not found in S3');
    });
  });

  describe('performance optimization', () => {
    it('should provide optimization suggestions for slow queries', async () => {
      // Mock slow query
      const originalSetTimeout = setTimeout;
      setTimeout = jest.fn((callback) => {
        // Simulate delay
        setTimeout(() => callback(), 1500);
      }) as any;

      try {
        const result = await service.searchReports({
          query: 'test',
          limit: 10
        });

        expect(result.searchMetadata.optimizationSuggestions).toBeDefined();
      } finally {
        setTimeout = originalSetTimeout;
      }
    });

    it('should suggest adding filters for broad searches', async () => {
      const result = await service.searchReports({
        query: 'test',
        limit: 10
      });

      expect(result.searchMetadata.optimizationSuggestions).toContain(
        'Adding type or date range filters can significantly improve search performance'
      );
    });
  });
});