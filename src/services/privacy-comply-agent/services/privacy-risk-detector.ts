// Privacy Risk Detection Service Interface
import {
  ComplianceFinding,
  S3ComplianceFindings,
  IAMComplianceFindings,
  AccessViolationFindings,
  PIIDetectionFindings,
  SecurityComplianceFindings,
  S3BucketResource
} from '../types';
import { AWSServiceClients } from '../config/service-clients';

/**
 * Privacy Risk Detection Service
 * Continuously scans AWS environment for privacy and compliance risks
 */
export interface PrivacyRiskDetector {
  /**
   * Scan S3 buckets for compliance violations
   * Checks for public access, encryption status, and PII exposure
   */
  scanS3Buckets(): Promise<S3ComplianceFindings[]>;

  /**
   * Analyze IAM roles and policies for overprivileged access
   * Identifies roles with excessive permissions to sensitive data
   */
  analyzeIAMPolicies(): Promise<IAMComplianceFindings[]>;

  /**
   * Process CloudTrail logs for unauthorized data access
   * Detects suspicious access patterns and unlogged events
   */
  processCloudTrailLogs(): Promise<AccessViolationFindings[]>;

  /**
   * Retrieve PII/PHI detection findings from Amazon Macie
   * Integrates with Macie for comprehensive PII discovery
   */
  getMacieFindings(): Promise<PIIDetectionFindings[]>;

  /**
   * Aggregate findings from AWS Security Hub
   * Collects security and compliance findings from multiple sources
   */
  getSecurityHubFindings(): Promise<SecurityComplianceFindings[]>;

  /**
   * Get all compliance findings for a specific resource
   */
  getResourceFindings(resourceArn: string): Promise<ComplianceFinding[]>;

  /**
   * Start continuous monitoring for new compliance violations
   */
  startContinuousMonitoring(): Promise<void>;

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring(): Promise<void>;

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): Promise<{
    active: boolean;
    lastScan: Date;
    nextScan: Date;
    resourcesMonitored: number;
  }>;
}

/**
 * Implementation class for Privacy Risk Detection Service
 */
export class PrivacyRiskDetectionService implements PrivacyRiskDetector {
  private monitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  private serviceClients: AWSServiceClients;
  private lastScan: Date = new Date();
  private resourcesMonitored: number = 0;

  constructor() {
    this.serviceClients = AWSServiceClients.getInstance();
  }

