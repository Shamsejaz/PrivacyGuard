/**
 * MCP Privacy Connectors - Salesforce CRM Connector
 * Implements privacy scanning and remediation for Salesforce CRM systems
 */

import { CRMConnector } from './CRMConnector.js';
import { CRMRemediationEngine } from './CRMRemediationEngine.js';
import type {
  ConnectorCredentials,
  ScanConfiguration,
  ScanResult,
  RemediationAction,
  RemediationResult,
  AuthToken,
  PIIFinding,
  ScanMetrics,
  DataLocation,
  PIIType,
  SensitivityLevel,
  ConsentStatus,
  ScanContext
} from '../../types/index.js';

/**
 * Salesforce-specific configuration interface
 */
interface SalesforceConfig {
  instanceUrl: string;
  apiVersion: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  securityToken?: string;
}

/**
 * Salesforce record interface for contacts and leads
 */
interface SalesforceRecord {
  Id: string;
  [key: string]: any;
}

/**
 * SOQL query result interface
 */
interface SOQLResult {
  totalSize: number;
  done: boolean;
  records: SalesforceRecord[];
  nextRecordsUrl?: string;
}

/**
 * Salesforce CRM connector for privacy scanning and remediation
 */
export class SalesforceConnector extends CRMConnector {
  private config: SalesforceConfig;
  private authToken: AuthToken | null = null;
  private rateLimitRemaining: number = 1000;
  private rateLimitResetTime: Date = new Date();

  constructor(connectorId: string, credentials: ConnectorCredentials) {
    super(connectorId, credentials);
    
    this.config = {
      instanceUrl: credentials.endpoint || 'https://login.salesforce.com',
      apiVersion: credentials.additionalConfig?.apiVersion || 'v58.0',
      clientId: credentials.clientId!,
      clientSecret: credentials.clientSecret!,
      username: credentials.additionalConfig?.username,
      password: credentials.additionalConfig?.password,
      securityToken: credentials.additionalConfig?.securityToken
    };
  }

  /**
   * Connect to Salesforce using OAuth2 authentication
   */
  async connect(credentials: ConnectorCredentials): Promise<void> {
    try {
      this.logActivity('Connecting to Salesforce', { instanceUrl: this.config.instanceUrl });
      
      // Update credentials if provided
      if (credentials) {
        this.updateCredentials(credentials);
      }

      // Authenticate using OAuth2
      this.authToken = await this.authenticate();
      this.isConnected = true;
      this.lastHealthCheck = new Date();
      
      // Initialize remediation engine with authenticated connection
      this.remediationEngine = new CRMRemediationEngine({
        instanceUrl: this.config.instanceUrl,
        apiVersion: this.config.apiVersion,
        authToken: this.authToken,
        dryRun: false,
        batchSize: 200
      });
      
      this.logActivity('Successfully connected to Salesforce', {
        instanceUrl: this.config.instanceUrl,
        tokenType: this.authToken.tokenType
      });
      
    } catch (error) {
      this.isConnected = false;
      this.logActivity('Failed to connect to Salesforce', { error: error.message });
      throw new Error(`Salesforce connection failed: ${error.message}`);
    }
  }

  /**
   * Execute privacy scan on Salesforce CRM data
   */
  async scan(config: ScanConfiguration): Promise<ScanResult> {
    if (!this.isConnected || !this.authToken) {
      throw new Error('Salesforce connector is not connected');
    }

    return await this.executeCRMScan(config);
  }

  /**
   * Execute remediation actions on Salesforce data using CRM remediation engine
   */
  async remediate(actions: RemediationAction[]): Promise<RemediationResult> {
    if (!this.isConnected || !this.authToken || !this.remediationEngine) {
      throw new Error('Salesforce connector is not connected or remediation engine not initialized');
    }

    return await this.executeCRMRemediation(actions);
  }

