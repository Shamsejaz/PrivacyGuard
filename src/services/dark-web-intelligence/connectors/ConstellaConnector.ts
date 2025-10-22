import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { MCPConnector } from './MCPConnector';
import {
  CredentialQuery,
  MarketplaceQuery,
  BreachQuery,
  CredentialResult,
  MarketplaceResult,
  BreachResult,
  KeywordMonitorResult,
  ConstellaCredentialResponse,
  ConstellaCredential,
  ConstellaAPIKeyResponse,
  ConstellaAPIKey,
  MCPConnectorConfig,
  APICredentials
} from '../types';

/**
 * Constella Intelligence MCP Connector
 * Provides credential monitoring and API key exposure detection
 */
export class ConstellaConnector extends MCPConnector {
  private httpClient: AxiosInstance;
  private readonly API_VERSION = 'v1';

  constructor(config: MCPConnectorConfig) {
    super(config);
    
    this.httpClient = axios.create({
      baseURL: `${config.baseUrl}/${this.API_VERSION}`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PrivacyGuard-DarkWeb/1.0'
      }
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use((config) => {
      const credentials = this.getCredentials();
      config.headers.Authorization = `Bearer ${credentials.apiKey}`;
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error('Invalid API credentials for Constella Intelligence');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded for Constella Intelligence API');
        }
        throw error;
      }
    );
  }

  /**
   * Search for exposed credentials using email and domain queries
   */
  async searchCredentials(query: CredentialQuery): Promise<CredentialResult[]> {
    return this.executeRequest(async () => {
      const results: CredentialResult[] = [];
      
      // Search by emails
      if (query.emails.length > 0) {
        const emailResults = await this.searchCredentialsByEmails(query.emails, query);
        results.push(...emailResults);
      }

      // Search by domains
      if (query.domains.length > 0) {
        const domainResults = await this.searchCredentialsByDomains(query.domains, query);
        results.push(...domainResults);
      }

      // Search by usernames
      if (query.usernames.length > 0) {
        const usernameResults = await this.searchCredentialsByUsernames(query.usernames, query);
        results.push(...usernameResults);
      }

      // Search for API key hashes
      if (query.apiKeyHashes.length > 0) {
        const apiKeyResults = await this.searchAPIKeyHashes(query.apiKeyHashes, query);
        results.push(...apiKeyResults);
      }

      // Remove duplicates and apply confidence filter
      const uniqueResults = this.deduplicateResults(results);
      return this.filterByConfidence(uniqueResults, query.minConfidence || 0.7);
    }, 'searchCredentials');
  }

  /**
   * Search marketplaces (Constella focuses on credentials, limited marketplace data)
   */
  async searchMarketplaces(query: MarketplaceQuery): Promise<MarketplaceResult[]> {
    return this.executeRequest(async () => {
      // Constella primarily focuses on credential monitoring
      // Limited marketplace functionality - return empty array for now
      // This could be extended if Constella adds marketplace monitoring
      return [];
    }, 'searchMarketplaces');
  }

  /**
   * Search breach databases
   */
  async searchBreachDatabases(query: BreachQuery): Promise<BreachResult[]> {
    return this.executeRequest(async () => {
      const results: BreachResult[] = [];
      
      // Search by emails in breach databases
      if (query.emails.length > 0) {
        const emailBreaches = await this.searchBreachesByEmails(query.emails, query);
        results.push(...emailBreaches);
      }

      // Search by domains in breach databases
      if (query.domains.length > 0) {
        const domainBreaches = await this.searchBreachesByDomains(query.domains, query);
        results.push(...domainBreaches);
      }

      // Filter by breach names if specified
      if (query.breachNames.length > 0) {
        return results.filter(result => 
          query.breachNames.some(name => 
            result.breachName.toLowerCase().includes(name.toLowerCase())
          )
        );
      }

      return results;
    }, 'searchBreachDatabases');
  }

