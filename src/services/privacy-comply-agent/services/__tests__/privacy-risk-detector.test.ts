import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivacyRiskDetectionService } from '../privacy-risk-detector';
import { AWSServiceClients } from '../../config/service-clients';

// Mock the AWSServiceClients
vi.mock('../../config/service-clients');

describe('PrivacyRiskDetectionService', () => {
  let service: PrivacyRiskDetectionService;
  let mockServiceClients: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock service clients
    mockServiceClients = {
      getS3Client: vi.fn(),
      getIAMClient: vi.fn(),
      getCloudTrailClient: vi.fn(),
      getMacieClient: vi.fn(),
      getSecurityHubClient: vi.fn()
    };

    // Mock the getInstance method
    (AWSServiceClients.getInstance as any) = vi.fn().mockReturnValue(mockServiceClients);
    
    service = new PrivacyRiskDetectionService();
  });

  describe('scanS3Buckets', () => {
    it('should scan S3 buckets and return compliance findings', async () => {
      // Mock S3 client
      const mockS3Client = {
        listBuckets: vi.fn().mockResolvedValue([
          { Name: 'test-bucket-1', CreationDate: new Date() },
          { Name: 'test-bucket-2', CreationDate: new Date() }
        ]),
        getBucketPolicy: vi.fn().mockRejectedValue(new Error('NoSuchBucketPolicy')),
        getBucketEncryption: vi.fn().mockRejectedValue(new Error('ServerSideEncryptionConfigurationNotFoundError')),
        getPublicAccessBlock: vi.fn().mockResolvedValue({
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: false,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: false
          }
        })
      };

      mockServiceClients.getS3Client.mockReturnValue(mockS3Client);

      const findings = await service.scanS3Buckets();

      expect(findings).toHaveLength(2);
      expect(findings[0]).toMatchObject({
        findingType: 'ACCESS_CONTROL', // Public access issues take precedence
        severity: 'HIGH',
        bucketName: 'test-bucket-1'
      });
      expect(findings[0].encryptionIssues).toContain('Bucket encryption not configured');
      expect(findings[0].publicAccessIssues).toContain('Public access block not fully configured');
    });

    it('should detect public bucket policies', async () => {
      const mockS3Client = {
        listBuckets: vi.fn().mockResolvedValue([
          { Name: 'public-bucket', CreationDate: new Date() }
        ]),
        getBucketPolicy: vi.fn().mockResolvedValue({
          Policy: JSON.stringify({
            Statement: [{
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::public-bucket/*'
            }]
          })
        }),
        getBucketEncryption: vi.fn().mockResolvedValue({
          ServerSideEncryptionConfiguration: {
            Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
          }
        }),
        getPublicAccessBlock: vi.fn().mockResolvedValue({
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true
          }
        })
      };

      mockServiceClients.getS3Client.mockReturnValue(mockS3Client);

      const findings = await service.scanS3Buckets();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        findingType: 'ACCESS_CONTROL',
        severity: 'HIGH',
        bucketName: 'public-bucket'
      });
      expect(findings[0].publicAccessIssues).toContain('Bucket policy allows public access');
    });

    it('should handle S3 client errors gracefully', async () => {
      const mockS3Client = {
        listBuckets: vi.fn().mockRejectedValue(new Error('Access denied'))
      };

      mockServiceClients.getS3Client.mockReturnValue(mockS3Client);

      await expect(service.scanS3Buckets()).rejects.toThrow('Failed to scan S3 buckets: Access denied');
    });
  });

  describe('analyzeIAMPolicies', () => {
    it('should analyze IAM roles and detect overprivileged access', async () => {
      const mockIAMClient = {
        listRoles: vi.fn().mockResolvedValue([
          {
            RoleName: 'AdminRole',
            Arn: 'arn:aws:iam::123456789012:role/AdminRole'
          }
        ]),
        listAttachedRolePolicies: vi.fn().mockResolvedValue({
          AttachedPolicies: [{
            PolicyName: 'AdministratorAccess',
            PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess'
          }]
        }),
        getPolicy: vi.fn().mockResolvedValue({
          Policy: {
            PolicyName: 'AdministratorAccess',
            DefaultVersionId: 'v1'
          }
        }),
        getPolicyVersion: vi.fn().mockResolvedValue({
          PolicyVersion: {
            Document: encodeURIComponent(JSON.stringify({
              Version: '2012-10-17',
              Statement: [{
                Effect: 'Allow',
                Action: '*',
                Resource: '*'
              }]
            }))
          }
        }),
        listRolePolicies: vi.fn().mockResolvedValue({
          PolicyNames: []
        })
      };

      mockServiceClients.getIAMClient.mockReturnValue(mockIAMClient);

      const findings = await service.analyzeIAMPolicies();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        findingType: 'ACCESS_CONTROL',
        severity: 'CRITICAL',
        roleName: 'AdminRole'
      });
      expect(findings[0].overprivilegedActions).toContain('*');
      expect(findings[0].riskyPermissions).toContain('Full administrative access (*)');
    });

    it('should detect service-specific wildcard permissions', async () => {
      const mockIAMClient = {
        listRoles: vi.fn().mockResolvedValue([
          {
            RoleName: 'S3Role',
            Arn: 'arn:aws:iam::123456789012:role/S3Role'
          }
        ]),
        listAttachedRolePolicies: vi.fn().mockResolvedValue({
          AttachedPolicies: [{
            PolicyName: 'S3FullAccess',
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess'
          }]
        }),
        getPolicy: vi.fn().mockResolvedValue({
          Policy: {
            PolicyName: 'S3FullAccess',
            DefaultVersionId: 'v1'
          }
        }),
        getPolicyVersion: vi.fn().mockResolvedValue({
          PolicyVersion: {
            Document: encodeURIComponent(JSON.stringify({
              Version: '2012-10-17',
              Statement: [{
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }]
            }))
          }
        }),
        listRolePolicies: vi.fn().mockResolvedValue({
          PolicyNames: []
        })
      };

      mockServiceClients.getIAMClient.mockReturnValue(mockIAMClient);

      const findings = await service.analyzeIAMPolicies();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        findingType: 'ACCESS_CONTROL',
        severity: 'HIGH',
        roleName: 'S3Role'
      });
      expect(findings[0].overprivilegedActions).toContain('s3:*');
      expect(findings[0].riskyPermissions).toContain('Full s3 access');
    });
  });

  describe('processCloudTrailLogs', () => {
    it('should process CloudTrail logs and detect suspicious events', async () => {
      const mockCloudTrailClient = {
        lookupEvents: vi.fn().mockResolvedValue({
          Events: [
            {
              EventId: 'event-1',
              EventName: 'AssumeRole',
              EventTime: new Date(),
              SourceIPAddress: '203.0.113.1', // External IP
              UserIdentity: {
                type: 'IAMUser',
                principalId: 'AIDACKCEVSQ6C2EXAMPLE'
              },
              Resources: [{
                ResourceName: 'arn:aws:iam::123456789012:role/AdminRole'
              }]
            },
            {
              EventId: 'event-2',
              EventName: 'CreateAccessKey',
              EventTime: new Date(),
              SourceIPAddress: '198.51.100.1',
              UserIdentity: {
                type: 'Root'
              },
              ErrorCode: 'AccessDenied'
            }
          ]
        })
      };

      mockServiceClients.getCloudTrailClient.mockReturnValue(mockCloudTrailClient);

      const findings = await service.processCloudTrailLogs();

      expect(findings).toHaveLength(2);
      expect(findings[0]).toMatchObject({
        findingType: 'ACCESS_CONTROL',
        eventName: 'AssumeRole',
        unauthorizedAccess: true
      });
      expect(findings[1]).toMatchObject({
        findingType: 'ACCESS_CONTROL',
        eventName: 'CreateAccessKey',
        unauthorizedAccess: true
      });
    });

    it('should filter out non-suspicious events', async () => {
      const mockCloudTrailClient = {
        lookupEvents: vi.fn().mockResolvedValue({
          Events: [
            {
              EventId: 'event-1',
              EventName: 'ListBuckets', // Not in suspicious events list
              EventTime: new Date(),
              SourceIPAddress: '10.0.0.1', // Private IP
              UserIdentity: {
                type: 'IAMUser'
              }
            }
          ]
        })
      };

      mockServiceClients.getCloudTrailClient.mockReturnValue(mockCloudTrailClient);

      const findings = await service.processCloudTrailLogs();

      expect(findings).toHaveLength(0);
    });
  });

  describe('getMacieFindings', () => {
    it('should process Macie findings and detect PII exposure', async () => {
      const mockMacieClient = {
        getFindings: vi.fn().mockResolvedValue({
          findings: [
            {
              id: 'macie-finding-1',
              createdAt: new Date().toISOString(),
              resourcesAffected: {
                s3Bucket: {
                  arn: 'arn:aws:s3:::test-bucket',
                  name: 'test-bucket'
                },
                s3Object: {
                  key: 'customer-data.csv'
                }
              },
              classificationDetails: {
                result: {
                  sensitiveData: [{
                    category: 'PII',
                    detections: [
                      {
                        type: 'EMAIL_ADDRESS',
                        confidence: 95,
                        count: 150
                      },
                      {
                        type: 'CREDIT_CARD_NUMBER',
                        confidence: 98,
                        count: 45
                      }
                    ]
                  }]
                }
              }
            }
          ]
        })
      };

      mockServiceClients.getMacieClient.mockReturnValue(mockMacieClient);

      const findings = await service.getMacieFindings();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        findingType: 'PII_EXPOSURE',
        severity: 'CRITICAL', // Credit card numbers are critical
        confidence: 98
      });
      expect(findings[0].piiTypes).toContain('EMAIL_ADDRESS');
      expect(findings[0].piiTypes).toContain('CREDIT_CARD_NUMBER');
      expect(findings[0].location).toBe('s3://test-bucket/customer-data.csv');
    });

    it('should filter out findings without PII detections', async () => {
      const mockMacieClient = {
        getFindings: vi.fn().mockResolvedValue({
          findings: [
            {
              id: 'macie-finding-1',
              createdAt: new Date().toISOString(),
              classificationDetails: {
                result: {
                  // No sensitive data
                }
              }
            }
          ]
        })
      };

      mockServiceClients.getMacieClient.mockReturnValue(mockMacieClient);

      const findings = await service.getMacieFindings();

      expect(findings).toHaveLength(0);
    });
  });

  describe('getSecurityHubFindings', () => {
    it('should process Security Hub findings for privacy-related issues', async () => {
      const mockSecurityHubClient = {
        getFindings: vi.fn().mockResolvedValue({
          Findings: [
            {
              Id: 'finding-1',
              Title: 'S3 bucket should not allow public access',
              Description: 'Data Protection issue detected',
              Types: ['Data Protection/Encryption'],
              CreatedAt: new Date().toISOString(),
              Severity: {
                Label: 'HIGH'
              },
              Compliance: {
                Status: 'FAILED'
              },
              Resources: [{
                Id: 'arn:aws:s3:::test-bucket'
              }],
              ProductArn: 'arn:aws:securityhub:us-east-1::product/aws/config',
              GeneratorId: 'config-rule-test'
            }
          ]
        })
      };

      mockServiceClients.getSecurityHubClient.mockReturnValue(mockSecurityHubClient);

      const findings = await service.getSecurityHubFindings();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        findingType: 'ENCRYPTION', // Based on the Types field containing 'Encryption'
        severity: 'HIGH',
        complianceType: 'FAILED'
      });
      expect(findings[0].description).toContain('S3 bucket should not allow public access');
    });

    it('should filter out non-privacy-related findings', async () => {
      const mockSecurityHubClient = {
        getFindings: vi.fn().mockResolvedValue({
          Findings: [
            {
              Id: 'finding-1',
              Title: 'Network security group issue', // Not privacy-related
              Description: 'Network configuration problem',
              Types: ['Network/Security'],
              CreatedAt: new Date().toISOString(),
              Severity: {
                Label: 'MEDIUM'
              }
            }
          ]
        })
      };

      mockServiceClients.getSecurityHubClient.mockReturnValue(mockSecurityHubClient);

      const findings = await service.getSecurityHubFindings();

      expect(findings).toHaveLength(0);
    });
  });

  describe('collectAllFindings', () => {
    it('should collect and normalize findings from all sources', async () => {
      // Mock all clients to return sample findings
      const mockS3Client = {
        listBuckets: vi.fn().mockResolvedValue([]),
      };
      const mockIAMClient = {
        listRoles: vi.fn().mockResolvedValue([]),
      };
      const mockCloudTrailClient = {
        lookupEvents: vi.fn().mockResolvedValue({ Events: [] }),
      };
      const mockMacieClient = {
        getFindings: vi.fn().mockResolvedValue({ findings: [] }),
      };
      const mockSecurityHubClient = {
        getFindings: vi.fn().mockResolvedValue({ Findings: [] }),
      };

      mockServiceClients.getS3Client.mockReturnValue(mockS3Client);
      mockServiceClients.getIAMClient.mockReturnValue(mockIAMClient);
      mockServiceClients.getCloudTrailClient.mockReturnValue(mockCloudTrailClient);
      mockServiceClients.getMacieClient.mockReturnValue(mockMacieClient);
      mockServiceClients.getSecurityHubClient.mockReturnValue(mockSecurityHubClient);

      const findings = await service.collectAllFindings();

      expect(Array.isArray(findings)).toBe(true);
      expect(mockS3Client.listBuckets).toHaveBeenCalled();
      expect(mockIAMClient.listRoles).toHaveBeenCalled();
      expect(mockCloudTrailClient.lookupEvents).toHaveBeenCalled();
      expect(mockMacieClient.getFindings).toHaveBeenCalled();
      expect(mockSecurityHubClient.getFindings).toHaveBeenCalled();
    });
  });

  describe('monitoring functionality', () => {
    it('should start and stop continuous monitoring', async () => {
      // Mock all scanning methods
      vi.spyOn(service, 'scanS3Buckets').mockResolvedValue([]);
      vi.spyOn(service, 'analyzeIAMPolicies').mockResolvedValue([]);
      vi.spyOn(service, 'processCloudTrailLogs').mockResolvedValue([]);
      vi.spyOn(service, 'getMacieFindings').mockResolvedValue([]);
      vi.spyOn(service, 'getSecurityHubFindings').mockResolvedValue([]);

      await service.startContinuousMonitoring();
      
      let status = await service.getMonitoringStatus();
      expect(status.active).toBe(true);

      await service.stopContinuousMonitoring();
      
      status = await service.getMonitoringStatus();
      expect(status.active).toBe(false);
    });

    it('should return monitoring status with correct information', async () => {
      const status = await service.getMonitoringStatus();
      
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('lastScan');
      expect(status).toHaveProperty('nextScan');
      expect(status).toHaveProperty('resourcesMonitored');
      expect(typeof status.active).toBe('boolean');
      expect(status.lastScan).toBeInstanceOf(Date);
      expect(status.nextScan).toBeInstanceOf(Date);
      expect(typeof status.resourcesMonitored).toBe('number');
    });
  });
});