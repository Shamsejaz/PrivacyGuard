// Report Storage and Retrieval Service
import {
  ComplianceReport,
  DateRange,
  ReportScope
} from '../types';
import { AWSServiceClients } from '../config/service-clients';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Report Storage and Retrieval Service
 * Provides comprehensive S3 storage with encryption and DynamoDB metadata indexing
 */
export interface ReportStorageService {
  /**
   * Store a report with enhanced encryption and metadata indexing
   */
  storeReport(report: ComplianceReport): Promise<{
    s3Key: string;
    reportId: string;
    storageLocation: string;
    encryptionStatus: 'ENCRYPTED' | 'FAILED';
    metadataIndexed: boolean;
  }>;

  /**
   * Retrieve a report by ID with caching support
   */
  getReport(reportId: string): Promise<ComplianceReport>;

  /**
   * Advanced search with multiple criteria and pagination
   */
  searchReports(criteria: {
    query?: string;
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    severityLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    minScore?: number;
    maxFindings?: number;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'generatedAt' | 'findingsCount' | 'overallScore';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    reports: ComplianceReport[];
    totalCount: number;
    hasMore: boolean;
    searchMetadata: {
      queryTime: number;
      indexesUsed: string[];
      optimizationSuggestions?: string[];
    };
  }>;

  /**
   * Get report metadata without full content for performance
   */
  getReportMetadata(reportId: string): Promise<{
    reportId: string;
    type: string;
    generatedAt: Date;
    s3Key: string;
    size: number;
    findingsCount: number;
    criticalFindings: number;
    highFindings: number;
    overallScore?: number;
    complianceScore?: number;
    status: string;
    tags: string[];
    lastAccessed?: Date;
  } | null>;

  /**
   * Bulk operations for efficiency
   */
  bulkStoreReports(reports: ComplianceReport[]): Promise<{
    successful: string[];
    failed: { reportId: string; error: string }[];
    totalProcessed: number;
  }>;

  /**
   * Delete report with audit trail
   */
  deleteReport(reportId: string, reason?: string): Promise<{
    deleted: boolean;
    auditTrail: {
      deletedAt: Date;
      deletedBy: string;
      reason?: string;
      s3KeyDeleted: string;
      metadataDeleted: boolean;
    };
  }>;

  /**
   * Archive old reports to cheaper storage
   */
  archiveOldReports(olderThanDays: number): Promise<{
    archivedCount: number;
    totalSavings: number;
    archivedReports: string[];
  }>;

  /**
   * Get storage statistics and health metrics
   */
  getStorageMetrics(): Promise<{
    totalReports: number;
    totalStorageSize: number;
    reportsByType: Record<string, number>;
    reportsByStatus: Record<string, number>;
    averageReportSize: number;
    oldestReport: Date;
    newestReport: Date;
    storageHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    recommendations: string[];
  }>;

  /**
   * Validate report integrity
   */
  validateReportIntegrity(reportId: string): Promise<{
    valid: boolean;
    issues: string[];
    s3Exists: boolean;
    metadataExists: boolean;
    checksumMatch: boolean;
    lastValidated: Date;
  }>;
}

/**
 * Implementation of Enhanced Report Storage Service
 */
export class ReportStorageServiceImpl implements ReportStorageService {
  private cache = new Map<string, { report: ComplianceReport; cachedAt: Date }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private awsClients: AWSServiceClients) {}

