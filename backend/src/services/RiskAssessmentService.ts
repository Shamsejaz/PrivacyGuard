import { RiskAssessmentRepository } from '../repositories/RiskAssessmentRepository.js';
import type { 
  RiskAssessment, 
  ComplianceFinding, 
  CreateRiskAssessmentRequest, 
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest,
  RiskFilters,
  ComplianceFilters,
  RiskMetrics,
  RiskAlert,
  RiskTrend
} from '../types/risk.js';
import type { PaginatedResponse } from '../types/common.js';
import { logger } from '../utils/logger';

export class RiskAssessmentService {
  constructor(private riskRepository: RiskAssessmentRepository) {}

  // Risk Assessment methods
  async createRiskAssessment(data: CreateRiskAssessmentRequest): Promise<RiskAssessment> {
    try {
      // Validate input data
      this.validateRiskAssessmentData(data);

      // Add unique IDs to mitigation measures
      if (data.mitigationMeasures) {
        data.mitigationMeasures = data.mitigationMeasures.map(measure => ({
          ...measure,
          id: this.generateId()
        }));
      }

      const riskAssessment = await this.riskRepository.createRiskAssessment(data);
      
      // Check if this creates any alerts
      await this.checkForRiskAlerts(riskAssessment);
      
      logger.info(`Risk assessment created: ${riskAssessment.id}`);
      return riskAssessment;
    } catch (error) {
      logger.error('Error creating risk assessment:', error);
      throw error;
    }
  }

  async getRiskAssessments(filters: RiskFilters): Promise<PaginatedResponse<RiskAssessment>> {
    try {
      return await this.riskRepository.getRiskAssessments(filters);
    } catch (error) {
      logger.error('Error fetching risk assessments:', error);
      throw error;
    }
  }

  async getRiskAssessmentById(id: string): Promise<RiskAssessment> {
    try {
      const riskAssessment = await this.riskRepository.getRiskAssessmentById(id);
      if (!riskAssessment) {
        throw new Error('Risk assessment not found');
      }
      return riskAssessment;
    } catch (error) {
      logger.error(`Error fetching risk assessment ${id}:`, error);
      throw error;
    }
  }

  async updateRiskAssessment(id: string, data: UpdateRiskAssessmentRequest): Promise<RiskAssessment> {
    try {
      // Validate input data
      if (data.impactScore !== undefined || data.likelihoodScore !== undefined) {
        this.validateScores(data.impactScore, data.likelihoodScore);
      }

      const updatedRiskAssessment = await this.riskRepository.updateRiskAssessment(id, data);
      
      // Check if updates create any alerts
      await this.checkForRiskAlerts(updatedRiskAssessment);
      
      logger.info(`Risk assessment updated: ${id}`);
      return updatedRiskAssessment;
    } catch (error) {
      logger.error(`Error updating risk assessment ${id}:`, error);
      throw error;
    }
  }

  async deleteRiskAssessment(id: string): Promise<void> {
    try {
      await this.riskRepository.deleteRiskAssessment(id);
      logger.info(`Risk assessment deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting risk assessment ${id}:`, error);
      throw error;
    }
  }

  // Compliance Finding methods
  async createComplianceFinding(data: CreateComplianceFindingRequest): Promise<ComplianceFinding> {
    try {
      this.validateComplianceFindingData(data);

      // Add unique IDs to remediation steps
      if (data.remediationSteps) {
        data.remediationSteps = data.remediationSteps.map(step => ({
          ...step,
          id: this.generateId()
        }));
      }

      const finding = await this.riskRepository.createComplianceFinding(data);
      
      // Check if this creates any alerts
      await this.checkForComplianceAlerts(finding);
      
      logger.info(`Compliance finding created: ${finding.id}`);
      return finding;
    } catch (error) {
      logger.error('Error creating compliance finding:', error);
      throw error;
    }
  }

  async getComplianceFindings(filters: ComplianceFilters): Promise<PaginatedResponse<ComplianceFinding>> {
    try {
      return await this.riskRepository.getComplianceFindings(filters);
    } catch (error) {
      logger.error('Error fetching compliance findings:', error);
      throw error;
    }
  }

  async getComplianceFindingById(id: string): Promise<ComplianceFinding> {
    try {
      const finding = await this.riskRepository.getComplianceFindingById(id);
      if (!finding) {
        throw new Error('Compliance finding not found');
      }
      return finding;
    } catch (error) {
      logger.error(`Error fetching compliance finding ${id}:`, error);
      throw error;
    }
  }

  async updateComplianceFinding(id: string, data: Partial<ComplianceFinding>): Promise<ComplianceFinding> {
    try {
      const updatedFinding = await this.riskRepository.updateComplianceFinding(id, data);
      
      // Check if updates create any alerts
      await this.checkForComplianceAlerts(updatedFinding);
      
      logger.info(`Compliance finding updated: ${id}`);
      return updatedFinding;
    } catch (error) {
      logger.error(`Error updating compliance finding ${id}:`, error);
      throw error;
    }
  }

