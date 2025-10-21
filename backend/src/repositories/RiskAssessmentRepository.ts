import { Pool } from 'pg';
import type { 
  RiskAssessment, 
  ComplianceFinding, 
  CreateRiskAssessmentRequest, 
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest,
  RiskFilters,
  ComplianceFilters,
  RiskMetrics,
  RiskTrend
} from '../types/risk.js';
import type { PaginatedResponse } from '../types/common.js';

export class RiskAssessmentRepository {
  constructor(private pool: Pool) {}

  async createRiskAssessment(data: CreateRiskAssessmentRequest): Promise<RiskAssessment> {
    const overallScore = this.calculateRiskScore(data.impactScore, data.likelihoodScore);
    const riskLevel = this.determineRiskLevel(overallScore);

    const query = `
      INSERT INTO risk_assessments (
        name, description, risk_level, impact_score, likelihood_score, 
        overall_score, category, data_types, mitigation_measures, owner_id, review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      data.name,
      data.description,
      riskLevel,
      data.impactScore,
      data.likelihoodScore,
      overallScore,
      data.category,
      JSON.stringify(data.dataTypes),
      JSON.stringify(data.mitigationMeasures || []),
      data.ownerId,
      data.reviewDate
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRiskAssessment(result.rows[0]);
  }

  async getRiskAssessments(filters: RiskFilters): Promise<PaginatedResponse<RiskAssessment>> {
    const { whereClause, values, paramCount } = this.buildRiskWhereClause(filters);
    const { limit, offset } = this.getPaginationParams(filters);
    const { orderBy } = this.getSortParams(filters);

    const countQuery = `SELECT COUNT(*) FROM risk_assessments ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT ra.*, u.name as owner_name 
      FROM risk_assessments ra
      LEFT JOIN users u ON ra.owner_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await this.pool.query(query, [...values, limit, offset]);
    const items = result.rows.map(row => this.mapRowToRiskAssessment(row));

    return {
      items,
      total,
      page: filters.page || 1,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getRiskAssessmentById(id: string): Promise<RiskAssessment | null> {
    const query = `
      SELECT ra.*, u.name as owner_name 
      FROM risk_assessments ra
      LEFT JOIN users u ON ra.owner_id = u.id
      WHERE ra.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToRiskAssessment(result.rows[0]) : null;
  }

  async updateRiskAssessment(id: string, data: UpdateRiskAssessmentRequest): Promise<RiskAssessment> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(data.description);
    }
    if (data.impactScore !== undefined || data.likelihoodScore !== undefined) {
      // Recalculate risk level and overall score if impact or likelihood changes
      const current = await this.getRiskAssessmentById(id);
      if (current) {
        const impactScore = data.impactScore ?? current.impactScore;
        const likelihoodScore = data.likelihoodScore ?? current.likelihoodScore;
        const overallScore = this.calculateRiskScore(impactScore, likelihoodScore);
        const riskLevel = this.determineRiskLevel(overallScore);

        if (data.impactScore !== undefined) {
          updates.push(`impact_score = $${++paramCount}`);
          values.push(data.impactScore);
        }
        if (data.likelihoodScore !== undefined) {
          updates.push(`likelihood_score = $${++paramCount}`);
          values.push(data.likelihoodScore);
        }
        updates.push(`overall_score = $${++paramCount}`);
        values.push(overallScore);
        updates.push(`risk_level = $${++paramCount}`);
        values.push(riskLevel);
      }
    }
    if (data.status !== undefined) {
      updates.push(`status = $${++paramCount}`);
      values.push(data.status);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${++paramCount}`);
      values.push(data.category);
    }
    if (data.dataTypes !== undefined) {
      updates.push(`data_types = $${++paramCount}`);
      values.push(JSON.stringify(data.dataTypes));
    }
    if (data.mitigationMeasures !== undefined) {
      updates.push(`mitigation_measures = $${++paramCount}`);
      values.push(JSON.stringify(data.mitigationMeasures));
    }
    if (data.ownerId !== undefined) {
      updates.push(`owner_id = $${++paramCount}`);
      values.push(data.ownerId);
    }
    if (data.reviewDate !== undefined) {
      updates.push(`review_date = $${++paramCount}`);
      values.push(data.reviewDate);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE risk_assessments 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Risk assessment not found');
    }

    return this.mapRowToRiskAssessment(result.rows[0]);
  }