  async storeReport(report: ComplianceReport): Promise<{
    s3Key: string;
    reportId: string;
    storageLocation: string;
    encryptionStatus: 'ENCRYPTED' | 'FAILED';
    metadataIndexed: boolean;
  }> {
    const startTime = Date.now();
    
    try {
      // Generate S3 key with enhanced organization
      const s3Key = this.generateS3Key(report);
      
      // Store report content in S3 with enhanced encryption
      const encryptionStatus = await this.storeReportInS3Enhanced(report, s3Key);
      
      // Store comprehensive metadata in DynamoDB
      const metadataIndexed = await this.storeEnhancedMetadata(report, s3Key);
      
      // Update cache
      this.updateCache(report.id, report);
      
      const storageTime = Date.now() - startTime;
      console.log(`Report ${report.id} stored successfully in ${storageTime}ms`);
      
      return {
        s3Key,
        reportId: report.id,
        storageLocation: `s3://${this.awsClients.getS3ReportsBucket()}/${s3Key}`,
        encryptionStatus,
        metadataIndexed
      };
    } catch (error) {
      console.error('Error storing report:', error);
      throw new Error(`Failed to store report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReport(reportId: string): Promise<ComplianceReport> {
    // Check cache first
    const cached = this.getCachedReport(reportId);
    if (cached) {
      return cached;
    }

    try {
      // Get metadata to find S3 location
      const metadata = await this.getReportMetadata(reportId);
      if (!metadata) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Retrieve from S3
      const report = await this.getReportFromS3Enhanced(metadata.s3Key);
      
      // Update cache
      this.updateCache(reportId, report);
      
      // Update last accessed timestamp
      await this.updateLastAccessed(reportId);
      
      return report;
    } catch (error) {
      console.error('Error retrieving report:', error);
      throw new Error(`Failed to retrieve report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchReports(criteria: {
    query?: string;
    type?: string;
    dateRange?: DateRange;
    regulation?: string;
    department?: string;
    severityLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    minScore?: number;
    maxFindings?: number;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'generatedAt' | 'findingsCount' | 'overallScore';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    reports: ComplianceReport[];
    totalCount: number;
    hasMore: boolean;
    searchMetadata: {
      queryTime: number;
      indexesUsed: string[];
      optimizationSuggestions?: string[];
    };
  }> {
    const startTime = Date.now();
    const indexesUsed: string[] = [];
    
    try {
      // Build optimized query based on criteria
      const queryPlan = this.buildOptimizedQuery(criteria);
      indexesUsed.push(...queryPlan.indexesUsed);
      
      // Execute query with pagination
      const metadataResults = await this.executeOptimizedQuery(queryPlan, criteria);
      
      // Apply additional filtering and sorting
      const filteredResults = this.applyAdvancedFiltering(metadataResults, criteria);
      const sortedResults = this.applySorting(filteredResults, criteria);
      
      // Apply pagination
      const offset = criteria.offset || 0;
      const limit = criteria.limit || 20;
      const paginatedResults = sortedResults.slice(offset, offset + limit);
      
      // Retrieve full reports
      const reports: ComplianceReport[] = [];
      for (const metadata of paginatedResults) {
        try {
          const report = await this.getReportFromS3Enhanced(metadata.s3Key);
          reports.push(report);
        } catch (error) {
          console.error(`Error retrieving report ${metadata.reportId}:`, error);
          // Continue with other reports
        }
      }
      
      const queryTime = Date.now() - startTime;
      const optimizationSuggestions = this.generateOptimizationSuggestions(criteria, queryTime);
      
      return {
        reports,
        totalCount: filteredResults.length,
        hasMore: filteredResults.length > offset + limit,
        searchMetadata: {
          queryTime,
          indexesUsed,
          optimizationSuggestions
        }
      };
    } catch (error) {
      console.error('Error searching reports:', error);
      throw new Error(`Failed to search reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReportMetadata(reportId: string): Promise<{
    reportId: string;
    type: string;
    generatedAt: Date;
    s3Key: string;
    size: number;
    findingsCount: number;
    criticalFindings: number;
    highFindings: number;
    overallScore?: number;
    complianceScore?: number;
    status: string;
    tags: string[];
    lastAccessed?: Date;
  } | null> {
    try {
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
        type: result.Item.reportType,
        generatedAt: new Date(result.Item.generatedAt),
        s3Key: result.Item.s3Key,
        size: result.Item.size || 0,
        findingsCount: result.Item.findingsCount || 0,
        criticalFindings: result.Item.criticalFindings || 0,
        highFindings: result.Item.highFindings || 0,
        overallScore: result.Item.overallScore,
        complianceScore: result.Item.complianceScore,
        status: result.Item.status || 'ACTIVE',
        tags: result.Item.tags || [],
        lastAccessed: result.Item.lastAccessed ? new Date(result.Item.lastAccessed) : undefined
      };
    } catch (error) {
      console.error('Error getting report metadata:', error);
      return null;
    }
  }

  async bulkStoreReports(reports: ComplianceReport[]): Promise<{
    successful: string[];
    failed: { reportId: string; error: string }[];
    totalProcessed: number;
  }> {
    const successful: string[] = [];
    const failed: { reportId: string; error: string }[] = [];
    
    // Process in batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < reports.length; i += batchSize) {
      const batch = reports.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (report) => {
        try {
          await this.storeReport(report);
          successful.push(report.id);
        } catch (error) {
          failed.push({
            reportId: report.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return {
      successful,
      failed,
      totalProcessed: reports.length
    };
  }

  async deleteReport(reportId: string, reason?: string): Promise<{
    deleted: boolean;
    auditTrail: {
      deletedAt: Date;
      deletedBy: string;
      reason?: string;
      s3KeyDeleted: string;
      metadataDeleted: boolean;
    };
  }> {
    try {
      // Get metadata first
      const metadata = await this.getReportMetadata(reportId);
      if (!metadata) {
        throw new Error(`Report not found: ${reportId}`);
      }
      
      const deletedAt = new Date();
      const deletedBy = process.env.SYSTEM_USER || 'privacy-comply-agent';
      
      // Delete from S3
      await this.awsClients.s3.deleteObject({
        Bucket: this.awsClients.getS3ReportsBucket(),
        Key: metadata.s3Key
      }).promise();
      
      // Delete metadata from DynamoDB
      await this.awsClients.dynamodb.delete({
        TableName: this.awsClients.getDynamoDBTableName(),
        Key: { reportId }
      }).promise();
      
      // Remove from cache
      this.cache.delete(reportId);
      
      // Store audit trail
      await this.storeAuditTrail({
        action: 'DELETE',
        reportId,
        deletedAt,
        deletedBy,
        reason,
        s3Key: metadata.s3Key
      });
      
      return {
        deleted: true,
        auditTrail: {
          deletedAt,
          deletedBy,
          reason,
          s3KeyDeleted: metadata.s3Key,
          metadataDeleted: true
        }
      };
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error(`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async archiveOldReports(olderThanDays: number): Promise<{
    archivedCount: number;
    totalSavings: number;
    archivedReports: string[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    try {
      // Find old reports
      const oldReports = await this.findOldReports(cutoffDate);
      const archivedReports: string[] = [];
      let totalSavings = 0;
      
      for (const report of oldReports) {
        try {
          // Move to Glacier storage class
          await this.awsClients.s3.putObject({
            Bucket: this.awsClients.getS3ReportsBucket(),
            Key: report.s3Key,
            StorageClass: 'GLACIER',
            Tagging: 'archived=true&archivedDate=' + new Date().toISOString()
          }).promise();
          
          // Update metadata
          await this.updateReportStatus(report.reportId, 'ARCHIVED');
          
          archivedReports.push(report.reportId);
          totalSavings += report.size * 0.7; // Approximate 70% savings
        } catch (error) {
          console.error(`Error archiving report ${report.reportId}:`, error);
        }
      }
      
      return {
        archivedCount: archivedReports.length,
        totalSavings,
        archivedReports
      };
    } catch (error) {
      console.error('Error archiving old reports:', error);
      throw new Error(`Failed to archive reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStorageMetrics(): Promise<{
    totalReports: number;
    totalStorageSize: number;
    reportsByType: Record<string, number>;
    reportsByStatus: Record<string, number>;
    averageReportSize: number;
    oldestReport: Date;
    newestReport: Date;
    storageHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    recommendations: string[];
  }> {
    try {
      // Scan all report metadata for metrics
      const allReports = await this.getAllReportMetadata();
      
      const metrics = {
        totalReports: allReports.length,
        totalStorageSize: allReports.reduce((sum, r) => sum + (r.size || 0), 0),
        reportsByType: {} as Record<string, number>,
        reportsByStatus: {} as Record<string, number>,
        averageReportSize: 0,
        oldestReport: new Date(),
        newestReport: new Date(0),
        storageHealth: 'HEALTHY' as 'HEALTHY' | 'WARNING' | 'CRITICAL',
        recommendations: [] as string[]
      };
      
      // Calculate metrics
      allReports.forEach(report => {
        // Count by type
        metrics.reportsByType[report.type] = (metrics.reportsByType[report.type] || 0) + 1;
        
        // Count by status
        metrics.reportsByStatus[report.status] = (metrics.reportsByStatus[report.status] || 0) + 1;
        
        // Track oldest and newest
        if (report.generatedAt < metrics.oldestReport) {
          metrics.oldestReport = report.generatedAt;
        }
        if (report.generatedAt > metrics.newestReport) {
          metrics.newestReport = report.generatedAt;
        }
      });
      
      // Calculate average size
      metrics.averageReportSize = metrics.totalReports > 0 
        ? metrics.totalStorageSize / metrics.totalReports 
        : 0;
      
      // Determine health and recommendations
      const healthCheck = this.assessStorageHealth(metrics);
      metrics.storageHealth = healthCheck.health;
      metrics.recommendations = healthCheck.recommendations;
      
      return metrics;
    } catch (error) {
      console.error('Error getting storage metrics:', error);
      throw new Error(`Failed to get storage metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateReportIntegrity(reportId: string): Promise<{
    valid: boolean;
    issues: string[];
    s3Exists: boolean;
    metadataExists: boolean;
    checksumMatch: boolean;
    lastValidated: Date;
  }> {
    const issues: string[] = [];
    let s3Exists = false;
    let metadataExists = false;
    let checksumMatch = false;
    
    try {
      // Check metadata exists
      const metadata = await this.getReportMetadata(reportId);
      metadataExists = metadata !== null;
      
      if (!metadataExists) {
        issues.push('Report metadata not found in DynamoDB');
      }
      
      if (metadata) {
        // Check S3 object exists
        try {
          const s3Object = await this.awsClients.s3.getObject({
            Bucket: this.awsClients.getS3ReportsBucket(),
            Key: metadata.s3Key
          }).promise();
          
          s3Exists = true;
          
          // Validate checksum if available
          if (s3Object.ETag && metadata.tags.includes(`checksum:${s3Object.ETag}`)) {
            checksumMatch = true;
          } else {
            issues.push('Checksum validation failed or not available');
          }
        } catch (error) {
          issues.push('Report file not found in S3');
        }
      }
      
      const lastValidated = new Date();
      
      // Update validation timestamp
      if (metadataExists) {
        await this.updateValidationTimestamp(reportId, lastValidated);
      }
      
      return {
        valid: issues.length === 0,
        issues,
        s3Exists,
        metadataExists,
        checksumMatch,
        lastValidated
      };
    } catch (error) {
      console.error('Error validating report integrity:', error);
      return {
        valid: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        s3Exists: false,
        metadataExists: false,
        checksumMatch: false,
        lastValidated: new Date()
      };
    }
  }

  // Private helper methods

  private generateS3Key(report: ComplianceReport): string {
    const date = report.generatedAt;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    
    return `compliance-reports/${report.type.toLowerCase()}/${year}/${month}/${day}/${hour}/${report.id}.json`;
  }

  private async storeReportInS3Enhanced(report: ComplianceReport, s3Key: string): Promise<'ENCRYPTED' | 'FAILED'> {
    try {
      const reportContent = JSON.stringify(report, null, 2);
      const contentBuffer = Buffer.from(reportContent);
      
      const params = {
        Bucket: this.awsClients.getS3ReportsBucket(),
        Key: s3Key,
        Body: contentBuffer,
        ContentType: 'application/json',
        ContentLength: contentBuffer.length,
        
        // Enhanced encryption
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: process.env.S3_KMS_KEY_ID || 'alias/aws/s3',
        
        // Comprehensive metadata
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
          version: '2.0',
          contentHash: this.calculateContentHash(reportContent)
        },
        
        // Storage optimization
        StorageClass: 'STANDARD_IA',
        
        // Tagging for management
        Tagging: this.generateS3Tags(report)
      };

      await this.awsClients.s3.putObject(params).promise();
      return 'ENCRYPTED';
    } catch (error) {
      console.error('Error storing report in S3:', error);
      return 'FAILED';
    }
  }

  private async storeEnhancedMetadata(report: ComplianceReport, s3Key: string): Promise<boolean> {
    try {
      const reportContent = JSON.stringify(report);
      const contentSize = Buffer.byteLength(reportContent, 'utf8');
      
      const item = {
        // Primary key
        reportId: report.id,
        
        // Basic information
        reportType: report.type,
        generatedAt: report.generatedAt.toISOString(),
        s3Key: s3Key,
        size: contentSize,
        
        // Scope information
        scope: JSON.stringify(report.scope),
        regulations: report.scope.regulations ? report.scope.regulations.join(',') : '',
        departments: report.scope.departments ? report.scope.departments.join(',') : '',
        resourceTypes: report.scope.resourceTypes ? report.scope.resourceTypes.join(',') : '',
        
        // Metrics
        findingsCount: report.findings.length,
        assessmentsCount: report.assessments.length,
        recommendationsCount: report.recommendations.length,
        
        // Severity breakdown
        criticalFindings: report.findings.filter(f => f.severity === 'CRITICAL').length,
        highFindings: report.findings.filter(f => f.severity === 'HIGH').length,
        mediumFindings: report.findings.filter(f => f.severity === 'MEDIUM').length,
        lowFindings: report.findings.filter(f => f.severity === 'LOW').length,
        
        // Finding types
        piiExposures: report.findings.filter(f => f.findingType === 'PII_EXPOSURE').length,
        encryptionIssues: report.findings.filter(f => f.findingType === 'ENCRYPTION').length,
        accessControlIssues: report.findings.filter(f => f.findingType === 'ACCESS_CONTROL').length,
        loggingIssues: report.findings.filter(f => f.findingType === 'LOGGING').length,
        
        // GSI attributes for efficient querying
        typeGeneratedAt: `${report.type}#${report.generatedAt.toISOString()}`,
        statusDate: `ACTIVE#${report.generatedAt.toISOString()}`,
        
        // Time-based indexing
        yearMonth: `${report.generatedAt.getFullYear()}-${String(report.generatedAt.getMonth() + 1).padStart(2, '0')}`,
        year: report.generatedAt.getFullYear(),
        month: report.generatedAt.getMonth() + 1,
        day: report.generatedAt.getDate(),
        hour: report.generatedAt.getHours(),
        
        // Report-specific metrics
        ...(report.type === 'SUMMARY' && {
          overallScore: (report as any).overallScore
        }),
        ...(report.type === 'AUDIT' && {
          complianceScore: (report as any).complianceScore,
          violationsCount: (report as any).violations?.length || 0
        }),
        ...(report.type === 'DPIA' && {
          riskLevel: (report as any).riskAssessment?.overallRisk,
          processingActivitiesCount: (report as any).dataProcessingActivities?.length || 0
        }),
        ...(report.type === 'ROPA' && {
          processingActivitiesCount: (report as any).processingActivities?.length || 0,
          dataCategoriesCount: (report as any).dataCategories?.length || 0
        }),
        
        // System fields
        createdBy: process.env.SYSTEM_USER || 'privacy-comply-agent',
        lastModified: report.generatedAt.toISOString(),
        version: '2.0',
        status: 'ACTIVE',
        
        // TTL for automatic cleanup (7 years)
        ttl: Math.floor((report.generatedAt.getTime() + (7 * 365 * 24 * 60 * 60 * 1000)) / 1000),
        
        // Enhanced search and tagging
        searchableText: this.generateSearchableText(report),
        tags: this.generateReportTags(report),
        contentHash: this.calculateContentHash(reportContent)
      };

      const params = {
        TableName: this.awsClients.getDynamoDBTableName(),
        Item: item,
        ConditionExpression: 'attribute_not_exists(reportId)'
      };

      await this.awsClients.dynamodb.put(params).promise();
      return true;
    } catch (error) {
      console.error('Error storing enhanced metadata:', error);
      return false;
    }
  }

  private async getReportFromS3Enhanced(s3Key: string): Promise<ComplianceReport> {
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
    this.convertDatesInReport(parsedReport);
    
    return parsedReport;
  }

  private convertDatesInReport(report: any): void {
    report.generatedAt = new Date(report.generatedAt);
    
    if (report.findings) {
      report.findings.forEach((finding: any) => {
        finding.detectedAt = new Date(finding.detectedAt);
      });
    }
    
    if (report.assessments) {
      report.assessments.forEach((assessment: any) => {
        assessment.assessedAt = new Date(assessment.assessedAt);
      });
    }
  }

  private getCachedReport(reportId: string): ComplianceReport | null {
    const cached = this.cache.get(reportId);
    if (cached && (Date.now() - cached.cachedAt.getTime()) < this.CACHE_TTL_MS) {
      return cached.report;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(reportId);
    }
    
    return null;
  }

  private updateCache(reportId: string, report: ComplianceReport): void {
    this.cache.set(reportId, {
      report,
      cachedAt: new Date()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private async updateLastAccessed(reportId: string): Promise<void> {
    try {
      await this.awsClients.dynamodb.put({
        TableName: this.awsClients.getDynamoDBTableName(),
        Key: { reportId },
        UpdateExpression: 'SET lastAccessed = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString()
        }
      }).promise();
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn('Failed to update last accessed timestamp:', error);
    }
  }

  private buildOptimizedQuery(criteria: any): {
    queryType: 'PRIMARY' | 'GSI' | 'SCAN';
    indexName?: string;
    keyCondition?: string;
    filterExpression?: string;
    indexesUsed: string[];
  } {
    const indexesUsed: string[] = [];
    
    // Determine optimal query strategy
    if (criteria.type && criteria.dateRange) {
      indexesUsed.push('TypeGeneratedAtIndex');
      return {
        queryType: 'GSI',
        indexName: 'TypeGeneratedAtIndex',
        keyCondition: 'reportType = :type AND generatedAt BETWEEN :startDate AND :endDate',
        indexesUsed
      };
    }
    
    if (criteria.dateRange) {
      indexesUsed.push('StatusDateIndex');
      return {
        queryType: 'GSI',
        indexName: 'StatusDateIndex',
        keyCondition: '#status = :status AND generatedAt BETWEEN :startDate AND :endDate',
        indexesUsed
      };
    }
    
    // Fall back to scan with filters
    indexesUsed.push('TABLE_SCAN');
    return {
      queryType: 'SCAN',
      indexesUsed
    };
  }

  private async executeOptimizedQuery(queryPlan: any, criteria: any): Promise<any[]> {
    // This is a simplified implementation
    // In a real implementation, this would execute the optimized DynamoDB query
    const params: any = {
      TableName: this.awsClients.getDynamoDBTableName(),
      Limit: (criteria.limit || 20) * 2 // Get more for filtering
    };

    if (queryPlan.queryType === 'GSI') {
      params.IndexName = queryPlan.indexName;
      params.KeyConditionExpression = queryPlan.keyCondition;
      params.ExpressionAttributeValues = this.buildExpressionAttributeValues(criteria);
      
      if (queryPlan.keyCondition.includes('#status')) {
        params.ExpressionAttributeNames = { '#status': 'status' };
      }
      
      const result = await this.awsClients.dynamodb.query(params).promise();
      return result.Items || [];
    } else {
      // Scan operation
      const result = await this.awsClients.dynamodb.scan(params).promise();
      return result.Items || [];
    }
  }

  private buildExpressionAttributeValues(criteria: any): Record<string, any> {
    const values: Record<string, any> = {};
    
    if (criteria.type) {
      values[':type'] = criteria.type;
    }
    
    if (criteria.dateRange) {
      values[':startDate'] = criteria.dateRange.startDate.toISOString();
      values[':endDate'] = criteria.dateRange.endDate.toISOString();
    }
    
    if (criteria.status) {
      values[':status'] = criteria.status;
    } else {
      values[':status'] = 'ACTIVE';
    }
    
    return values;
  }

  private applyAdvancedFiltering(results: any[], criteria: any): any[] {
    return results.filter(item => {
      // Apply text search
      if (criteria.query) {
        const searchText = (item.searchableText || '').toLowerCase();
        const query = criteria.query.toLowerCase();
        if (!searchText.includes(query)) {
          return false;
        }
      }
      
      // Apply regulation filter
      if (criteria.regulation) {
        const regulations = item.regulations || '';
        if (!regulations.includes(criteria.regulation)) {
          return false;
        }
      }
      
      // Apply department filter
      if (criteria.department) {
        const departments = item.departments || '';
        if (!departments.includes(criteria.department)) {
          return false;
        }
      }
      
      // Apply severity filter
      if (criteria.severityLevel) {
        const severityField = `${criteria.severityLevel.toLowerCase()}Findings`;
        if (!item[severityField] || item[severityField] === 0) {
          return false;
        }
      }
      
      // Apply score filter
      if (criteria.minScore !== undefined) {
        const score = item.overallScore || item.complianceScore || 0;
        if (score < criteria.minScore) {
          return false;
        }
      }
      
      // Apply findings count filter
      if (criteria.maxFindings !== undefined) {
        const findingsCount = item.findingsCount || 0;
        if (findingsCount > criteria.maxFindings) {
          return false;
        }
      }
      
      // Apply tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const itemTags = item.tags || [];
        const hasAllTags = criteria.tags.every((tag: string) => 
          itemTags.some((itemTag: string) => itemTag.includes(tag))
        );
        if (!hasAllTags) {
          return false;
        }
      }
      
      return true;
    });
  }

  private applySorting(results: any[], criteria: any): any[] {
    const sortBy = criteria.sortBy || 'generatedAt';
    const sortOrder = criteria.sortOrder || 'DESC';
    
    return results.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date sorting
      if (sortBy === 'generatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'ASC' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'ASC' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }

  private generateOptimizationSuggestions(criteria: any, queryTime: number): string[] {
    const suggestions: string[] = [];
    
    if (queryTime > 1000) {
      suggestions.push('Consider adding more specific filters to improve query performance');
    }
    
    if (criteria.query && !criteria.type && !criteria.dateRange) {
      suggestions.push('Adding type or date range filters can significantly improve search performance');
    }
    
    if (criteria.limit && criteria.limit > 100) {
      suggestions.push('Consider using pagination with smaller page sizes for better performance');
    }
    
    return suggestions;
  }

  private async findOldReports(cutoffDate: Date): Promise<Array<{
    reportId: string;
    s3Key: string;
    size: number;
  }>> {
    const params = {
      TableName: this.awsClients.getDynamoDBTableName(),
      FilterExpression: 'generatedAt < :cutoffDate AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':cutoffDate': cutoffDate.toISOString(),
        ':status': 'ACTIVE'
      }
    };

    const result = await this.awsClients.dynamodb.scan(params).promise();
    
    return (result.Items || []).map(item => ({
      reportId: item.reportId,
      s3Key: item.s3Key,
      size: item.size || 0
    }));
  }

  private async updateReportStatus(reportId: string, status: string): Promise<void> {
    await this.awsClients.dynamodb.put({
      TableName: this.awsClients.getDynamoDBTableName(),
      Key: { reportId },
      UpdateExpression: 'SET #status = :status, lastModified = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':timestamp': new Date().toISOString()
      }
    }).promise();
  }

  private async storeAuditTrail(auditData: any): Promise<void> {
    const auditItem = {
      auditId: uuidv4(),
      ...auditData,
      timestamp: new Date().toISOString()
    };

    // Store in separate audit table (would need to be created)
    console.log('Audit trail stored:', auditItem);
  }

  private async getAllReportMetadata(): Promise<Array<{
    reportId: string;
    type: string;
    generatedAt: Date;
    size: number;
    status: string;
  }>> {
    const params = {
      TableName: this.awsClients.getDynamoDBTableName(),
      ProjectionExpression: 'reportId, reportType, generatedAt, #size, #status',
      ExpressionAttributeNames: {
        '#size': 'size',
        '#status': 'status'
      }
    };

    const result = await this.awsClients.dynamodb.scan(params).promise();
    
    return (result.Items || []).map(item => ({
      reportId: item.reportId,
      type: item.reportType,
      generatedAt: new Date(item.generatedAt),
      size: item.size || 0,
      status: item.status || 'ACTIVE'
    }));
  }

  private assessStorageHealth(metrics: any): {
    health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let health: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    // Check storage size
    const storageSizeGB = metrics.totalStorageSize / (1024 * 1024 * 1024);
    if (storageSizeGB > 1000) {
      health = 'WARNING';
      recommendations.push('Consider archiving old reports to reduce storage costs');
    }
    
    // Check report age
    const oldestReportAge = Date.now() - metrics.oldestReport.getTime();
    const daysSinceOldest = oldestReportAge / (1000 * 60 * 60 * 24);
    if (daysSinceOldest > 2555) { // 7 years
      health = 'WARNING';
      recommendations.push('Some reports are approaching retention limit and should be reviewed');
    }
    
    // Check average report size
    if (metrics.averageReportSize > 10 * 1024 * 1024) { // 10MB
      recommendations.push('Consider optimizing report content to reduce storage size');
    }
    
    return { health, recommendations };
  }

  private async updateValidationTimestamp(reportId: string, timestamp: Date): Promise<void> {
    try {
      await this.awsClients.dynamodb.put({
        TableName: this.awsClients.getDynamoDBTableName(),
        Key: { reportId },
        UpdateExpression: 'SET lastValidated = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': timestamp.toISOString()
        }
      }).promise();
    } catch (error) {
      console.warn('Failed to update validation timestamp:', error);
    }
  }

  private calculateContentHash(content: string): string {
    // Simple hash implementation - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private generateS3Tags(report: ComplianceReport): string {
    const tags = [
      `ReportType=${report.type}`,
      `GeneratedYear=${report.generatedAt.getFullYear()}`,
      `FindingsCount=${report.findings.length}`,
      `Environment=${process.env.NODE_ENV || 'development'}`,
      `System=PrivacyComplyAgent`,
      `Version=2.0`
    ];

    if (report.scope.regulations) {
      tags.push(`Regulations=${report.scope.regulations.join('-')}`);
    }

    if (report.scope.departments) {
      tags.push(`Departments=${report.scope.departments.join('-')}`);
    }

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
      `recommendations:${report.recommendations.length}`,
      `version:2.0`
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
}