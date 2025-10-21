import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { GDPRRepository } from '../repositories/GDPRRepository';
import { getTestDatabase, cleanupTestDatabase } from './setup';

describe('GDPR Repository', () => {
  let pool: Pool;
  let gdprRepository: GDPRRepository;

  beforeAll(async () => {
    pool = await getTestDatabase();
    gdprRepository = new GDPRRepository(pool);
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await pool.query('DELETE FROM lawful_basis_records');
    await pool.query('DELETE FROM processing_records');
    await pool.query('DELETE FROM dpias');
    await pool.query('DELETE FROM data_breaches');
    await pool.query('DELETE FROM data_portability_requests');
  });

  describe('Lawful Basis Records', () => {
    it('should create a lawful basis record', async () => {
      const data = {
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      };

      const result = await gdprRepository.createLawfulBasisRecord(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.processingActivity).toBe(data.processingActivity);
      expect(result.lawfulBasis).toBe(data.lawfulBasis);
      expect(result.dataCategories).toEqual(data.dataCategories);
      expect(result.status).toBe('active');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should get lawful basis records', async () => {
      // Create test records
      await gdprRepository.createLawfulBasisRecord({
        processingActivity: 'Activity 1',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprRepository.createLawfulBasisRecord({
        processingActivity: 'Activity 2',
        lawfulBasis: 'contract',
        dataCategories: ['Contact Data'],
        purposes: ['Service'],
        dataSubjects: ['Customers'],
        retentionPeriod: '2 years'
      });

      const records = await gdprRepository.getLawfulBasisRecords();

      expect(records).toHaveLength(2);
      expect(records[0].processingActivity).toBe('Activity 2'); // Should be ordered by created_at DESC
      expect(records[1].processingActivity).toBe('Activity 1');
    });

    it('should filter lawful basis records by status', async () => {
      const record = await gdprRepository.createLawfulBasisRecord({
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      // Update status to review
      await gdprRepository.updateLawfulBasisRecord(record.id, { status: 'review' });

      const activeRecords = await gdprRepository.getLawfulBasisRecords({ status: 'active' });
      const reviewRecords = await gdprRepository.getLawfulBasisRecords({ status: 'review' });

      expect(activeRecords).toHaveLength(0);
      expect(reviewRecords).toHaveLength(1);
      expect(reviewRecords[0].status).toBe('review');
    });

    it('should update a lawful basis record', async () => {
      const record = await gdprRepository.createLawfulBasisRecord({
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      const updated = await gdprRepository.updateLawfulBasisRecord(record.id, {
        processingActivity: 'Updated Activity',
        status: 'review'
      });

      expect(updated.processingActivity).toBe('Updated Activity');
      expect(updated.status).toBe('review');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(record.updatedAt.getTime());
    });

    it('should delete a lawful basis record', async () => {
      const record = await gdprRepository.createLawfulBasisRecord({
        processingActivity: 'Test Activity',
        lawfulBasis: 'consent',
        dataCategories: ['Personal Data'],
        purposes: ['Testing'],
        dataSubjects: ['Test Users'],
        retentionPeriod: '1 year'
      });

      await gdprRepository.deleteLawfulBasisRecord(record.id);

      const records = await gdprRepository.getLawfulBasisRecords();
      expect(records).toHaveLength(0);
    });

    it('should throw error when updating non-existent record', async () => {
      await expect(gdprRepository.updateLawfulBasisRecord('non-existent-id', { status: 'review' }))
        .rejects.toThrow('Lawful basis record not found');
    });

    it('should throw error when deleting non-existent record', async () => {
      await expect(gdprRepository.deleteLawfulBasisRecord('non-existent-id'))
        .rejects.toThrow('Lawful basis record not found');
    });
  });

  describe('Processing Records', () => {
    it('should create a processing record', async () => {
      const data = {
        activityName: 'Test Processing Activity',
        controller: 'Test Controller',
        processor: 'Test Processor',
        purposes: ['Testing', 'Development'],
        lawfulBasis: 'Contract (Article 6(1)(b))',
        dataCategories: ['Personal Data', 'Contact Data'],
        dataSubjects: ['Customers', 'Users'],
        recipients: ['Internal Team', 'External Partner'],
        thirdCountryTransfers: true,
        retentionPeriod: '5 years',
        technicalMeasures: ['Encryption', 'Access Controls'],
        organisationalMeasures: ['Staff Training', 'Policies']
      };

      const result = await gdprRepository.createProcessingRecord(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.activityName).toBe(data.activityName);
      expect(result.controller).toBe(data.controller);
      expect(result.processor).toBe(data.processor);
      expect(result.purposes).toEqual(data.purposes);
      expect(result.thirdCountryTransfers).toBe(true);
      expect(result.createdAt).toBeDefined();
    });

    it('should create processing record without processor', async () => {
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
        organisationalMeasures: ['Staff Training']
      };

      const result = await gdprRepository.createProcessingRecord(data);

      expect(result.processor).toBeNull();
      expect(result.thirdCountryTransfers).toBe(false);
    });

    it('should get processing records with pagination', async () => {
      // Create multiple records
      for (let i = 1; i <= 5; i++) {
        await gdprRepository.createProcessingRecord({
          activityName: `Activity ${i}`,
          controller: 'Test Controller',
          purposes: ['Testing'],
          lawfulBasis: 'Contract (Article 6(1)(b))',
          dataCategories: ['Personal Data'],
          dataSubjects: ['Customers'],
          recipients: ['Internal Team'],
          thirdCountryTransfers: false,
          retentionPeriod: '5 years',
          technicalMeasures: ['Encryption'],
          organisationalMeasures: ['Staff Training']
        });
      }

      const firstPage = await gdprRepository.getProcessingRecords({ limit: 3, offset: 0 });
      const secondPage = await gdprRepository.getProcessingRecords({ limit: 3, offset: 3 });

      expect(firstPage).toHaveLength(3);
      expect(secondPage).toHaveLength(2);
      expect(firstPage[0].activityName).toBe('Activity 5'); // Most recent first
    });
  });

  describe('DPIAs', () => {
    it('should create a DPIA', async () => {
      const data = {
        title: 'Test DPIA',
        description: 'Test DPIA Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data', 'Behavioral Data'],
        mitigationMeasures: ['Data Minimization', 'Regular Audits']
      };

      const result = await gdprRepository.createDPIA(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(data.title);
      expect(result.processingType).toBe(data.processingType);
      expect(result.status).toBe('draft');
      expect(result.riskLevel).toBe('medium');
      expect(result.reviewer).toBe('Not assigned');
      expect(result.dataCategories).toEqual(data.dataCategories);
      expect(result.mitigationMeasures).toEqual(data.mitigationMeasures);
    });

    it('should filter DPIAs by status', async () => {
      const dpia1 = await gdprRepository.createDPIA({
        title: 'Draft DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      const dpia2 = await gdprRepository.createDPIA({
        title: 'Review DPIA',
        description: 'Test Description',
        processingType: 'Profiling',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      // Update one to in_review status
      await gdprRepository.updateDPIA(dpia2.id, { status: 'in_review' });

      const draftDPIAs = await gdprRepository.getDPIAs({ status: 'draft' });
      const reviewDPIAs = await gdprRepository.getDPIAs({ status: 'in_review' });

      expect(draftDPIAs).toHaveLength(1);
      expect(reviewDPIAs).toHaveLength(1);
      expect(draftDPIAs[0].title).toBe('Draft DPIA');
      expect(reviewDPIAs[0].title).toBe('Review DPIA');
    });

    it('should update DPIA', async () => {
      const dpia = await gdprRepository.createDPIA({
        title: 'Test DPIA',
        description: 'Test Description',
        processingType: 'Automated Decision Making',
        dataCategories: ['Personal Data'],
        mitigationMeasures: ['Data Minimization']
      });

      const updated = await gdprRepository.updateDPIA(dpia.id, {
        status: 'approved',
        riskLevel: 'low',
        reviewer: 'John Doe (DPO)'
      });

      expect(updated.status).toBe('approved');
      expect(updated.riskLevel).toBe('low');
      expect(updated.reviewer).toBe('John Doe (DPO)');
    });
  });

  describe('Data Breaches', () => {
    it('should create a data breach', async () => {
      const discoveryDate = new Date('2024-02-15');
      const data = {
        title: 'Test Data Breach',
        description: 'Unauthorized access to customer database',
        discoveryDate,
        severity: 'high' as const,
        affectedDataSubjects: 1000,
        dataCategories: ['Email addresses', 'Names'],
        likelyConsequences: 'Potential spam emails',
        mitigationMeasures: ['Password reset', 'Security audit'],
        assignedTo: 'Security Team'
      };

      const result = await gdprRepository.createDataBreach(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(data.title);
      expect(result.discoveryDate).toEqual(discoveryDate);
      expect(result.severity).toBe(data.severity);
      expect(result.status).toBe('discovered');
      expect(result.supervisoryAuthorityNotified).toBe(false);
      expect(result.dataSubjectsNotified).toBe(false);
      expect(result.notificationDeadline).toBeDefined();
      
      // Check that notification deadline is 3 days after discovery
      const expectedDeadline = new Date(discoveryDate);
      expectedDeadline.setDate(expectedDeadline.getDate() + 3);
      expect(result.notificationDeadline.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should filter data breaches by status and assignee', async () => {
      await gdprRepository.createDataBreach({
        title: 'Breach 1',
        description: 'Test breach',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email'],
        likelyConsequences: 'Spam',
        mitigationMeasures: ['Reset'],
        assignedTo: 'Team A'
      });

      await gdprRepository.createDataBreach({
        title: 'Breach 2',
        description: 'Test breach',
        discoveryDate: new Date(),
        severity: 'medium' as const,
        affectedDataSubjects: 50,
        dataCategories: ['Names'],
        likelyConsequences: 'Privacy violation',
        mitigationMeasures: ['Notification'],
        assignedTo: 'Team B'
      });

      const teamABreaches = await gdprRepository.getDataBreaches({ assignedTo: 'Team A' });
      const discoveredBreaches = await gdprRepository.getDataBreaches({ status: 'discovered' });

      expect(teamABreaches).toHaveLength(1);
      expect(teamABreaches[0].title).toBe('Breach 1');
      expect(discoveredBreaches).toHaveLength(2);
    });

    it('should update data breach', async () => {
      const breach = await gdprRepository.createDataBreach({
        title: 'Test Breach',
        description: 'Test breach',
        discoveryDate: new Date(),
        severity: 'high' as const,
        affectedDataSubjects: 100,
        dataCategories: ['Email'],
        likelyConsequences: 'Spam',
        mitigationMeasures: ['Reset'],
        assignedTo: 'Security Team'
      });

      const updated = await gdprRepository.updateDataBreach(breach.id, {
        status: 'reported',
        supervisoryAuthorityNotified: true,
        reportedDate: new Date()
      });

      expect(updated.status).toBe('reported');
      expect(updated.supervisoryAuthorityNotified).toBe(true);
      expect(updated.reportedDate).toBeDefined();
    });
  });

  describe('Data Portability Requests', () => {
    it('should create a data portability request', async () => {
      const data = {
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data', 'Transaction History'],
        format: 'json' as const,
        deliveryMethod: 'email' as const,
        notes: 'Urgent request'
      };

      const result = await gdprRepository.createDataPortabilityRequest(data);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.requestId).toMatch(/^DP-\d{4}-\d{3}$/);
      expect(result.dataSubject.name).toBe(data.dataSubjectName);
      expect(result.dataSubject.email).toBe(data.dataSubjectEmail);
      expect(result.dataSubject.userId).toBe(data.dataSubjectUserId);
      expect(result.status).toBe('pending');
      expect(result.downloadCount).toBe(0);
      expect(result.expiryDate).toBeDefined();
      
      // Check that expiry date is 30 days from now
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(result.expiryDate.toDateString()).toBe(expectedExpiry.toDateString());
    });

    it('should filter data portability requests by status', async () => {
      const request1 = await gdprRepository.createDataPortabilityRequest({
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      });

      const request2 = await gdprRepository.createDataPortabilityRequest({
        dataSubjectName: 'Jane Smith',
        dataSubjectEmail: 'jane@example.com',
        dataSubjectUserId: 'user456',
        dataCategories: ['Profile Data'],
        format: 'csv' as const,
        deliveryMethod: 'download' as const
      });

      // Update one to processing status
      await gdprRepository.updateDataPortabilityRequest(request2.id, { status: 'processing' });

      const pendingRequests = await gdprRepository.getDataPortabilityRequests({ status: 'pending' });
      const processingRequests = await gdprRepository.getDataPortabilityRequests({ status: 'processing' });

      expect(pendingRequests).toHaveLength(1);
      expect(processingRequests).toHaveLength(1);
      expect(pendingRequests[0].dataSubject.name).toBe('John Doe');
      expect(processingRequests[0].dataSubject.name).toBe('Jane Smith');
    });

    it('should update data portability request', async () => {
      const request = await gdprRepository.createDataPortabilityRequest({
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      });

      const updated = await gdprRepository.updateDataPortabilityRequest(request.id, {
        status: 'ready',
        fileSize: '2.5 MB',
        completionDate: new Date()
      });

      expect(updated.status).toBe('ready');
      expect(updated.fileSize).toBe('2.5 MB');
      expect(updated.completionDate).toBeDefined();
    });

    it('should get data portability request by id', async () => {
      const request = await gdprRepository.createDataPortabilityRequest({
        dataSubjectName: 'John Doe',
        dataSubjectEmail: 'john@example.com',
        dataSubjectUserId: 'user123',
        dataCategories: ['Profile Data'],
        format: 'json' as const,
        deliveryMethod: 'email' as const
      });

      const found = await gdprRepository.getDataPortabilityRequestById(request.id);
      const notFound = await gdprRepository.getDataPortabilityRequestById('non-existent-id');

      expect(found).toBeDefined();
      expect(found?.id).toBe(request.id);
      expect(notFound).toBeNull();
    });
  });
});