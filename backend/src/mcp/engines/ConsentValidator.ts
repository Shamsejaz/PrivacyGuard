/**
 * MCP Privacy Connectors - Consent Validator
 * Service for validating consent status and expiration for privacy findings
 */

import type {
  ConsentStatus,
  PIIFinding,
  ScanContext
} from '../types/index.js';

/**
 * Consent record from GDPR system
 */
interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  purpose: string;
  legalBasis: string;
  consentGiven: boolean;
  consentDate: Date;
  expiryDate?: Date;
  withdrawalDate?: Date;
  isActive: boolean;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Consent validation result
 */
interface ConsentValidationResult {
  status: ConsentStatus;
  consentRecord?: ConsentRecord;
  validationDate: Date;
  expiresIn?: number; // days until expiry
  warnings: string[];
  recommendations: string[];
}

/**
 * Consent validation rules
 */
interface ConsentValidationRules {
  requireExplicitConsent: boolean;
  maxConsentAge: number; // days
  warningThreshold: number; // days before expiry to warn
  allowImpliedConsent: boolean;
  requiredPurposes: string[];
}

/**
 * Data subject identification result
 */
interface DataSubjectIdentification {
  dataSubjectId?: string;
  identificationMethod: 'email' | 'phone' | 'customer_id' | 'unknown';
  confidence: number;
  identifiers: string[];
}

/**
 * Consent Validator for checking consent status and expiration
 */
export class ConsentValidator {
  private validationRules: ConsentValidationRules;
  private gdprService: any; // Will be injected from existing GDPR service

  constructor(
    gdprService: any,
    validationRules?: Partial<ConsentValidationRules>
  ) {
    this.gdprService = gdprService;
    this.validationRules = {
      requireExplicitConsent: true,
      maxConsentAge: 365, // 1 year
      warningThreshold: 30, // 30 days
      allowImpliedConsent: false,
      requiredPurposes: ['data_processing', 'marketing'],
      ...validationRules
    };
  }

  /**
   * Validate consent for a PII finding
   */
  async validateConsent(
    finding: PIIFinding,
    context: ScanContext
  ): Promise<ConsentValidationResult> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Step 1: Identify data subject from PII finding
      const dataSubject = await this.identifyDataSubject(finding, context);
      
      if (!dataSubject.dataSubjectId) {
        return {
          status: 'missing',
          validationDate: new Date(),
          warnings: ['Could not identify data subject for consent validation'],
          recommendations: ['Implement data subject identification mechanism']
        };
      }

      // Step 2: Retrieve consent records for data subject
      const consentRecords = await this.getConsentRecords(
        dataSubject.dataSubjectId,
        context
      );

      if (consentRecords.length === 0) {
        return {
          status: 'missing',
          validationDate: new Date(),
          warnings: [`No consent records found for data subject ${dataSubject.dataSubjectId}`],
          recommendations: ['Obtain explicit consent from data subject']
        };
      }

      // Step 3: Find most relevant consent record
      const relevantConsent = this.findRelevantConsent(
        consentRecords,
        finding,
        context
      );

      if (!relevantConsent) {
        return {
          status: 'missing',
          validationDate: new Date(),
          warnings: ['No relevant consent found for this data processing purpose'],
          recommendations: ['Obtain specific consent for this data processing activity']
        };
      }

      // Step 4: Validate consent status and expiry
      const validationResult = this.validateConsentRecord(
        relevantConsent,
        warnings,
        recommendations
      );

