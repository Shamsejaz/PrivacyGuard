/**
 * MCP Privacy Connectors - Connector Interfaces
 * Interfaces defining connector operations and capabilities
 */

import type {
  ConnectorCredentials,
  ScanConfiguration,
  ScanResult,
  RemediationAction,
  RemediationResult,
  ConnectorHealth,
  PIIFinding,
  ScanContext
} from '../types/index.js';

/**
 * Core connector interface that all MCP connectors must implement
 */
export interface IMCPConnector {
  /**
   * Connect to the external system using provided credentials
   */
  connect(credentials: ConnectorCredentials): Promise<void>;

  /**
   * Execute privacy scan based on configuration
   */
  scan(config: ScanConfiguration): Promise<ScanResult>;

  /**
   * Execute remediation actions on identified privacy findings
   */
  remediate(actions: RemediationAction[]): Promise<RemediationResult>;

  /**
   * Get current health status of the connector
   */
  getHealth(): ConnectorHealth;

  /**
   * Disconnect from the external system
   */
  disconnect(): Promise<void>;
}

/**
 * Interface for connectors that support real-time scanning
 */
export interface IRealtimeConnector extends IMCPConnector {
  /**
   * Start real-time monitoring for privacy events
   */
  startRealtimeMonitoring(callback: (finding: PIIFinding) => void): Promise<void>;

  /**
   * Stop real-time monitoring
   */
  stopRealtimeMonitoring(): Promise<void>;

  /**
   * Check if real-time monitoring is active
   */
  isRealtimeActive(): boolean;
}

/**
 * Interface for connectors that support batch operations
 */
export interface IBatchConnector extends IMCPConnector {
  /**
   * Execute batch scan on large datasets
   */
  batchScan(config: ScanConfiguration, batchSize: number): Promise<ScanResult[]>;

  /**
   * Execute batch remediation actions
   */
  batchRemediate(actions: RemediationAction[], batchSize: number): Promise<RemediationResult[]>;
}

/**
 * Interface for CRM-specific connector operations
 */
export interface ICRMConnector extends IMCPConnector {
  /**
   * Scan contact records for PII
   */
  scanContacts(filters?: any[]): Promise<ScanResult>;

  /**
   * Scan lead records for PII
   */
  scanLeads(filters?: any[]): Promise<ScanResult>;

  /**
   * Update consent status for records
   */
  updateConsentStatus(recordId: string, status: string): Promise<void>;

  /**
   * Delete expired consent records
   */
  deleteExpiredRecords(criteria: any): Promise<RemediationResult>;
}

/**
 * Interface for CMS-specific connector operations
 */
export interface ICMSConnector extends IMCPConnector {
  /**
   * Scan website pages for exposed PII
   */
  scanPages(siteUrl: string): Promise<ScanResult>;

  /**
   * Scan comments for PII
   */
  scanComments(): Promise<ScanResult>;

  /**
   * Detect third-party tracking scripts
   */
  detectTrackers(): Promise<any>;

  /**
   * Audit privacy policy compliance
   */
  auditPrivacyPolicy(): Promise<any>;
}

/**
 * Interface for email/chat connector operations
 */
export interface IEmailChatConnector extends IMCPConnector {
  /**
   * Scan messages for PII sharing
   */
  scanMessages(timeRange: { startDate: Date; endDate: Date }): Promise<ScanResult>;

  /**
   * Scan attachments for sensitive data
   */
  scanAttachments(filters?: any[]): Promise<ScanResult>;

  /**
   * Detect external sharing risks
   */
  detectExternalSharing(): Promise<any>;

  /**
   * Generate anonymized communication summary
   */
  generateAnonymizedSummary(): Promise<any>;
}

/**
 * Interface for cloud storage connector operations
 */
export interface ICloudStorageConnector extends IMCPConnector {
  /**
   * Scan storage buckets for unencrypted PII
   */
  scanBuckets(bucketNames: string[]): Promise<ScanResult>;

  /**
   * Scan databases for PII
   */
  scanDatabases(connectionStrings: string[]): Promise<ScanResult>;

  /**
   * Check encryption status of stored data
   */
  checkEncryption(): Promise<any>;

  /**
   * Apply data retention policies
   */
  applyRetentionPolicies(): Promise<RemediationResult>;
}

/**
 * Interface for privacy detection capabilities
 */
export interface IPrivacyDetector {
  /**
   * Detect PII in provided content
   */
  detectPII(content: string, context: ScanContext): Promise<PIIFinding[]>;

  /**
   * Classify data sensitivity level
   */
  classifyDataSensitivity(data: any): Promise<string>;

  /**
   * Validate consent status
   */
  validateConsent(record: any, consentRules: any[]): Promise<string>;

  /**
   * Generate remediation suggestions
   */
  generateRemediationSuggestions(findings: PIIFinding[]): Promise<RemediationAction[]>;
}

/**
 * Interface for connector configuration management
 */
export interface IConnectorConfiguration {
  /**
   * Validate connector configuration
   */
  validateConfiguration(config: any): Promise<boolean>;

  /**
   * Get default configuration template
   */
  getDefaultConfiguration(): any;

  /**
   * Test connector connectivity
   */
  testConnection(credentials: ConnectorCredentials): Promise<boolean>;

  /**
   * Get supported scan options
   */
  getSupportedScanOptions(): any;
}

/**
 * Interface for connector lifecycle management
 */
export interface IConnectorLifecycle {
  /**
   * Initialize connector with configuration
   */
  initialize(config: any): Promise<void>;

  /**
   * Start connector operations
   */
  start(): Promise<void>;

  /**
   * Stop connector operations
   */
  stop(): Promise<void>;

  /**
   * Restart connector
   */
  restart(): Promise<void>;

  /**
   * Get connector status
   */
  getStatus(): string;
}

/**
 * Interface for audit and compliance tracking
 */
export interface IAuditTracker {
  /**
   * Log connector activity
   */
  logActivity(activity: string, details?: any): void;

  /**
   * Get audit trail
   */
  getAuditTrail(startDate?: Date, endDate?: Date): any[];

  /**
   * Generate compliance report
   */
  generateComplianceReport(): Promise<any>;
}