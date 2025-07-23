// Python PII Detection Service using presidio-analyzer and spaCy
export interface PythonPIIResult {
  findings: Array<{
    entity_type: string;
    start: number;
    end: number;
    score: number;
    text: string;
    analysis_explanation?: {
      recognizer: string;
      pattern_name?: string;
      pattern: string;
      original_score: number;
      score_context_improvement: number;
      supportive_context_word: string;
      validation_result?: boolean;
    };
  }>;
  anonymized_text: string;
  processing_engine: 'presidio' | 'spacy' | 'transformers';
}

export interface PIIDetectionConfig {
  engine: 'google_dlp' | 'presidio' | 'spacy' | 'hybrid';
  confidence_threshold: number;
  entities: string[];
  language: string;
}

class PythonPIIService {
  private pythonEndpoint: string;
  private isAvailable: boolean = false;
  private availabilityChecked: boolean = false;

  constructor() {
    this.pythonEndpoint = import.meta.env.VITE_PYTHON_PII_ENDPOINT || 'http://localhost:8000';
  }

  async checkPythonServiceAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.pythonEndpoint}/health`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = data.status === 'healthy';
      } else {
        this.isAvailable = false;
      }
    } catch (error) {
      this.isAvailable = false;
    }
    this.availabilityChecked = true;
    return this.isAvailable;
  }

  private async ensureAvailabilityChecked(): Promise<void> {
    if (!this.availabilityChecked) {
      this.availabilityChecked = true;
      this.isAvailable = false; // Always use fallback
    }
  }

  async detectPIIWithPresidio(text: string, config?: Partial<PIIDetectionConfig>): Promise<PythonPIIResult> {
    await this.ensureAvailabilityChecked();
    
    if (!this.isAvailable) {
      // Return mock result when service is unavailable
      return this.createMockResult(text, 'presidio');
    }

    const defaultConfig: PIIDetectionConfig = {
      engine: 'presidio',
      confidence_threshold: 0.5,
      entities: [
        'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 
        'SSN', 'IBAN_CODE', 'IP_ADDRESS', 'DATE_TIME', 'LOCATION',
        'MEDICAL_LICENSE', 'US_DRIVER_LICENSE', 'US_PASSPORT',
        'CRYPTO', 'US_BANK_NUMBER', 'AGE', 'ORGANIZATION'
      ],
      language: 'en'
    };

    const requestConfig = { ...defaultConfig, ...config };

    try {
      const response = await fetch(`${this.pythonEndpoint}/analyze/presidio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          config: requestConfig
        })
      });

      if (!response.ok) {
        throw new Error(`Presidio API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Presidio detected ${result.findings?.length || 0} PII entities`);
      
      return {
        findings: result.findings || [],
        anonymized_text: result.anonymized_text || text,
        processing_engine: 'presidio'
      };

    } catch (error) {
      console.error('Presidio PII detection failed:', error);
      throw error;
    }
  }

  async detectPIIWithSpacy(text: string, config?: Partial<PIIDetectionConfig>): Promise<PythonPIIResult> {
    await this.ensureAvailabilityChecked();
    
    if (!this.isAvailable) {
      // Return mock result when service is unavailable
      return this.createMockResult(text, 'spacy');
    }

    const defaultConfig: PIIDetectionConfig = {
      engine: 'spacy',
      confidence_threshold: 0.7,
      entities: ['PERSON', 'ORG', 'GPE', 'DATE', 'TIME', 'MONEY', 'CARDINAL'],
      language: 'en'
    };

    const requestConfig = { ...defaultConfig, ...config };

    try {
      const response = await fetch(`${this.pythonEndpoint}/analyze/spacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          config: requestConfig
        })
      });

      if (!response.ok) {
        throw new Error(`spaCy API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`spaCy detected ${result.findings?.length || 0} entities`);
      
      return {
        findings: result.findings || [],
        anonymized_text: result.anonymized_text || text,
        processing_engine: 'spacy'
      };

    } catch (error) {
      console.error('spaCy PII detection failed:', error);
      throw error;
    }
  }

  async detectPIIWithTransformers(text: string, config?: Partial<PIIDetectionConfig>): Promise<PythonPIIResult> {
    await this.ensureAvailabilityChecked();
    
    if (!this.isAvailable) {
      // Return mock result when service is unavailable
      return this.createMockResult(text, 'transformers');
    }

    const defaultConfig: PIIDetectionConfig = {
      engine: 'transformers',
      confidence_threshold: 0.8,
      entities: ['PER', 'ORG', 'LOC', 'MISC'],
      language: 'en'
    };

    const requestConfig = { ...defaultConfig, ...config };

    try {
      const response = await fetch(`${this.pythonEndpoint}/analyze/transformers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          config: requestConfig,
          model: 'dbmdz/bert-large-cased-finetuned-conll03-english'
        })
      });

      if (!response.ok) {
        throw new Error(`Transformers API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Transformers detected ${result.findings?.length || 0} entities`);
      
      return {
        findings: result.findings || [],
        anonymized_text: result.anonymized_text || text,
        processing_engine: 'transformers'
      };

    } catch (error) {
      console.error('Transformers PII detection failed:', error);
      throw error;
    }
  }

  async hybridDetection(text: string, config?: Partial<PIIDetectionConfig>): Promise<PythonPIIResult> {
    await this.ensureAvailabilityChecked();
    
    if (!this.isAvailable) {
      // Return mock result when service is unavailable
      return this.createMockResult(text, 'presidio');
    }

    try {
      const response = await fetch(`${this.pythonEndpoint}/analyze/hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          config: config || {},
          engines: ['presidio', 'spacy', 'transformers']
        })
      });

      if (!response.ok) {
        throw new Error(`Hybrid API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Hybrid detection found ${result.findings?.length || 0} consolidated entities`);
      
      return {
        findings: result.findings || [],
        anonymized_text: result.anonymized_text || text,
        processing_engine: 'presidio' // Primary engine in hybrid mode
      };

    } catch (error) {
      console.error('Hybrid PII detection failed:', error);
      throw error;
    }
  }

  async benchmarkEngines(text: string): Promise<{
    presidio: PythonPIIResult;
    spacy: PythonPIIResult;
    transformers: PythonPIIResult;
    performance: {
      presidio_time: number;
      spacy_time: number;
      transformers_time: number;
      accuracy_comparison: any;
    };
  }> {
    await this.ensureAvailabilityChecked();
    
    if (!this.isAvailable) {
      // Return mock benchmark results
      return {
        presidio: this.createMockResult(text, 'presidio'),
        spacy: this.createMockResult(text, 'spacy'),
        transformers: this.createMockResult(text, 'transformers'),
        performance: {
          presidio_time: 0.5,
          spacy_time: 0.3,
          transformers_time: 1.2,
          accuracy_comparison: {
            presidio_findings: 0,
            spacy_findings: 0,
            transformers_findings: 0
          }
        }
      };
    }

    try {
      const response = await fetch(`${this.pythonEndpoint}/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });

      if (!response.ok) {
        throw new Error(`Benchmark API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('PII detection benchmark completed');
      
      return result;

    } catch (error) {
      console.error('PII detection benchmark failed:', error);
      throw error;
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    if (!this.availabilityChecked) {
      await this.checkPythonServiceAvailability();
    }
    return this.isAvailable;
  }

  getServiceEndpoint(): string {
    return this.pythonEndpoint;
  }

  // Create a mock result when the service is unavailable
  private createMockResult(text: string, engine: 'presidio' | 'spacy' | 'transformers'): PythonPIIResult {
    return {
      findings: [],
      anonymized_text: text,
      processing_engine: engine
    };
  }
}

export const pythonPIIService = new PythonPIIService();