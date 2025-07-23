// Google Cloud DLP API Service
import { pythonPIIService, PythonPIIResult, PIIDetectionConfig } from './pythonPIIService';

export interface DLPInspectResult {
  findings: Array<{
    infoType: {
      name: string;
      displayName: string;
    };
    likelihood: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
    location: {
      byteRange: {
        start: number;
        end: number;
      };
    };
    quote: string;
    createTime: string;
  }>;
  result: {
    processedBytes: number;
    totalEstimatedBytes: number;
  };
}

export interface DLPDeidentifyResult {
  item: {
    value: string;
  };
  overview: {
    transformedBytes: number;
    transformationSummaries: Array<{
      infoType: {
        name: string;
      };
      transformation: {
        primitiveTransformation: {
          replaceWithInfoTypeConfig: {};
        };
      };
      results: Array<{
        count: number;
        code: string;
      }>;
    }>;
  };
}

export interface MultiEngineDetectionResult {
  google_dlp?: DLPInspectResult;
  presidio?: PythonPIIResult;
  spacy?: PythonPIIResult;
  transformers?: PythonPIIResult;
  hybrid?: PythonPIIResult;
  consolidated_findings: Array<{
    text: string;
    entity_type: string;
    confidence: number;
    start: number;
    end: number;
    detected_by: string[];
    redacted: string;
  }>;
  best_engine: string;
  processing_time: number;
}

class DLPService {
  private apiKey: string;
  private projectId: string;
  private baseUrl = 'https://dlp.googleapis.com/v2';
  private isDemoMode = false;
  private preferredEngine: 'google_dlp' | 'presidio' | 'spacy' | 'transformers' | 'hybrid' = 'hybrid';

  constructor() {
    // Get API credentials from environment variables
    this.apiKey = localStorage.getItem('googleCloudApiKey') || import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || 'demo-key';
    this.projectId = localStorage.getItem('googleCloudProjectId') || import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'privacy-guard-demo';
    
    // Check if we have valid credentials
    if (this.apiKey === 'demo-key' || this.projectId === 'privacy-guard-demo') {
      console.warn('Google Cloud DLP API credentials not configured. Set VITE_GOOGLE_CLOUD_API_KEY and VITE_GOOGLE_CLOUD_PROJECT_ID environment variables.');
      this.isDemoMode = true;
    }
  }

  async detectPIIMultiEngine(text: string, engines?: string[]): Promise<MultiEngineDetectionResult> {
    const startTime = Date.now();
    const results: MultiEngineDetectionResult = {
      consolidated_findings: [],
      best_engine: 'hybrid',
      processing_time: 0
    };

    const enabledEngines = engines || ['google_dlp', 'presidio', 'spacy'];

    // Run Google DLP if enabled and configured
    if (enabledEngines.includes('google_dlp') && !this.isDemoMode) {
      try {
        results.google_dlp = await this.inspectText(text);
        console.log(`Google DLP found ${results.google_dlp.findings.length} findings`);
      } catch (error) {
        console.error('Google DLP detection failed:', error);
      }
    }

    // Run Python-based engines if service is available
    if (await pythonPIIService.isServiceAvailable()) {
      try {
        if (enabledEngines.includes('presidio')) {
          results.presidio = await pythonPIIService.detectPIIWithPresidio(text);
          console.log(`Presidio found ${results.presidio.findings.length} findings`);
        }

        if (enabledEngines.includes('spacy')) {
          results.spacy = await pythonPIIService.detectPIIWithSpacy(text);
          console.log(`spaCy found ${results.spacy.findings.length} findings`);
        }

        if (enabledEngines.includes('transformers')) {
          results.transformers = await pythonPIIService.detectPIIWithTransformers(text);
          console.log(`Transformers found ${results.transformers.findings.length} findings`);
        }

        if (enabledEngines.includes('hybrid')) {
          results.hybrid = await pythonPIIService.hybridDetection(text);
          console.log(`Hybrid detection found ${results.hybrid.findings.length} findings`);
        }
      } catch (error) {
        console.error('Python PII service detection failed:', error);
      }
    }

    // Consolidate findings from all engines
    results.consolidated_findings = this.consolidateFindings(results);
    results.best_engine = this.determineBestEngine(results);
    results.processing_time = Date.now() - startTime;

    console.log(`Multi-engine PII detection completed in ${results.processing_time}ms`);
    console.log(`Consolidated ${results.consolidated_findings.length} unique findings`);

    return results;
  }