  // Analytics and Reporting methods
  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      return await this.riskRepository.getRiskMetrics();
    } catch (error) {
      logger.error('Error fetching risk metrics:', error);
      throw error;
    }
  }

  async getRiskTrends(days: number = 30): Promise<RiskTrend[]> {
    try {
      return await this.riskRepository.getRiskTrends(days);
    } catch (error) {
      logger.error('Error fetching risk trends:', error);
      throw error;
    }
  }

  async generateRiskReport(filters: RiskFilters): Promise<any> {
    try {
      const [assessments, metrics, trends] = await Promise.all([
        this.riskRepository.getRiskAssessments(filters),
        this.riskRepository.getRiskMetrics(),
        this.riskRepository.getRiskTrends(90)
      ]);

      return {
        summary: metrics,
        assessments: assessments.items,
        trends,
        generatedAt: new Date(),
        filters
      };
    } catch (error) {
      logger.error('Error generating risk report:', error);
      throw error;
    }
  }

  // Risk Calculation and Analysis methods
  calculateRiskScore(impact: number, likelihood: number): number {
    this.validateScores(impact, likelihood);
    return Number(((impact * likelihood) / 5).toFixed(2));
  }

  determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  async analyzeRiskTrends(): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    recommendation: string;
  }> {
    try {
      const trends = await this.riskRepository.getRiskTrends(30);
      
      if (trends.length < 2) {
        return {
          trend: 'stable',
          changePercentage: 0,
          recommendation: 'Insufficient data for trend analysis'
        };
      }

      const recent = trends.slice(-7); // Last 7 days
      const previous = trends.slice(-14, -7); // Previous 7 days

      const recentAvg = recent.reduce((sum, t) => sum + t.averageScore, 0) / recent.length;
      const previousAvg = previous.reduce((sum, t) => sum + t.averageScore, 0) / previous.length;

      const changePercentage = ((recentAvg - previousAvg) / previousAvg) * 100;

      let trend: 'increasing' | 'decreasing' | 'stable';
      let recommendation: string;

      if (Math.abs(changePercentage) < 5) {
        trend = 'stable';
        recommendation = 'Risk levels are stable. Continue monitoring current mitigation strategies.';
      } else if (changePercentage > 0) {
        trend = 'increasing';
        recommendation = 'Risk levels are increasing. Review and strengthen mitigation measures.';
      } else {
        trend = 'decreasing';
        recommendation = 'Risk levels are decreasing. Current mitigation strategies are effective.';
      }

      return { trend, changePercentage: Math.abs(changePercentage), recommendation };
    } catch (error) {
      logger.error('Error analyzing risk trends:', error);
      throw error;
    }
  }

  // Alert and Monitoring methods
  async checkForRiskAlerts(riskAssessment: RiskAssessment): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    // Critical risk alert
    if (riskAssessment.riskLevel === 'critical') {
      alerts.push({
        id: this.generateId(),
        type: 'new_critical_risk',
        title: 'New Critical Risk Identified',
        message: `Risk assessment "${riskAssessment.name}" has been classified as critical with a score of ${riskAssessment.overallScore}`,
        severity: 'critical',
        resourceId: riskAssessment.id,
        resourceType: 'risk_assessment',
        acknowledged: false,
        createdAt: new Date()
      });
    }

    // Overdue review alert
    if (riskAssessment.reviewDate && riskAssessment.reviewDate < new Date()) {
      alerts.push({
        id: this.generateId(),
        type: 'overdue_review',
        title: 'Risk Assessment Review Overdue',
        message: `Risk assessment "${riskAssessment.name}" review was due on ${riskAssessment.reviewDate.toDateString()}`,
        severity: 'medium',
        resourceId: riskAssessment.id,
        resourceType: 'risk_assessment',
        acknowledged: false,
        createdAt: new Date()
      });
    }

    // Log alerts (in a real implementation, these would be stored and sent via WebSocket)
    alerts.forEach(alert => {
      logger.warn(`Risk Alert: ${alert.title} - ${alert.message}`);
    });

    return alerts;
  }

  async checkForComplianceAlerts(finding: ComplianceFinding): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    // Critical compliance gap alert
    if (finding.severity === 'critical') {
      alerts.push({
        id: this.generateId(),
        type: 'compliance_gap',
        title: 'Critical Compliance Gap Identified',
        message: `Critical compliance finding "${finding.title}" requires immediate attention`,
        severity: 'critical',
        resourceId: finding.id,
        resourceType: 'compliance_finding',
        acknowledged: false,
        createdAt: new Date()
      });
    }

    // Overdue remediation alert
    if (finding.dueDate && finding.dueDate < new Date() && finding.status !== 'resolved') {
      alerts.push({
        id: this.generateId(),
        type: 'overdue_review',
        title: 'Compliance Remediation Overdue',
        message: `Compliance finding "${finding.title}" remediation was due on ${finding.dueDate.toDateString()}`,
        severity: 'high',
        resourceId: finding.id,
        resourceType: 'compliance_finding',
        acknowledged: false,
        createdAt: new Date()
      });
    }

    // Log alerts
    alerts.forEach(alert => {
      logger.warn(`Compliance Alert: ${alert.title} - ${alert.message}`);
    });

    return alerts;
  }

  // Validation methods
  private validateRiskAssessmentData(data: CreateRiskAssessmentRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Risk assessment name is required');
    }

    this.validateScores(data.impactScore, data.likelihoodScore);

    if (data.dataTypes && !Array.isArray(data.dataTypes)) {
      throw new Error('Data types must be an array');
    }
  }

  private validateComplianceFindingData(data: CreateComplianceFindingRequest): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Compliance finding title is required');
    }

    if (!data.regulation) {
      throw new Error('Regulation is required');
    }

    if (!data.severity) {
      throw new Error('Severity is required');
    }

    if (!Array.isArray(data.affectedSystems)) {
      throw new Error('Affected systems must be an array');
    }
  }

  private validateScores(impact?: number, likelihood?: number): void {
    if (impact !== undefined && (impact < 1 || impact > 5 || !Number.isInteger(impact))) {
      throw new Error('Impact score must be an integer between 1 and 5');
    }

    if (likelihood !== undefined && (likelihood < 1 || likelihood > 5 || !Number.isInteger(likelihood))) {
      throw new Error('Likelihood score must be an integer between 1 and 5');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