  async scanS3Buckets(): Promise<S3ComplianceFindings[]> {
    const findings: S3ComplianceFindings[] = [];
    
    try {
      const s3Client = this.serviceClients.getS3Client();
      
      // Get list of all S3 buckets
      const buckets = await s3Client.listBuckets();
      
      for (const bucket of buckets) {
        const bucketFindings = await this.analyzeBucket(bucket.Name);
        findings.push(...bucketFindings);
      }
      
      this.resourcesMonitored += buckets.length;
      this.lastScan = new Date();
      
      return findings;
    } catch (error) {
      console.error('Error scanning S3 buckets:', error);
      throw new Error(`Failed to scan S3 buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeBucket(bucketName: string): Promise<S3ComplianceFindings[]> {
    const findings: S3ComplianceFindings[] = [];
    const s3Client = this.serviceClients.getS3Client();
    
    try {
      // Check public access configuration
      const publicAccessIssues: string[] = [];
      const encryptionIssues: string[] = [];
      
      // Analyze bucket policy for public access
      try {
        const bucketPolicy = await s3Client.getBucketPolicy({ Bucket: bucketName });
        if (bucketPolicy.Policy) {
          const policy = JSON.parse(bucketPolicy.Policy);
          if (this.hasPolicyPublicAccess(policy)) {
            publicAccessIssues.push('Bucket policy allows public access');
          }
        }
      } catch (error) {
        // No bucket policy exists - this is actually good for security
      }
      
      // Check bucket encryption
      try {
        const encryption = await s3Client.getBucketEncryption({ Bucket: bucketName });
        if (!encryption.ServerSideEncryptionConfiguration) {
          encryptionIssues.push('Bucket encryption not enabled');
        }
      } catch (error) {
        encryptionIssues.push('Bucket encryption not configured');
      }
      
      // Check public access block settings
      try {
        const publicAccessBlock = await s3Client.getPublicAccessBlock({ Bucket: bucketName });
        if (!publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicAcls ||
            !publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicPolicy ||
            !publicAccessBlock.PublicAccessBlockConfiguration?.IgnorePublicAcls ||
            !publicAccessBlock.PublicAccessBlockConfiguration?.RestrictPublicBuckets) {
          publicAccessIssues.push('Public access block not fully configured');
        }
      } catch (error) {
        publicAccessIssues.push('Public access block not configured');
      }
      
      // Create findings if issues exist
      if (publicAccessIssues.length > 0 || encryptionIssues.length > 0) {
        const severity = publicAccessIssues.length > 0 ? 'HIGH' : 'MEDIUM';
        const findingType = publicAccessIssues.length > 0 ? 'ACCESS_CONTROL' : 'ENCRYPTION';
        
        findings.push({
          id: `s3-${bucketName}-${Date.now()}`,
          resourceArn: `arn:aws:s3:::${bucketName}`,
          findingType,
          severity,
          description: `S3 bucket compliance issues: ${[...publicAccessIssues, ...encryptionIssues].join(', ')}`,
          detectedAt: new Date(),
          rawData: { bucketName, publicAccessIssues, encryptionIssues },
          bucketName,
          publicAccessIssues,
          encryptionIssues
        });
      }
      
    } catch (error) {
      console.error(`Error analyzing bucket ${bucketName}:`, error);
    }
    
    return findings;
  }

  private hasPolicyPublicAccess(policy: any): boolean {
    if (!policy.Statement) return false;
    
    return policy.Statement.some((statement: any) => {
      const principal = statement.Principal;
      return principal === '*' || 
             (typeof principal === 'object' && principal.AWS === '*') ||
             (Array.isArray(principal) && principal.includes('*'));
    });
  }

  async analyzeIAMPolicies(): Promise<IAMComplianceFindings[]> {
    const findings: IAMComplianceFindings[] = [];
    
    try {
      const iamClient = this.serviceClients.getIAMClient();
      
      // Get list of all IAM roles
      const roles = await iamClient.listRoles();
      
      for (const role of roles) {
        const roleFindings = await this.analyzeIAMRole(role);
        findings.push(...roleFindings);
      }
      
      this.resourcesMonitored += roles.length;
      
      return findings;
    } catch (error) {
      console.error('Error analyzing IAM policies:', error);
      throw new Error(`Failed to analyze IAM policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeIAMRole(role: any): Promise<IAMComplianceFindings[]> {
    const findings: IAMComplianceFindings[] = [];
    const iamClient = this.serviceClients.getIAMClient();
    
    try {
      const overprivilegedActions: string[] = [];
      const riskyPermissions: string[] = [];
      
      // Get attached policies for the role
      const attachedPolicies = await iamClient.listAttachedRolePolicies({ RoleName: role.RoleName });
      
      for (const policy of attachedPolicies.AttachedPolicies || []) {
        const policyDocument = await iamClient.getPolicy({ PolicyArn: policy.PolicyArn });
        const policyVersion = await iamClient.getPolicyVersion({
          PolicyArn: policy.PolicyArn,
          VersionId: policyDocument.Policy.DefaultVersionId
        });
        
        const document = JSON.parse(decodeURIComponent(policyVersion.PolicyVersion.Document));
        const analysis = this.analyzePolicyDocument(document);
        
        overprivilegedActions.push(...analysis.overprivilegedActions);
        riskyPermissions.push(...analysis.riskyPermissions);
      }
      
      // Check inline policies
      const inlinePolicies = await iamClient.listRolePolicies({ RoleName: role.RoleName });
      for (const policyName of inlinePolicies.PolicyNames || []) {
        const inlinePolicy = await iamClient.getRolePolicy({
          RoleName: role.RoleName,
          PolicyName: policyName
        });
        
        const document = JSON.parse(decodeURIComponent(inlinePolicy.PolicyDocument));
        const analysis = this.analyzePolicyDocument(document);
        
        overprivilegedActions.push(...analysis.overprivilegedActions);
        riskyPermissions.push(...analysis.riskyPermissions);
      }
      
      // Create findings if issues exist
      if (overprivilegedActions.length > 0 || riskyPermissions.length > 0) {
        const severity = riskyPermissions.some(p => p.includes('*')) ? 'CRITICAL' : 'HIGH';
        
        findings.push({
          id: `iam-${role.RoleName}-${Date.now()}`,
          resourceArn: role.Arn,
          findingType: 'ACCESS_CONTROL',
          severity,
          description: `IAM role has overprivileged access: ${overprivilegedActions.slice(0, 3).join(', ')}${overprivilegedActions.length > 3 ? '...' : ''}`,
          detectedAt: new Date(),
          rawData: { role, overprivilegedActions, riskyPermissions },
          roleName: role.RoleName,
          policyArn: role.Arn,
          overprivilegedActions,
          riskyPermissions
        });
      }
      
    } catch (error) {
      console.error(`Error analyzing IAM role ${role.RoleName}:`, error);
    }
    
    return findings;
  }

  private analyzePolicyDocument(document: any): {
    overprivilegedActions: string[];
    riskyPermissions: string[];
  } {
    const overprivilegedActions: string[] = [];
    const riskyPermissions: string[] = [];
    
    if (!document.Statement) return { overprivilegedActions, riskyPermissions };
    
    const statements = Array.isArray(document.Statement) ? document.Statement : [document.Statement];
    
    for (const statement of statements) {
      if (statement.Effect !== 'Allow') continue;
      
      const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      
      for (const action of actions) {
        // Check for wildcard permissions
        if (action === '*') {
          riskyPermissions.push('Full administrative access (*)');
          overprivilegedActions.push('*');
        }
        
        // Check for sensitive service wildcards
        if (action.endsWith(':*')) {
          const service = action.split(':')[0];
          if (['s3', 'iam', 'kms', 'secretsmanager', 'ssm'].includes(service)) {
            riskyPermissions.push(`Full ${service} access`);
            overprivilegedActions.push(action);
          }
        }
        
        // Check for specific risky actions
        const riskyActions = [
          'iam:CreateRole',
          'iam:AttachRolePolicy',
          'iam:PutRolePolicy',
          's3:GetBucketPolicy',
          's3:PutBucketPolicy',
          'kms:CreateKey',
          'kms:PutKeyPolicy'
        ];
        
        if (riskyActions.includes(action)) {
          overprivilegedActions.push(action);
        }
      }
    }
    
    return { overprivilegedActions, riskyPermissions };
  }

  async processCloudTrailLogs(): Promise<AccessViolationFindings[]> {
    const findings: AccessViolationFindings[] = [];
    
    try {
      const cloudTrailClient = this.serviceClients.getCloudTrailClient();
      
      // Look for events in the last 24 hours
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      
      const events = await cloudTrailClient.lookupEvents({
        StartTime: startTime,
        EndTime: endTime,
        MaxItems: 1000
      });
      
      for (const event of events.Events || []) {
        const violation = this.analyzeCloudTrailEvent(event);
        if (violation) {
          findings.push(violation);
        }
      }
      
      this.resourcesMonitored += events.Events?.length || 0;
      
      return findings;
    } catch (error) {
      console.error('Error processing CloudTrail logs:', error);
      throw new Error(`Failed to process CloudTrail logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private analyzeCloudTrailEvent(event: any): AccessViolationFindings | null {
    // Check for suspicious access patterns
    const suspiciousEvents = [
      'AssumeRole',
      'GetSessionToken',
      'CreateAccessKey',
      'DeleteBucket',
      'PutBucketPolicy',
      'CreateRole',
      'AttachRolePolicy'
    ];
    
    if (!suspiciousEvents.includes(event.EventName)) {
      return null;
    }
    
    // Check for access from unusual locations or failed attempts
    const isUnauthorized = this.isUnauthorizedAccess(event);
    
    if (!isUnauthorized) {
      return null;
    }
    
    const severity = this.getEventSeverity(event.EventName);
    
    return {
      id: `cloudtrail-${event.EventId || Date.now()}`,
      resourceArn: event.Resources?.[0]?.ResourceName || 'unknown',
      findingType: 'ACCESS_CONTROL',
      severity,
      description: `Suspicious CloudTrail event: ${event.EventName} from ${event.SourceIPAddress}`,
      detectedAt: new Date(event.EventTime),
      rawData: event,
      eventName: event.EventName,
      sourceIPAddress: event.SourceIPAddress,
      userIdentity: event.UserIdentity,
      unauthorizedAccess: true
    };
  }

  private isUnauthorizedAccess(event: any): boolean {
    // Check for failed authentication
    if (event.ErrorCode || event.ErrorMessage) {
      return true;
    }
    
    // Check for access from unusual IP ranges (simplified check)
    const sourceIP = event.SourceIPAddress;
    if (sourceIP && !this.isKnownIPRange(sourceIP)) {
      return true;
    }
    
    // Check for root user activity (should be rare)
    if (event.UserIdentity?.type === 'Root') {
      return true;
    }
    
    return false;
  }

  private isKnownIPRange(ip: string): boolean {
    // Simplified IP range check - in production, this would check against
    // known corporate IP ranges or AWS service IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  private getEventSeverity(eventName: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = ['CreateRole', 'AttachRolePolicy', 'PutBucketPolicy'];
    const highEvents = ['AssumeRole', 'CreateAccessKey', 'DeleteBucket'];
    
    if (criticalEvents.includes(eventName)) return 'CRITICAL';
    if (highEvents.includes(eventName)) return 'HIGH';
    return 'MEDIUM';
  }

  async getMacieFindings(): Promise<PIIDetectionFindings[]> {
    const findings: PIIDetectionFindings[] = [];
    
    try {
      const macieClient = this.serviceClients.getMacieClient();
      
      // Get Macie findings for PII/PHI detection
      const macieFindings = await macieClient.getFindings({
        MaxResults: 100,
        SortCriteria: {
          AttributeName: 'createdAt',
          OrderBy: 'DESC'
        }
      });
      
      for (const finding of macieFindings.findings || []) {
        const piiFindings = this.processMacieFinding(finding);
        if (piiFindings) {
          findings.push(piiFindings);
        }
      }
      
      this.resourcesMonitored += macieFindings.findings?.length || 0;
      
      return findings;
    } catch (error) {
      console.error('Error getting Macie findings:', error);
      throw new Error(`Failed to get Macie findings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processMacieFinding(finding: any): PIIDetectionFindings | null {
    if (!finding.classificationDetails?.result) {
      return null;
    }
    
    const result = finding.classificationDetails.result;
    const piiTypes: string[] = [];
    let maxConfidence = 0;
    
    // Process sensitive data identifiers
    if (result.sensitiveData) {
      for (const sensitiveDataItem of result.sensitiveData) {
        if (sensitiveDataItem.category === 'PII' || sensitiveDataItem.category === 'CREDENTIALS') {
          for (const detection of sensitiveDataItem.detections || []) {
            piiTypes.push(detection.type);
            maxConfidence = Math.max(maxConfidence, detection.confidence || 0);
          }
        }
      }
    }
    
    if (piiTypes.length === 0) {
      return null;
    }
    
    const severity = this.getPIISeverity(piiTypes, maxConfidence);
    const location = this.extractLocationFromMacieFinding(finding);
    
    return {
      id: `macie-${finding.id}`,
      resourceArn: finding.resourcesAffected?.s3Bucket?.arn || 'unknown',
      findingType: 'PII_EXPOSURE',
      severity,
      description: `PII detected: ${piiTypes.join(', ')} (confidence: ${maxConfidence}%)`,
      detectedAt: new Date(finding.createdAt),
      rawData: finding,
      piiTypes,
      confidence: maxConfidence,
      location
    };
  }

  private getPIISeverity(piiTypes: string[], confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalTypes = ['CREDIT_CARD_NUMBER', 'SSN', 'PASSPORT_NUMBER', 'DRIVER_LICENSE'];
    const highTypes = ['EMAIL_ADDRESS', 'PHONE_NUMBER', 'ADDRESS'];
    
    if (piiTypes.some(type => criticalTypes.includes(type))) {
      return confidence > 80 ? 'CRITICAL' : 'HIGH';
    }
    
    if (piiTypes.some(type => highTypes.includes(type))) {
      return confidence > 80 ? 'HIGH' : 'MEDIUM';
    }
    
    return confidence > 80 ? 'MEDIUM' : 'LOW';
  }

  private extractLocationFromMacieFinding(finding: any): string {
    if (finding.resourcesAffected?.s3Bucket) {
      const bucket = finding.resourcesAffected.s3Bucket;
      const object = finding.resourcesAffected.s3Object;
      return `s3://${bucket.name}/${object?.key || ''}`;
    }
    
    return 'unknown';
  }

  async getSecurityHubFindings(): Promise<SecurityComplianceFindings[]> {
    const findings: SecurityComplianceFindings[] = [];
    
    try {
      const securityHubClient = this.serviceClients.getSecurityHubClient();
      
      // Get Security Hub findings related to privacy and compliance
      const hubFindings = await securityHubClient.getFindings({
        MaxResults: 100,
        Filters: {
          ComplianceStatus: [
            { Value: 'FAILED', Comparison: 'EQUALS' }
          ],
          RecordState: [
            { Value: 'ACTIVE', Comparison: 'EQUALS' }
          ]
        },
        SortCriteria: [{
          Field: 'CreatedAt',
          SortOrder: 'desc'
        }]
      });
      
      for (const finding of hubFindings.Findings || []) {
        const complianceFindings = this.processSecurityHubFinding(finding);
        if (complianceFindings) {
          findings.push(complianceFindings);
        }
      }
      
      this.resourcesMonitored += hubFindings.Findings?.length || 0;
      
      return findings;
    } catch (error) {
      console.error('Error getting Security Hub findings:', error);
      throw new Error(`Failed to get Security Hub findings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processSecurityHubFinding(finding: any): SecurityComplianceFindings | null {
    // Filter for privacy-related compliance findings
    const privacyRelatedTypes = [
      'Data Protection',
      'Encryption',
      'Access Control',
      'Logging and Monitoring',
      'Data Classification'
    ];
    
    const isPrivacyRelated = privacyRelatedTypes.some(type => 
      finding.Title?.includes(type) || 
      finding.Description?.includes(type) ||
      finding.Types?.some((t: string) => t.includes(type))
    );
    
    if (!isPrivacyRelated) {
      return null;
    }
    
    const severity = this.mapSecurityHubSeverity(finding.Severity?.Label);
    const findingType = this.mapSecurityHubToFindingType(finding);
    
    return {
      id: `securityhub-${finding.Id}`,
      resourceArn: finding.Resources?.[0]?.Id || 'unknown',
      findingType,
      severity,
      description: finding.Title || finding.Description || 'Security Hub compliance finding',
      detectedAt: new Date(finding.CreatedAt),
      rawData: finding,
      complianceType: finding.Compliance?.Status || 'UNKNOWN',
      productArn: finding.ProductArn,
      generatorId: finding.GeneratorId
    };
  }

  private mapSecurityHubSeverity(severityLabel?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (severityLabel?.toUpperCase()) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }

  private mapSecurityHubToFindingType(finding: any): 'ENCRYPTION' | 'ACCESS_CONTROL' | 'PII_EXPOSURE' | 'LOGGING' {
    const title = finding.Title?.toLowerCase() || '';
    const description = finding.Description?.toLowerCase() || '';
    const types = finding.Types?.join(' ').toLowerCase() || '';
    
    const content = `${title} ${description} ${types}`;
    
    if (content.includes('encrypt')) return 'ENCRYPTION';
    if (content.includes('access') || content.includes('permission') || content.includes('policy')) return 'ACCESS_CONTROL';
    if (content.includes('log') || content.includes('audit') || content.includes('trail')) return 'LOGGING';
    if (content.includes('pii') || content.includes('personal') || content.includes('sensitive')) return 'PII_EXPOSURE';
    
    return 'ACCESS_CONTROL'; // Default
  }

  async getResourceFindings(resourceArn: string): Promise<ComplianceFinding[]> {
    const allFindings: ComplianceFinding[] = [];
    
    try {
      // Get findings from all scanning methods
      const s3Findings = await this.scanS3Buckets();
      const iamFindings = await this.analyzeIAMPolicies();
      const cloudTrailFindings = await this.processCloudTrailLogs();
      
      // Filter findings for the specific resource
      const resourceFindings = [
        ...s3Findings,
        ...iamFindings,
        ...cloudTrailFindings
      ].filter(finding => finding.resourceArn === resourceArn);
      
      return resourceFindings;
    } catch (error) {
      console.error(`Error getting findings for resource ${resourceArn}:`, error);
      throw new Error(`Failed to get resource findings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async startContinuousMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      console.log('Continuous monitoring is already active');
      return;
    }
    
    this.monitoringActive = true;
    
    // Run initial scan
    await this.performFullScan();
    
    // Set up periodic scanning (every 6 hours)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performFullScan();
      } catch (error) {
        console.error('Error during continuous monitoring scan:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    console.log('Continuous monitoring started');
  }

  async stopContinuousMonitoring(): Promise<void> {
    if (!this.monitoringActive) {
      console.log('Continuous monitoring is not active');
      return;
    }
    
    this.monitoringActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('Continuous monitoring stopped');
  }

  async getMonitoringStatus(): Promise<{
    active: boolean;
    lastScan: Date;
    nextScan: Date;
    resourcesMonitored: number;
  }> {
    const nextScan = new Date(this.lastScan.getTime() + 6 * 60 * 60 * 1000); // 6 hours from last scan
    
    return {
      active: this.monitoringActive,
      lastScan: this.lastScan,
      nextScan,
      resourcesMonitored: this.resourcesMonitored
    };
  }

  /**
   * Unified findings collector that aggregates findings from all sources
   */
  async collectAllFindings(): Promise<ComplianceFinding[]> {
    try {
      // Collect findings from all sources
      const [s3Findings, iamFindings, cloudTrailFindings, macieFindings, securityHubFindings] = await Promise.all([
        this.scanS3Buckets(),
        this.analyzeIAMPolicies(),
        this.processCloudTrailLogs(),
        this.getMacieFindings(),
        this.getSecurityHubFindings()
      ]);
      
      // Normalize and deduplicate findings
      const allFindings = [
        ...s3Findings,
        ...iamFindings,
        ...cloudTrailFindings,
        ...macieFindings,
        ...securityHubFindings
      ];
      
      return this.normalizeFindings(allFindings);
    } catch (error) {
      console.error('Error collecting all findings:', error);
      throw new Error(`Failed to collect findings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize findings to ensure consistent format and remove duplicates
   */
  private normalizeFindings(findings: ComplianceFinding[]): ComplianceFinding[] {
    const normalizedFindings: ComplianceFinding[] = [];
    const seenFindings = new Set<string>();
    
    for (const finding of findings) {
      // Create a unique key for deduplication
      const key = `${finding.resourceArn}-${finding.findingType}-${finding.description}`;
      
      if (seenFindings.has(key)) {
        continue; // Skip duplicate
      }
      
      seenFindings.add(key);
      
      // Normalize the finding
      const normalizedFinding: ComplianceFinding = {
        id: finding.id,
        resourceArn: finding.resourceArn,
        findingType: finding.findingType,
        severity: finding.severity,
        description: finding.description.trim(),
        detectedAt: finding.detectedAt,
        rawData: finding.rawData
      };
      
      normalizedFindings.push(normalizedFinding);
    }
    
    // Sort by severity and detection time
    return normalizedFindings.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });
  }

  /**
   * Get findings summary by type and severity
   */
  async getFindingsSummary(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    const findings = await this.collectAllFindings();
    
    const summary = {
      total: findings.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byResource: {} as Record<string, number>
    };
    
    for (const finding of findings) {
      // Count by type
      summary.byType[finding.findingType] = (summary.byType[finding.findingType] || 0) + 1;
      
      // Count by severity
      summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1;
      
      // Count by resource type
      const resourceType = this.extractResourceType(finding.resourceArn);
      summary.byResource[resourceType] = (summary.byResource[resourceType] || 0) + 1;
    }
    
    return summary;
  }

  private extractResourceType(arn: string): string {
    const parts = arn.split(':');
    if (parts.length >= 3) {
      return parts[2]; // Service name (e.g., 's3', 'iam')
    }
    return 'unknown';
  }

  private async performFullScan(): Promise<void> {
    console.log('Starting full compliance scan...');
    
    try {
      // Reset resource counter
      this.resourcesMonitored = 0;
      
      // Collect all findings using the unified collector
      const allFindings = await this.collectAllFindings();
      
      console.log(`Full scan completed. Found ${allFindings.length} compliance issues across ${this.resourcesMonitored} resources.`);
      
      // Get summary for logging
      const summary = await this.getFindingsSummary();
      console.log('Findings summary:', {
        total: summary.total,
        critical: summary.bySeverity['CRITICAL'] || 0,
        high: summary.bySeverity['HIGH'] || 0,
        medium: summary.bySeverity['MEDIUM'] || 0,
        low: summary.bySeverity['LOW'] || 0
      });
      
      // In a real implementation, findings would be stored in DynamoDB
      // and potentially sent to Security Hub for centralized management
      
    } catch (error) {
      console.error('Error during full scan:', error);
      throw error;
    }
  }
}