      return {
        ...validationResult,
        consentRecord: relevantConsent,
        validationDate: new Date(),
        warnings,
        recommendations
      };

    } catch (error) {
      console.error('Consent validation error:', error);
      
      return {
        status: 'missing',
        validationDate: new Date(),
        warnings: [`Consent validation failed: ${error.message}`],
        recommendations: ['Review consent validation system configuration']
      };
    }
  }

  /**
   * Identify data subject from PII finding
   */
  private async identifyDataSubject(
    finding: PIIFinding,
    context: ScanContext
  ): Promise<DataSubjectIdentification> {
    const identifiers: string[] = [];
    let identificationMethod: 'email' | 'phone' | 'customer_id' | 'unknown' = 'unknown';
    let confidence = 0;
    let dataSubjectId: string | undefined;

    // Extract potential identifiers based on PII type
    switch (finding.type) {
      case 'email':
        identificationMethod = 'email';
        confidence = 0.9;
        identifiers.push(this.unmaskContent(finding.content));
        dataSubjectId = await this.findDataSubjectByEmail(identifiers[0]);
        break;

      case 'phone':
        identificationMethod = 'phone';
        confidence = 0.8;
        identifiers.push(this.unmaskContent(finding.content));
        dataSubjectId = await this.findDataSubjectByPhone(identifiers[0]);
        break;

      case 'name':
        // Names are less reliable for identification
        confidence = 0.5;
        identifiers.push(this.unmaskContent(finding.content));
        // Would need additional context to identify by name
        break;

      default:
        // Check if record metadata contains customer ID or other identifiers
        if (context.recordMetadata?.customerId) {
          identificationMethod = 'customer_id';
          confidence = 0.95;
          identifiers.push(context.recordMetadata.customerId);
          dataSubjectId = context.recordMetadata.customerId;
        }
        break;
    }

    return {
      dataSubjectId,
      identificationMethod,
      confidence,
      identifiers
    };
  }

  /**
   * Get consent records for data subject
   */
  private async getConsentRecords(
    dataSubjectId: string,
    context: ScanContext
  ): Promise<ConsentRecord[]> {
    try {
      // Integration with existing GDPR service
      const gdprRecords = await this.gdprService.getConsentRecords(dataSubjectId);
      
      return gdprRecords.map((record: any) => ({
        id: record.id,
        dataSubjectId: record.dataSubjectId || record.userId,
        purpose: record.purpose || 'data_processing',
        legalBasis: record.legalBasis || 'consent',
        consentGiven: record.consentGiven || record.isActive,
        consentDate: new Date(record.consentDate || record.createdAt),
        expiryDate: record.expiryDate ? new Date(record.expiryDate) : undefined,
        withdrawalDate: record.withdrawalDate ? new Date(record.withdrawalDate) : undefined,
        isActive: record.isActive !== false,
        source: record.source || context.connectorType,
        metadata: record.metadata
      }));
    } catch (error) {
      console.error('Error retrieving consent records:', error);
      return [];
    }
  }

  /**
   * Find most relevant consent record for the finding
   */
  private findRelevantConsent(
    consentRecords: ConsentRecord[],
    finding: PIIFinding,
    context: ScanContext
  ): ConsentRecord | null {
    // Filter active consents
    const activeConsents = consentRecords.filter(record => 
      record.isActive && 
      record.consentGiven && 
      !record.withdrawalDate
    );

    if (activeConsents.length === 0) {
      return null;
    }

    // Prioritize by purpose relevance
    const purposeMap: Record<string, string[]> = {
      'email': ['marketing', 'communication', 'data_processing'],
      'phone': ['marketing', 'communication', 'data_processing'],
      'address': ['shipping', 'billing', 'data_processing'],
      'name': ['data_processing', 'identification'],
      'ssn': ['identity_verification', 'data_processing'],
      'credit_card': ['payment_processing', 'billing']
    };

    const relevantPurposes = purposeMap[finding.type] || ['data_processing'];
    
    // Find consent with matching purpose
    for (const purpose of relevantPurposes) {
      const matchingConsent = activeConsents.find(record => 
        record.purpose.toLowerCase().includes(purpose.toLowerCase())
      );
      
      if (matchingConsent) {
        return matchingConsent;
      }
    }

    // Return most recent active consent if no purpose match
    return activeConsents.sort((a, b) => 
      b.consentDate.getTime() - a.consentDate.getTime()
    )[0];
  }

  /**
   * Validate consent record against rules
   */
  private validateConsentRecord(
    consentRecord: ConsentRecord,
    warnings: string[],
    recommendations: string[]
  ): Pick<ConsentValidationResult, 'status' | 'expiresIn'> {
    const now = new Date();
    
    // Check if consent is withdrawn
    if (consentRecord.withdrawalDate) {
      warnings.push(`Consent was withdrawn on ${consentRecord.withdrawalDate.toISOString()}`);
      recommendations.push('Stop processing this data immediately');
      return { status: 'revoked' };
    }

    // Check if consent is expired
    if (consentRecord.expiryDate && consentRecord.expiryDate < now) {
      warnings.push(`Consent expired on ${consentRecord.expiryDate.toISOString()}`);
      recommendations.push('Obtain renewed consent from data subject');
      return { status: 'expired' };
    }

    // Check consent age
    const consentAge = Math.floor(
      (now.getTime() - consentRecord.consentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (consentAge > this.validationRules.maxConsentAge) {
      warnings.push(`Consent is ${consentAge} days old, exceeding maximum age of ${this.validationRules.maxConsentAge} days`);
      recommendations.push('Consider refreshing consent with data subject');
      return { status: 'expired' };
    }

    // Check if consent is expiring soon
    let expiresIn: number | undefined;
    if (consentRecord.expiryDate) {
      expiresIn = Math.floor(
        (consentRecord.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (expiresIn <= this.validationRules.warningThreshold) {
        warnings.push(`Consent expires in ${expiresIn} days`);
        recommendations.push('Plan consent renewal process');
      }
    }

    // Consent is valid
    return { 
      status: 'valid',
      expiresIn
    };
  }

  /**
   * Find data subject by email (integration with existing system)
   */
  private async findDataSubjectByEmail(email: string): Promise<string | undefined> {
    try {
      // This would integrate with existing user/customer database
      const user = await this.gdprService.findUserByEmail(email);
      return user?.id;
    } catch (error) {
      console.error('Error finding data subject by email:', error);
      return undefined;
    }
  }

  /**
   * Find data subject by phone (integration with existing system)
   */
  private async findDataSubjectByPhone(phone: string): Promise<string | undefined> {
    try {
      // This would integrate with existing user/customer database
      const user = await this.gdprService.findUserByPhone(phone);
      return user?.id;
    } catch (error) {
      console.error('Error finding data subject by phone:', error);
      return undefined;
    }
  }

  /**
   * Unmask content for identification (simplified version)
   */
  private unmaskContent(maskedContent: string): string {
    // In a real implementation, this would need to access the original content
    // For now, return the masked content as-is
    // This would require storing original content securely for consent validation
    return maskedContent;
  }

  /**
   * Batch validate consent for multiple findings
   */
  async batchValidateConsent(
    findings: PIIFinding[],
    context: ScanContext
  ): Promise<Map<string, ConsentValidationResult>> {
    const results = new Map<string, ConsentValidationResult>();
    
    // Group findings by data subject for efficiency
    const findingsBySubject = new Map<string, PIIFinding[]>();
    
    for (const finding of findings) {
      const dataSubject = await this.identifyDataSubject(finding, context);
      
      if (dataSubject.dataSubjectId) {
        const existing = findingsBySubject.get(dataSubject.dataSubjectId) || [];
        existing.push(finding);
        findingsBySubject.set(dataSubject.dataSubjectId, existing);
      } else {
        // Handle findings without identifiable data subject
        results.set(finding.id, {
          status: 'missing',
          validationDate: new Date(),
          warnings: ['Could not identify data subject'],
          recommendations: ['Implement data subject identification']
        });
      }
    }

    // Validate consent for each data subject
    for (const [dataSubjectId, subjectFindings] of findingsBySubject) {
      const consentRecords = await this.getConsentRecords(dataSubjectId, context);
      
      for (const finding of subjectFindings) {
        const validationResult = await this.validateConsent(finding, context);
        results.set(finding.id, validationResult);
      }
    }

    return results;
  }

  /**
   * Get consent validation statistics
   */
  getValidationStatistics() {
    return {
      validationRules: this.validationRules,
      supportedIdentificationMethods: ['email', 'phone', 'customer_id'],
      maxConsentAge: this.validationRules.maxConsentAge,
      warningThreshold: this.validationRules.warningThreshold
    };
  }

  /**
   * Update validation rules
   */
  updateValidationRules(newRules: Partial<ConsentValidationRules>): void {
    this.validationRules = {
      ...this.validationRules,
      ...newRules
    };
  }

  /**
   * Check if consent is required for PII type
   */
  isConsentRequired(piiType: string, context: ScanContext): boolean {
    // High sensitivity data always requires consent
    const highSensitivityTypes = ['ssn', 'credit_card'];
    if (highSensitivityTypes.includes(piiType)) {
      return true;
    }

    // Check if processing purpose requires consent
    const consentRequiredPurposes = ['marketing', 'profiling', 'automated_decision_making'];
    const processingPurpose = context.recordMetadata?.processingPurpose;
    
    if (processingPurpose && consentRequiredPurposes.includes(processingPurpose)) {
      return true;
    }

    // Default based on validation rules
    return this.validationRules.requireExplicitConsent;
  }
}