  private consolidateFindings(results: MultiEngineDetectionResult): MultiEngineDetectionResult['consolidated_findings'] {
    const findingsMap = new Map<string, any>();

    // Process Google DLP findings
    if (results.google_dlp?.findings) {
      results.google_dlp.findings.forEach(finding => {
        const key = `${finding.location.byteRange.start}-${finding.location.byteRange.end}`;
        findingsMap.set(key, {
          text: finding.quote,
          entity_type: finding.infoType.name,
          confidence: this.mapDLPLikelihoodToConfidence(finding.likelihood),
          start: finding.location.byteRange.start,
          end: finding.location.byteRange.end,
          detected_by: ['google_dlp'],
          redacted: this.redactText(finding.quote, finding.infoType.name)
        });
      });
    }

    // Process Python engine findings
    [results.presidio, results.spacy, results.transformers, results.hybrid].forEach((result, index) => {
      const engineName = ['presidio', 'spacy', 'transformers', 'hybrid'][index];
      if (result?.findings) {
        result.findings.forEach(finding => {
          const key = `${finding.start}-${finding.end}`;
          if (findingsMap.has(key)) {
            // Merge with existing finding
            const existing = findingsMap.get(key);
            existing.detected_by.push(engineName);
            existing.confidence = Math.max(existing.confidence, finding.score);
          } else {
            // Add new finding
            findingsMap.set(key, {
              text: finding.text,
              entity_type: finding.entity_type,
              confidence: finding.score,
              start: finding.start,
              end: finding.end,
              detected_by: [engineName],
              redacted: this.redactText(finding.text, finding.entity_type)
            });
          }
        });
      }
    });

    return Array.from(findingsMap.values())
      .sort((a, b) => a.start - b.start)
      .filter(finding => finding.confidence >= 0.5); // Filter low confidence findings
  }

  private determineBestEngine(results: MultiEngineDetectionResult): string {
    const engineScores = {
      google_dlp: 0,
      presidio: 0,
      spacy: 0,
      transformers: 0,
      hybrid: 0
    };

    // Score based on number of findings and confidence
    if (results.google_dlp?.findings) {
      engineScores.google_dlp = results.google_dlp.findings.length * 1.2; // Slight preference for Google DLP
    }

    if (results.presidio?.findings) {
      engineScores.presidio = results.presidio.findings.reduce((sum, f) => sum + f.score, 0);
    }

    if (results.spacy?.findings) {
      engineScores.spacy = results.spacy.findings.reduce((sum, f) => sum + f.score, 0);
    }

    if (results.transformers?.findings) {
      engineScores.transformers = results.transformers.findings.reduce((sum, f) => sum + f.score, 0);
    }

    if (results.hybrid?.findings) {
      engineScores.hybrid = results.hybrid.findings.reduce((sum, f) => sum + f.score, 0) * 1.1; // Slight preference for hybrid
    }

    return Object.entries(engineScores).reduce((best, [engine, score]) => 
      score > engineScores[best as keyof typeof engineScores] ? engine : best, 'hybrid'
    );
  }

  private mapDLPLikelihoodToConfidence(likelihood: string): number {
    const confidenceMapping: Record<string, number> = {
      'VERY_LIKELY': 0.95,
      'LIKELY': 0.85,
      'POSSIBLE': 0.70,
      'UNLIKELY': 0.40,
      'VERY_UNLIKELY': 0.20
    };
    
    return confidenceMapping[likelihood] || 0.50;
  }

