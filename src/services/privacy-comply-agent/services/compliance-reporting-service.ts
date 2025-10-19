// Compliance Reporting Service Interface
import {
  ComplianceReport,
  DPIAReport,
  RoPAReport,
  AuditReport,
  ComplianceSummary,
  ReportScope,
  DateRange,
  ComplianceFinding,
  ComplianceAssessment,
  RemediationRecommendation,
  ProcessingActivity,
  DataCategory,
  RiskAssessment,
  RiskFactor,
  TrendData,
  RemediationResult
} from '../types';
import { PrivacyRiskDetector } from './privacy-risk-detector';
import { ComplianceReasoningEngine } from './compliance-reasoning-engine';
import { AWSServiceClients } from '../config/service-clients';
import { v4 as uuidv4 } from 'uuid';

/**
 * Compliance Reporting Service
 * Generates comprehensive compliance reports and documentation
 */
export interface ComplianceReportingService {
  /**
   * Generate a Data Protection Impact Assessment (DPIA) report
   * Creates comprehensive DPIA documentation for high-risk processing
   */
  generateDPIA(scope: ReportScope): Promise<DPIAReport>;

  /**
   * Generate Records of Processing Activities (RoPA) report
   * Documents all data processing activities for regulatory compliance
   */
  generateRoPA(scope: ReportScope): Promise<RoPAReport>;

  /**
   * Generate comprehensive audit report
   * Provides detailed compliance status and violation history
   */
  generateAuditReport(timeRange: DateRange): Promise<AuditReport>;

  /**
   * Generate compliance summary report
   * High-level overview of compliance status and trends
   */
  generateComplianceSummary(regulation: string, department?: string): Promise<ComplianceSummary>;

  /**
   * Store a report securely in S3 with encryption
   * Returns the S3 object key for retrieval
   */
  storeReport(report: ComplianceReport): Promise<string>;

  /**
   * Retrieve a stored report by ID
   */
  getReport(reportId: string): Promise<ComplianceReport>;

  /**
   * List all reports matching criteria
   */
  listReports(filters: {
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    status?: string;
    limit?: number;
  }): Promise<ComplianceReport[]>;

  /**
   * Delete a report
   */
  deleteReport(reportId: string): Promise<boolean>;

  /**
   * Generate natural language summary of a report
   */
  generateExecutiveSummary(report: ComplianceReport): Promise<string>;

  /**
   * Export report in various formats (PDF, JSON, CSV)
   */
  exportReport(reportId: string, format: 'PDF' | 'JSON' | 'CSV'): Promise<Buffer>;

  /**
   * Schedule automatic report generation
   */
  scheduleReport(
    reportType: string,
    scope: ReportScope,
    schedule: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
      time: string;
    }
  ): Promise<string>;

  /**
   * Get report generation status
   */
  getReportStatus(reportId: string): Promise<{
    status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    progress: number;
    estimatedCompletion?: Date;
  }>;

  /**
   * Advanced report search with multiple criteria
   */
  searchReports(searchCriteria: {
    query?: string;
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    severityLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    minScore?: number;
    maxFindings?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    reports: ComplianceReport[];
    totalCount: number;
    hasMore: boolean;
  }>;

  /**
   * Get report summary without full content for dashboard views
   */
  getReportSummary(reportId: string): Promise<{
    id: string;
    type: string;
    generatedAt: Date;
    findingsCount: number;
    criticalFindings: number;
    highFindings: number;
    overallScore?: number;
    complianceScore?: number;
    status: string;
  } | null>;

  /**
   * Get compliance trends over time
   */
  getComplianceTrends(filters: {
    regulation?: string;
    department?: string;
    timeRange: DateRange;
    granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }): Promise<{
    period: string;
    reportsCount: number;
    averageScore: number;
    totalFindings: number;
    criticalFindings: number;
  }[]>;
}

/**
 * Implementation class for Compliance Reporting Service
 */
export class ComplianceReportingServiceImpl implements ComplianceReportingService {
  constructor(
    private riskDetector: PrivacyRiskDetector,
    private reasoningEngine: ComplianceReasoningEngine,
    private awsClients: AWSServiceClients
  ) {}

  async generateDPIA(scope: ReportScope): Promise<DPIAReport> {
    const reportId = uuidv4();
    const generatedAt = new Date();

    // Collect compliance findings within scope
    const findings = await this.collectFindingsForScope(scope);
    
    // Generate assessments for findings
    const assessments = await this.generateAssessments(findings);
    
    // Extract processing activities from findings and assessments
    const dataProcessingActivities = this.extractProcessingActivities(findings, assessments);
    
    // Perform risk assessment
    const riskAssessment = this.performRiskAssessment(findings, assessments);
    
    // Generate mitigation measures
    const mitigationMeasures = this.generateMitigationMeasures(assessments);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(assessments);
    
    // Generate executive summary
    const executiveSummary = await this.generateDPIAExecutiveSummary(
      dataProcessingActivities,
      riskAssessment,
      findings.length
    );

    return {
      id: reportId,
      type: 'DPIA',
      generatedAt,
      scope,
      findings,
      assessments,
      recommendations,
      executiveSummary,
      dataProcessingActivities,
      riskAssessment,
      mitigationMeasures
    };
  }

  async generateRoPA(scope: ReportScope): Promise<RoPAReport> {
    const reportId = uuidv4();
    const generatedAt = new Date();

    // Collect compliance findings within scope
    const findings = await this.collectFindingsForScope(scope);
    
    // Generate assessments for findings
    const assessments = await this.generateAssessments(findings);
    
    // Extract processing activities
    const processingActivities = this.extractProcessingActivities(findings, assessments);
    
    // Extract data categories
    const dataCategories = this.extractDataCategories(findings, assessments);
    
    // Extract legal bases
    const legalBases = this.extractLegalBases(assessments);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(assessments);
    
    // Generate executive summary
    const executiveSummary = await this.generateRoPAExecutiveSummary(
      processingActivities,
      dataCategories,
      legalBases
    );

    return {
      id: reportId,
      type: 'ROPA',
      generatedAt,
      scope,
      findings,
      assessments,
      recommendations,
      executiveSummary,
      processingActivities,
      dataCategories,
      legalBases
    };
  }

  async generateAuditReport(timeRange: DateRange): Promise<AuditReport> {
    const reportId = uuidv4();
    const generatedAt = new Date();
    const scope: ReportScope = { timeRange };

    // Collect all compliance findings within time range
    const findings = await this.collectFindingsForScope(scope);
    
    // Generate assessments for findings
    const assessments = await this.generateAssessments(findings);
    
    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(findings, assessments);
    
    // Filter violations (high and critical severity findings)
    const violations = findings.filter(f => 
      f.severity === 'HIGH' || f.severity === 'CRITICAL'
    );
    
    // Get remediation actions (mock data for now - would come from remediation service)
    const remediationActions = this.getRemediationActions(timeRange);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(assessments);
    
    // Generate executive summary
    const executiveSummary = await this.generateAuditExecutiveSummary(
      complianceScore,
      violations.length,
      remediationActions.length
    );

    return {
      id: reportId,
      type: 'AUDIT',
      generatedAt,
      scope,
      findings,
      assessments,
      recommendations,
      executiveSummary,
      auditPeriod: timeRange,
      complianceScore,
      violations,
      remediationActions
    };
  }

