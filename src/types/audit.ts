export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userName: string;
  tenantId?: string;
  sessionId?: string;
  eventType: AuditEventType;
  category: AuditCategory;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  metadata: AuditMetadata;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
}

export enum AuditEventType {
  // Authentication & Authorization
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  MFA_VERIFICATION = 'MFA_VERIFICATION',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Data Operations
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_DELETE = 'DATA_DELETE',
  DATA_MODIFY = 'DATA_MODIFY',
  
  // Compliance Operations
  COMPLIANCE_ASSESSMENT = 'COMPLIANCE_ASSESSMENT',
  POLICY_UPDATE = 'POLICY_UPDATE',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  AUDIT_REPORT_GENERATED = 'AUDIT_REPORT_GENERATED',
  
  // DSAR Operations
  DSAR_CREATED = 'DSAR_CREATED',
  DSAR_PROCESSED = 'DSAR_PROCESSED',
  DSAR_COMPLETED = 'DSAR_COMPLETED',
  DSAR_REJECTED = 'DSAR_REJECTED',
  
  // System Operations
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  USER_CREATED = 'USER_CREATED',
  USER_MODIFIED = 'USER_MODIFIED',
  USER_DELETED = 'USER_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  
  // Tenant Operations
  TENANT_CREATED = 'TENANT_CREATED',
  TENANT_MODIFIED = 'TENANT_MODIFIED',
  TENANT_SWITCHED = 'TENANT_SWITCHED',
  
  // Security Events
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  BREACH_DETECTED = 'BREACH_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // AI Agent Operations
  AI_AGENT_ACTIVATED = 'AI_AGENT_ACTIVATED',
  AI_AGENT_CONFIGURED = 'AI_AGENT_CONFIGURED',
  AI_AGENT_TASK_EXECUTED = 'AI_AGENT_TASK_EXECUTED'
}

export enum AuditCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT',
  COMPLIANCE = 'COMPLIANCE',
  PRIVACY = 'PRIVACY',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  TENANT_MANAGEMENT = 'TENANT_MANAGEMENT',
  AI_OPERATIONS = 'AI_OPERATIONS'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  DENIED = 'DENIED'
}

export interface AuditMetadata {
  correlationId?: string;
  requestId?: string;
  source: string; // Component or service that generated the event
  version: string;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
  customFields?: Record<string, any>;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  tenantId?: string;
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  outcomes?: AuditOutcome[];
  resources?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSearchResult {
  events: AuditEvent[];
  totalCount: number;
  hasMore: boolean;
  aggregations?: AuditAggregation[];
}

export interface AuditAggregation {
  field: string;
  buckets: Array<{
    key: string;
    count: number;
  }>;
}

export interface AuditExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'xml';
  filter: AuditFilter;
  includeMetadata: boolean;
  digitalSignature: boolean;
  encryptionKey?: string;
}

export interface AuditRetentionPolicy {
  id: string;
  name: string;
  retentionPeriodDays: number;
  categories: AuditCategory[];
  severities: AuditSeverity[];
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  immutablePeriodDays: number;
  enabled: boolean;
}

export interface AuditConfiguration {
  enabled: boolean;
  retentionPolicies: AuditRetentionPolicy[];
  realTimeAlerting: boolean;
  encryptionEnabled: boolean;
  digitalSignatures: boolean;
  geoLocationTracking: boolean;
  sensitiveDataMasking: boolean;
  complianceMode: boolean;
}

export interface AuditAlert {
  id: string;
  name: string;
  description: string;
  conditions: AuditAlertCondition[];
  actions: AuditAlertAction[];
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface AuditAlertCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  timeWindow?: number; // minutes
  threshold?: number;
}

export interface AuditAlertAction {
  type: 'email' | 'webhook' | 'sms' | 'slack';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByCategory: Record<AuditCategory, number>;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<AuditOutcome, number>;
  topUsers: Array<{ userId: string; userName: string; eventCount: number }>;
  topResources: Array<{ resource: string; eventCount: number }>;
  timeSeriesData: Array<{ timestamp: Date; count: number }>;
}