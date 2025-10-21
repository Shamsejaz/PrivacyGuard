/**
 * MCP Privacy Connectors - Privacy Detection Engine
 * Central service for PII detection using multiple detection methods
 */

import axios, { AxiosInstance } from 'axios';
import type {
  PIIFinding,
  ScanContext,
  PrivacyRule,
  PIIType,
  SensitivityLevel,
  RemediationAction,
  RemediationActionType
} from '../types/index.js';

/**
 * Python PII Service response format
 */
interface PythonPIIResponse {
  entities: Array<{
    entity_type: string;
    start: number;
    end: number;
    score: number;
    text: string;
  }>;
  processing_time: number;
  engine: string;
}

/**
 * Detection result from privacy detection engine
 */
interface DetectionResult {
  findings: PIIFinding[];
  processingTimeMs: number;
  confidence: number;
  detectionMethod: 'python_service' | 'regex_fallback' | 'hybrid';
}

/**
 * Regex patterns for fallback PII detection
 */
const FALLBACK_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  address: /\b\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi
};

/**
 * Privacy Detection Engine for comprehensive PII detection
 */
export class PrivacyDetectionEngine {
  private pythonServiceClient: AxiosInstance;
  private pythonServiceUrl: string;
  private fallbackEnabled: boolean = true;
  private cacheEnabled: boolean = true;
  private detectionCache: Map<string, DetectionResult> = new Map();
  private customRules: Map<string, PrivacyRule> = new Map();

