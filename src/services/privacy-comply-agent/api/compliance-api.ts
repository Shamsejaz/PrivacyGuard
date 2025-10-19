/**
 * Compliance Findings API
 * REST endpoints for accessing and managing compliance findings and assessments
 */

import { AgentController } from '../orchestration/agent-controller';
import {
  APIResponse,
  PaginatedResponse,
  FindingsQueryParams,
  FindingDetailsResponse,
  ComplianceMetricsResponse
} from './types';
import {
  ComplianceFinding,
  ComplianceAssessment,
  RemediationRecommendation,
  RemediationResult
} from '../types';

export class ComplianceAPI {
  private agentController: AgentController;
  private findingsCache: Map<string, ComplianceFinding> = new Map();
  private assessmentsCache: Map<string, ComplianceAssessment> = new Map();

  constructor(agentController: AgentController) {
    this.agentController = agentController;
  }

  /**
   * GET /api/compliance/findings
   * Get paginated list of compliance findings with filtering
   */
  async getFindings(params: FindingsQueryParams = {}): Promise<PaginatedResponse<ComplianceFinding>> {
    try {
      // Get latest findings from agent
      const workflowResult = await this.agentController.executeComplianceWorkflow({
        skipRemediation: true,
        generateReport: false
      });

      let findings = workflowResult.findings;

      // Apply filters
      findings = this.applyFindingsFilters(findings, params);

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedFindings = findings.slice(startIndex, endIndex);
      const totalPages = Math.ceil(findings.length / limit);

      return {
        success: true,
        data: paginatedFindings,
        pagination: {
          page,
          limit,
          total: findings.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get findings',
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/compliance/findings/:id
   * Get detailed information about a specific finding
   */
  async getFindingDetails(findingId: string): Promise<FindingDetailsResponse> {
    try {
      // Get finding from cache or fetch from agent
      let finding = this.findingsCache.get(findingId);
      
      if (!finding) {
        const workflowResult = await this.agentController.executeComplianceWorkflow({
          skipRemediation: true,
          generateReport: false
        });
        
        finding = workflowResult.findings.find(f => f.id === findingId);
        
        if (!finding) {
          return {
            success: false,
            error: `Finding with ID ${findingId} not found`,
            timestamp: new Date().toISOString()
          };
        }
        
        // Cache the finding
        this.findingsCache.set(findingId, finding);
      }

      // Get assessment for this finding
      const assessment = this.assessmentsCache.get(findingId) || 
        await this.getAssessmentForFinding(findingId);

      // Get recommendations
      const recommendations = assessment ? 
        await this.getRecommendationsForAssessment(assessment) : [];

      // Get remediation history (simulated for now)
      const remediationHistory = await this.getRemediationHistoryForFinding(findingId);

      return {
        success: true,
        data: finding,
        assessment,
        recommendations,
        remediationHistory,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get finding details',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/compliance/metrics
   * Get compliance metrics and statistics
   */
  async getComplianceMetrics(): Promise<APIResponse<ComplianceMetricsResponse>> {
    try {
      const workflowResult = await this.agentController.executeComplianceWorkflow({
        skipRemediation: true,
        generateReport: false
      });

      const findings = workflowResult.findings;
      
      // Calculate metrics
      const totalFindings = findings.length;
      
      const findingsBySeverity = findings.reduce((acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const findingsByType = findings.reduce((acc, finding) => {
        acc[finding.findingType] = (acc[finding.findingType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const findingsByRegion = findings.reduce((acc, finding) => {
        const region = this.extractRegionFromArn(finding.resourceArn);
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate compliance score (simplified)
      const complianceScore = this.calculateComplianceScore(findings);

      // Generate trend data (simulated)
      const trends = this.generateTrendData();

      const metrics: ComplianceMetricsResponse = {
        totalFindings,
        findingsBySeverity,
        findingsByType,
        findingsByRegion,
        complianceScore,
        trends
      };

      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get compliance metrics',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/compliance/scan
   * Trigger a new compliance scan
   */
  async triggerComplianceScan(options?: {
    skipRemediation?: boolean;
    generateReport?: boolean;
  }): Promise<APIResponse<{
    workflowId: string;
    findings: number;
    assessments: number;
    recommendations: number;
    executionTime: number;
  }>> {
    try {
      const workflowResult = await this.agentController.executeComplianceWorkflow(options);

      // Update caches
      workflowResult.findings.forEach(finding => {
        this.findingsCache.set(finding.id, finding);
      });

      workflowResult.assessments.forEach(assessment => {
        this.assessmentsCache.set(assessment.findingId, assessment);
      });

      return {
        success: true,
        data: {
          workflowId: workflowResult.workflowId,
          findings: workflowResult.findings.length,
          assessments: workflowResult.assessments.length,
          recommendations: workflowResult.recommendations.length,
          executionTime: workflowResult.executionTime
        },
        message: 'Compliance scan completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compliance scan failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/compliance/assessments/:findingId
   * Get compliance assessment for a specific finding
   */
  async getAssessment(findingId: string): Promise<APIResponse<ComplianceAssessment>> {
    try {
      const assessment = await this.getAssessmentForFinding(findingId);
      
      if (!assessment) {
        return {
          success: false,
          error: `Assessment for finding ${findingId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: assessment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get assessment',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * DELETE /api/compliance/cache
   * Clear findings and assessments cache
   */
  async clearCache(): Promise<APIResponse<{ message: string }>> {
    try {
      this.findingsCache.clear();
      this.assessmentsCache.clear();

      return {
        success: true,
        data: { message: 'Cache cleared successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private applyFindingsFilters(findings: ComplianceFinding[], params: FindingsQueryParams): ComplianceFinding[] {
    let filtered = [...findings];

    // Filter by severity
    if (params.severity) {
      filtered = filtered.filter(f => f.severity === params.severity);
    }

    // Filter by finding type
    if (params.findingType) {
      filtered = filtered.filter(f => f.findingType === params.findingType);
    }

    // Filter by resource type
    if (params.resourceType) {
      filtered = filtered.filter(f => f.resourceArn.includes(params.resourceType));
    }

    // Filter by region
    if (params.region) {
      filtered = filtered.filter(f => f.resourceArn.includes(params.region));
    }

    // Filter by date range
    if (params.dateFrom) {
      const fromDate = new Date(params.dateFrom);
      filtered = filtered.filter(f => f.detectedAt >= fromDate);
    }

    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      filtered = filtered.filter(f => f.detectedAt <= toDate);
    }

    // Apply sorting
    if (params.sortBy) {
      filtered.sort((a, b) => {
        const aValue = this.getFieldValue(a, params.sortBy!);
        const bValue = this.getFieldValue(b, params.sortBy!);
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return params.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }

  private getFieldValue(finding: ComplianceFinding, field: string): any {
    switch (field) {
      case 'severity':
        return this.getSeverityWeight(finding.severity);
      case 'detectedAt':
        return finding.detectedAt.getTime();
      case 'resourceArn':
        return finding.resourceArn;
      case 'findingType':
        return finding.findingType;
      default:
        return finding.id;
    }
  }

  private getSeverityWeight(severity: string): number {
    const weights = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    return weights[severity] || 0;
  }

  private extractRegionFromArn(arn: string): string {
    const parts = arn.split(':');
    return parts.length > 3 ? parts[3] : 'unknown';
  }

  private calculateComplianceScore(findings: ComplianceFinding[]): number {
    if (findings.length === 0) return 1.0;

    const severityWeights = { 'LOW': 0.1, 'MEDIUM': 0.3, 'HIGH': 0.6, 'CRITICAL': 1.0 };
    const totalWeight = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    // Score decreases with more severe issues
    const maxPossibleWeight = findings.length * 1.0;
    return Math.max(0, 1 - (totalWeight / maxPossibleWeight));
  }

  private generateTrendData(): Array<{
    period: string;
    findings: number;
    resolved: number;
    score: number;
  }> {
    // Simulated trend data - in production this would come from historical data
    const periods = ['30d', '7d', '1d'];
    return periods.map(period => ({
      period,
      findings: Math.floor(Math.random() * 50) + 10,
      resolved: Math.floor(Math.random() * 30) + 5,
      score: Math.random() * 0.3 + 0.7 // Score between 0.7 and 1.0
    }));
  }

  private async getAssessmentForFinding(findingId: string): Promise<ComplianceAssessment | undefined> {
    // Check cache first
    if (this.assessmentsCache.has(findingId)) {
      return this.assessmentsCache.get(findingId);
    }

    // In a real implementation, this would query the reasoning engine
    // For now, we'll simulate an assessment
    const mockAssessment: ComplianceAssessment = {
      findingId,
      legalMappings: [
        {
          regulation: 'GDPR',
          article: 'Article 32',
          description: 'Security of processing',
          applicability: 0.9
        }
      ],
      riskScore: 0.8,
      confidenceScore: 0.85,
      recommendations: [],
      reasoning: 'This finding indicates a potential security vulnerability that may violate GDPR Article 32 requirements for appropriate technical measures.',
      assessedAt: new Date()
    };

    this.assessmentsCache.set(findingId, mockAssessment);
    return mockAssessment;
  }

  private async getRecommendationsForAssessment(assessment: ComplianceAssessment): Promise<RemediationRecommendation[]> {
    // In a real implementation, this would use the reasoning engine
    // For now, we'll return mock recommendations
    return [
      {
        id: `rec-${assessment.findingId}`,
        findingId: assessment.findingId,
        action: 'ENABLE_ENCRYPTION',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'encryption-enablement',
        parameters: { encryptionType: 'AES256' },
        estimatedImpact: 'Low - Encryption will be enabled without service disruption'
      }
    ];
  }

  private async getRemediationHistoryForFinding(findingId: string): Promise<RemediationResult[]> {
    // In a real implementation, this would query the remediation service
    // For now, we'll return mock history
    return [
      {
        remediationId: `rem-${findingId}-1`,
        success: true,
        message: 'Encryption enabled successfully',
        executedAt: new Date(Date.now() - 86400000), // 1 day ago
        rollbackAvailable: true,
        findingId
      }
    ];
  }
}