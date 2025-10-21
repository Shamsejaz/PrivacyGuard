import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataImportExportService } from '../services/DataImportExportService';
import type { ImportJob, ExportJob, FieldMapping, ValidationRule } from '../services/DataImportExportService';

// Mock file system operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  },
  createReadStream: vi.fn()
}));

vi.mock('csv-parser', () => ({
  default: vi.fn()
}));

vi.mock('csv-writer', () => ({
  createObjectCsvWriter: vi.fn()
}));

describe('DataImportExportService', () => {
  let service: DataImportExportService;

  beforeEach(() => {
    service = new DataImportExportService();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Import Job Management', () => {
    it('should create an import job', async () => {
      const jobConfig = {
        name: 'Test Import Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const,
          hasHeader: true,
          delimiter: ','
        },
        targetTable: 'test_table',
        mapping: [
          {
            sourceField: 'name',
            targetField: 'full_name'
          }
        ] as FieldMapping[],
        validation: [
          {
            field: 'name',
            type: 'required' as const,
            config: {}
          }
        ] as ValidationRule[]
      };

      const jobId = await service.createImportJob(jobConfig);
      
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^import_/);
      
      const jobs = service.getImportJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('Test Import Job');
      expect(jobs[0].status).toBe('pending');
    });

    it('should get import job by ID', async () => {
      const jobConfig = {
        name: 'Test Import Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      const job = service.getImportJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.name).toBe('Test Import Job');
    });

    it('should return undefined for non-existent import job', () => {
      const job = service.getImportJob('non-existent-job');
      expect(job).toBeUndefined();
    });

    it('should cancel import job', async () => {
      const jobConfig = {
        name: 'Test Import Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      await service.cancelJob(jobId);
      
      const job = service.getImportJob(jobId);
      expect(job?.status).toBe('cancelled');
    });

    it('should delete import job', async () => {
      const jobConfig = {
        name: 'Test Import Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      expect(service.getImportJobs()).toHaveLength(1);
      
      await service.deleteJob(jobId);
      expect(service.getImportJobs()).toHaveLength(0);
    });
  });

  describe('Export Job Management', () => {
    it('should create an export job', async () => {
      const jobConfig = {
        name: 'Test Export Job',
        sourceTable: 'test_table',
        targetType: 'file' as const,
        targetConfig: {
          filePath: '/path/to/export.csv'
        },
        filters: [],
        format: 'csv' as const
      };

      const jobId = await service.createExportJob(jobConfig);
      
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^export_/);
      
      const jobs = service.getExportJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('Test Export Job');
      expect(jobs[0].status).toBe('pending');
    });

    it('should get export job by ID', async () => {
      const jobConfig = {
        name: 'Test Export Job',
        sourceTable: 'test_table',
        targetType: 'file' as const,
        targetConfig: {
          filePath: '/path/to/export.csv'
        },
        filters: [],
        format: 'csv' as const
      };

      const jobId = await service.createExportJob(jobConfig);
      const job = service.getExportJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.name).toBe('Test Export Job');
    });

    it('should cancel export job', async () => {
      const jobConfig = {
        name: 'Test Export Job',
        sourceTable: 'test_table',
        targetType: 'file' as const,
        targetConfig: {
          filePath: '/path/to/export.csv'
        },
        filters: [],
        format: 'csv' as const
      };

      const jobId = await service.createExportJob(jobConfig);
      await service.cancelJob(jobId);
      
      const job = service.getExportJob(jobId);
      expect(job?.status).toBe('cancelled');
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields', () => {
      const record = { name: 'John Doe', email: '' };
      const rules: ValidationRule[] = [
        {
          field: 'name',
          type: 'required',
          config: {}
        },
        {
          field: 'email',
          type: 'required',
          config: {}
        }
      ];

      const result = service['validateRecord'](record, rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].message).toContain('required');
    });

    it('should validate field types', () => {
      const record = { age: 'not-a-number', active: true };
      const rules: ValidationRule[] = [
        {
          field: 'age',
          type: 'type',
          config: { type: 'number' }
        },
        {
          field: 'active',
          type: 'type',
          config: { type: 'boolean' }
        }
      ];

      const result = service['validateRecord'](record, rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('age');
      expect(result.errors[0].message).toContain('type number');
    });

    it('should validate field formats', () => {
      const record = { email: 'invalid-email', phone: '123-456-7890' };
      const rules: ValidationRule[] = [
        {
          field: 'email',
          type: 'format',
          config: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        },
        {
          field: 'phone',
          type: 'format',
          config: { pattern: '^\\d{3}-\\d{3}-\\d{4}$' }
        }
      ];

      const result = service['validateRecord'](record, rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should validate numeric ranges', () => {
      const record = { age: 150, score: 85 };
      const rules: ValidationRule[] = [
        {
          field: 'age',
          type: 'range',
          config: { min: 0, max: 120 }
        },
        {
          field: 'score',
          type: 'range',
          config: { min: 0, max: 100 }
        }
      ];

      const result = service['validateRecord'](record, rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('age');
    });

    it('should pass validation for valid records', () => {
      const record = { 
        name: 'John Doe', 
        email: 'john@example.com',
        age: 30,
        active: true
      };
      const rules: ValidationRule[] = [
        {
          field: 'name',
          type: 'required',
          config: {}
        },
        {
          field: 'email',
          type: 'format',
          config: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        },
        {
          field: 'age',
          type: 'range',
          config: { min: 0, max: 120 }
        }
      ];

      const result = service['validateRecord'](record, rules);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Field Mapping', () => {
    it('should map fields correctly', () => {
      const record = { 
        first_name: 'John', 
        last_name: 'Doe',
        email_address: 'john@example.com'
      };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'first_name',
          targetField: 'firstName'
        },
        {
          sourceField: 'last_name',
          targetField: 'lastName'
        },
        {
          sourceField: 'email_address',
          targetField: 'email'
        }
      ];

      const result = service['mapRecord'](record, mappings);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    it('should apply default value transformation', () => {
      const record = { name: 'John', status: null };
      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'fullName'
        },
        {
          sourceField: 'status',
          targetField: 'status',
          transformation: {
            type: 'default',
            config: { defaultValue: 'active' }
          }
        }
      ];

      const result = service['mapRecord'](record, mappings);
      
      expect(result).toEqual({
        fullName: 'John',
        status: 'active'
      });
    });
  });

  describe('Data Quality Analysis', () => {
    it('should generate data quality report', async () => {
      const data = [
        { name: 'John Doe', age: 30, email: 'john@example.com' },
        { name: 'Jane Smith', age: 25, email: 'jane@example.com' },
        { name: '', age: 35, email: 'invalid-email' },
        { name: 'John Doe', age: 30, email: 'john@example.com' }, // Duplicate
        { name: 'Bob Johnson', age: null, email: 'bob@example.com' }
      ];

      const report = await service.generateDataQualityReport(data);
      
      expect(report.totalRecords).toBe(5);
      expect(report.duplicateRecords).toBe(1);
      expect(report.missingFields.name).toBe(1);
      expect(report.missingFields.age).toBe(1);
      expect(report.qualityScore).toBeLessThan(100);
      expect(report.recommendations).toContain('Duplicate records detected. Consider deduplication process.');
    });

    it('should calculate quality score correctly', async () => {
      const perfectData = [
        { name: 'John Doe', age: 30, email: 'john@example.com' },
        { name: 'Jane Smith', age: 25, email: 'jane@example.com' }
      ];

      const report = await service.generateDataQualityReport(perfectData);
      
      expect(report.totalRecords).toBe(2);
      expect(report.duplicateRecords).toBe(0);
      expect(Object.keys(report.missingFields)).toHaveLength(0);
      expect(report.qualityScore).toBe(100);
      expect(report.recommendations).toHaveLength(0);
    });
  });

  describe('Job Execution', () => {
    it('should handle job execution errors', async () => {
      const jobConfig = {
        name: 'Failing Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/non/existent/file.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      
      // Mock file system error
      vi.mocked(require('fs').createReadStream).mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(service.executeImportJob(jobId)).rejects.toThrow();
      
      const job = service.getImportJob(jobId);
      expect(job?.status).toBe('failed');
    });

    it('should prevent concurrent execution of same job', async () => {
      const jobConfig = {
        name: 'Concurrent Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      
      // Start first execution (will be mocked to be slow)
      const firstExecution = service.executeImportJob(jobId);
      
      // Try to start second execution immediately
      await expect(service.executeImportJob(jobId)).rejects.toThrow('Import job already running');
      
      // Wait for first execution to complete
      await expect(firstExecution).rejects.toThrow(); // Will fail due to mocked file system
    });
  });

  describe('Event Handling', () => {
    it('should emit job creation events', async () => {
      const importJobCreatedSpy = vi.fn();
      const exportJobCreatedSpy = vi.fn();
      
      service.on('import:job_created', importJobCreatedSpy);
      service.on('export:job_created', exportJobCreatedSpy);

      const importJobConfig = {
        name: 'Test Import Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const exportJobConfig = {
        name: 'Test Export Job',
        sourceTable: 'test_table',
        targetType: 'file' as const,
        targetConfig: {
          filePath: '/path/to/export.csv'
        },
        filters: [],
        format: 'csv' as const
      };

      await service.createImportJob(importJobConfig);
      await service.createExportJob(exportJobConfig);
      
      expect(importJobCreatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Import Job',
          status: 'pending'
        })
      );
      
      expect(exportJobCreatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Export Job',
          status: 'pending'
        })
      );
    });

    it('should emit job deletion events', async () => {
      const jobDeletedSpy = vi.fn();
      service.on('job:deleted', jobDeletedSpy);

      const jobConfig = {
        name: 'Test Job',
        sourceType: 'file' as const,
        sourceConfig: {
          filePath: '/path/to/test.csv',
          fileType: 'csv' as const
        },
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const jobId = await service.createImportJob(jobConfig);
      await service.deleteJob(jobId);
      
      expect(jobDeletedSpy).toHaveBeenCalledWith(jobId);
    });
  });
});