  async deleteRiskAssessment(id: string): Promise<void> {
    const query = 'DELETE FROM risk_assessments WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Risk assessment not found');
    }
  }

  // Compliance Findings methods
  async createComplianceFinding(data: CreateComplianceFindingRequest): Promise<ComplianceFinding> {
    const query = `
      INSERT INTO compliance_findings (
        title, description, regulation, severity, category, 
        affected_systems, remediation_steps, assigned_to, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.title,
      data.description,
      data.regulation,
      data.severity,
      data.category,
      JSON.stringify(data.affectedSystems),
      JSON.stringify(data.remediationSteps || []),
      data.assignedTo,
      data.dueDate
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToComplianceFinding(result.rows[0]);
  }

  async getComplianceFindings(filters: ComplianceFilters): Promise<PaginatedResponse<ComplianceFinding>> {
    const { whereClause, values, paramCount } = this.buildComplianceWhereClause(filters);
    const { limit, offset } = this.getPaginationParams(filters);
    const { orderBy } = this.getSortParams(filters);

    const countQuery = `SELECT COUNT(*) FROM compliance_findings ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT cf.*, u.name as assigned_to_name 
      FROM compliance_findings cf
      LEFT JOIN users u ON cf.assigned_to = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await this.pool.query(query, [...values, limit, offset]);
    const items = result.rows.map(row => this.mapRowToComplianceFinding(row));

    return {
      items,
      total,
      page: filters.page || 1,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getComplianceFindingById(id: string): Promise<ComplianceFinding | null> {
    const query = `
      SELECT cf.*, u.name as assigned_to_name 
      FROM compliance_findings cf
      LEFT JOIN users u ON cf.assigned_to = u.id
      WHERE cf.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToComplianceFinding(result.rows[0]) : null;
  }

  async updateComplianceFinding(id: string, data: Partial<ComplianceFinding>): Promise<ComplianceFinding> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        updates.push(`${this.camelToSnake(key)} = $${++paramCount}`);
        if (Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE compliance_findings 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Compliance finding not found');
    }

    return this.mapRowToComplianceFinding(result.rows[0]);
  }

  // Analytics and Metrics methods
  async getRiskMetrics(): Promise<RiskMetrics> {
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risks,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risks,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risks,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risks,
        AVG(overall_score) as average_score
      FROM risk_assessments
      WHERE status = 'active'
    `;

    const findingsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN due_date < NOW() AND status != 'resolved' THEN 1 END) as overdue
      FROM compliance_findings
    `;

    const [metricsResult, findingsResult] = await Promise.all([
      this.pool.query(metricsQuery),
      this.pool.query(findingsQuery)
    ]);

    const metrics = metricsResult.rows[0];
    const findings = findingsResult.rows[0];

    // Get trends data for the last 30 days
    const trendsData = await this.getRiskTrends(30);

    return {
      totalAssessments: parseInt(metrics.total_assessments),
      criticalRisks: parseInt(metrics.critical_risks),
      highRisks: parseInt(metrics.high_risks),
      mediumRisks: parseInt(metrics.medium_risks),
      lowRisks: parseInt(metrics.low_risks),
      averageScore: parseFloat(metrics.average_score) || 0,
      trendsData,
      complianceFindings: {
        total: parseInt(findings.total),
        open: parseInt(findings.open),
        critical: parseInt(findings.critical),
        overdue: parseInt(findings.overdue)
      }
    };
  }

  async getRiskTrends(days: number): Promise<RiskTrend[]> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_count,
        AVG(overall_score) as average_score
      FROM risk_assessments
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      date: new Date(row.date),
      criticalCount: parseInt(row.critical_count),
      highCount: parseInt(row.high_count),
      mediumCount: parseInt(row.medium_count),
      lowCount: parseInt(row.low_count),
      averageScore: parseFloat(row.average_score) || 0
    }));
  }

  // Helper methods
  private calculateRiskScore(impact: number, likelihood: number): number {
    return Number(((impact * likelihood) / 5).toFixed(2));
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private buildRiskWhereClause(filters: RiskFilters): { whereClause: string; values: any[]; paramCount: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filters.riskLevel) {
      const riskLevels = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
      if (riskLevels.length > 0) {
        const placeholders = riskLevels.map(() => `$${++paramCount}`).join(', ');
        conditions.push(`risk_level IN (${placeholders})`);
        values.push(...riskLevels);
      }
    }

    if (filters.status && filters.status.length > 0) {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      const placeholders = statusArray.map(() => `$${++paramCount}`).join(', ');
      conditions.push(`status IN (${placeholders})`);
      values.push(...statusArray);
    }

    if (filters.category) {
      conditions.push(`category ILIKE $${++paramCount}`);
      values.push(`%${filters.category}%`);
    }

    if (filters.ownerId) {
      conditions.push(`owner_id = $${++paramCount}`);
      values.push(filters.ownerId);
    }

    if (filters.dateFrom) {
      conditions.push(`review_date >= $${++paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`review_date <= $${++paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, paramCount };
  }

  private buildComplianceWhereClause(filters: ComplianceFilters): { whereClause: string; values: any[]; paramCount: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filters.regulation && filters.regulation.length > 0) {
      const regulationArray = Array.isArray(filters.regulation) ? filters.regulation : [filters.regulation];
      const placeholders = regulationArray.map(() => `$${++paramCount}`).join(', ');
      conditions.push(`regulation IN (${placeholders})`);
      values.push(...regulationArray);
    }

    if (filters.severity && filters.severity.length > 0) {
      const severityArray = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      const placeholders = severityArray.map(() => `$${++paramCount}`).join(', ');
      conditions.push(`severity IN (${placeholders})`);
      values.push(...severityArray);
    }

    if (filters.status && filters.status.length > 0) {
      const statusArray2 = Array.isArray(filters.status) ? filters.status : [filters.status];
      const placeholders = statusArray2.map(() => `$${++paramCount}`).join(', ');
      conditions.push(`status IN (${placeholders})`);
      values.push(...statusArray2);
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${++paramCount}`);
      values.push(filters.assignedTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, paramCount };
  }

  private getPaginationParams(filters: RiskFilters | ComplianceFilters): { limit: number; offset: number } {
    const limit = Math.min(filters.limit || 20, 100);
    const page = Math.max(filters.page || 1, 1);
    const offset = (page - 1) * limit;
    return { limit, offset };
  }

  private getSortParams(filters: RiskFilters | ComplianceFilters): { orderBy: string } {
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy = `ORDER BY ${this.camelToSnake(sortBy)} ${sortOrder.toUpperCase()}`;
    return { orderBy };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private mapRowToRiskAssessment(row: any): RiskAssessment {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      riskLevel: row.risk_level,
      impactScore: row.impact_score,
      likelihoodScore: row.likelihood_score,
      overallScore: parseFloat(row.overall_score),
      status: row.status,
      category: row.category,
      dataTypes: JSON.parse(row.data_types || '[]'),
      mitigationMeasures: JSON.parse(row.mitigation_measures || '[]'),
      ownerId: row.owner_id,
      reviewDate: row.review_date ? new Date(row.review_date) : new Date(),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToComplianceFinding(row: any): ComplianceFinding {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      regulation: row.regulation,
      severity: row.severity,
      status: row.status,
      category: row.category,
      affectedSystems: JSON.parse(row.affected_systems || '[]'),
      remediationSteps: JSON.parse(row.remediation_steps || '[]'),
      assignedTo: row.assigned_to,
      dueDate: row.due_date ? new Date(row.due_date) : new Date(),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
