// API Integration Framework Types

export interface APIIntegration {
  id: string;
  name: string;
  description: string;
  type: 'crm' | 'erp' | 'hr' | 'marketing' | 'analytics' | 'custom';
  category: 'source' | 'target' | 'bidirectional';
  status: 'active' | 'inactive' | 'error' | 'configuring';
  configuration: APIConfiguration;
  authentication: APIAuthentication;
  endpoints: APIEndpoint[];
  dataMapping: DataMapping[];
  webhooks: WebhookConfig[];
  monitoring: IntegrationMonitoring;
  security: SecurityConfig;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  createdBy: string;
}

export interface APIConfiguration {
  baseUrl: string;
  version?: string;
  timeout: number;
  retryPolicy: RetryPolicy;
  rateLimiting: RateLimitConfig;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  environment: 'development' | 'staging' | 'production';
}

export interface APIAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2' | 'jwt' | 'custom';
  credentials: AuthCredentials;
  refreshConfig?: RefreshConfig;
  scopes?: string[];
}

export interface AuthCredentials {
  // Basic Auth
  username?: string;
  password?: string;
  
  // API Key
  apiKey?: string;
  apiKeyHeader?: string;
  
  // Bearer Token
  token?: string;
  
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  redirectUri?: string;
  
  // JWT
  privateKey?: string;
  publicKey?: string;
  algorithm?: string;
  
  // Custom
  customHeaders?: Record<string, string>;
  customParams?: Record<string, string>;
}

export interface RefreshConfig {
  enabled: boolean;
  refreshUrl?: string;
  refreshToken?: string;
  expirationBuffer: number; // minutes before expiry to refresh
  maxRetries: number;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
  strategy: 'fixed_window' | 'sliding_window' | 'token_bucket';
}

export interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters: EndpointParameter[];
  requestSchema?: JSONSchema;
  responseSchema?: JSONSchema;
  authentication?: APIAuthentication;
  rateLimit?: RateLimitConfig;
  caching?: CacheConfig;
  enabled: boolean;
}

export interface EndpointParameter {
  name: string;
  type: 'query' | 'path' | 'header' | 'body';
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message?: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  strategy: 'memory' | 'redis' | 'database';
  keyPattern?: string;
  invalidationRules?: string[];
}

export interface DataMapping {
  id: string;
  name: string;
  sourceField: string;
  targetField: string;
  transformation?: DataTransformation;
  validation?: ValidationRule[];
  required: boolean;
}

export interface DataTransformation {
  type: 'format' | 'calculate' | 'lookup' | 'conditional' | 'aggregate' | 'custom';
  config: TransformationConfig;
}

export interface TransformationConfig {
  // Format transformation
  inputFormat?: string;
  outputFormat?: string;
  
  // Calculate transformation
  expression?: string;
  variables?: Record<string, any>;
  
  // Lookup transformation
  lookupTable?: Record<string, any>;
  defaultValue?: any;
  
  // Conditional transformation
  conditions?: ConditionalRule[];
  
  // Aggregate transformation
  aggregateFunction?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string[];
  
  // Custom transformation
  customFunction?: string;
  customParams?: Record<string, any>;
}

export interface ConditionalRule {
  condition: string;
  value: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
}

// Webhook Types
export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  authentication?: WebhookAuthentication;
  headers: Record<string, string>;
  retryPolicy: RetryPolicy;
  security: WebhookSecurity;
  status: 'active' | 'inactive' | 'error';
  createdAt: Date;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
}

export interface WebhookEvent {
  type: string;
  description: string;
  payload: JSONSchema;
  filters?: EventFilter[];
}

export interface EventFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: any;
}

export interface WebhookAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'hmac' | 'custom';
  credentials: AuthCredentials;
  signatureHeader?: string;
  algorithm?: 'sha256' | 'sha512' | 'md5';
}

export interface WebhookSecurity {
  ipWhitelist?: string[];
  userAgent?: string;
  customHeaders?: Record<string, string>;
  encryption?: {
    enabled: boolean;
    algorithm: string;
    key: string;
  };
}

// Monitoring Types
export interface IntegrationMonitoring {
  healthCheck: HealthCheckConfig;
  metrics: IntegrationMetrics;
  alerts: AlertConfig[];
  logs: LogConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // seconds
  timeout: number; // seconds
  endpoint?: string;
  expectedStatus: number[];
  expectedResponse?: any;
  retries: number;
}

export interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  uptime: number; // percentage
  errorRate: number; // percentage
  throughput: number; // requests per minute
}

export interface AlertConfig {
  id: string;
  name: string;
  type: 'error_rate' | 'response_time' | 'uptime' | 'throughput' | 'custom';
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  notifications: NotificationConfig[];
  enabled: boolean;
}

export interface NotificationConfig {
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'in_app';
  recipients: string[];
  template?: string;
  config?: Record<string, any>;
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  format: 'json' | 'text';
  includeHeaders: boolean;
  includeBody: boolean;
  maskSensitiveData: boolean;
}

// Security Types
export interface SecurityConfig {
  encryption: EncryptionConfig;
  accessControl: AccessControlConfig;
  audit: AuditConfig;
  compliance: ComplianceConfig;
}