  /**
   * Monitor keywords across Constella's data sources
   */
  async monitorKeywords(keywords: string[]): Promise<KeywordMonitorResult> {
    return this.executeRequest(async () => {
      const response = await this.httpClient.post('/monitor/keywords', {
        keywords,
        include_context: true,
        max_results: 100
      });

      return {
        id: `constella-monitor-${Date.now()}`,
        keyword: keywords.join(', '),
        source: 'constella',
        matches: response.data.matches.map((match: any) => ({
          id: match.id,
          content: match.content,
          url: match.source_url || '',
          title: match.title,
          discoveredDate: new Date(match.discovered_date),
          riskScore: this.calculateRiskScore(match),
          context: match.context || ''
        })),
        totalMatches: response.data.total,
        lastUpdated: new Date()
      };
    }, 'monitorKeywords');
  }

  /**
   * Perform API health check
   */
  protected async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Search credentials by email addresses
   */
  private async searchCredentialsByEmails(
    emails: string[], 
    query: CredentialQuery
  ): Promise<CredentialResult[]> {
    const response: AxiosResponse<ConstellaCredentialResponse> = await this.httpClient.post('/credentials/search', {
      emails,
      include_passwords: query.includePasswords || false,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map(cred => this.mapConstellaCredential(cred));
  }

  /**
   * Search credentials by domains
   */
  private async searchCredentialsByDomains(
    domains: string[], 
    query: CredentialQuery
  ): Promise<CredentialResult[]> {
    const response: AxiosResponse<ConstellaCredentialResponse> = await this.httpClient.post('/credentials/search', {
      domains,
      include_passwords: query.includePasswords || false,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map(cred => this.mapConstellaCredential(cred));
  }

  /**
   * Search credentials by usernames
   */
  private async searchCredentialsByUsernames(
    usernames: string[], 
    query: CredentialQuery
  ): Promise<CredentialResult[]> {
    const response: AxiosResponse<ConstellaCredentialResponse> = await this.httpClient.post('/credentials/search', {
      usernames,
      include_passwords: query.includePasswords || false,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map(cred => this.mapConstellaCredential(cred));
  }

  /**
   * Search for exposed API key hashes
   */
  private async searchAPIKeyHashes(
    apiKeyHashes: string[], 
    query: CredentialQuery
  ): Promise<CredentialResult[]> {
    const response: AxiosResponse<ConstellaAPIKeyResponse> = await this.httpClient.post('/apikeys/search', {
      key_hashes: apiKeyHashes,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map(apiKey => this.mapConstellaAPIKey(apiKey));
  }

  /**
   * Search breaches by email addresses
   */
  private async searchBreachesByEmails(
    emails: string[], 
    query: BreachQuery
  ): Promise<BreachResult[]> {
    const response = await this.httpClient.post('/breaches/search', {
      emails,
      include_passwords: query.includePasswords || false,
      verified_only: query.verifiedOnly || false,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map((breach: any) => this.mapConstellaBreach(breach));
  }

  /**
   * Search breaches by domains
   */
  private async searchBreachesByDomains(
    domains: string[], 
    query: BreachQuery
  ): Promise<BreachResult[]> {
    const response = await this.httpClient.post('/breaches/search', {
      domains,
      include_passwords: query.includePasswords || false,
      verified_only: query.verifiedOnly || false,
      date_from: query.timeRange.startDate.toISOString(),
      date_to: query.timeRange.endDate.toISOString(),
      limit: 1000
    });

    return response.data.results.map((breach: any) => this.mapConstellaBreach(breach));
  }

  /**
   * Map Constella credential to standard format
   */
  private mapConstellaCredential(cred: ConstellaCredential): CredentialResult {
    return {
      id: cred.id,
      source: 'constella',
      email: cred.email,
      username: cred.username,
      domain: cred.domain,
      passwordHash: cred.password_hash,
      plainTextPassword: cred.password_plain,
      breachName: cred.breach_name,
      breachDate: new Date(cred.breach_date),
      discoveredDate: new Date(cred.discovered_date),
      confidence: cred.confidence_score,
      riskScore: this.calculateCredentialRiskScore(cred),
      metadata: {
        sourceReliability: cred.source_reliability,
        additionalData: cred.additional_data || {}
      }
    };
  }

  /**
   * Map Constella API key to credential result format
   */
  private mapConstellaAPIKey(apiKey: ConstellaAPIKey): CredentialResult {
    return {
      id: apiKey.id,
      source: 'constella',
      email: '', // API keys don't have associated emails
      username: apiKey.service_name,
      domain: apiKey.domain,
      passwordHash: apiKey.api_key_hash,
      breachName: `API Key Exposure - ${apiKey.service_name}`,
      breachDate: new Date(apiKey.discovered_date),
      discoveredDate: new Date(apiKey.discovered_date),
      confidence: this.mapRiskLevelToConfidence(apiKey.risk_level),
      riskScore: this.mapRiskLevelToScore(apiKey.risk_level),
      metadata: {
        exposureContext: apiKey.exposure_context,
        lastSeen: apiKey.last_seen,
        serviceName: apiKey.service_name
      }
    };
  }

  /**
   * Map Constella breach to standard format
   */
  private mapConstellaBreach(breach: any): BreachResult {
    return {
      id: breach.id,
      source: 'constella',
      breachName: breach.breach_name,
      breachDate: new Date(breach.breach_date),
      discoveredDate: new Date(breach.discovered_date),
      affectedRecords: breach.affected_records || 0,
      dataTypes: breach.data_types || [],
      description: breach.description || '',
      verified: breach.verified || false,
      riskScore: this.calculateBreachRiskScore(breach),
      affectedEmails: breach.affected_emails || [],
      metadata: {
        sourceReliability: breach.source_reliability,
        additionalInfo: breach.additional_info || {}
      }
    };
  }

  /**
   * Calculate risk score for credentials
   */
  private calculateCredentialRiskScore(cred: ConstellaCredential): number {
    let score = 50; // Base score

    // Increase score for plain text passwords
    if (cred.password_plain) score += 30;
    
    // Increase score for high confidence
    if (cred.confidence_score > 0.8) score += 15;
    
    // Increase score for recent discoveries
    const daysSinceDiscovery = (Date.now() - new Date(cred.discovered_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDiscovery < 30) score += 20;
    else if (daysSinceDiscovery < 90) score += 10;

    // Increase score for high source reliability
    if (cred.source_reliability > 0.8) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate risk score for breaches
   */
  private calculateBreachRiskScore(breach: any): number {
    let score = 40; // Base score

    // Increase score for verified breaches
    if (breach.verified) score += 20;
    
    // Increase score for recent breaches
    const daysSinceBreach = (Date.now() - new Date(breach.breach_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBreach < 90) score += 25;
    else if (daysSinceBreach < 365) score += 15;

    // Increase score for large breaches
    if (breach.affected_records > 1000000) score += 15;
    else if (breach.affected_records > 100000) score += 10;

    // Increase score for sensitive data types
    const sensitiveTypes = ['password', 'ssn', 'credit_card', 'financial'];
    if (breach.data_types?.some((type: string) => sensitiveTypes.includes(type.toLowerCase()))) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate risk score for keyword matches
   */
  private calculateRiskScore(match: any): number {
    let score = 30; // Base score

    // Increase score based on context keywords
    const highRiskKeywords = ['password', 'credential', 'login', 'api_key', 'secret'];
    if (highRiskKeywords.some(keyword => 
      match.context?.toLowerCase().includes(keyword) || 
      match.content?.toLowerCase().includes(keyword)
    )) {
      score += 40;
    }

    // Increase score for recent discoveries
    const daysSinceDiscovery = (Date.now() - new Date(match.discovered_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDiscovery < 7) score += 20;
    else if (daysSinceDiscovery < 30) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Map risk level string to confidence score
   */
  private mapRiskLevelToConfidence(riskLevel: string): number {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 0.95;
      case 'high': return 0.85;
      case 'medium': return 0.70;
      case 'low': return 0.50;
      default: return 0.60;
    }
  }

  /**
   * Map risk level string to numeric score
   */
  private mapRiskLevelToScore(riskLevel: string): number {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 90;
      case 'high': return 75;
      case 'medium': return 55;
      case 'low': return 30;
      default: return 40;
    }
  }

  /**
   * Remove duplicate results based on email and breach name
   */
  private deduplicateResults(results: CredentialResult[]): CredentialResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.email}-${result.breachName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Filter results by minimum confidence threshold
   */
  private filterByConfidence(results: CredentialResult[], minConfidence: number): CredentialResult[] {
    return results.filter(result => result.confidence >= minConfidence);
  }
}