  private redactText(text: string, entityType: string): string {
    // Simple redaction - in production you might want more sophisticated redaction
    if (text.length <= 2) return text;
    
    switch (entityType.toLowerCase()) {
      case 'email_address':
      case 'email':
        const [local, domain] = text.split('@');
        if (domain) {
          const redactedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 1)) + (local.length > 1 ? local.charAt(local.length - 1) : '');
          return `${redactedLocal}@${domain}`;
        }
        break;
      case 'phone_number':
      case 'phone':
        return text.replace(/\d/g, (match, index) => {
          const cleanPhone = text.replace(/\D/g, '');
          const digitIndex = text.substring(0, index + 1).replace(/\D/g, '').length - 1;
          return digitIndex < 3 || digitIndex >= cleanPhone.length - 4 ? match : '*';
        });
      case 'person':
      case 'per':
        return text.split(' ').map(part => {
          if (part.length <= 2) return part;
          return part.charAt(0) + '*'.repeat(part.length - 2) + part.charAt(part.length - 1);
        }).join(' ');
    }
    
    // Default redaction
    return text.charAt(0) + '*'.repeat(Math.max(text.length - 2, 1)) + (text.length > 1 ? text.charAt(text.length - 1) : '');
  }

  async inspectText(text: string, infoTypes?: string[]): Promise<DLPInspectResult> {
    if (this.isDemoMode) {
      console.warn('Google Cloud DLP API not configured. Please set up API credentials for accurate PII detection.');
      return {
        findings: [],
        result: {
          processedBytes: text.length,
          totalEstimatedBytes: text.length
        }
      };
    }

    // Use real Google Cloud DLP API
    try {
      const url = `${this.baseUrl}/projects/${this.projectId}/content:inspect?key=${this.apiKey}`;
      
      const defaultInfoTypes = [
        'EMAIL_ADDRESS',
        'PHONE_NUMBER',
        'CREDIT_CARD_NUMBER',
        'US_SOCIAL_SECURITY_NUMBER',
        'PERSON_NAME',
        'DATE_OF_BIRTH',
        'US_DRIVERS_LICENSE_NUMBER',
        'MEDICAL_RECORD_NUMBER',
        'US_HEALTHCARE_NPI',
        'IP_ADDRESS',
        'PASSPORT',
        'IBAN_CODE',
        'US_NATIONAL_ID_NUMBER'
      ];
      
      const requestBody = {
        item: { value: text },
        inspectConfig: {
          infoTypes: (infoTypes || defaultInfoTypes).map(type => ({ name: type })),
          includeQuote: true,
          minLikelihood: 'POSSIBLE',
          limits: {
            maxFindingsPerRequest: 100,
            maxFindingsPerInfoType: [{
              infoType: { name: 'PERSON_NAME' },
              maxFindings: 10
            }]
          }
        }
      };
      
      console.log('Calling Google Cloud DLP API for text inspection...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DLP API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`DLP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Google Cloud DLP found ${data.result?.findings?.length || 0} PII items`);
      
      return {
        findings: data.result?.findings || [],
        result: {
          processedBytes: text.length,
          totalEstimatedBytes: text.length
        }
      };
      
    } catch (error) {
      console.error('Error calling Google Cloud DLP API:', error);
      // Don't fall back to regex - return empty results if DLP fails
      return {
        findings: [],
        result: {
          processedBytes: text.length,
          totalEstimatedBytes: text.length
        }
      };
    }
  }

  async deidentifyText(text: string, infoTypes?: string[]): Promise<DLPDeidentifyResult> {
    if (this.isDemoMode) {
      console.warn('Google Cloud DLP API not configured. Cannot perform deidentification.');
      return {
        item: { value: text },
        overview: {
          transformedBytes: 0,
          transformationSummaries: []
        }
      };
    }

    try {
      const url = `${this.baseUrl}/projects/${this.projectId}/content:deidentify?key=${this.apiKey}`;
      
      const requestBody = {
        item: { value: text },
        deidentifyConfig: {
          infoTypeTransformations: {
            transformations: [{
              primitiveTransformation: {
                replaceWithInfoTypeConfig: {}
              }
            }]
          }
        },
        inspectConfig: {
          infoTypes: (infoTypes || []).map(type => ({ name: type })),
          minLikelihood: 'POSSIBLE'
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`DLP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error calling DLP deidentify API:', error);
      return {
        item: { value: text },
        overview: {
          transformedBytes: 0,
          transformationSummaries: []
        }
      };
    }
  }

  setPreferredEngine(engine: 'google_dlp' | 'presidio' | 'spacy' | 'transformers' | 'hybrid'): void {
    this.preferredEngine = engine;
    console.log(`PII detection engine set to: ${engine}`);
  }

  getPreferredEngine(): string {
    return this.preferredEngine;
  }

  async getEngineStatus(): Promise<{
    google_dlp: boolean;
    python_service: boolean;
    preferred_engine: string;
  }> {
    return {
      google_dlp: !(this.apiKey === 'demo-key' || this.projectId === 'privacy-guard-demo'),
      python_service: await pythonPIIService.isServiceAvailable(),
      preferred_engine: this.preferredEngine
    };
  }

  async inspectDatabase(connectionConfig: DatabaseConfig): Promise<DLPInspectResult[]> {
    // Simulate database scanning with DLP API
    const results: DLPInspectResult[] = [];
    
    // This would connect to actual databases and scan tables/columns
    const sampleTables = ['users', 'customers', 'orders', 'employees'];
    
    for (const table of sampleTables) {
      const sampleData = this.generateSampleDatabaseData(table);
      const inspectResult = await this.inspectText(sampleData);
      results.push(inspectResult);
    }

    return results;
  }

  private generateSampleDatabaseData(tableName: string): string {
    const sampleData = {
      users: 'John Doe, john.doe@email.com, 555-123-4567, 123-45-6789',
      customers: 'Jane Smith, jane.smith@company.com, 555-987-6543, 4532-1234-5678-9012',
      orders: 'Order #12345, customer: bob.wilson@email.com, phone: 555-555-5555',
      employees: 'Alice Johnson, HR Department, alice.j@company.com, SSN: 987-65-4321'
    };
    
    return sampleData[tableName as keyof typeof sampleData] || 'Sample data for scanning';
  }
}

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export const dlpService = new DLPService();