export interface EncryptionConfig {
  inTransit: {
    enabled: boolean;
    protocol: 'TLS1.2' | 'TLS1.3';
    certificateValidation: boolean;
  };
  atRest: {
    enabled: boolean;
    algorithm: 'AES256' | 'AES128';
    keyRotation: boolean;
    keyRotationInterval: number; // days
  };
}

export interface AccessControlConfig {
  ipWhitelist?: string[];
  userAgentValidation: boolean;
  corsPolicy?: CORSPolicy;
  apiKeyRotation: {
    enabled: boolean;
    interval: number; // days
    notificationDays: number;
  };
}

export interface CORSPolicy {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface AuditConfig {
  enabled: boolean;
  logAllRequests: boolean;
  logFailedRequests: boolean;
  logAuthenticationEvents: boolean;
  retention: number; // days
  exportFormat: 'json' | 'csv' | 'xml';
}

export interface ComplianceConfig {
  frameworks: string[]; // GDPR, CCPA, HIPAA, etc.
  dataClassification: DataClassificationConfig;
  retention: RetentionConfig;
  anonymization: AnonymizationConfig;
}

export interface DataClassificationConfig {
  enabled: boolean;
  rules: ClassificationRule[];
  defaultClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface ClassificationRule {
  field: string;
  pattern: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  action: 'log' | 'mask' | 'encrypt' | 'block';
}

export interface RetentionConfig {
  enabled: boolean;
  defaultPeriod: number; // days
  rules: RetentionRule[];
}

export interface RetentionRule {
  dataType: string;
  period: number; // days
  action: 'delete' | 'archive' | 'anonymize';
}

export interface AnonymizationConfig {
  enabled: boolean;
  techniques: AnonymizationTechnique[];
  preserveUtility: boolean;
}

export interface AnonymizationTechnique {
  field: string;
  method: 'mask' | 'hash' | 'tokenize' | 'generalize' | 'suppress';
  config: Record<string, any>;
}

// Data Synchronization Types
export interface DataSyncConfig {
  id: string;
  name: string;
  sourceIntegration: string;
  targetIntegration: string;
  syncType: 'full' | 'incremental' | 'real_time' | 'scheduled';
  schedule?: ScheduleConfig;
  mapping: DataMapping[];
  filters: SyncFilter[];
  conflictResolution: ConflictResolutionConfig;
  validation: SyncValidationConfig;
  status: 'active' | 'inactive' | 'error' | 'paused';
  lastSync?: Date;
  nextSync?: Date;
  metrics: SyncMetrics;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval';
  expression: string; // cron expression or interval in minutes
  timezone: string;
  enabled: boolean;
}

export interface SyncFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ConflictResolutionConfig {
  strategy: 'source_wins' | 'target_wins' | 'timestamp_wins' | 'manual' | 'custom';
  customRules?: ConflictRule[];
  notifyOnConflict: boolean;
  notifications: NotificationConfig[];
}

export interface ConflictRule {
  condition: string;
  resolution: 'source' | 'target' | 'merge' | 'skip';
  mergeStrategy?: 'concatenate' | 'sum' | 'average' | 'custom';
}

export interface SyncValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
  onValidationFailure: 'skip' | 'stop' | 'log';
  notifications: NotificationConfig[];
}

export interface SyncMetrics {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  conflictedRecords: number;
  lastSyncDuration: number; // milliseconds
  averageSyncDuration: number; // milliseconds
  errorRate: number; // percentage
}

// API Integration Templates
export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'erp' | 'hr' | 'marketing' | 'analytics';
  vendor: string;
  version: string;
  configuration: Partial<APIConfiguration>;
  authentication: Partial<APIAuthentication>;
  endpoints: Partial<APIEndpoint>[];
  commonMappings: DataMapping[];
  webhookTemplates: Partial<WebhookConfig>[];
  documentation: string;
  tags: string[];
  popularity: number;
  verified: boolean;
}

// System Integration Types
export interface SystemIntegration {
  crm: CRMIntegration[];
  erp: ERPIntegration[];
  hr: HRIntegration[];
}

export interface CRMIntegration {
  type: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom';
  name: string;
  configuration: APIConfiguration;
  dataSync: {
    contacts: boolean;
    leads: boolean;
    opportunities: boolean;
    activities: boolean;
  };
}

export interface ERPIntegration {
  type: 'sap' | 'oracle' | 'netsuite' | 'dynamics' | 'custom';
  name: string;
  configuration: APIConfiguration;
  dataSync: {
    customers: boolean;
    vendors: boolean;
    employees: boolean;
    transactions: boolean;
  };
}

export interface HRIntegration {
  type: 'workday' | 'bamboohr' | 'adp' | 'successfactors' | 'custom';
  name: string;
  configuration: APIConfiguration;
  dataSync: {
    employees: boolean;
    departments: boolean;
    roles: boolean;
    performance: boolean;
  };
}

// API Request/Response Types
export interface APIRequest {
  id: string;
  integrationId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, any>;
  body?: any;
  timestamp: Date;
  userId: string;
}

export interface APIResponse {
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  responseTime: number;
  timestamp: Date;
  cached: boolean;
  retryCount: number;
}

export interface APIError {
  requestId: string;
  type: 'network' | 'authentication' | 'authorization' | 'validation' | 'server' | 'timeout';
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}