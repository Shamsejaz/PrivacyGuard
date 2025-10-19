// API-specific types and interfaces for Privacy Comply Agent REST endpoints

import {
  ComplianceFinding,
  ComplianceAssessment,
  RemediationRecommendation,
  RemediationResult,
  ComplianceReport,
  QueryResponse,
  ConversationContext,
  AgentConfiguration
} from '../types';

// Base API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Agent Status API
export interface AgentStatusResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  initialized: boolean;
  monitoring: boolean;
  services: Record<string, boolean>;
  lastScan: string;
  nextScan: string;
  activeWorkflows: number;
  activeRemediations: number;
  configuration: AgentConfiguration;
  systemHealth: {
    overallScore: number;
    categoryScores: Record<string, number>;
    criticalIssues: number;
  };
}

export interface AgentControlRequest {
  action: 'start' | 'stop' | 'restart' | 'scan' | 'initialize';
  options?: {
    skipRemediation?: boolean;
    generateReport?: boolean;
    targetFindings?: string[];
  };
}

export interface AgentControlResponse {
  action: string;
  success: boolean;
  message: string;
  workflowId?: string;
  executionTime?: number;
}

// Compliance Findings API
export interface FindingsQueryParams extends PaginationParams {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingType?: 'ENCRYPTION' | 'ACCESS_CONTROL' | 'PII_EXPOSURE' | 'LOGGING';
  resourceType?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
  resolved?: boolean;
}

export interface FindingDetailsResponse extends APIResponse<ComplianceFinding> {
  assessment?: ComplianceAssessment;
  recommendations?: RemediationRecommendation[];
  remediationHistory?: RemediationResult[];
}

export interface ComplianceMetricsResponse {
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  findingsByType: Record<string, number>;
  findingsByRegion: Record<string, number>;
  complianceScore: number;
  trends: {
    period: string;
    findings: number;
    resolved: number;
    score: number;
  }[];
}

// Remediation API
export interface RemediationRequest {
  findingIds: string[];
  approvalRequired?: boolean;
  scheduledTime?: string;
  dryRun?: boolean;
}

export interface RemediationStatusResponse {
  remediationId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  progress: number;
  startTime: string;
  endTime?: string;
  findingId: string;
  action: string;
  message: string;
  rollbackAvailable: boolean;
  logs: string[];
}

export interface RemediationHistoryParams extends PaginationParams {
  findingId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Reporting API
export interface ReportGenerationRequest {
  type: 'DPIA' | 'ROPA' | 'AUDIT' | 'SUMMARY';
  scope?: {
    departments?: string[];
    regulations?: string[];
    timeRange?: {
      startDate: string;
      endDate: string;
    };
    resourceTypes?: string[];
  };
  format?: 'JSON' | 'PDF' | 'XLSX';
  includeExecutiveSummary?: boolean;
}

export interface ReportGenerationResponse {
  reportId: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  generatedAt?: string;
  expiresAt?: string;
}

export interface ReportListParams extends PaginationParams {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface ReportMetadata {
  id: string;
  type: string;
  generatedAt: string;
  scope: any;
  size: number;
  downloadUrl: string;
  expiresAt: string;
}

// Query API
export interface NaturalLanguageQueryRequest {
  query: string;
  conversationId?: string;
  context?: Record<string, any>;
}

export interface QuerySuggestion {
  text: string;
  category: string;
  description: string;
}

export interface ConversationHistoryParams extends PaginationParams {
  conversationId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ConversationEntry {
  id: string;
  conversationId: string;
  query: string;
  response: QueryResponse;
  timestamp: string;
  userId?: string;
}

// Configuration API
export interface ConfigurationUpdateRequest {
  scanInterval?: number;
  autoRemediation?: boolean;
  maxConcurrentRemediations?: number;
  riskThreshold?: number;
  enableContinuousMonitoring?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ConfigurationValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Webhook and Events
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
}

export interface EventNotification {
  eventType: string;
  timestamp: string;
  data: any;
  severity?: string;
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    name: string;
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    details?: any;
  }[];
  metrics: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  path?: string;
  method?: string;
}

export interface ValidationError extends APIError {
  code: 'VALIDATION_ERROR';
  fields: {
    field: string;
    message: string;
    value?: any;
  }[];
}

export interface AuthenticationError extends APIError {
  code: 'AUTHENTICATION_ERROR';
}

export interface AuthorizationError extends APIError {
  code: 'AUTHORIZATION_ERROR';
  requiredPermissions?: string[];
}

export interface NotFoundError extends APIError {
  code: 'NOT_FOUND';
  resource: string;
  resourceId?: string;
}

export interface ConflictError extends APIError {
  code: 'CONFLICT';
  conflictingResource?: string;
}

export interface RateLimitError extends APIError {
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number;
}

export interface ServiceUnavailableError extends APIError {
  code: 'SERVICE_UNAVAILABLE';
  service: string;
  estimatedRecoveryTime?: string;
}