/**
 * MCP Privacy Connectors - Type Definitions
 * Core types and interfaces for Model Context Protocol privacy scanning connectors
 */

export type ConnectorType = 'crm' | 'cms' | 'email_chat' | 'cloud_storage';
export type ScanDepth = 'shallow' | 'deep';
export type SensitivityLevel = 'low' | 'medium' | 'high';
export type ConsentStatus = 'valid' | 'expired' | 'missing' | 'revoked';
export type PIIType = 'email' | 'phone' | 'ssn' | 'address' | 'name' | 'credit_card' | 'custom';
export type RemediationActionType = 'mask' | 'delete' | 'encrypt' | 'anonymize' | 'flag_review';

/**
 * Connector credentials interface for secure authentication
 */
export interface ConnectorCredentials {
  id: string;
  connectorType: ConnectorType;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  endpoint?: string;
  additionalConfig?: Record<string, any>;
  encryptedData?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Scan configuration for privacy scanning operations
 */
export interface ScanConfiguration {
  connectors: string[];
  scanDepth: ScanDepth;
  includeArchived: boolean;
  customRules: PrivacyRule[];
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: ScanFilter[];
}

/**
 * Privacy rule definition for custom PII detection
 */
export interface PrivacyRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  piiType: PIIType;
  sensitivityLevel: SensitivityLevel;
  isEnabled: boolean;
}

/**
 * Scan filter for targeted scanning
 */
export interface ScanFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
}

/**
 * Data location information for PII findings
 */
export interface DataLocation {
  system: string;
  database?: string;
  table?: string;
  column?: string;
  recordId?: string;
  filePath?: string;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * PII finding result from privacy scanning
 */
export interface PIIFinding {
  id: string;
  type: PIIType;
  location: DataLocation;
  content: string; // masked/hashed for security
  confidence: number;
  sensitivityLevel: SensitivityLevel;
  consentStatus?: ConsentStatus;
  recommendedAction: RemediationAction;
  detectionMethod: 'regex' | 'ml' | 'context' | 'custom_rule';
  timestamp: Date;
}

/**
 * Remediation action for privacy findings
 */
export interface RemediationAction {
  id: string;
  type: RemediationActionType;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  parameters?: Record<string, any>;
}

/**
 * Scan result from connector operations
 */
export interface ScanResult {
  id: string;
  scanId: string;
  connectorId: string;
  connectorType: ConnectorType;
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled';
  findings: PIIFinding[];
  metrics: ScanMetrics;
  remediationActions: RemediationAction[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Scan metrics for performance and compliance tracking
 */
export interface ScanMetrics {
  recordsScanned: number;
  piiInstancesFound: number;
  sensitiveDataVolume: number;
  complianceScore: number;
  processingTimeMs: number;
  errorCount: number;
}

/**
 * Connector health status
 */
export interface ConnectorHealth {
  connectorId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastHealthCheck: Date;
  responseTimeMs: number;
  errorRate: number;
  uptime: number;
  details?: string;
}

/**
 * Scan context for privacy detection engine
 */
export interface ScanContext {
  connectorType: ConnectorType;
  dataSource: string;
  fieldNames?: string[];
  recordMetadata?: Record<string, any>;
  organizationRules?: PrivacyRule[];
}

/**
 * Authentication token for connector operations
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string[];
}

/**
 * Connector activity log entry
 */
export interface ConnectorActivity {
  connectorId: string;
  activity: string;
  timestamp: Date;
  details?: Record<string, any>;
  userId?: string;
}

/**
 * Remediation result from connector operations
 */
export interface RemediationResult {
  actionId: string;
  status: 'success' | 'failed' | 'partial';
  recordsAffected: number;
  details?: string;
  timestamp: Date;
}