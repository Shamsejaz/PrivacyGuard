/**
 * Types for Dark Web Intelligence & Threat Intelligence APIs
 */

// Core Enums
export type ThreatIntelSource = 'constella' | 'intsights' | 'dehashed' | 'custom';
export type ExposureType = 'credentials' | 'pii' | 'corporate_data' | 'api_keys' | 'documents' | 'financial';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ContactMethod = 'email' | 'form' | 'api' | 'manual';
export type TakedownType = 'automated' | 'assisted' | 'manual';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'requires_manual';

// API Credentials
export interface APICredentials {
  apiKey: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// MCP Connector Configuration
export interface MCPConnectorConfig {
  sourceId: ThreatIntelSource;
  name: string;
  baseUrl: string;
  credentialId: string;
  rateLimits: RateLimitConfig;
  retryConfig: RetryConfig;
  timeout: number;
  enabled: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Query Interfaces
export interface CredentialQuery {
  emails: string[];
  domains: string[];
  usernames: string[];
  apiKeyHashes: string[];
  timeRange: DateRange;
  includePasswords?: boolean;
  minConfidence?: number;
}

export interface MarketplaceQuery {
  keywords: string[];
  domains: string[];
  categories: string[];
  timeRange: DateRange;
  minRiskScore?: number;
  includeMetadata?: boolean;
}

export interface BreachQuery {
  emails: string[];
  domains: string[];
  breachNames: string[];
  timeRange: DateRange;
  includePasswords?: boolean;
  verifiedOnly?: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Result Interfaces
export interface CredentialResult {
  id: string;
  source: ThreatIntelSource;
  email: string;
  username?: string;
  domain: string;
  passwordHash?: string;
  plainTextPassword?: string;
  breachName: string;
  breachDate: Date;
  discoveredDate: Date;
  confidence: number;
  riskScore: number;
  metadata: Record<string, any>;
}

export interface MarketplaceResult {
  id: string;
  source: ThreatIntelSource;
  title: string;
  description: string;
  url: string;
  marketplace: string;
  category: string;
  price?: number;
  currency?: string;
  seller: string;
  discoveredDate: Date;
  lastSeen: Date;
  riskScore: number;
  keywords: string[];
  metadata: Record<string, any>;
}

export interface BreachResult {
  id: string;
  source: ThreatIntelSource;
  breachName: string;
  breachDate: Date;
  discoveredDate: Date;
  affectedRecords: number;
  dataTypes: string[];
  description: string;
  verified: boolean;
  riskScore: number;
  affectedEmails: string[];
  metadata: Record<string, any>;
}

export interface KeywordMonitorResult {
  id: string;
  keyword: string;
  source: ThreatIntelSource;
  matches: KeywordMatch[];
  totalMatches: number;
  lastUpdated: Date;
}

export interface KeywordMatch {
  id: string;
  content: string;
  url: string;
  title?: string;
  discoveredDate: Date;
  riskScore: number;
  context: string;
}

// Health and Status
export interface SourceHealthStatus {
  sourceId: ThreatIntelSource;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

// Dark Web Finding
export interface DarkWebFinding {
  findingId: string;
  scanId: string;
  source: ThreatIntelSource;
  discoveredAt: Date;
  lastSeen: Date;
  exposureType: ExposureType;
  riskScore: number;
  confidenceLevel: number;
  affectedAssets: AffectedAsset[];
  evidenceReferences: EvidenceReference[];
  sanitizedContent: string;
  takedownStatus: TakedownStatus;
  complianceFlags: ComplianceFlag[];
}

export interface AffectedAsset {
  type: 'email' | 'domain' | 'username' | 'api_key' | 'document' | 'database';
  value: string;
  classification: DataClassification;
  businessUnit?: string;
}

export interface EvidenceReference {
  evidenceId: string;
  type: 'screenshot' | 'document' | 'log' | 'metadata';
  s3Location: string;
  accessUrl: string;
  expiryDate: Date;
  checksumHash: string;
}

export interface TakedownStatus {
  status: ActionStatus;
  initiatedAt?: Date;
  completedAt?: Date;
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  method: ContactMethod;
  evidence: string[];
}

export interface ComplianceFlag {
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiresNotification: boolean;
  deadline?: Date;
}

// Constella-specific types
export interface ConstellaCredentialResponse {
  results: ConstellaCredential[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ConstellaCredential {
  id: string;
  email: string;
  username?: string;
  domain: string;
  password_hash?: string;
  password_plain?: string;
  breach_name: string;
  breach_date: string;
  discovered_date: string;
  confidence_score: number;
  source_reliability: number;
  additional_data?: Record<string, any>;
}

export interface ConstellaAPIKeyResponse {
  results: ConstellaAPIKey[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ConstellaAPIKey {
  id: string;
  api_key_hash: string;
  service_name: string;
  domain: string;
  discovered_date: string;
  last_seen: string;
  exposure_context: string;
  risk_level: string;
}

// IntSights-specific types
export interface IntSightsMarketplaceResponse {
  data: IntSightsListing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

export interface IntSightsListing {
  id: string;
  title: string;
  description: string;
  url: string;
  marketplace: string;
  category: string;
  price: number;
  currency: string;
  seller: {
    name: string;
    reputation: number;
    verified: boolean;
  };
  discovered_date: string;
  last_seen: string;
  risk_score: number;
  keywords: string[];
  metadata: Record<string, any>;
}

// DeHashed-specific types
export interface DeHashedBreachResponse {
  success: boolean;
  balance: number;
  entries: DeHashedEntry[];
  total: number;
}

export interface DeHashedEntry {
  id: string;
  email: string;
  username?: string;
  password?: string;
  hashed_password?: string;
  name?: string;
  vin?: string;
  address?: string;
  phone?: string;
  database_name: string;
  obtained_from: string;
  breach_date?: string;
}

// Error types
export interface ConnectorError extends Error {
  sourceId: ThreatIntelSource;
  errorCode: string;
  retryable: boolean;
  rateLimited: boolean;
}

// Scan Configuration
export interface DarkWebScanConfig {
  keywords: string[];
  domains: string[];
  emailPatterns: string[];
  apiKeyHashes: string[];
  scanDepth: 'surface' | 'deep' | 'comprehensive';
  sources: ThreatIntelSource[];
  riskThreshold: RiskLevel;
  autoTakedown: boolean;
}

export interface ScanResult {
  scanId: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'in_progress';
  findings: DarkWebFinding[];
  riskScore: number;
  evidenceUrls: string[];
  takedownActions: TakedownAction[];
}

export interface TakedownAction {
  actionId: string;
  type: TakedownType;
  targetUrl: string;
  contactMethod: ContactMethod;
  evidenceUrls: string[];
  urgencyLevel: UrgencyLevel;
  automationLevel: 'full' | 'assisted' | 'manual';
}