  constructor(pythonServiceUrl: string = 'http://localhost:8000') {
    this.pythonServiceUrl = pythonServiceUrl;
    this.pythonServiceClient = axios.create({
      baseURL: pythonServiceUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Detect PII in provided content using hybrid approach
   */
  async detectPII(content: string, context: ScanContext): Promise<PIIFinding[]> {
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(content, context);
    if (this.cacheEnabled && this.detectionCache.has(cacheKey)) {
      const cached = this.detectionCache.get(cacheKey)!;
      return cached.findings;
    }

    let detectionResult: DetectionResult;

    try {
      // Try Python service first
      detectionResult = await this.detectWithPythonService(content, context);
    } catch (error) {
      console.warn('Python PII service unavailable, falling back to regex detection:', error);
      
      if (this.fallbackEnabled) {
        detectionResult = await this.detectWithRegexFallback(content, context);
      } else {
        throw new Error('PII detection failed and fallback is disabled');
      }
    }

    // Apply custom rules
    const customFindings = await this.applyCustomRules(content, context);
    detectionResult.findings.push(...customFindings);

    // Cache result
    if (this.cacheEnabled) {
      this.detectionCache.set(cacheKey, detectionResult);
      
      // Limit cache size
      if (this.detectionCache.size > 1000) {
        const firstKey = this.detectionCache.keys().next().value;
        this.detectionCache.delete(firstKey);
      }
    }

    return detectionResult.findings;
  }

  /**
   * Detect PII using Python service hybrid endpoint
   */
  private async detectWithPythonService(content: string, context: ScanContext): Promise<DetectionResult> {
    const startTime = Date.now();

    try {
      const response = await this.pythonServiceClient.post<PythonPIIResponse>('/analyze/hybrid', {
        text: content
      });

      const findings = this.convertPythonResponseToFindings(response.data, content, context);
      const processingTime = Date.now() - startTime;

      return {
        findings,
        processingTimeMs: processingTime,
        confidence: this.calculateOverallConfidence(findings),
        detectionMethod: 'python_service'
      };
    } catch (error) {
      console.error('Python PII service error:', error);
      throw error;
    }
  }

  /**
   * Fallback PII detection using regex patterns
   */
  private async detectWithRegexFallback(content: string, context: ScanContext): Promise<DetectionResult> {
    const startTime = Date.now();
    const findings: PIIFinding[] = [];

    for (const [piiType, pattern] of Object.entries(FALLBACK_PATTERNS)) {
      const matches = content.matchAll(pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const finding: PIIFinding = {
            id: this.generateFindingId(),
            type: piiType as PIIType,
            location: {
              system: context.connectorType,
              database: context.dataSource,
              metadata: {
                fieldNames: context.fieldNames,
                recordMetadata: context.recordMetadata
              }
            },
            content: this.maskContent(match[0]),
            confidence: 0.7, // Lower confidence for regex
            sensitivityLevel: this.classifyDataSensitivity(piiType as PIIType),
            recommendedAction: this.generateRemediationAction(piiType as PIIType),
            detectionMethod: 'regex',
            timestamp: new Date()
          };

          findings.push(finding);
        }
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      findings,
      processingTimeMs: processingTime,
      confidence: this.calculateOverallConfidence(findings),
      detectionMethod: 'regex_fallback'
    };
  }

  /**
   * Convert Python service response to PIIFinding objects
   */
  private convertPythonResponseToFindings(
    response: PythonPIIResponse, 
    originalContent: string, 
    context: ScanContext
  ): PIIFinding[] {
    return response.entities.map(entity => {
      const piiType = this.mapEntityTypeToPIIType(entity.entity_type);
      
      return {
        id: this.generateFindingId(),
        type: piiType,
        location: {
          system: context.connectorType,
          database: context.dataSource,
          metadata: {
            fieldNames: context.fieldNames,
            recordMetadata: context.recordMetadata,
            startPosition: entity.start,
            endPosition: entity.end
          }
        },
        content: this.maskContent(entity.text),
        confidence: entity.score,
        sensitivityLevel: this.classifyDataSensitivity(piiType),
        recommendedAction: this.generateRemediationAction(piiType),
        detectionMethod: 'ml',
        timestamp: new Date()
      };
    });
  }

  /**
   * Apply custom privacy rules to content
   */
  private async applyCustomRules(content: string, context: ScanContext): Promise<PIIFinding[]> {
    const findings: PIIFinding[] = [];

    // Apply organization-specific rules if available
    if (context.organizationRules) {
      for (const rule of context.organizationRules) {
        if (!rule.isEnabled) continue;

        try {
          const pattern = new RegExp(rule.pattern, 'gi');
          const matches = content.matchAll(pattern);

          for (const match of matches) {
            if (match.index !== undefined) {
              const finding: PIIFinding = {
                id: this.generateFindingId(),
                type: rule.piiType,
                location: {
                  system: context.connectorType,
                  database: context.dataSource,
                  metadata: {
                    customRule: rule.id,
                    ruleName: rule.name,
                    fieldNames: context.fieldNames
                  }
                },
                content: this.maskContent(match[0]),
                confidence: 0.9, // High confidence for custom rules
                sensitivityLevel: rule.sensitivityLevel,
                recommendedAction: this.generateRemediationAction(rule.piiType),
                detectionMethod: 'custom_rule',
                timestamp: new Date()
              };

              findings.push(finding);
            }
          }
        } catch (error) {
          console.error(`Error applying custom rule ${rule.id}:`, error);
        }
      }
    }

    return findings;
  }

  /**
   * Classify data sensitivity level based on PII type
   */
  private classifyDataSensitivity(piiType: PIIType): SensitivityLevel {
    const sensitivityMap: Record<PIIType, SensitivityLevel> = {
      ssn: 'high',
      credit_card: 'high',
      email: 'medium',
      phone: 'medium',
      address: 'medium',
      name: 'low',
      custom: 'medium'
    };

    return sensitivityMap[piiType] || 'medium';
  }

  /**
   * Generate remediation action based on PII type and sensitivity
   */
  private generateRemediationAction(piiType: PIIType): RemediationAction {
    const actionMap: Record<PIIType, RemediationActionType> = {
      ssn: 'encrypt',
      credit_card: 'mask',
      email: 'flag_review',
      phone: 'mask',
      address: 'anonymize',
      name: 'flag_review',
      custom: 'flag_review'
    };

    const actionType = actionMap[piiType] || 'flag_review';
    const priority = this.classifyDataSensitivity(piiType) === 'high' ? 'critical' : 'medium';

    return {
      id: this.generateActionId(),
      type: actionType,
      description: this.getActionDescription(actionType, piiType),
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      automated: actionType !== 'flag_review'
    };
  }

  /**
   * Get human-readable action description
   */
  private getActionDescription(actionType: RemediationActionType, piiType: PIIType): string {
    const descriptions: Record<RemediationActionType, string> = {
      mask: `Mask ${piiType} data to protect privacy`,
      delete: `Delete ${piiType} data permanently`,
      encrypt: `Encrypt ${piiType} data for secure storage`,
      anonymize: `Anonymize ${piiType} data while preserving utility`,
      flag_review: `Flag ${piiType} data for manual review`
    };

    return descriptions[actionType] || `Review ${piiType} data for privacy compliance`;
  }

  /**
   * Map Python service entity types to our PIIType enum
   */
  private mapEntityTypeToPIIType(entityType: string): PIIType {
    const typeMap: Record<string, PIIType> = {
      'EMAIL_ADDRESS': 'email',
      'PHONE_NUMBER': 'phone',
      'US_SSN': 'ssn',
      'CREDIT_CARD': 'credit_card',
      'LOCATION': 'address',
      'PERSON': 'name',
      'PER': 'name', // spaCy person entity
      'LOC': 'address', // spaCy location entity
      'ORG': 'custom' // Organization names
    };

    return typeMap[entityType.toUpperCase()] || 'custom';
  }

  /**
   * Mask sensitive content for logging and storage
   */
  private maskContent(content: string): string {
    if (!content || content.length <= 4) {
      return '***';
    }
    
    const visibleChars = Math.min(2, Math.floor(content.length * 0.2));
    const maskedLength = content.length - (visibleChars * 2);
    
    return content.substring(0, visibleChars) + 
           '*'.repeat(maskedLength) + 
           content.substring(content.length - visibleChars);
  }

  /**
   * Calculate overall confidence score for findings
   */
  private calculateOverallConfidence(findings: PIIFinding[]): number {
    if (findings.length === 0) return 0;
    
    const totalConfidence = findings.reduce((sum, finding) => sum + finding.confidence, 0);
    return totalConfidence / findings.length;
  }

  /**
   * Generate cache key for content and context
   */
  private generateCacheKey(content: string, context: ScanContext): string {
    const contentHash = this.simpleHash(content);
    const contextHash = this.simpleHash(JSON.stringify({
      connectorType: context.connectorType,
      dataSource: context.dataSource,
      fieldNames: context.fieldNames
    }));
    
    return `${contentHash}_${contextHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `finding_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Setup HTTP client interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.pythonServiceClient.interceptors.request.use(
      (config) => {
        console.log(`Making PII detection request to ${config.url}`);
        return config;
      },
      (error) => {
        console.error('PII service request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.pythonServiceClient.interceptors.response.use(
      (response) => {
        console.log(`PII detection response received in ${response.headers['x-processing-time'] || 'unknown'}ms`);
        return response;
      },
      (error) => {
        console.error('PII service response error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Add custom privacy rule
   */
  addCustomRule(rule: PrivacyRule): void {
    this.customRules.set(rule.id, rule);
  }

  /**
   * Remove custom privacy rule
   */
  removeCustomRule(ruleId: string): void {
    this.customRules.delete(ruleId);
  }

  /**
   * Get detection engine statistics
   */
  getStatistics() {
    return {
      cacheSize: this.detectionCache.size,
      customRulesCount: this.customRules.size,
      fallbackEnabled: this.fallbackEnabled,
      pythonServiceUrl: this.pythonServiceUrl
    };
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Test connection to Python PII service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.pythonServiceClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Python PII service health check failed:', error);
      return false;
    }
  }

  /**
   * Enable or disable fallback detection
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}