import { Pool } from 'pg';
import type { 
  DSARRequest, 
  DSARStatusHistory, 
  CreateDSARRequest, 
  UpdateDSARRequest, 
  DSARFilters 
} from '../models/DSAR';
import type { PaginatedResponse } from '../types/common';

export class DSARRepository {
  constructor(private db: Pool) {}

  async create(data: CreateDSARRequest): Promise<DSARRequest> {
    const requestId = this.generateRequestId();
    const query = `
      INSERT INTO dsar_requests (
        request_id, subject_name, subject_email, subject_phone, 
        request_type, description, data_categories, processing_purposes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      requestId,
      data.subjectName,
      data.subjectEmail,
      data.subjectPhone || null,
      data.requestType,
      data.description || null,
      JSON.stringify(data.dataCategories || []),
      JSON.stringify(data.processingPurposes || [])
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToDSAR(result.rows[0]);
  }

  async findById(id: string): Promise<DSARRequest | null> {
    const query = 'SELECT * FROM dsar_requests WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToDSAR(result.rows[0]);
  }

  async findByRequestId(requestId: string): Promise<DSARRequest | null> {
    const query = 'SELECT * FROM dsar_requests WHERE request_id = $1';
    const result = await this.db.query(query, [requestId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToDSAR(result.rows[0]);
  }

  async findBySubjectEmail(email: string): Promise<DSARRequest[]> {
    const query = 'SELECT * FROM dsar_requests WHERE subject_email = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [email]);
    
    return result.rows.map(row => this.mapRowToDSAR(row));
  }

  async findMany(filters: DSARFilters): Promise<PaginatedResponse<DSARRequest>> {
    const { whereClause, values, countValues } = this.buildWhereClause(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM dsar_requests ${whereClause}`;
    const countResult = await this.db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const query = `
      SELECT dr.*, u.name as assigned_to_name 
      FROM dsar_requests dr
      LEFT JOIN users u ON dr.assigned_to = u.id
      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT ${values.length + 1} OFFSET ${values.length + 2}
    `;
    
    const result = await this.db.query(query, [...values, limit, offset]);
    
    return {
      items: result.rows.map(row => this.mapRowToDSAR(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async update(id: string, updates: UpdateDSARRequest): Promise<DSARRequest> {
    const { setClause, values } = this.buildUpdateClause(updates);
    
    const query = `
      UPDATE dsar_requests 
      SET ${setClause}
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    const result = await this.db.query(query, [...values, id]);
    
    if (result.rows.length === 0) {
      throw new Error('DSAR request not found');
    }
    
    return this.mapRowToDSAR(result.rows[0]);
  }

  async updateStatus(id: string, status: DSARRequest['status'], userId: string, comment?: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the DSAR request status
      await client.query(
        'UPDATE dsar_requests SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, id]
      );
      
      // Add status history entry
      await client.query(
        'INSERT INTO dsar_status_history (dsar_id, status, comment, changed_by) VALUES ($1, $2, $3, $4)',
        [id, status, comment, userId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStatusHistory(dsarId: string): Promise<DSARStatusHistory[]> {
    const query = `
      SELECT dsh.*, u.name as changed_by_name
      FROM dsar_status_history dsh
      LEFT JOIN users u ON dsh.changed_by = u.id
      WHERE dsh.dsar_id = $1
      ORDER BY dsh.changed_at DESC
    `;
    
    const result = await this.db.query(query, [dsarId]);
    
    return result.rows.map(row => ({
      id: row.id,
      dsarId: row.dsar_id,
      status: row.status,
      comment: row.comment,
      changedBy: row.changed_by,
      changedAt: row.changed_at
    }));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM dsar_requests WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async count(filters?: DSARFilters): Promise<number> {
    const { whereClause, values } = this.buildWhereClause(filters || {});
    const query = `SELECT COUNT(*) FROM dsar_requests ${whereClause}`;
    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DSAR-${timestamp}-${random}`.toUpperCase();
  }

  private mapRowToDSAR(row: any): DSARRequest {
    return {
      id: row.id,
      requestId: row.request_id,
      subjectName: row.subject_name,
      subjectEmail: row.subject_email,
      subjectPhone: row.subject_phone,
      requestType: row.request_type,
      status: row.status,
      priority: row.priority,
      description: row.description,
      legalBasis: row.legal_basis,
      dataCategories: Array.isArray(row.data_categories) ? row.data_categories : JSON.parse(row.data_categories || '[]'),
      processingPurposes: Array.isArray(row.processing_purposes) ? row.processing_purposes : JSON.parse(row.processing_purposes || '[]'),
      assignedTo: row.assigned_to,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      rejectionReason: row.rejection_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private buildWhereClause(filters: DSARFilters): { whereClause: string; values: any[]; countValues: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.requestType) {
      conditions.push(`request_type = $${paramIndex++}`);
      values.push(filters.requestType);
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }

    if (filters.subjectEmail) {
      conditions.push(`subject_email ILIKE $${paramIndex++}`);
      values.push(`%${filters.subjectEmail}%`);
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return {
      whereClause,
      values,
      countValues: values.slice() // Copy for count query
    };
  }

  private buildUpdateClause(updates: UpdateDSARRequest): { setClause: string; values: any[] } {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }

    if (updates.assignedTo !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(updates.assignedTo);
    }

    if (updates.dueDate !== undefined) {
      setClauses.push(`due_date = $${paramIndex++}`);
      values.push(updates.dueDate);
    }

    if (updates.rejectionReason !== undefined) {
      setClauses.push(`rejection_reason = $${paramIndex++}`);
      values.push(updates.rejectionReason);
    }

    if (updates.legalBasis !== undefined) {
      setClauses.push(`legal_basis = $${paramIndex++}`);
      values.push(updates.legalBasis);
    }

    if (updates.dataCategories !== undefined) {
      setClauses.push(`data_categories = $${paramIndex++}`);
      values.push(JSON.stringify(updates.dataCategories));
    }

    if (updates.processingPurposes !== undefined) {
      setClauses.push(`processing_purposes = $${paramIndex++}`);
      values.push(JSON.stringify(updates.processingPurposes));
    }

    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);

    return {
      setClause: setClauses.join(', '),
      values
    };
  }
}
