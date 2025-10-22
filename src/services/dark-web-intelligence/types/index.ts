// Core Types for Dark Web Intelligence System

export interface ThreatIntelSource {
  id: string;
  name: string;
  type: 'credential_monitoring' | 'marketplace_scanning' | 'breach_database' | 'osint';
  apiEndpoint: string;
  isActive: boolean;
  rateLimits: RateLimit;
  credentialId: string; // AWS Secrets Manager secret ID
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface CredentialQuery {
  emails: string[];
  domains: string[];
  usernames: string[];
  apiKeyHashes: string[];
  timeRange: DateRange;
}

export interface MarketplaceQuery {
  keywords: string[];
  domains: string[];
  categories: string[];
  timeRange: DateRange;
}

export interface BreachQuery {
  emails: string[];
  domains: string[];
  breachNames: string[];
  timeRange: DateRange;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DarkWebFinding {
  findingId: string;
  source: ThreatIntelSource;
  exposureType: ExposureType;
  discoveredAt: Date;
  lastSeen: Date;
  riskScore: number;
  confidenceLevel: number;
  affectedAssets: AffectedAsset[];
  evidenceHash: string;
  sanitizedContent: string;
  takedownStatus: TakedownStatus;
  complianceFlags: ComplianceFlag[];
}

export interface AffectedAsset {
  type: 'email' | 'domain' | 'credential' | 'api_key' | 'document';
  value: string;
  classification: DataClassification;
}

export interface CredentialResult {
  id: string;
  source: string;
  email: string;
  username?: string;
  domain: string;
  exposureDate: Date;
  breachName?: string;
  passwordHash?: string;
  additionalData: Record<string, any>;
}

export interface MarketplaceResult {
  id: string;
  source: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  currency?: string;
  seller: string;
  postedDate: Date;
  url: string;
  keywords: string[];
}

export interface BreachResult {
  id: string;
  source: string;
  breachName: string;
  breachDate: Date;
  recordCount: number;
  dataTypes: string[];
  affectedDomains: string[];
  description: string;
}

export interface KeywordMonitorResult {
  id: string;
  keyword: string;
  matches: DarkWebFinding[];
  lastScanned: Date;
  nextScan: Date;
}

export interface SourceHealthStatus {
  sourceId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

export interface MCPConnectorConfig {
  sourceId: string;
  apiEndpoint: string;
  credentialId: string;
  rateLimits: RateLimit;
  retryConfig: RetryConfig;
  healthCheckInterval: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ConnectorRegistry {
  connectors: Map<string, MCPConnector>;
  healthStatuses: Map<string, SourceHealthStatus>;
}

export type ExposureType = 
  | 'credential_leak'
  | 'api_key_exposure'
  | 'document_leak'
  | 'database_breach'
  | 'marketplace_listing'
  | 'paste_site_exposure';

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export type TakedownStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'requires_manual';

export type ComplianceFlag = 
  | 'gdpr_breach'
  | 'ccpa_incident'
  | 'hipaa_violation'
  | 'pci_exposure'
  | 'sox_concern';

export interface APICredentials {
  apiKey: string;
  secretKey?: string;
  token?: string;
  additionalHeaders?: Record<string, string>;
}

export interface ConnectorError extends Error {
  sourceId: string;
  errorCode: string;
  retryable: boolean;
  rateLimited: boolean;
}