  async generateComplianceSummary(regulation: string, department?: string): Promise<ComplianceSummary> {
    const reportId = uuidv4();
    const generatedAt = new Date();
    const scope: ReportScope = { 
      regulations: [regulation],
      departments: department ? [department] : undefined
    };

    // Collect compliance findings within scope
    const findings = await this.collectFindingsForScope(scope);
    
    // Generate assessments for findings
    const assessments = await this.generateAssessments(findings);
    
    // Calculate overall compliance score
    const overallScore = this.calculateComplianceScore(findings, assessments);
    
    // Generate trend analysis (mock data for now)
    const trendAnalysis = this.generateTrendAnalysis(regulation, department);
    
    // Calculate key metrics
    const keyMetrics = this.calculateKeyMetrics(findings, assessments);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(assessments);
    
    // Generate executive summary
    const executiveSummary = await this.generateSummaryExecutiveSummary(
      regulation,
      overallScore,
      findings.length,
      department
    );

    return {
      id: reportId,
      type: 'SUMMARY',
      generatedAt,
      scope,
      findings,
      assessments,
      recommendations,
      executiveSummary,
      overallScore,
      trendAnalysis,
      keyMetrics
    };
  }

  async storeReport(report: ComplianceReport): Promise<string> {
    try {
      // Store report content in S3 with encryption
      const s3Key = await this.storeReportInS3(report);
      
      // Store metadata in DynamoDB for indexing and querying
      await this.storeReportMetadata(report, s3Key);
      
      return s3Key;
    } catch (error) {
      console.error('Error storing report:', error);
      throw new Error(`Failed to store report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReport(reportId: string): Promise<ComplianceReport> {
    try {
      // Get metadata from DynamoDB to find S3 location
      const metadata = await this.getReportMetadata(reportId);
      if (!metadata) {
        throw new Error(`Report not found: ${reportId}`);
      }
      
      // Retrieve report content from S3
      const report = await this.getReportFromS3(metadata.s3Key);
      return report;
    } catch (error) {
      console.error('Error retrieving report:', error);
      throw new Error(`Failed to retrieve report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listReports(filters: {
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    status?: string;
    limit?: number;
  }): Promise<ComplianceReport[]> {
    try {
      // Use enhanced search functionality
      const searchResult = await this.searchReports({
        type: filters.type,
        dateRange: filters.dateRange,
        regulation: filters.regulation,
        department: filters.department,
        status: filters.status,
        limit: filters.limit || 50
      });
      
      return searchResult.reports;
    } catch (error) {
      console.error('Error listing reports:', error);
      throw new Error(`Failed to list reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteReport(reportId: string): Promise<boolean> {
    try {
      // Get metadata to find S3 location
      const metadata = await this.getReportMetadata(reportId);
      if (!metadata) {
        return false; // Report doesn't exist
      }
      
      // Delete from S3
      await this.deleteReportFromS3(metadata.s3Key);
      
      // Delete metadata from DynamoDB
      await this.deleteReportMetadata(reportId);
      
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error(`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateExecutiveSummary(report: ComplianceReport): Promise<string> {
    // Return the existing executive summary from the report
    return report.executiveSummary;
  }

  async exportReport(reportId: string, format: 'PDF' | 'JSON' | 'CSV'): Promise<Buffer> {
    try {
      const report = await this.getReport(reportId);
      
      switch (format) {
        case 'JSON':
          return Buffer.from(JSON.stringify(report, null, 2));
        
        case 'CSV':
          return this.exportReportAsCSV(report);
        
        case 'PDF':
          return this.exportReportAsPDF(report);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scheduleReport(
    reportType: string,
    scope: ReportScope,
    schedule: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
      time: string;
    }
  ): Promise<string> {
    try {
      const scheduleId = uuidv4();
      
      // Store schedule configuration in DynamoDB
      await this.storeReportSchedule(scheduleId, reportType, scope, schedule);
      
      // In a real implementation, this would integrate with AWS EventBridge or similar
      // For now, we'll just store the schedule configuration
      console.log(`Report schedule created: ${scheduleId} for ${reportType} reports`);
      
      return scheduleId;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error(`Failed to schedule report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReportStatus(reportId: string): Promise<{
    status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    progress: number;
    estimatedCompletion?: Date;
  }> {
    try {
      // Get report metadata from DynamoDB
      const params = {
        TableName: this.awsClients.getDynamoDBTableName(),
        Key: { reportId }
      };

      const result = await this.awsClients.dynamodb.get(params).promise();
      
      if (!result.Item) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Check if report exists in S3 to determine completion status
      const s3Key = result.Item.s3Key;
      let status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' = 'PENDING';
      let progress = 0;

      try {
        await this.awsClients.s3.getObject({
          Bucket: this.awsClients.getS3ReportsBucket(),
          Key: s3Key
        }).promise();
        
        status = 'COMPLETED';
        progress = 100;
      } catch (error) {
        // If report doesn't exist in S3, check metadata status
        status = result.Item.status || 'PENDING';
        progress = result.Item.progress || 0;
      }

      return {
        status,
        progress,
        estimatedCompletion: result.Item.estimatedCompletion 
          ? new Date(result.Item.estimatedCompletion) 
          : undefined
      };
    } catch (error) {
      console.error('Error getting report status:', error);
      throw new Error(`Failed to get report status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods for report generation

  private async collectFindingsForScope(scope: ReportScope): Promise<ComplianceFinding[]> {
    const allFindings: ComplianceFinding[] = [];

    try {
      // Collect findings from different sources
      const [s3Findings, iamFindings, cloudTrailFindings, macieFindings, securityHubFindings] = 
        await Promise.all([
          this.riskDetector.scanS3Buckets(),
          this.riskDetector.analyzeIAMPolicies(),
          this.riskDetector.processCloudTrailLogs(),
          this.riskDetector.getMacieFindings(),
          this.riskDetector.getSecurityHubFindings()
        ]);

      // Flatten all findings into a single array
      allFindings.push(
        ...s3Findings,
        ...iamFindings,
        ...cloudTrailFindings,
        ...macieFindings,
        ...securityHubFindings
      );

      // Filter findings based on scope
      return this.filterFindingsByScope(allFindings, scope);
    } catch (error) {
      console.error('Error collecting findings for scope:', error);
      return [];
    }
  }

  private filterFindingsByScope(findings: ComplianceFinding[], scope: ReportScope): ComplianceFinding[] {
    return findings.filter(finding => {
      // Filter by time range
      if (scope.timeRange) {
        const findingDate = finding.detectedAt;
        if (findingDate < scope.timeRange.startDate || findingDate > scope.timeRange.endDate) {
          return false;
        }
      }

      // Filter by departments (would need department tagging on resources)
      if (scope.departments && scope.departments.length > 0) {
        // For now, assume department is in resource tags or ARN
        const hasMatchingDepartment = scope.departments.some(dept => 
          finding.resourceArn.toLowerCase().includes(dept.toLowerCase())
        );
        if (!hasMatchingDepartment) {
          return false;
        }
      }

      // Filter by resource types
      if (scope.resourceTypes && scope.resourceTypes.length > 0) {
        const resourceType = this.extractResourceTypeFromArn(finding.resourceArn);
        if (!scope.resourceTypes.includes(resourceType)) {
          return false;
        }
      }

      return true;
    });
  }

  private extractResourceTypeFromArn(arn: string): string {
    // Extract resource type from ARN (e.g., "s3", "iam", "lambda")
    const parts = arn.split(':');
    return parts.length >= 3 ? parts[2] : 'unknown';
  }

  private async generateAssessments(findings: ComplianceFinding[]): Promise<ComplianceAssessment[]> {
    const assessments: ComplianceAssessment[] = [];

    for (const finding of findings) {
      try {
        const assessment = await this.reasoningEngine.analyzeFinding(finding);
        assessments.push(assessment);
      } catch (error) {
        console.error(`Error generating assessment for finding ${finding.id}:`, error);
        // Continue with other findings
      }
    }

    return assessments;
  }

  private extractProcessingActivities(
    findings: ComplianceFinding[], 
    assessments: ComplianceAssessment[]
  ): ProcessingActivity[] {
    const activities: ProcessingActivity[] = [];
    const processedResources = new Set<string>();

    findings.forEach(finding => {
      if (processedResources.has(finding.resourceArn)) {
        return;
      }

      const assessment = assessments.find(a => a.findingId === finding.id);
      const resourceType = this.extractResourceTypeFromArn(finding.resourceArn);

      activities.push({
        id: uuidv4(),
        name: `${resourceType.toUpperCase()} Data Processing - ${finding.resourceArn.split('/').pop()}`,
        purpose: this.inferProcessingPurpose(finding, assessment),
        dataCategories: this.inferDataCategories(finding, assessment),
        legalBasis: this.inferLegalBasis(assessment),
        dataSubjects: this.inferDataSubjects(finding),
        recipients: this.inferRecipients(finding),
        retentionPeriod: this.inferRetentionPeriod(finding, assessment)
      });

      processedResources.add(finding.resourceArn);
    });

    return activities;
  }

  private extractDataCategories(
    findings: ComplianceFinding[], 
    _assessments: ComplianceAssessment[]
  ): DataCategory[] {
    const categories = new Map<string, DataCategory>();

    findings.forEach(finding => {
      if (finding.findingType === 'PII_EXPOSURE') {
        categories.set('personal_data', {
          name: 'Personal Data',
          type: 'PERSONAL',
          description: 'Personally identifiable information',
          sources: [finding.resourceArn]
        });
      }

      if (finding.description.toLowerCase().includes('sensitive') || 
          finding.description.toLowerCase().includes('phi')) {
        categories.set('sensitive_data', {
          name: 'Sensitive Personal Data',
          type: 'SENSITIVE',
          description: 'Sensitive personal information requiring special protection',
          sources: [finding.resourceArn]
        });
      }

      if (finding.description.toLowerCase().includes('health') ||
          finding.description.toLowerCase().includes('medical')) {
        categories.set('special_category', {
          name: 'Special Category Data',
          type: 'SPECIAL',
          description: 'Health and medical data requiring explicit consent',
          sources: [finding.resourceArn]
        });
      }
    });

    return Array.from(categories.values());
  }

  private extractLegalBases(assessments: ComplianceAssessment[]): string[] {
    const legalBases = new Set<string>();

    assessments.forEach(assessment => {
      assessment.legalMappings.forEach(mapping => {
        if (mapping.regulation === 'GDPR') {
          // Infer legal basis from GDPR article
          if (mapping.article.includes('6(1)(a)')) {
            legalBases.add('Consent');
          } else if (mapping.article.includes('6(1)(b)')) {
            legalBases.add('Contract');
          } else if (mapping.article.includes('6(1)(c)')) {
            legalBases.add('Legal obligation');
          } else if (mapping.article.includes('6(1)(f)')) {
            legalBases.add('Legitimate interests');
          } else {
            legalBases.add('Other lawful basis');
          }
        }
      });
    });

    return Array.from(legalBases);
  }

  private performRiskAssessment(
    findings: ComplianceFinding[], 
    assessments: ComplianceAssessment[]
  ): RiskAssessment {
    const riskFactors: RiskFactor[] = [];
    
    // Analyze findings for risk factors
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length;
    const highFindings = findings.filter(f => f.severity === 'HIGH').length;
    const piiExposures = findings.filter(f => f.findingType === 'PII_EXPOSURE').length;
    const accessViolations = findings.filter(f => f.findingType === 'ACCESS_CONTROL').length;

    if (criticalFindings > 0) {
      riskFactors.push({
        factor: 'Critical Security Vulnerabilities',
        impact: 'HIGH',
        likelihood: 'HIGH',
        description: `${criticalFindings} critical security issues identified`
      });
    }

    if (piiExposures > 0) {
      riskFactors.push({
        factor: 'PII Data Exposure',
        impact: 'HIGH',
        likelihood: 'MEDIUM',
        description: `${piiExposures} instances of PII exposure detected`
      });
    }

    if (highFindings > 0) {
      riskFactors.push({
        factor: 'High Severity Security Issues',
        impact: 'HIGH',
        likelihood: 'MEDIUM',
        description: `${highFindings} high severity security issues identified`
      });
    }

    if (accessViolations > 0) {
      riskFactors.push({
        factor: 'Access Control Violations',
        impact: 'MEDIUM',
        likelihood: 'MEDIUM',
        description: `${accessViolations} access control issues identified`
      });
    }

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(riskFactors);
    
    // Generate mitigation measures
    const mitigationMeasures = this.generateMitigationMeasures(assessments);
    
    // Calculate residual risk (assuming some mitigation)
    const residualRisk = this.calculateResidualRisk(overallRisk, mitigationMeasures.length);

    return {
      overallRisk,
      riskFactors,
      mitigationMeasures,
      residualRisk
    };
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (riskFactors.length === 0) return 'LOW';
    
    const highRiskFactors = riskFactors.filter(rf => rf.impact === 'HIGH' && rf.likelihood === 'HIGH').length;
    const mediumRiskFactors = riskFactors.filter(rf => 
      (rf.impact === 'HIGH' && rf.likelihood === 'MEDIUM') ||
      (rf.impact === 'MEDIUM' && rf.likelihood === 'HIGH')
    ).length;

    if (highRiskFactors >= 2) return 'VERY_HIGH';
    if (highRiskFactors >= 1) return 'HIGH';
    if (mediumRiskFactors >= 2) return 'HIGH';
    if (mediumRiskFactors >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculateResidualRisk(
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH',
    mitigationCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
    const currentIndex = riskLevels.indexOf(overallRisk);
    
    // Reduce risk based on mitigation measures
    const reduction = Math.min(Math.floor(mitigationCount / 3), 2);
    const newIndex = Math.max(0, currentIndex - reduction);
    
    return riskLevels[newIndex] as 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  }

  private generateMitigationMeasures(assessments: ComplianceAssessment[]): string[] {
    const measures = new Set<string>();

    assessments.forEach((assessment: ComplianceAssessment) => {
      assessment.recommendations.forEach((rec: RemediationRecommendation) => {
        switch (rec.action) {
          case 'ENABLE_ENCRYPTION':
            measures.add('Implement encryption at rest and in transit');
            break;
          case 'RESTRICT_ACCESS':
            measures.add('Implement principle of least privilege access controls');
            break;
          case 'ENABLE_LOGGING':
            measures.add('Enable comprehensive audit logging and monitoring');
            break;
          case 'UPDATE_POLICY':
            measures.add('Update and enforce data protection policies');
            break;
          default:
            measures.add('Implement additional security controls');
        }
      });
    });

    return Array.from(measures);
  }

  private generateRecommendations(assessments: ComplianceAssessment[]): RemediationRecommendation[] {
    const recommendations: RemediationRecommendation[] = [];

    assessments.forEach(assessment => {
      recommendations.push(...assessment.recommendations);
    });

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateComplianceScore(
    findings: ComplianceFinding[], 
    _assessments: ComplianceAssessment[]
  ): number {
    if (findings.length === 0) return 100;

    const totalFindings = findings.length;
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length;
    const highFindings = findings.filter(f => f.severity === 'HIGH').length;
    const mediumFindings = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowFindings = findings.filter(f => f.severity === 'LOW').length;

    // Weight findings by severity
    const weightedScore = (
      criticalFindings * 10 +
      highFindings * 5 +
      mediumFindings * 2 +
      lowFindings * 1
    );

    // Calculate score out of 100
    const maxPossibleScore = totalFindings * 10; // Assuming all critical
    const score = Math.max(0, 100 - (weightedScore / maxPossibleScore * 100));

    return Math.round(score);
  }

  private getRemediationActions(_timeRange: DateRange): RemediationResult[] {
    // Mock remediation actions - in real implementation, this would come from remediation service
    return [
      {
        remediationId: uuidv4(),
        success: true,
        message: 'Encryption enabled successfully',
        executedAt: new Date(),
        rollbackAvailable: true
      }
    ];
  }

  private generateTrendAnalysis(_regulation: string, _department?: string): TrendData[] {
    // Mock trend data - in real implementation, this would come from historical data
    const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
    return periods.map((period) => ({
      period,
      value: 85 + Math.random() * 10, // Mock compliance score
      change: (Math.random() - 0.5) * 10 // Mock change percentage
    }));
  }

  private calculateKeyMetrics(
    findings: ComplianceFinding[], 
    assessments: ComplianceAssessment[]
  ): Record<string, number> {
    return {
      totalFindings: findings.length,
      criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
      highFindings: findings.filter(f => f.severity === 'HIGH').length,
      mediumFindings: findings.filter(f => f.severity === 'MEDIUM').length,
      lowFindings: findings.filter(f => f.severity === 'LOW').length,
      piiExposures: findings.filter(f => f.findingType === 'PII_EXPOSURE').length,
      encryptionIssues: findings.filter(f => f.findingType === 'ENCRYPTION').length,
      accessControlIssues: findings.filter(f => f.findingType === 'ACCESS_CONTROL').length,
      averageConfidenceScore: assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + a.confidenceScore, 0) / assessments.length 
        : 0
    };
  }

  // Executive summary generation methods
  private async generateDPIAExecutiveSummary(
    activities: ProcessingActivity[],
    riskAssessment: RiskAssessment,
    findingsCount: number
  ): Promise<string> {
    return `This Data Protection Impact Assessment covers ${activities.length} data processing activities with ${findingsCount} compliance findings identified. The overall risk level is assessed as ${riskAssessment.overallRisk} with ${riskAssessment.riskFactors.length} key risk factors. ${riskAssessment.mitigationMeasures.length} mitigation measures have been recommended to reduce the residual risk to ${riskAssessment.residualRisk}.`;
  }

  private async generateRoPAExecutiveSummary(
    activities: ProcessingActivity[],
    dataCategories: DataCategory[],
    legalBases: string[]
  ): Promise<string> {
    return `This Records of Processing Activities report documents ${activities.length} data processing activities across ${dataCategories.length} data categories. The processing activities are based on ${legalBases.length} different legal bases: ${legalBases.join(', ')}. This documentation ensures compliance with regulatory requirements for maintaining comprehensive records of all data processing operations.`;
  }

  private async generateAuditExecutiveSummary(
    complianceScore: number,
    violationsCount: number,
    remediationCount: number
  ): Promise<string> {
    return `The compliance audit reveals an overall compliance score of ${complianceScore}% with ${violationsCount} high-priority violations identified. ${remediationCount} remediation actions have been completed during the audit period. Continued monitoring and remediation efforts are recommended to maintain and improve compliance posture.`;
  }

  private async generateSummaryExecutiveSummary(
    regulation: string,
    overallScore: number,
    findingsCount: number,
    department?: string
  ): Promise<string> {
    const scope = department ? `for the ${department} department` : 'organization-wide';
    return `${regulation} compliance summary ${scope} shows an overall score of ${overallScore}% with ${findingsCount} findings requiring attention. Regular monitoring and proactive remediation are essential for maintaining compliance with ${regulation} requirements.`;
  }

  // Helper methods for inferring data processing details
  private inferProcessingPurpose(finding: ComplianceFinding, _assessment?: ComplianceAssessment): string {
    const resourceType = this.extractResourceTypeFromArn(finding.resourceArn);
    
    switch (resourceType) {
      case 's3':
        return 'Data storage and backup operations';
      case 'lambda':
        return 'Data processing and transformation';
      case 'rds':
        return 'Database operations and data management';
      case 'dynamodb':
        return 'Application data storage and retrieval';
      default:
        return 'General data processing operations';
    }
  }

  private inferDataCategories(finding: ComplianceFinding, _assessment?: ComplianceAssessment): DataCategory[] {
    const categories: DataCategory[] = [];
    
    if (finding.findingType === 'PII_EXPOSURE') {
      categories.push({
        name: 'Personal Identifiers',
        type: 'PERSONAL',
        description: 'Names, email addresses, phone numbers, and other personal identifiers',
        sources: [finding.resourceArn]
      });
    }

    return categories;
  }

  private inferLegalBasis(assessment?: ComplianceAssessment): string {
    if (!assessment) return 'To be determined';
    
    const gdprMappings = assessment.legalMappings.filter(m => m.regulation === 'GDPR');
    if (gdprMappings.length > 0) {
      const article = gdprMappings[0].article;
      if (article.includes('6(1)(f)')) return 'Legitimate interests';
      if (article.includes('6(1)(b)')) return 'Contract';
      if (article.includes('6(1)(c)')) return 'Legal obligation';
    }
    
    return 'Legitimate interests';
  }

  private inferDataSubjects(finding: ComplianceFinding): string[] {
    const resourceType = this.extractResourceTypeFromArn(finding.resourceArn);
    
    switch (resourceType) {
      case 's3':
      case 'rds':
      case 'dynamodb':
        return ['Customers', 'Employees', 'Website visitors'];
      default:
        return ['Data subjects'];
    }
  }

  private inferRecipients(_finding: ComplianceFinding): string[] {
    return ['Internal teams', 'Authorized personnel'];
  }

  private inferRetentionPeriod(finding: ComplianceFinding, _assessment?: ComplianceAssessment): string {
    const resourceType = this.extractResourceTypeFromArn(finding.resourceArn);
    
    switch (resourceType) {
      case 's3':
        return 'As per data retention policy (typically 7 years)';
      case 'rds':
      case 'dynamodb':
        return 'As long as business relationship exists + 3 years';
      default:
        return 'As per applicable retention policy';
    }
  }

  // S3 Storage Methods
  private async storeReportInS3(report: ComplianceReport): Promise<string> {
    const s3Key = `compliance-reports/${report.type.toLowerCase()}/${report.generatedAt.getFullYear()}/${String(report.generatedAt.getMonth() + 1).padStart(2, '0')}/${String(report.generatedAt.getDate()).padStart(2, '0')}/${report.id}.json`;
    
    // Enhanced S3 storage with comprehensive encryption and metadata
    const params = {
      Bucket: this.awsClients.getS3ReportsBucket(),
      Key: s3Key,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json',
      // Enhanced encryption configuration
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.S3_KMS_KEY_ID || 'alias/aws/s3',
      // Comprehensive metadata for indexing and search
      Metadata: {
        reportId: report.id,
        reportType: report.type,
        generatedAt: report.generatedAt.toISOString(),
        findingsCount: report.findings.length.toString(),
        assessmentsCount: report.assessments.length.toString(),
        recommendationsCount: report.recommendations.length.toString(),
        regulations: report.scope.regulations?.join(',') || '',
        departments: report.scope.departments?.join(',') || '',
        resourceTypes: report.scope.resourceTypes?.join(',') || '',
        version: '1.0'
      },
      // Additional security and compliance settings
      StorageClass: 'STANDARD_IA', // Cost-effective for compliance reports
      Tagging: this.generateS3Tags(report)
    };

    await this.awsClients.s3.putObject(params).promise();
    
    // Log storage action for audit trail
    console.log(`Report ${report.id} stored in S3 with encryption at ${s3Key}`);
    
    return s3Key;
  }

  private async getReportFromS3(s3Key: string): Promise<ComplianceReport> {
    const params = {
      Bucket: this.awsClients.getS3ReportsBucket(),
      Key: s3Key
    };

    const result = await this.awsClients.s3.getObject(params).promise();
    const reportData = result.Body?.toString();
    
    if (!reportData) {
      throw new Error('Report data not found in S3');
    }

    const parsedReport = JSON.parse(reportData);
    
    // Convert date strings back to Date objects
    parsedReport.generatedAt = new Date(parsedReport.generatedAt);
    if (parsedReport.findings) {
      parsedReport.findings.forEach((finding: any) => {
        finding.detectedAt = new Date(finding.detectedAt);
      });
    }
    if (parsedReport.assessments) {
      parsedReport.assessments.forEach((assessment: any) => {
        assessment.assessedAt = new Date(assessment.assessedAt);
      });
    }

    return parsedReport;
  }

  private async deleteReportFromS3(s3Key: string): Promise<void> {
    const params = {
      Bucket: this.awsClients.getS3ReportsBucket(),
      Key: s3Key
    };

    await this.awsClients.s3.deleteObject(params).promise();
  }

  // DynamoDB Metadata Methods
  private async storeReportMetadata(report: ComplianceReport, s3Key: string): Promise<void> {
    // Enhanced metadata with comprehensive indexing attributes
    const item = {
      // Primary key
      reportId: report.id,
      
      // Basic report information
      reportType: report.type,
      generatedAt: report.generatedAt.toISOString(),
      s3Key: s3Key,
      
      // Scope information for filtering
      scope: JSON.stringify(report.scope),
      regulations: report.scope.regulations ? report.scope.regulations.join(',') : '',
      departments: report.scope.departments ? report.scope.departments.join(',') : '',
      resourceTypes: report.scope.resourceTypes ? report.scope.resourceTypes.join(',') : '',
      
      // Metrics for quick access
      findingsCount: report.findings.length,
      assessmentsCount: report.assessments.length,
      recommendationsCount: report.recommendations.length,
      
      // Severity breakdown for dashboard queries
      criticalFindings: report.findings.filter(f => f.severity === 'CRITICAL').length,
      highFindings: report.findings.filter(f => f.severity === 'HIGH').length,
      mediumFindings: report.findings.filter(f => f.severity === 'MEDIUM').length,
      lowFindings: report.findings.filter(f => f.severity === 'LOW').length,
      
      // Finding types breakdown
      piiExposures: report.findings.filter(f => f.findingType === 'PII_EXPOSURE').length,
      encryptionIssues: report.findings.filter(f => f.findingType === 'ENCRYPTION').length,
      accessControlIssues: report.findings.filter(f => f.findingType === 'ACCESS_CONTROL').length,
      loggingIssues: report.findings.filter(f => f.findingType === 'LOGGING').length,
      
      // GSI attributes for efficient querying
      typeGeneratedAt: `${report.type}#${report.generatedAt.toISOString()}`,
      statusDate: `ACTIVE#${report.generatedAt.toISOString()}`,
      
      // Time-based indexing for trend analysis
      yearMonth: `${report.generatedAt.getFullYear()}-${String(report.generatedAt.getMonth() + 1).padStart(2, '0')}`,
      year: report.generatedAt.getFullYear(),
      month: report.generatedAt.getMonth() + 1,
      day: report.generatedAt.getDate(),
      
      // Report-specific metrics
      ...(report.type === 'SUMMARY' && {
        overallScore: (report as ComplianceSummary).overallScore
      }),
      ...(report.type === 'AUDIT' && {
        complianceScore: (report as AuditReport).complianceScore,
        violationsCount: (report as AuditReport).violations.length
      }),
      ...(report.type === 'DPIA' && {
        riskLevel: (report as DPIAReport).riskAssessment.overallRisk,
        processingActivitiesCount: (report as DPIAReport).dataProcessingActivities.length
      }),
      ...(report.type === 'ROPA' && {
        processingActivitiesCount: (report as RoPAReport).processingActivities.length,
        dataCategoriesCount: (report as RoPAReport).dataCategories.length
      }),
      
      // Audit and compliance fields
      createdBy: process.env.SYSTEM_USER || 'privacy-comply-agent',
      lastModified: report.generatedAt.toISOString(),
      version: '1.0',
      status: 'ACTIVE',
      
      // TTL for automatic cleanup (7 years for compliance requirements)
      ttl: Math.floor((report.generatedAt.getTime() + (7 * 365 * 24 * 60 * 60 * 1000)) / 1000),
      
      // Additional search attributes
      searchableText: this.generateSearchableText(report),
      tags: this.generateReportTags(report)
    };

    const params = {
      TableName: this.awsClients.getDynamoDBTableName(),
      Item: item,
      // Conditional write to prevent overwrites
      ConditionExpression: 'attribute_not_exists(reportId)'
    };

    try {
      await this.awsClients.dynamodb.put(params).promise();
      console.log(`Report metadata stored for ${report.id} with enhanced indexing`);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ConditionalCheckFailedException') {
        console.warn(`Report ${report.id} already exists in metadata store`);
        throw new Error(`Report ${report.id} already exists`);
      }
      throw error;
    }
  }

  private async getReportMetadata(reportId: string): Promise<{ reportId: string; s3Key: string } | null> {
    const params = {
      TableName: this.awsClients.getDynamoDBTableName(),
      Key: { reportId }
    };

    const result = await this.awsClients.dynamodb.get(params).promise();
    
    if (!result.Item) {
      return null;
    }

    return {
      reportId: result.Item.reportId,
      s3Key: result.Item.s3Key
    };
  }

  private async queryReportMetadata(filters: {
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    status?: string;
    minScore?: number;
    maxFindings?: number;
    severityLevel?: string;
    limit?: number;
  }): Promise<{ reportId: string; s3Key: string; metadata?: any }[]> {
    const limit = filters.limit || 50; // Default limit for performance
    
    try {
      // Enhanced querying with multiple access patterns
      if (filters.type) {
        return await this.queryByTypeAndDate(filters, limit);
      } else if (filters.dateRange) {
        return await this.queryByDateRange(filters, limit);
      } else if (filters.regulation) {
        return await this.queryByRegulation(filters, limit);
      } else {
        return await this.scanWithFilters(filters, limit);
      }
    } catch (error) {
      console.error('Error querying report metadata:', error);
      throw new Error(`Failed to query reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async queryByTypeAndDate(filters: any, limit: number): Promise<{ reportId: string; s3Key: string; metadata?: any }[]> {
    const params: any = {
      TableName: this.awsClients.getDynamoDBTableName(),
      IndexName: 'TypeGeneratedAtIndex', // GSI for type-based queries
      KeyConditionExpression: 'reportType = :type',
      ExpressionAttributeValues: {
        ':type': filters.type
      },
      Limit: limit,
      ScanIndexForward: false // Most recent first
    };

    // Add date range to key condition if provided
    if (filters.dateRange) {
      params.KeyConditionExpression += ' AND generatedAt BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeValues[':startDate'] = filters.dateRange.startDate.toISOString();
      params.ExpressionAttributeValues[':endDate'] = filters.dateRange.endDate.toISOString();
    }

    // Add additional filters
    this.addFilterExpressions(params, filters);

    const result = await this.awsClients.dynamodb.query(params).promise();
    return this.mapQueryResults(result.Items || []);
  }

  private async queryByDateRange(filters: any, limit: number): Promise<{ reportId: string; s3Key: string; metadata?: any }[]> {
    const params: any = {
      TableName: this.awsClients.getDynamoDBTableName(),
      IndexName: 'StatusDateIndex', // GSI for date-based queries
      KeyConditionExpression: '#status = :status AND generatedAt BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': filters.status || 'ACTIVE',
        ':startDate': filters.dateRange.startDate.toISOString(),
        ':endDate': filters.dateRange.endDate.toISOString()
      },
      Limit: limit,
      ScanIndexForward: false
    };

    this.addFilterExpressions(params, filters);

    const result = await this.awsClients.dynamodb.query(params).promise();
    return this.mapQueryResults(result.Items || []);
  }

  private async queryByRegulation(filters: any, limit: number): Promise<{ reportId: string; s3Key: string; metadata?: any }[]> {
    // Use scan with filter for regulation-based queries (could be optimized with a GSI)
    const params: any = {
      TableName: this.awsClients.getDynamoDBTableName(),
      FilterExpression: 'contains(regulations, :regulation)',
      ExpressionAttributeValues: {
        ':regulation': filters.regulation
      },
      Limit: limit
    };

    this.addFilterExpressions(params, filters);

    const result = await this.awsClients.dynamodb.scan(params).promise();
    return this.mapQueryResults(result.Items || []);
  }

  private async scanWithFilters(filters: any, limit: number): Promise<{ reportId: string; s3Key: string; metadata?: any }[]> {
    const params: any = {
      TableName: this.awsClients.getDynamoDBTableName(),
      Limit: limit
    };

    this.addFilterExpressions(params, filters);

    const result = await this.awsClients.dynamodb.scan(params).promise();
    return this.mapQueryResults(result.Items || []);
  }

  private addFilterExpressions(params: any, filters: any): void {
    const filterExpressions: string[] = [];
    
    if (!params.ExpressionAttributeValues) {
      params.ExpressionAttributeValues = {};
    }
    if (!params.ExpressionAttributeNames) {
      params.ExpressionAttributeNames = {};
    }

    // Department filter
    if (filters.department) {
      filterExpressions.push('contains(departments, :department)');
      params.ExpressionAttributeValues[':department'] = filters.department;
    }

    // Score filters
    if (filters.minScore !== undefined) {
      filterExpressions.push('(overallScore >= :minScore OR complianceScore >= :minScore)');
      params.ExpressionAttributeValues[':minScore'] = filters.minScore;
    }

    // Findings count filter
    if (filters.maxFindings !== undefined) {
      filterExpressions.push('findingsCount <= :maxFindings');
      params.ExpressionAttributeValues[':maxFindings'] = filters.maxFindings;
    }

    // Severity level filter
    if (filters.severityLevel) {
      switch (filters.severityLevel.toUpperCase()) {
        case 'CRITICAL':
          filterExpressions.push('criticalFindings > :zero');
          params.ExpressionAttributeValues[':zero'] = 0;
          break;
        case 'HIGH':
          filterExpressions.push('(criticalFindings > :zero OR highFindings > :zero)');
          params.ExpressionAttributeValues[':zero'] = 0;
          break;
        case 'MEDIUM':
          filterExpressions.push('(criticalFindings > :zero OR highFindings > :zero OR mediumFindings > :zero)');
          params.ExpressionAttributeValues[':zero'] = 0;
          break;
      }
    }

    // Status filter (if not already in key condition)
    if (filters.status && !params.KeyConditionExpression?.includes('status')) {
      filterExpressions.push('#status = :statusFilter');
      params.ExpressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':statusFilter'] = filters.status;
    }

    // Combine filter expressions
    if (filterExpressions.length > 0) {
      const existingFilter = params.FilterExpression;
      const newFilter = filterExpressions.join(' AND ');
      params.FilterExpression = existingFilter 
        ? `${existingFilter} AND ${newFilter}`
        : newFilter;
    }
  }

  private mapQueryResults(items: any[]): { reportId: string; s3Key: string; metadata?: any }[] {
    return items.map(item => ({
      reportId: item.reportId,
      s3Key: item.s3Key,
      metadata: {
        reportType: item.reportType,
        generatedAt: item.generatedAt,
        findingsCount: item.findingsCount,
        assessmentsCount: item.assessmentsCount,
        recommendationsCount: item.recommendationsCount,
        criticalFindings: item.criticalFindings,
        highFindings: item.highFindings,
        overallScore: item.overallScore,
        complianceScore: item.complianceScore,
        regulations: item.regulations,
        departments: item.departments,
        status: item.status
      }
    }));
  }

  private async deleteReportMetadata(reportId: string): Promise<void> {
    const params = {
      TableName: this.awsClients.getDynamoDBTableName(),
      Key: { reportId }
    };

    await this.awsClients.dynamodb.delete(params).promise();
  }

  private async storeReportSchedule(
    scheduleId: string,
    reportType: string,
    scope: ReportScope,
    schedule: { frequency: string; time: string }
  ): Promise<void> {
    const item = {
      scheduleId: scheduleId,
      reportType: reportType,
      scope: JSON.stringify(scope),
      frequency: schedule.frequency,
      time: schedule.time,
      createdAt: new Date().toISOString(),
      active: true
    };

    const params = {
      TableName: `${this.awsClients.getDynamoDBTableName()}-schedules`, // Separate table for schedules
      Item: item
    };

    await this.awsClients.dynamodb.put(params).promise();
  }

  // Export Methods
  private exportReportAsCSV(report: ComplianceReport): Buffer {
    const csvLines: string[] = [];
    
    // Header
    csvLines.push('Report ID,Type,Generated At,Findings Count,Overall Score');
    
    // Report summary
    const overallScore = report.type === 'SUMMARY' 
      ? (report as ComplianceSummary).overallScore 
      : report.type === 'AUDIT'
      ? (report as AuditReport).complianceScore
      : 'N/A';
    
    csvLines.push(`${report.id},${report.type},${report.generatedAt.toISOString()},${report.findings.length},${overallScore}`);
    
    // Findings section
    csvLines.push('');
    csvLines.push('Findings');
    csvLines.push('ID,Resource ARN,Type,Severity,Description,Detected At');
    
    report.findings.forEach(finding => {
      csvLines.push(`${finding.id},${finding.resourceArn},${finding.findingType},${finding.severity},"${finding.description}",${finding.detectedAt.toISOString()}`);
    });
    
    // Recommendations section
    csvLines.push('');
    csvLines.push('Recommendations');
    csvLines.push('ID,Action,Priority,Automatable,Description');
    
    report.recommendations.forEach(rec => {
      csvLines.push(`${rec.id},${rec.action},${rec.priority},${rec.automatable},"${rec.estimatedImpact}"`);
    });
    
    return Buffer.from(csvLines.join('\n'));
  }

  private exportReportAsPDF(report: ComplianceReport): Buffer {
    // For now, return a simple text-based PDF content
    // In a real implementation, this would use a PDF generation library
    const pdfContent = `
COMPLIANCE REPORT
================

Report ID: ${report.id}
Type: ${report.type}
Generated: ${report.generatedAt.toISOString()}

EXECUTIVE SUMMARY
================
${report.executiveSummary}

FINDINGS SUMMARY
===============
Total Findings: ${report.findings.length}
Critical: ${report.findings.filter(f => f.severity === 'CRITICAL').length}
High: ${report.findings.filter(f => f.severity === 'HIGH').length}
Medium: ${report.findings.filter(f => f.severity === 'MEDIUM').length}
Low: ${report.findings.filter(f => f.severity === 'LOW').length}

RECOMMENDATIONS
==============
Total Recommendations: ${report.recommendations.length}
High Priority: ${report.recommendations.filter(r => r.priority === 'HIGH').length}
Automatable: ${report.recommendations.filter(r => r.automatable).length}

DETAILED FINDINGS
================
${report.findings.map(f => `
Finding: ${f.id}
Resource: ${f.resourceArn}
Type: ${f.findingType}
Severity: ${f.severity}
Description: ${f.description}
Detected: ${f.detectedAt.toISOString()}
`).join('\n')}
`;

    return Buffer.from(pdfContent);
  }

  // Helper methods for enhanced storage and indexing

  private generateS3Tags(report: ComplianceReport): string {
    const tags = [
      `ReportType=${report.type}`,
      `GeneratedYear=${report.generatedAt.getFullYear()}`,
      `FindingsCount=${report.findings.length}`,
      `Environment=${process.env.NODE_ENV || 'development'}`,
      `System=PrivacyComplyAgent`
    ];

    if (report.scope.regulations) {
      tags.push(`Regulations=${report.scope.regulations.join('-')}`);
    }

    if (report.scope.departments) {
      tags.push(`Departments=${report.scope.departments.join('-')}`);
    }

    // Add severity-based tags
    const criticalCount = report.findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = report.findings.filter(f => f.severity === 'HIGH').length;
    
    if (criticalCount > 0) {
      tags.push(`CriticalFindings=${criticalCount}`);
    }
    if (highCount > 0) {
      tags.push(`HighFindings=${highCount}`);
    }

    return tags.join('&');
  }

  private generateSearchableText(report: ComplianceReport): string {
    const searchTerms = [
      report.type,
      report.executiveSummary,
      ...report.findings.map(f => `${f.findingType} ${f.description}`),
      ...report.recommendations.map(r => `${r.action} ${r.estimatedImpact}`),
      ...(report.scope.regulations || []),
      ...(report.scope.departments || []),
      ...(report.scope.resourceTypes || [])
    ];

    return searchTerms
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateReportTags(report: ComplianceReport): string[] {
    const tags = [
      `type:${report.type.toLowerCase()}`,
      `year:${report.generatedAt.getFullYear()}`,
      `month:${report.generatedAt.getMonth() + 1}`,
      `findings:${report.findings.length}`,
      `recommendations:${report.recommendations.length}`
    ];

    // Add regulation tags
    if (report.scope.regulations) {
      tags.push(...report.scope.regulations.map(reg => `regulation:${reg.toLowerCase()}`));
    }

    // Add department tags
    if (report.scope.departments) {
      tags.push(...report.scope.departments.map(dept => `department:${dept.toLowerCase()}`));
    }

    // Add severity tags
    const severityCounts = {
      critical: report.findings.filter(f => f.severity === 'CRITICAL').length,
      high: report.findings.filter(f => f.severity === 'HIGH').length,
      medium: report.findings.filter(f => f.severity === 'MEDIUM').length,
      low: report.findings.filter(f => f.severity === 'LOW').length
    };

    Object.entries(severityCounts).forEach(([severity, count]) => {
      if (count > 0) {
        tags.push(`${severity}:${count}`);
      }
    });

    // Add finding type tags
    const findingTypes = [...new Set(report.findings.map(f => f.findingType))];
    tags.push(...findingTypes.map(type => `finding-type:${type.toLowerCase()}`));

    return tags;
  }

  // Enhanced API methods for report query and retrieval

  /**
   * Advanced report search with multiple criteria
   */
  async searchReports(searchCriteria: {
    query?: string;
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    severityLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    minScore?: number;
    maxFindings?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    reports: ComplianceReport[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      // Query metadata first for efficient filtering
      const metadataResults = await this.queryReportMetadata({
        type: searchCriteria.type,
        dateRange: searchCriteria.dateRange,
        regulation: searchCriteria.regulation,
        department: searchCriteria.department,
        status: searchCriteria.status,
        minScore: searchCriteria.minScore,
        maxFindings: searchCriteria.maxFindings,
        severityLevel: searchCriteria.severityLevel,
        limit: (searchCriteria.limit || 20) + (searchCriteria.offset || 0)
      });

      // Apply text search if query provided
      let filteredResults = metadataResults;
      if (searchCriteria.query) {
        const queryLower = searchCriteria.query.toLowerCase();
        filteredResults = metadataResults.filter(result => 
          result.metadata?.searchableText?.includes(queryLower) ||
          result.reportId.toLowerCase().includes(queryLower)
        );
      }

      // Apply pagination
      const offset = searchCriteria.offset || 0;
      const limit = searchCriteria.limit || 20;
      const paginatedResults = filteredResults.slice(offset, offset + limit);

      // Retrieve full reports from S3
      const reports: ComplianceReport[] = [];
      for (const result of paginatedResults) {
        try {
          const report = await this.getReportFromS3(result.s3Key);
          reports.push(report);
        } catch (error) {
          console.error(`Error retrieving report ${result.reportId}:`, error);
          // Continue with other reports
        }
      }

      return {
        reports,
        totalCount: filteredResults.length,
        hasMore: filteredResults.length > offset + limit
      };
    } catch (error) {
      console.error('Error searching reports:', error);
      throw new Error(`Failed to search reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get report summary without full content for dashboard views
   */
  async getReportSummary(reportId: string): Promise<{
    id: string;
    type: string;
    generatedAt: Date;
    findingsCount: number;
    criticalFindings: number;
    highFindings: number;
    overallScore?: number;
    complianceScore?: number;
    status: string;
  } | null> {
    try {
      const metadata = await this.getReportMetadata(reportId);
      if (!metadata) {
        return null;
      }

      // Get additional metadata from DynamoDB
      const params = {
        TableName: this.awsClients.getDynamoDBTableName(),
        Key: { reportId }
      };

      const result = await this.awsClients.dynamodb.get(params).promise();
      if (!result.Item) {
        return null;
      }

      return {
        id: result.Item.reportId,
        type: result.Item.reportType,
        generatedAt: new Date(result.Item.generatedAt),
        findingsCount: result.Item.findingsCount || 0,
        criticalFindings: result.Item.criticalFindings || 0,
        highFindings: result.Item.highFindings || 0,
        overallScore: result.Item.overallScore,
        complianceScore: result.Item.complianceScore,
        status: result.Item.status || 'ACTIVE'
      };
    } catch (error) {
      console.error('Error getting report summary:', error);
      return null;
    }
  }

  /**
   * Get compliance trends over time
   */
  async getComplianceTrends(filters: {
    regulation?: string;
    department?: string;
    timeRange: DateRange;
    granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }): Promise<{
    period: string;
    reportsCount: number;
    averageScore: number;
    totalFindings: number;
    criticalFindings: number;
  }[]> {
    try {
      // Query reports within time range
      const reports = await this.queryReportMetadata({
        dateRange: filters.timeRange,
        regulation: filters.regulation,
        department: filters.department,
        limit: 1000 // Large limit for trend analysis
      });

      // Group by time period
      const trends = new Map<string, {
        reportsCount: number;
        totalScore: number;
        totalFindings: number;
        criticalFindings: number;
      }>();

      reports.forEach(report => {
        if (!report.metadata) return;

        const date = new Date(report.metadata.generatedAt);
        let period: string;

        switch (filters.granularity) {
          case 'DAILY':
            period = date.toISOString().split('T')[0];
            break;
          case 'WEEKLY':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            period = weekStart.toISOString().split('T')[0];
            break;
          case 'MONTHLY':
            period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            period = date.toISOString().split('T')[0];
        }

        if (!trends.has(period)) {
          trends.set(period, {
            reportsCount: 0,
            totalScore: 0,
            totalFindings: 0,
            criticalFindings: 0
          });
        }

        const trend = trends.get(period)!;
        trend.reportsCount++;
        trend.totalScore += report.metadata.overallScore || report.metadata.complianceScore || 0;
        trend.totalFindings += report.metadata.findingsCount || 0;
        trend.criticalFindings += report.metadata.criticalFindings || 0;
      });

      // Convert to array and calculate averages
      return Array.from(trends.entries())
        .map(([period, data]) => ({
          period,
          reportsCount: data.reportsCount,
          averageScore: data.reportsCount > 0 ? Math.round(data.totalScore / data.reportsCount) : 0,
          totalFindings: data.totalFindings,
          criticalFindings: data.criticalFindings
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error getting compliance trends:', error);
      throw new Error(`Failed to get compliance trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}