import { Pool } from 'pg';
import { 
  LawfulBasisRecord, 
  ProcessingRecord, 
  DPIA, 
  DataBreach, 
  DataPortabilityRequest, 
  ComplianceItem,
  CreateLawfulBasisRequest,
  CreateProcessingRecordRequest,
  CreateDPIARequest,
  CreateDataBreachRequest,
  CreateDataPortabilityRequest,
  GDPRFilters
} from '../models/GDPR';

export class GDPRRepository {
  constructor(private db: Pool) {}

  // Lawful Basis Records
  async createLawfulBasisRecord(data: CreateLawfulBasisRequest): Promise<LawfulBasisRecord> {
    const query = `
      INSERT INTO lawful_basis_records 
      (processing_activity, lawful_basis, data_categories, purposes, data_subjects, retention_period, status, review_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 6); // Review every 6 months
    
    const values = [
      data.processingActivity,
      data.lawfulBasis,
      JSON.stringify(data.dataCategories),
      JSON.stringify(data.purposes),
      JSON.stringify(data.dataSubjects),
      data.retentionPeriod,
      'active',
      reviewDate
    ];

    const result = await this.db.query(query, values);
    return this.mapLawfulBasisRecord(result.rows[0]);
  }

  async getLawfulBasisRecords(filters: GDPRFilters = {}): Promise<LawfulBasisRecord[]> {
    let query = 'SELECT * FROM lawful_basis_records WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapLawfulBasisRecord(row));
  }

  async updateLawfulBasisRecord(id: string, updates: Partial<LawfulBasisRecord>): Promise<LawfulBasisRecord> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        paramCount++;
        if (key === 'dataCategories' || key === 'purposes' || key === 'dataSubjects') {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    setClause.push(`updated_at = $${++paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE lawful_basis_records 
      SET ${setClause.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Lawful basis record not found');
    }
    return this.mapLawfulBasisRecord(result.rows[0]);
  }

  async deleteLawfulBasisRecord(id: string): Promise<void> {
    const query = 'DELETE FROM lawful_basis_records WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Lawful basis record not found');
    }
  }

  // Processing Records
  async createProcessingRecord(data: CreateProcessingRecordRequest): Promise<ProcessingRecord> {
    const query = `
      INSERT INTO processing_records 
      (activity_name, controller, processor, purposes, lawful_basis, data_categories, 
       data_subjects, recipients, third_country_transfers, retention_period, 
       technical_measures, organisational_measures)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      data.activityName,
      data.controller,
      data.processor || null,
      JSON.stringify(data.purposes),
      data.lawfulBasis,
      JSON.stringify(data.dataCategories),
      JSON.stringify(data.dataSubjects),
      JSON.stringify(data.recipients),
      data.thirdCountryTransfers,
      data.retentionPeriod,
      JSON.stringify(data.technicalMeasures),
      JSON.stringify(data.organisationalMeasures)
    ];

    const result = await this.db.query(query, values);
    return this.mapProcessingRecord(result.rows[0]);
  }

  async getProcessingRecords(filters: GDPRFilters = {}): Promise<ProcessingRecord[]> {
    let query = 'SELECT * FROM processing_records WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapProcessingRecord(row));
  }

  // DPIAs
  async createDPIA(data: CreateDPIARequest): Promise<DPIA> {
    const query = `
      INSERT INTO dpias 
      (title, description, processing_type, data_categories, mitigation_measures, 
       risk_level, status, reviewer, residual_risk)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.title,
      data.description,
      data.processingType,
      JSON.stringify(data.dataCategories),
      JSON.stringify(data.mitigationMeasures),
      'medium', // Default risk level
      'draft',
      'Not assigned',
      'medium'
    ];

    const result = await this.db.query(query, values);
    return this.mapDPIA(result.rows[0]);
  }

  async getDPIAs(filters: GDPRFilters = {}): Promise<DPIA[]> {
    let query = 'SELECT * FROM dpias WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapDPIA(row));
  }

  async updateDPIA(id: string, updates: Partial<DPIA>): Promise<DPIA> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        paramCount++;
        if (key === 'dataCategories' || key === 'mitigationMeasures') {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    setClause.push(`updated_at = $${++paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE dpias 
      SET ${setClause.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('DPIA not found');
    }
    return this.mapDPIA(result.rows[0]);
  }

  // Data Breaches
  async createDataBreach(data: CreateDataBreachRequest): Promise<DataBreach> {
    const notificationDeadline = new Date(data.discoveryDate);
    notificationDeadline.setDate(notificationDeadline.getDate() + 3); // 72 hours

    const query = `
      INSERT INTO data_breaches 
      (title, description, discovery_date, severity, affected_data_subjects, 
       data_categories, likely_consequences, mitigation_measures, assigned_to, 
       notification_deadline, status, supervisory_authority_notified, data_subjects_notified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      data.title,
      data.description,
      data.discoveryDate,
      data.severity,
      data.affectedDataSubjects,
      JSON.stringify(data.dataCategories),
      data.likelyConsequences,
      JSON.stringify(data.mitigationMeasures),
      data.assignedTo,
      notificationDeadline,
      'discovered',
      false,
      false
    ];

    const result = await this.db.query(query, values);
    return this.mapDataBreach(result.rows[0]);
  }

  async getDataBreaches(filters: GDPRFilters = {}): Promise<DataBreach[]> {
    let query = 'SELECT * FROM data_breaches WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    if (filters.assignedTo) {
      query += ` AND assigned_to = $${++paramCount}`;
      values.push(filters.assignedTo);
    }

    query += ' ORDER BY discovery_date DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapDataBreach(row));
  }

  async updateDataBreach(id: string, updates: Partial<DataBreach>): Promise<DataBreach> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        paramCount++;
        if (key === 'dataCategories' || key === 'mitigationMeasures') {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    setClause.push(`updated_at = $${++paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE data_breaches 
      SET ${setClause.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Data breach not found');
    }
    return this.mapDataBreach(result.rows[0]);
  }

  // Data Portability Requests
  async createDataPortabilityRequest(data: CreateDataPortabilityRequest): Promise<DataPortabilityRequest> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    const requestId = `DP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    const query = `
      INSERT INTO data_portability_requests 
      (request_id, data_subject_name, data_subject_email, data_subject_user_id, 
       data_categories, format, delivery_method, expiry_date, notes, status, download_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      requestId,
      data.dataSubjectName,
      data.dataSubjectEmail,
      data.dataSubjectUserId,
      JSON.stringify(data.dataCategories),
      data.format,
      data.deliveryMethod,
      expiryDate,
      data.notes || null,
      'pending',
      0
    ];

    const result = await this.db.query(query, values);
    return this.mapDataPortabilityRequest(result.rows[0]);
  }

  async getDataPortabilityRequests(filters: GDPRFilters = {}): Promise<DataPortabilityRequest[]> {
    let query = 'SELECT * FROM data_portability_requests WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapDataPortabilityRequest(row));
  }

  async getDataPortabilityRequestById(id: string): Promise<DataPortabilityRequest | null> {
    const query = 'SELECT * FROM data_portability_requests WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDataPortabilityRequest(result.rows[0]);
  }

  async updateDataPortabilityRequest(id: string, updates: Partial<DataPortabilityRequest>): Promise<DataPortabilityRequest> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'dataSubject') {
        paramCount++;
        if (key === 'dataCategories') {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    setClause.push(`updated_at = $${++paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE data_portability_requests 
      SET ${setClause.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Data portability request not found');
    }
    return this.mapDataPortabilityRequest(result.rows[0]);
  }

  // Helper methods for mapping database rows to models
  private mapLawfulBasisRecord(row: any): LawfulBasisRecord {
    return {
      id: row.id,
      processingActivity: row.processing_activity,
      lawfulBasis: row.lawful_basis,
      dataCategories: JSON.parse(row.data_categories || '[]'),
      purposes: JSON.parse(row.purposes || '[]'),
      dataSubjects: JSON.parse(row.data_subjects || '[]'),
      retentionPeriod: row.retention_period,
      status: row.status,
      reviewDate: row.review_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapProcessingRecord(row: any): ProcessingRecord {
    return {
      id: row.id,
      activityName: row.activity_name,
      controller: row.controller,
      processor: row.processor,
      purposes: JSON.parse(row.purposes || '[]'),
      lawfulBasis: row.lawful_basis,
      dataCategories: JSON.parse(row.data_categories || '[]'),
      dataSubjects: JSON.parse(row.data_subjects || '[]'),
      recipients: JSON.parse(row.recipients || '[]'),
      thirdCountryTransfers: row.third_country_transfers,
      retentionPeriod: row.retention_period,
      technicalMeasures: JSON.parse(row.technical_measures || '[]'),
      organisationalMeasures: JSON.parse(row.organisational_measures || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDPIA(row: any): DPIA {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      processingType: row.processing_type,
      riskLevel: row.risk_level,
      status: row.status,
      createdDate: row.created_at,
      completedDate: row.completed_date,
      reviewer: row.reviewer,
      dataCategories: JSON.parse(row.data_categories || '[]'),
      mitigationMeasures: JSON.parse(row.mitigation_measures || '[]'),
      residualRisk: row.residual_risk,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDataBreach(row: any): DataBreach {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      discoveryDate: row.discovery_date,
      reportedDate: row.reported_date,
      severity: row.severity,
      status: row.status,
      affectedDataSubjects: row.affected_data_subjects,
      dataCategories: JSON.parse(row.data_categories || '[]'),
      likelyConsequences: row.likely_consequences,
      mitigationMeasures: JSON.parse(row.mitigation_measures || '[]'),
      supervisoryAuthorityNotified: row.supervisory_authority_notified,
      dataSubjectsNotified: row.data_subjects_notified,
      notificationDeadline: row.notification_deadline,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDataPortabilityRequest(row: any): DataPortabilityRequest {
    return {
      id: row.id,
      requestId: row.request_id,
      dataSubject: {
        name: row.data_subject_name,
        email: row.data_subject_email,
        userId: row.data_subject_user_id
      },
      requestDate: row.created_at,
      status: row.status,
      dataCategories: JSON.parse(row.data_categories || '[]'),
      format: row.format,
      deliveryMethod: row.delivery_method,
      completionDate: row.completion_date,
      expiryDate: row.expiry_date,
      fileSize: row.file_size,
      downloadCount: row.download_count,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