  /**
   * Execute automated deletion of expired consent records
   */
  async deleteExpiredConsentRecords(findings: PIIFinding[]): Promise<RemediationResult> {
    if (!this.remediationEngine) {
      throw new Error('Remediation engine not initialized');
    }

    this.logActivity('Deleting expired consent records', { findingsCount: findings.length });
    return await this.remediationEngine.deleteExpiredConsentRecords(findings);
  }

  /**
   * Mask sensitive CRM fields
   */
  async maskSensitiveCRMFields(findings: PIIFinding[]): Promise<RemediationResult> {
    if (!this.remediationEngine) {
      throw new Error('Remediation engine not initialized');
    }

    this.logActivity('Masking sensitive CRM fields', { findingsCount: findings.length });
    return await this.remediationEngine.maskSensitiveCRMFields(findings);
  }

  /**
   * Synchronize consent status with external systems
   */
  async synchronizeConsentStatus(findings: PIIFinding[]): Promise<RemediationResult> {
    if (!this.remediationEngine) {
      throw new Error('Remediation engine not initialized');
    }

    this.logActivity('Synchronizing consent status', { findingsCount: findings.length });
    return await this.remediationEngine.synchronizeConsentStatus(findings);
  }



  /**
   * Authenticate with Salesforce using OAuth2
   */
  protected async authenticate(): Promise<AuthToken> {
    const tokenUrl = `${this.config.instanceUrl}/services/oauth2/token`;
    
    // Use username/password flow for simplicity (in production, use OAuth2 web flow)
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username!,
      password: this.config.password! + (this.config.securityToken || '')
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Authentication failed: ${errorData.error_description || response.statusText}`);
      }

      const tokenData = await response.json();
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        tokenType: 'Bearer',
        scope: tokenData.scope?.split(' ')
      };

    } catch (error) {
      throw new Error(`Salesforce authentication failed: ${error.message}`);
    }
  }

  /**
   * Handle Salesforce API rate limiting
   */
  protected async handleRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 10) {
      const waitTime = Math.max(0, this.rateLimitResetTime.getTime() - Date.now());
      if (waitTime > 0) {
        this.logActivity('Rate limit reached, waiting', { waitTimeMs: waitTime });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }  
/**
   * Execute SOQL query with rate limiting and error handling
   */
  private async executeSOQL(query: string): Promise<SOQLResult> {
    await this.handleRateLimit();

    const url = `${this.config.instanceUrl}/services/data/v${this.config.apiVersion}/query`;
    
    try {
      const response = await fetch(`${url}?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken!.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Update rate limit info from response headers
      this.updateRateLimitInfo(response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SOQL query failed: ${errorData[0]?.message || response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      this.logActivity('SOQL query failed', { query: this.maskSensitiveData(query), error: error.message });
      throw error;
    }
  }

  /**
   * Update rate limit information from API response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const remaining = response.headers.get('Sforce-Limit-Info');
    if (remaining) {
      // Parse rate limit info (format: "api-usage=123/15000")
      const match = remaining.match(/api-usage=(\d+)\/(\d+)/);
      if (match) {
        const used = parseInt(match[1]);
        const total = parseInt(match[2]);
        this.rateLimitRemaining = total - used;
      }
    }
  }

  /**
   * Scan Salesforce contacts for PII
   */
  async scanContacts(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }> {
    const query = this.buildContactQuery(config);
    const result = await this.executeSOQL(query);
    
    const findings: PIIFinding[] = [];
    
    for (const contact of result.records) {
      const contactFindings = await this.scanRecord(contact, 'Contact', scanId);
      findings.push(...contactFindings);
    }

    return {
      findings,
      recordsScanned: result.totalSize
    };
  }

  /**
   * Scan Salesforce leads for PII
   */
  async scanLeads(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }> {
    const query = this.buildLeadQuery(config);
    const result = await this.executeSOQL(query);
    
    const findings: PIIFinding[] = [];
    
    for (const lead of result.records) {
      const leadFindings = await this.scanRecord(lead, 'Lead', scanId);
      findings.push(...leadFindings);
    }

    return {
      findings,
      recordsScanned: result.totalSize
    };
  }

  /**
   * Scan Salesforce accounts for PII
   */
  async scanAccounts(config: ScanConfiguration, scanId: string): Promise<{ findings: PIIFinding[], recordsScanned: number }> {
    const query = this.buildAccountQuery(config);
    const result = await this.executeSOQL(query);
    
    const findings: PIIFinding[] = [];
    
    for (const account of result.records) {
      const accountFindings = await this.scanRecord(account, 'Account', scanId);
      findings.push(...accountFindings);
    }

    return {
      findings,
      recordsScanned: result.totalSize
    };
  }

  /**
   * Build SOQL query for contacts
   */
  private buildContactQuery(config: ScanConfiguration): string {
    const fields = [
      'Id', 'FirstName', 'LastName', 'Email', 'Phone', 'MobilePhone',
      'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode',
      'HasOptedOutOfEmail', 'DoNotCall', 'CreatedDate', 'LastModifiedDate'
    ];

    let query = `SELECT ${fields.join(', ')} FROM Contact`;
    
    if (!config.includeArchived) {
      query += ' WHERE IsDeleted = false';
    }

    if (config.timeRange) {
      const whereClause = config.includeArchived ? ' WHERE ' : ' AND ';
      query += `${whereClause}LastModifiedDate >= ${config.timeRange.startDate.toISOString()}`;
      query += ` AND LastModifiedDate <= ${config.timeRange.endDate.toISOString()}`;
    }

    query += ' ORDER BY LastModifiedDate DESC LIMIT 1000';
    
    return query;
  }

  /**
   * Build SOQL query for leads
   */
  private buildLeadQuery(config: ScanConfiguration): string {
    const fields = [
      'Id', 'FirstName', 'LastName', 'Email', 'Phone', 'MobilePhone',
      'Street', 'City', 'State', 'PostalCode', 'Company',
      'HasOptedOutOfEmail', 'DoNotCall', 'CreatedDate', 'LastModifiedDate'
    ];

    let query = `SELECT ${fields.join(', ')} FROM Lead`;
    
    if (!config.includeArchived) {
      query += ' WHERE IsDeleted = false';
    }

    if (config.timeRange) {
      const whereClause = config.includeArchived ? ' WHERE ' : ' AND ';
      query += `${whereClause}LastModifiedDate >= ${config.timeRange.startDate.toISOString()}`;
      query += ` AND LastModifiedDate <= ${config.timeRange.endDate.toISOString()}`;
    }

    query += ' ORDER BY LastModifiedDate DESC LIMIT 1000';
    
    return query;
  }

  /**
   * Build SOQL query for accounts
   */
  private buildAccountQuery(config: ScanConfiguration): string {
    const fields = [
      'Id', 'Name', 'Phone', 'Website',
      'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode',
      'CreatedDate', 'LastModifiedDate'
    ];

    let query = `SELECT ${fields.join(', ')} FROM Account`;
    
    if (!config.includeArchived) {
      query += ' WHERE IsDeleted = false';
    }

    if (config.timeRange) {
      const whereClause = config.includeArchived ? ' WHERE ' : ' AND ';
      query += `${whereClause}LastModifiedDate >= ${config.timeRange.startDate.toISOString()}`;
      query += ` AND LastModifiedDate <= ${config.timeRange.endDate.toISOString()}`;
    }

    query += ' ORDER BY LastModifiedDate DESC LIMIT 1000';
    
    return query;
  }

  /**
   * Scan individual Salesforce record for PII using CRM data scanner
   */
  private async scanRecord(record: SalesforceRecord, objectType: string, scanId: string): Promise<PIIFinding[]> {
    return await this.scanCRMRecord(record, objectType, scanId, this.config.instanceUrl);
  }

  /**
   * Get PII field mappings for Salesforce object types
   */
  private getPIIFieldMappings(objectType: string): Record<string, string> {
    const commonFields = {
      'Email': 'email',
      'Phone': 'phone',
      'MobilePhone': 'phone'
    };

    switch (objectType) {
      case 'Contact':
      case 'Lead':
        return {
          ...commonFields,
          'FirstName': 'name',
          'LastName': 'name',
          'Street': 'address',
          'MailingStreet': 'address',
          'City': 'address',
          'MailingCity': 'address',
          'State': 'address',
          'MailingState': 'address',
          'PostalCode': 'address',
          'MailingPostalCode': 'address'
        };
      case 'Account':
        return {
          ...commonFields,
          'Name': 'name',
          'BillingStreet': 'address',
          'BillingCity': 'address',
          'BillingState': 'address',
          'BillingPostalCode': 'address'
        };
      default:
        return commonFields;
    }
  }

  /**
   * Analyze individual field for PII content
   */
  private async analyzePIIField(
    fieldValue: string,
    fieldName: string,
    piiType: PIIType,
    record: SalesforceRecord,
    objectType: string,
    scanId: string
  ): Promise<PIIFinding | null> {
    // Basic PII validation based on field type
    if (!this.validatePIIContent(fieldValue, piiType)) {
      return null;
    }

    const location: DataLocation = {
      system: 'Salesforce',
      database: this.config.instanceUrl,
      table: objectType,
      column: fieldName,
      recordId: record.Id,
      metadata: {
        objectType,
        recordId: record.Id
      }
    };

    const consentStatus = this.determineConsentStatus(record, fieldName);
    const sensitivityLevel = this.determineSensitivityLevel(piiType, fieldValue);

    return {
      id: `finding_${scanId}_${record.Id}_${fieldName}`,
      type: piiType,
      location,
      content: this.maskSensitiveData(fieldValue),
      confidence: 0.9, // High confidence for structured CRM data
      sensitivityLevel,
      consentStatus,
      recommendedAction: this.getRecommendedAction(piiType, consentStatus, sensitivityLevel),
      detectionMethod: 'context',
      timestamp: new Date()
    };
  }

  /**
   * Validate PII content based on type
   */
  private validatePIIContent(value: string, piiType: PIIType): boolean {
    switch (piiType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /[\d\-\(\)\+\s]{10,}/.test(value);
      case 'name':
        return value.length >= 2 && /^[a-zA-Z\s\-'\.]+$/.test(value);
      case 'address':
        return value.length >= 5;
      default:
        return value.length > 0;
    }
  }

  /**
   * Determine consent status from Salesforce record
   */
  private determineConsentStatus(record: SalesforceRecord, fieldName: string): ConsentStatus {
    // Check opt-out flags
    if (fieldName === 'Email' && record.HasOptedOutOfEmail === true) {
      return 'revoked';
    }
    
    if ((fieldName === 'Phone' || fieldName === 'MobilePhone') && record.DoNotCall === true) {
      return 'revoked';
    }

    // For this implementation, assume valid consent if no opt-out
    // In real implementation, check against consent management system
    return 'valid';
  }

  /**
   * Determine sensitivity level based on PII type and content
   */
  private determineSensitivityLevel(piiType: PIIType, content: string): SensitivityLevel {
    switch (piiType) {
      case 'ssn':
      case 'credit_card':
        return 'high';
      case 'email':
      case 'phone':
        return 'medium';
      case 'name':
      case 'address':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get recommended remediation action
   */
  private getRecommendedAction(
    piiType: PIIType,
    consentStatus: ConsentStatus,
    sensitivityLevel: SensitivityLevel
  ): RemediationAction {
    if (consentStatus === 'expired' || consentStatus === 'revoked') {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'delete',
        description: `Delete ${piiType} data due to ${consentStatus} consent`,
        priority: sensitivityLevel === 'high' ? 'critical' : 'high',
        automated: false
      };
    }

    if (sensitivityLevel === 'high') {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'encrypt',
        description: `Encrypt high-sensitivity ${piiType} data`,
        priority: 'high',
        automated: true
      };
    }

    return {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'flag_review',
      description: `Review ${piiType} data for compliance`,
      priority: 'medium',
      automated: false
    };
  }






}