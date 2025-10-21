import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GDPRService } from '../services/GDPRService';
import { GDPRRepository } from '../repositories/GDPRRepository';

// Mock the GDPRRepository
vi.mock('../repositories/GDPRRepository');

describe('GDPR Compliance Logic and Calculations', () => {
  let gdprService: GDPRService;
  let mockGdprRepository: any;

  beforeEach(() => {
    // Create mock repository with all required methods
    mockGdprRepository = {
      createLawfulBasisRecord: vi.fn(),
      getLawfulBasisRecords: vi.fn(),
      updateLawfulBasisRecord: vi.fn(),
      deleteLawfulBasisRecord: vi.fn(),
      createProcessingRecord: vi.fn(),
      getProcessingRecords: vi.fn(),
      createDPIA: vi.fn(),
      getDPIAs: vi.fn(),
      updateDPIA: vi.fn(),
      createDataBreach: vi.fn(),
      getDataBreaches: vi.fn(),
      updateDataBreach: vi.fn(),
      createDataPortabilityRequest: vi.fn(),
      getDataPortabilityRequests: vi.fn(),
      getDataPortabilityRequestById: vi.fn(),
      updateDataPortabilityRequest: vi.fn()
    };

    vi.mocked(GDPRRepository).mockImplementation(() => mockGdprRepository);
    gdprService = new GDPRService(mockGdprRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Lawful Basis Validation', () => {
    it('should validate all GDPR lawful basis types', async () => {
      const validBases = [
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
      ];

      for (const basis of validBases) {
        const mockResult = {
          id: `lb-${basis}`,
          processingActivity: `Activity for ${basis}`,
          lawfulBasis: basis,
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year',
          status: 'active' as const,
          reviewDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockGdprRepository.createLawfulBasisRecord.mockResolvedValueOnce(mockResult);

        const record = await gdprService.createLawfulBasisRecord({
          processingActivity: `Activity for ${basis}`,
          lawfulBasis: basis,
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        });

        expect(record.lawfulBasis).toBe(basis);
      }
    });

    it('should reject invalid lawful basis types', async () => {
      const invalidBases = ['invalid_basis', 'unknown', '', 'custom_basis'];

      for (const basis of invalidBases) {
        await expect(gdprService.createLawfulBasisRecord({
          processingActivity: 'Test Activity',
          lawfulBasis: basis,
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        })).rejects.toThrow('Invalid lawful basis provided');
      }
    });
  });

  describe('GDPR Compliance Calculations', () => {
    it('should calculate overall compliance score correctly', async () => {
      // Mock data for compliance calculation
      const mockLawfulBasisRecords = [
        { id: '1', status: 'active', processingActivity: 'Activity 1' },
        { id: '2', status: 'active', processingActivity: 'Activity 2' }
      ];
      
      const mockProcessingRecords = [
        { id: '1', activityName: 'Processing 1' }
      ];
      
      const mockDPIAs = [
        { id: '1', status: 'approved', title: 'DPIA 1' }
      ];
      
      const mockBreaches = [];
      const mockPortabilityRequests = [];

      // Setup mocks for getDashboardStats
      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockLawfulBasisRecords);
      mockGdprRepository.getProcessingRecords.mockResolvedValue(mockProcessingRecords);
      mockGdprRepository.getDPIAs.mockResolvedValue(mockDPIAs);
      mockGdprRepository.getDataBreaches.mockResolvedValue(mockBreaches);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue(mockPortabilityRequests);

      const stats = await gdprService.getDashboardStats();

      expect(stats.overallScore).toBeGreaterThan(50);
      expect(stats.lawfulBasisCoverage).toBe(100); // All records are active
      expect(stats.dpiasCompleted).toBe(1);
      expect(stats.recordsOfProcessing).toBe(1);
    });

    it('should calculate lawful basis coverage percentage correctly', async () => {
      // Mock 3 records: 2 active, 1 inactive
      const mockLawfulBasisRecords = [
        { id: '1', status: 'active', processingActivity: 'Activity 1' },
        { id: '2', status: 'active', processingActivity: 'Activity 2' },
        { id: '3', status: 'inactive', processingActivity: 'Activity 3' }
      ];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockLawfulBasisRecords);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue([]);
      mockGdprRepository.getDataBreaches.mockResolvedValue([]);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const stats = await gdprService.getDashboardStats();

      expect(stats.lawfulBasisCoverage).toBe(67); // 2 out of 3 records are active (rounded)
    });

    it('should calculate breach response time correctly', async () => {
      const discoveryDate = new Date('2024-01-01T10:00:00Z');
      const reportedDate = new Date('2024-01-02T10:00:00Z'); // 24 hours later

      const mockBreaches = [{
        id: '1',
        status: 'resolved',
        discoveryDate,
        reportedDate,
        title: 'Test Breach'
      }];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue([]);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue([]);
      mockGdprRepository.getDataBreaches.mockResolvedValue(mockBreaches);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const stats = await gdprService.getDashboardStats();

      expect(stats.breachResponseTime).toBe('< 72h');
    });

    it('should handle breach response time over 72 hours', async () => {
      const discoveryDate = new Date('2024-01-01T10:00:00Z');
      const reportedDate = new Date('2024-01-05T10:00:00Z'); // 96 hours later

      const mockBreaches = [{
        id: '1',
        status: 'resolved',
        discoveryDate,
        reportedDate,
        title: 'Test Breach'
      }];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue([]);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue([]);
      mockGdprRepository.getDataBreaches.mockResolvedValue(mockBreaches);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const stats = await gdprService.getDashboardStats();

      expect(stats.breachResponseTime).toBe('96h');
    });

    it('should calculate compliance by category correctly', async () => {
      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue([]);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue([]);
      mockGdprRepository.getDataBreaches.mockResolvedValue([]);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const stats = await gdprService.getDashboardStats();

      expect(stats.complianceByCategory).toBeDefined();
      expect(stats.complianceByCategory.principles).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.rights).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.obligations).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.governance).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.security).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GDPR Reporting and Audit Functionality', () => {
    it('should generate comprehensive compliance report', async () => {
      const mockLawfulBasisRecords = [
        { id: '1', status: 'active', processingActivity: 'Activity 1' }
      ];
      const mockProcessingRecords = [
        { id: '1', activityName: 'Processing 1' }
      ];
      const mockDPIAs = [
        { id: '1', status: 'approved', title: 'DPIA 1' }
      ];
      const mockBreaches = [];

      // Setup mocks for all repository calls
      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockLawfulBasisRecords);
      mockGdprRepository.getProcessingRecords.mockResolvedValue(mockProcessingRecords);
      mockGdprRepository.getDPIAs.mockResolvedValue(mockDPIAs);
      mockGdprRepository.getDataBreaches.mockResolvedValue(mockBreaches);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const report = await gdprService.generateComplianceReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.reportPeriod).toBeDefined();
      expect(report.reportPeriod.from).toBeDefined();
      expect(report.reportPeriod.to).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.details.lawfulBasisRecords).toBe(1);
      expect(report.details.processingRecords).toBe(1);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should export processing records as CSV with correct format', async () => {
      const mockRecords = [{
        id: 'pr-123',
        activityName: 'CSV Export Test',
        controller: 'Test Controller Ltd',
        processor: 'Test Processor Inc',
        purposes: ['Data Processing', 'Analytics'],
        lawfulBasis: 'Legitimate Interests (Article 6(1)(f))',
        dataCategories: ['Contact Data', 'Usage Data'],
        dataSubjects: ['Customers', 'Employees'],
        recipients: ['Internal Team', 'Third Party'],
        thirdCountryTransfers: true,
        retentionPeriod: '7 years',
        technicalMeasures: ['Encryption', 'Access Controls'],
        organisationalMeasures: ['Staff Training', 'Data Policies'],
        createdAt: new Date()
      }];

      mockGdprRepository.getProcessingRecords.mockResolvedValue(mockRecords);

      const csv = await gdprService.exportProcessingRecords();

      expect(csv).toContain('Activity Name,Controller,Processor');
      expect(csv).toContain('"CSV Export Test"');
      expect(csv).toContain('"Test Controller Ltd"');
      expect(csv).toContain('"Test Processor Inc"');
      expect(csv).toContain('"Data Processing; Analytics"');
      expect(csv).toContain('Yes'); // Third country transfers
      expect(csv).toContain('"7 years"');
    });

    it('should generate recommendations based on compliance gaps', async () => {
      // Create scenario with compliance gaps
      const mockLawfulBasisRecords = [
        { id: '1', status: 'inactive', processingActivity: 'Inactive Activity' }
      ];
      const mockDPIAs = [
        { 
          id: '1', 
          status: 'draft', 
          title: 'Pending DPIA',
          updatedAt: new Date()
        }
      ];
      const mockBreaches = [
        { 
          id: '1', 
          status: 'discovered', 
          title: 'Unresolved Breach',
          updatedAt: new Date()
        }
      ];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockLawfulBasisRecords);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue(mockDPIAs);
      mockGdprRepository.getDataBreaches.mockResolvedValue(mockBreaches);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const report = await gdprService.generateComplianceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((rec: string) => 
        rec.includes('lawful basis') || rec.includes('Lawful basis')
      )).toBe(true);
      expect(report.recommendations.some((rec: string) => 
        rec.includes('DPIA') || rec.includes('DPIAs')
      )).toBe(true);
      expect(report.recommendations.some((rec: string) => 
        rec.includes('breach')
      )).toBe(true);
    });

    it('should provide positive recommendations when compliance is good', async () => {
      // Create good compliance scenario
      const mockLawfulBasisRecords = [
        { id: '1', status: 'active', processingActivity: 'Good Activity 1' },
        { id: '2', status: 'active', processingActivity: 'Good Activity 2' }
      ];
      const mockDPIAs = [
        { id: '1', status: 'approved', title: 'Completed DPIA' }
      ];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockLawfulBasisRecords);
      mockGdprRepository.getProcessingRecords.mockResolvedValue([]);
      mockGdprRepository.getDPIAs.mockResolvedValue(mockDPIAs);
      mockGdprRepository.getDataBreaches.mockResolvedValue([]);
      mockGdprRepository.getDataPortabilityRequests.mockResolvedValue([]);

      const report = await gdprService.generateComplianceReport();

      expect(report.recommendations).toContain(
        'GDPR compliance appears to be well-maintained. Continue regular monitoring and reviews.'
      );
    });
  });

  describe('Processing Records Management', () => {
    it('should validate required fields for processing record', async () => {
      const data = {
        activityName: '',
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

      await expect(gdprService.createProcessingRecord(data))
        .rejects.toThrow('Missing required fields for processing record');
    });
  });

  describe('DPIA Management', () => {
    it('should validate processing type for DPIA', async () => {
      const data = {
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Invalid Type',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      };

      await expect(gdprService.createDPIA(data))
        .rejects.toThrow('Invalid processing type for DPIA');
    });

    it('should assess DPIA risk and require consultation for high risk', async () => {
      const mockUpdated = {
        id: 'dpia-123',
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization'],
        riskLevel: 'high' as const,
        status: 'requires_consultation' as const,
        createdDate: new Date(),
        completedDate: undefined,
        reviewer: 'Not assigned',
        residualRisk: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.updateDPIA.mockResolvedValue(mockUpdated);

      const updated = await gdprService.assessDPIARisk('dpia-123', 'high');

      expect(mockGdprRepository.updateDPIA).toHaveBeenCalledWith('dpia-123', {
        riskLevel: 'high',
        status: 'requires_consultation'
      });
      expect(updated.riskLevel).toBe('high');
      expect(updated.status).toBe('requires_consultation');
    });
  });

  describe('Data Breach Management', () => {
    it('should validate affected data subjects count', async () => {
      const data = {
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: -1,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      };

      await expect(gdprService.createDataBreach(data))
        .rejects.toThrow('Affected data subjects count cannot be negative');
    });
  });

  describe('Data Portability Management', () => {
    it('should validate email format', async () => {
      const data = {
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'invalid-email',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      };

      await expect(gdprService.createDataPortabilityRequest(data))
        .rejects.toThrow('Invalid email address format');
    });
  });
});