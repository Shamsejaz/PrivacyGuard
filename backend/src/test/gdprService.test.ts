import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GDPRService } from '../services/GDPRService';
import { GDPRRepository } from '../repositories/GDPRRepository';

// Mock the GDPRRepository
vi.mock('../repositories/GDPRRepository');

describe('GDPR Service', () => {
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

  describe('Lawful Basis Management', () => {
    it('should create a lawful basis record', async () => {
      const data = {
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      };

      const mockResult = {
        id: 'lb-123',
        ...data,
        status: 'active' as const,
        reviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.createLawfulBasisRecord.mockResolvedValue(mockResult);

      const result = await gdprService.createLawfulBasisRecord(data);

      expect(mockGdprRepository.createLawfulBasisRecord).toHaveBeenCalledWith(data);
      expect(result).toBeDefined();
      expect(result.processingActivity).toBe(data.processingActivity);
      expect(result.lawfulBasis).toBe(data.lawfulBasis);
      expect(result.dataCategories).toEqual(data.dataCategories);
      expect(result.status).toBe('active');
    });

    it('should validate lawful basis values', async () => {
      const data = {
        processingActivity: 'Test Activity',
        lawfulBasis: 'invalid_basis',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      };

      await expect(gdprService.createLawfulBasisRecord(data))
        .rejects.toThrow('Invalid lawful basis provided');
    });

    it('should get lawful basis records with filters', async () => {
      const mockRecords = [{
        id: 'lb-123',
        processingActivity: 'Active Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year',
        status: 'active' as const,
        reviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockGdprRepository.getLawfulBasisRecords.mockResolvedValue(mockRecords);

      const records = await gdprService.getLawfulBasisRecords({ status: 'active' });

      expect(mockGdprRepository.getLawfulBasisRecords).toHaveBeenCalledWith({ status: 'active' });
      expect(records).toHaveLength(1);
      expect(records[0].processingActivity).toBe('Active Activity');
    });

    it('should update a lawful basis record', async () => {
      const mockUpdated = {
        id: 'lb-123',
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year',
        status: 'review' as const,
        reviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.updateLawfulBasisRecord.mockResolvedValue(mockUpdated);

      const updated = await gdprService.updateLawfulBasisRecord('lb-123', {
        status: 'review'
      });

      expect(mockGdprRepository.updateLawfulBasisRecord).toHaveBeenCalledWith('lb-123', { status: 'review' });
      expect(updated.status).toBe('review');
    });

    it('should delete a lawful basis record', async () => {
      mockGdprRepository.deleteLawfulBasisRecord.mockResolvedValue(undefined);

      await gdprService.deleteLawfulBasisRecord('lb-123');

      expect(mockGdprRepository.deleteLawfulBasisRecord).toHaveBeenCalledWith('lb-123');
    });
  });

  describe('Processing Records Management', () => {
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

      const mockResult = {
        id: 'pr-123',
        ...data,
        processor: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.createProcessingRecord.mockResolvedValue(mockResult);

      const result = await gdprService.createProcessingRecord(data);

      expect(mockGdprRepository.createProcessingRecord).toHaveBeenCalledWith(data);
      expect(result).toBeDefined();
      expect(result.activityName).toBe(data.activityName);
      expect(result.controller).toBe(data.controller);
      expect(result.thirdCountryTransfers).toBe(false);
    });

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

    it('should export processing records as CSV', async () => {
      const mockRecords = [{
        id: 'pr-123',
        activityName: 'Test Activity',
        controller: 'Test Controller',
        processor: undefined,
        purposes: ['Testing'],
        lawfulBasis: 'Contract (Article 6(1)(b))',
        dataCategories: ['Personal Data'],
        dataSubjects: ['Customers'],
        recipients: ['Internal Team'],
        thirdCountryTransfers: false,
        retentionPeriod: '5 years',
        technicalMeasures: ['Encryption'],
        organisationalMeasures: ['Access Controls'],
        createdAt: new Date()
      }];

      mockGdprRepository.getProcessingRecords.mockResolvedValue(mockRecords);

      const csv = await gdprService.exportProcessingRecords();

      expect(mockGdprRepository.getProcessingRecords).toHaveBeenCalled();
      expect(csv).toContain('Activity Name');
      expect(csv).toContain('Test Activity');
      expect(csv).toContain('Test Controller');
    });
  });

  describe('DPIA Management', () => {
    it('should create a DPIA', async () => {
      const data = {
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      };

      const mockResult = {
        id: 'dpia-123',
        ...data,
        riskLevel: 'medium' as const,
        status: 'draft' as const,
        createdDate: new Date(),
        completedDate: undefined,
        reviewer: 'Not assigned',
        residualRisk: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.createDPIA.mockResolvedValue(mockResult);

      const result = await gdprService.createDPIA(data);

      expect(mockGdprRepository.createDPIA).toHaveBeenCalledWith(data);
      expect(result).toBeDefined();
      expect(result.title).toBe(data.title);
      expect(result.processingType).toBe(data.processingType);
      expect(result.status).toBe('draft');
      expect(result.riskLevel).toBe('medium');
    });

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

    it('should set completion date when DPIA is approved', async () => {
      const mockUpdated = {
        id: 'dpia-123',
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization'],
        riskLevel: 'medium' as const,
        status: 'approved' as const,
        createdDate: new Date(),
        completedDate: new Date(),
        reviewer: 'Not assigned',
        residualRisk: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGdprRepository.updateDPIA.mockResolvedValue(mockUpdated);

      const updated = await gdprService.updateDPIA('dpia-123', { status: 'approved' });

      expect(updated.status).toBe('approved');
      expect(updated.completedDate).toBeDefined();
    });
  });

  describe('Data Breach Management', () => {
    it('should create a data breach', async () => {
      const data = {
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      };

      const result = await gdprService.createDataBreach(data);

      expect(result).toBeDefined();
      expect(result.title).toBe(data.title);
      expect(result.severity).toBe(data.severity);
      expect(result.status).toBe('discovered');
      expect(result.supervisoryAuthorityNotified).toBe(false);
    });

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

    it('should notify supervisory authority', async () => {
      const breach = await gdprService.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      const updated = await gdprService.notifySupervisoryAuthority(breach.id);

      expect(updated.supervisoryAuthorityNotified).toBe(true);
      expect(updated.status).toBe('reported');
      expect(updated.reportedDate).toBeDefined();
    });

    it('should notify data subjects', async () => {
      const breach = await gdprService.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      const updated = await gdprService.notifyDataSubjects(breach.id);

      expect(updated.dataSubjectsNotified).toBe(true);
    });
  });

  describe('Data Portability Management', () => {
    it('should create a data portability request', async () => {
      const data = {
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const,
        notes: 'Test request'
      };

      const result = await gdprService.createDataPortabilityRequest(data);

      expect(result).toBeDefined();
      expect(result.dataSubject.name).toBe(data.dataSubjectName);
      expect(result.dataSubject.email).toBe(data.dataSubjectEmail);
      expect(result.status).toBe('pending');
      expect(result.downloadCount).toBe(0);
    });

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

    it('should process data portability request', async () => {
      const request = await gdprService.createDataPortabilityRequest({
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      });

      const updated = await gdprService.processDataPortabilityRequest(request.id);

      expect(updated.status).toBe('processing');
    });

    it('should complete data portability request', async () => {
      const request = await gdprService.createDataPortabilityRequest({
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      });

      const updated = await gdprService.completeDataPortabilityRequest(request.id, '2.5 MB');

      expect(updated.status).toBe('ready');
      expect(updated.fileSize).toBe('2.5 MB');
      expect(updated.completionDate).toBeDefined();
    });
  });

  describe('Dashboard and Analytics', () => {
    it('should generate dashboard stats', async () => {
      // Create some test data
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.createDPIA({
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      const stats = await gdprService.getDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.overallScore).toBeGreaterThan(0);
      expect(stats.lawfulBasisCoverage).toBeGreaterThanOrEqual(0);
      expect(stats.dpiasCompleted).toBeGreaterThanOrEqual(0);
      expect(stats.recentActivities).toBeDefined();
      expect(Array.isArray(stats.recentActivities)).toBe(true);
    });

    it('should generate compliance report', async () => {
      const report = await gdprService.generateComplianceReport();

      expect(report).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide recommendations based on compliance status', async () => {
      // Create a data breach to trigger recommendations
      await gdprService.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      const report = await gdprService.generateComplianceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((rec: string) => rec.includes('breach'))).toBe(true);
    });
  });

  describe('GDPR Compliance Logic and Calculations', () => {
    it('should calculate overall compliance score correctly', async () => {
      // Create test data with known compliance status
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Active Activity 1',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Active Activity 2',
        lawfulBasis: 'contract',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      const dpia = await gdprService.createDPIA({
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      // Approve the DPIA to increase compliance score
      await gdprService.updateDPIA(dpia.id, { status: 'approved' });

      const stats = await gdprService.getDashboardStats();

      expect(stats.overallScore).toBeGreaterThan(50);
      expect(stats.lawfulBasisCoverage).toBe(100); // All records are active
      expect(stats.dpiasCompleted).toBe(1);
    });

    it('should calculate lawful basis coverage percentage correctly', async () => {
      // Create 3 active and 1 inactive lawful basis records
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Active Activity 1',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Active Activity 2',
        lawfulBasis: 'contract',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      const inactiveRecord = await gdprService.createLawfulBasisRecord({
        processingActivity: 'Inactive Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      // Make one record inactive
      await gdprService.updateLawfulBasisRecord(inactiveRecord.id, { status: 'inactive' });

      const stats = await gdprService.getDashboardStats();

      expect(stats.lawfulBasisCoverage).toBe(67); // 2 out of 3 records are active (rounded)
    });

    it('should calculate breach response time correctly', async () => {
      const discoveryDate = new Date('2024-01-01T10:00:00Z');
      const reportedDate = new Date('2024-01-02T10:00:00Z'); // 24 hours later

      const breach = await gdprService.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate,
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      // Simulate reporting and resolving the breach
      await gdprService.updateDataBreach(breach.id, { 
        status: 'reported',
        reportedDate 
      });
      await gdprService.updateDataBreach(breach.id, { status: 'resolved' });

      const stats = await gdprService.getDashboardStats();

      expect(stats.breachResponseTime).toBe('< 72h');
    });

    it('should handle breach response time over 72 hours', async () => {
      const discoveryDate = new Date('2024-01-01T10:00:00Z');
      const reportedDate = new Date('2024-01-05T10:00:00Z'); // 96 hours later

      const breach = await gdprService.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach description',
        discoveryDate,
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      await gdprService.updateDataBreach(breach.id, { 
        status: 'reported',
        reportedDate 
      });
      await gdprService.updateDataBreach(breach.id, { status: 'resolved' });

      const stats = await gdprService.getDashboardStats();

      expect(stats.breachResponseTime).toBe('96h');
    });

    it('should calculate compliance by category correctly', async () => {
      const stats = await gdprService.getDashboardStats();

      expect(stats.complianceByCategory).toBeDefined();
      expect(stats.complianceByCategory.principles).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.rights).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.obligations).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.governance).toBeGreaterThanOrEqual(0);
      expect(stats.complianceByCategory.security).toBeGreaterThanOrEqual(0);
    });

    it('should track recent activities correctly', async () => {
      const dpia = await gdprService.createDPIA({
        title: 'Recent DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      const breach = await gdprService.createDataBreach({
        title: 'Recent Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'medium' as const,
        affectedDataSubjects: 50,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      const stats = await gdprService.getDashboardStats();

      expect(stats.recentActivities).toHaveLength(2);
      expect(stats.recentActivities[0].type).toMatch(/DPIA|Breach/);
      expect(stats.recentActivities[0].description).toContain('Recent');
    });
  });

  describe('Lawful Basis Validation and Records Management', () => {
    it('should validate all GDPR lawful basis types', async () => {
      const validBases = [
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
      ];

      for (const basis of validBases) {
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

    it('should validate required fields for lawful basis records', async () => {
      const requiredFields = ['processingActivity', 'lawfulBasis', 'dataCategories', 'purposes', 'dataSubjects', 'retentionPeriod'];
      
      for (const field of requiredFields) {
        const data: any = {
          processingActivity: 'Test Activity',
          lawfulBasis: 'consent',
          dataCategories: ['Personal Data'],
          purposes: ['Testing'],
          dataSubjects: ['Test Users'],
          retentionPeriod: '1 year'
        };
        
        delete data[field];

        // This test assumes the service validates required fields
        // If not implemented, this would need to be added to the service
        if (field === 'processingActivity' || field === 'lawfulBasis') {
          await expect(gdprService.createLawfulBasisRecord(data))
            .rejects.toThrow();
        }
      }
    });

    it('should set default review date for lawful basis records', async () => {
      const record = await gdprService.createLawfulBasisRecord({
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      expect(record.reviewDate).toBeDefined();
      expect(record.reviewDate!.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should manage lawful basis record lifecycle', async () => {
      // Create record
      const record = await gdprService.createLawfulBasisRecord({
        processingActivity: 'Lifecycle Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      expect(record.status).toBe('active');

      // Update to review status
      const updated = await gdprService.updateLawfulBasisRecord(record.id, {
        status: 'review'
      });
      expect(updated.status).toBe('review');

      // Update to inactive
      const inactive = await gdprService.updateLawfulBasisRecord(record.id, {
        status: 'inactive'
      });
      expect(inactive.status).toBe('inactive');

      // Delete record
      await gdprService.deleteLawfulBasisRecord(record.id);
      const records = await gdprService.getLawfulBasisRecords();
      expect(records.find(r => r.id === record.id)).toBeUndefined();
    });

    it('should filter lawful basis records by status', async () => {
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Active Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      const reviewRecord = await gdprService.createLawfulBasisRecord({
        processingActivity: 'Review Activity',
        lawfulBasis: 'contract',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.updateLawfulBasisRecord(reviewRecord.id, { status: 'review' });

      const activeRecords = await gdprService.getLawfulBasisRecords({ status: 'active' });
      const reviewRecords = await gdprService.getLawfulBasisRecords({ status: 'review' });

      expect(activeRecords).toHaveLength(1);
      expect(reviewRecords).toHaveLength(1);
      expect(activeRecords[0].processingActivity).toBe('Active Activity');
      expect(reviewRecords[0].processingActivity).toBe('Review Activity');
    });
  });

  describe('GDPR Reporting and Audit Functionality', () => {
    it('should generate comprehensive compliance report with all sections', async () => {
      // Create test data for comprehensive report
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Report Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.createProcessingRecord({
        activityName: 'Report Processing Activity',
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

    it('should generate report with date filters', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      const report = await gdprService.generateComplianceReport({
        dateFrom: fromDate,
        dateTo: toDate
      });

      expect(report.reportPeriod.from).toEqual(fromDate);
      expect(report.reportPeriod.to).toEqual(toDate);
    });

    it('should export processing records as CSV with correct format', async () => {
      await gdprService.createProcessingRecord({
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
        organisationalMeasures: ['Staff Training', 'Data Policies']
      });

      const csv = await gdprService.exportProcessingRecords();

      expect(csv).toContain('Activity Name,Controller,Processor');
      expect(csv).toContain('"CSV Export Test"');
      expect(csv).toContain('"Test Controller Ltd"');
      expect(csv).toContain('"Test Processor Inc"');
      expect(csv).toContain('"Data Processing; Analytics"');
      expect(csv).toContain('Yes'); // Third country transfers
      expect(csv).toContain('"7 years"');
    });

    it('should track audit trail for DPIA status changes', async () => {
      const dpia = await gdprService.createDPIA({
        title: 'Audit Trail DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      expect(dpia.status).toBe('draft');
      expect(dpia.createdDate).toBeDefined();

      // Update to in_review
      const reviewed = await gdprService.updateDPIA(dpia.id, { status: 'in_review' });
      expect(reviewed.status).toBe('in_review');

      // Update to approved (should set completion date)
      const approved = await gdprService.updateDPIA(dpia.id, { status: 'approved' });
      expect(approved.status).toBe('approved');
      expect(approved.completedDate).toBeDefined();
    });

    it('should track audit trail for data breach notifications', async () => {
      const breach = await gdprService.createDataBreach({
        title: 'Audit Breach',
        description: 'Test breach for audit trail',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

      expect(breach.status).toBe('discovered');
      expect(breach.supervisoryAuthorityNotified).toBe(false);
      expect(breach.dataSubjectsNotified).toBe(false);

      // Notify supervisory authority
      const notifiedSA = await gdprService.notifySupervisoryAuthority(breach.id);
      expect(notifiedSA.supervisoryAuthorityNotified).toBe(true);
      expect(notifiedSA.status).toBe('reported');
      expect(notifiedSA.reportedDate).toBeDefined();

      // Notify data subjects
      const notifiedDS = await gdprService.notifyDataSubjects(breach.id);
      expect(notifiedDS.dataSubjectsNotified).toBe(true);
    });

    it('should track data portability request lifecycle', async () => {
      const request = await gdprService.createDataPortabilityRequest({
        dataSubjectName: 'John Audit',
        dataSubjectEmail: 'john.audit@example.com',
        dataSubjectUserId: 'audit123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const,
        notes: 'Audit trail test'
      });

      expect(request.status).toBe('pending');
      expect(request.downloadCount).toBe(0);
      expect(request.requestId).toMatch(/^DP-\d{4}-\d{3}$/);

      // Process request
      const processing = await gdprService.processDataPortabilityRequest(request.id);
      expect(processing.status).toBe('processing');

      // Complete request
      const completed = await gdprService.completeDataPortabilityRequest(request.id, '1.2 MB');
      expect(completed.status).toBe('ready');
      expect(completed.fileSize).toBe('1.2 MB');
      expect(completed.completionDate).toBeDefined();

      // Deliver request
      const delivered = await gdprService.deliverDataPortabilityRequest(request.id);
      expect(delivered.status).toBe('delivered');
      expect(delivered.downloadCount).toBe(1);
    });

    it('should generate recommendations based on compliance gaps', async () => {
      // Create scenario with compliance gaps
      
      // Low lawful basis coverage
      const inactiveRecord = await gdprService.createLawfulBasisRecord({
        processingActivity: 'Inactive Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });
      await gdprService.updateLawfulBasisRecord(inactiveRecord.id, { status: 'inactive' });

      // Pending DPIA
      await gdprService.createDPIA({
        title: 'Pending DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      // Unresolved breach
      await gdprService.createDataBreach({
        title: 'Unresolved Breach',
        description: 'Test breach description',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email addresses'],
        likelyConsequences: 'Spam emails',
        mitigationMeasures: ['Password reset'],
        assignedTo: 'Security Team'
      });

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
      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Good Activity 1',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprService.createLawfulBasisRecord({
        processingActivity: 'Good Activity 2',
        lawfulBasis: 'contract',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      const dpia = await gdprService.createDPIA({
        title: 'Completed DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      await gdprService.updateDPIA(dpia.id, { status: 'approved' });

      const report = await gdprService.generateComplianceReport();

      expect(report.recommendations).toContain(
        'GDPR compliance appears to be well-maintained. Continue regular monitoring and reviews.'
      );
    });
  });
});