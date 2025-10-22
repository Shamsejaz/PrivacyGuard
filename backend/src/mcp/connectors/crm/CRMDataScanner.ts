/**
 * MCP Privacy Connectors - CRM Data Scanner
 * Implements field-level sensitivity classification and consent validation for CRM data
 */

import type {
  PIIFinding,
  PIIType,
  SensitivityLevel,
  ConsentStatus,
  DataLocation,
  RemediationAction,
  ScanContext,
  PrivacyRule
} from '../../types/index.js';

/**
 * CRM field classification result
 */
interface CRMFieldClassification {
  fieldName: string;
  piiType: PIIType;
  sensitivityLevel: SensitivityLevel;
  confidence: number;
  consentRequired: boolean;
}

/**
 * CRM consent field mapping
 */
interface CRMConsentMapping {
  fieldName: string;
  consentField: string;
  consentType: 'email' | 'phone' | 'marketing' | 'general';
}

/**
 * CRM record with consent information
 */
interface CRMRecordWithConsent {
  Id: string;
  [key: string]: any;
  // Common consent fields
  HasOptedOutOfEmail?: boolean;
  DoNotCall?: boolean;
  HasOptedOutOfFax?: boolean;
  // Custom consent fields
  MarketingConsent__c?: boolean;
  DataProcessingConsent__c?: boolean;
  ConsentDate__c?: string;
  ConsentExpiry__c?: string;
}

/**
 * CRM data scanner for privacy detection and classification
 */
export class CRMDataScanner {
  private customRules: PrivacyRule[];
  private consentMappings: CRMConsentMapping[];
  private fieldClassifications: Map<string, CRMFieldClassification>;

  constructor(customRules: PrivacyRule[] = []) {
    this.customRules = customRules;
    this.consentMappings = this.initializeConsentMappings();
    this.fieldClassifications = this.initializeFieldClassifications();
  }

  /**
   * Scan CRM record for PII and classify sensitivity
   */
  async scanCRMRecord(
    record: CRMRecordWithConsent,
    objectType: string,
    scanId: string,
    context: ScanContext
  ): Promise<PIIFinding[]> {
    const findings: PIIFinding[] = [];
    
    // Get field classifications for this object type
    const relevantFields = this.getRelevantFields(objectType);
    
    for (const fieldClassification of relevantFields) {
      const fieldValue = record[fieldClassification.fieldName];
      
      if (this.isValidFieldValue(fieldValue)) {
        const finding = await this.analyzeField(
          fieldValue,
          fieldClassification,
          record,
          objectType,
          scanId,
          context
        );
        
        if (finding) {
          findings.push(finding);
        }
      }
    }

    // Apply custom rules
    const customFindings = await this.applyCustomRules(record, objectType, scanId, context);
    findings.push(...customFindings);

    return findings;
  }

  /**
   * Classify field sensitivity based on content and context
   */
  classifyFieldSensitivity(
    fieldName: string,
    fieldValue: string,
    piiType: PIIType,
    context: ScanContext
  ): SensitivityLevel {
    // Base sensitivity by PII type
    let baseSensitivity = this.getBaseSensitivity(piiType);
    
    // Adjust based on field name context
    const contextAdjustment = this.getContextualSensitivityAdjustment(fieldName, fieldValue);
    
    // Adjust based on organizational rules
    const orgAdjustment = this.getOrganizationalSensitivityAdjustment(piiType, context);
    
    return this.combineSensitivityLevels(baseSensitivity, contextAdjustment, orgAdjustment);
  }

  /**
   * Validate consent status for CRM field
   */
  validateConsentStatus(
    record: CRMRecordWithConsent,
    fieldName: string,
    piiType: PIIType
  ): ConsentStatus {
    // Find relevant consent mapping
    const consentMapping = this.consentMappings.find(
      mapping => mapping.fieldName === fieldName || mapping.consentType === this.mapPIITypeToConsentType(piiType)
    );

    if (!consentMapping) {
      // No specific consent mapping, check general consent
      return this.checkGeneralConsent(record, piiType);
    }

    const consentFieldValue = record[consentMapping.consentField];
    
    // Check explicit opt-out flags
    if (this.isExplicitOptOut(consentMapping.consentType, record)) {
      return 'revoked';
    }

    // Check consent expiry
    const consentExpiry = this.getConsentExpiry(record);
    if (consentExpiry && consentExpiry < new Date()) {
      return 'expired';
    }

    // Check positive consent
    if (this.hasPositiveConsent(consentFieldValue, consentMapping.consentType)) {
      return 'valid';
    }

    // Default to missing if no clear consent indication
    return 'missing';
  }

  /**
   * Generate field-level remediation recommendations
   */
  generateFieldRemediationActions(
    findings: PIIFinding[],
    objectType: string
  ): RemediationAction[] {
    const actions: RemediationAction[] = [];
    
    // Group findings by consent status and sensitivity
    const groupedFindings = this.groupFindingsByRisk(findings);
    
    // Generate actions for revoked consent
    if (groupedFindings.revokedConsent.length > 0) {
      actions.push(this.createBulkDeletionAction(groupedFindings.revokedConsent, objectType));
    }

    // Generate actions for expired consent
    if (groupedFindings.expiredConsent.length > 0) {
      actions.push(this.createConsentRenewalAction(groupedFindings.expiredConsent, objectType));
    }

    // Generate actions for high sensitivity data
    if (groupedFindings.highSensitivity.length > 0) {
      actions.push(this.createEncryptionAction(groupedFindings.highSensitivity, objectType));
    }

    // Generate actions for missing consent
    if (groupedFindings.missingConsent.length > 0) {
      actions.push(this.createConsentCollectionAction(groupedFindings.missingConsent, objectType));
    }

    return actions;
  }

  /**
   * Initialize consent field mappings for common CRM systems
   */
  private initializeConsentMappings(): CRMConsentMapping[] {
    return [
      { fieldName: 'Email', consentField: 'HasOptedOutOfEmail', consentType: 'email' },
      { fieldName: 'Phone', consentField: 'DoNotCall', consentType: 'phone' },
      { fieldName: 'MobilePhone', consentField: 'DoNotCall', consentType: 'phone' },
      { fieldName: 'Fax', consentField: 'HasOptedOutOfFax', consentType: 'phone' },
      // Custom consent fields
      { fieldName: 'MarketingEmail__c', consentField: 'MarketingConsent__c', consentType: 'marketing' },
      { fieldName: 'DataProcessing__c', consentField: 'DataProcessingConsent__c', consentType: 'general' }
    ];
  }

  /**
   * Initialize field classifications for CRM objects
   */
  private initializeFieldClassifications(): Map<string, CRMFieldClassification> {
    const classifications = new Map<string, CRMFieldClassification>();
    
    // Contact/Lead personal information
    const personalFields: CRMFieldClassification[] = [
      { fieldName: 'FirstName', piiType: 'name', sensitivityLevel: 'low', confidence: 0.95, consentRequired: false },
      { fieldName: 'LastName', piiType: 'name', sensitivityLevel: 'low', confidence: 0.95, consentRequired: false },
      { fieldName: 'Email', piiType: 'email', sensitivityLevel: 'medium', confidence: 0.98, consentRequired: true },
      { fieldName: 'Phone', piiType: 'phone', sensitivityLevel: 'medium', confidence: 0.95, consentRequired: true },
      { fieldName: 'MobilePhone', piiType: 'phone', sensitivityLevel: 'medium', confidence: 0.95, consentRequired: true },
      { fieldName: 'HomePhone', piiType: 'phone', sensitivityLevel: 'medium', confidence: 0.95, consentRequired: true },
      { fieldName: 'WorkPhone', piiType: 'phone', sensitivityLevel: 'medium', confidence: 0.95, consentRequired: true }
    ];

    // Address fields
    const addressFields: CRMFieldClassification[] = [
      { fieldName: 'MailingStreet', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false },
      { fieldName: 'MailingCity', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'MailingState', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'MailingPostalCode', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false },
      { fieldName: 'Street', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false },
      { fieldName: 'City', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'State', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'PostalCode', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false }
    ];

    // Account fields
    const accountFields: CRMFieldClassification[] = [
      { fieldName: 'Name', piiType: 'name', sensitivityLevel: 'low', confidence: 0.80, consentRequired: false },
      { fieldName: 'BillingStreet', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false },
      { fieldName: 'BillingCity', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'BillingState', piiType: 'address', sensitivityLevel: 'low', confidence: 0.85, consentRequired: false },
      { fieldName: 'BillingPostalCode', piiType: 'address', sensitivityLevel: 'low', confidence: 0.90, consentRequired: false }
    ];

    // Add all classifications to map
    [...personalFields, ...addressFields, ...accountFields].forEach(classification => {
      classifications.set(classification.fieldName, classification);
    });

    return classifications;
  }

  /**
   * Get relevant fields for object type
   */
  private getRelevantFields(objectType: string): CRMFieldClassification[] {
    const allFields = Array.from(this.fieldClassifications.values());
    
    switch (objectType.toLowerCase()) {
      case 'contact':
        return allFields.filter(field => 
          !field.fieldName.startsWith('Billing') && 
          field.fieldName !== 'Name' // Account name, not contact name
        );
      case 'lead':
        return allFields.filter(field => 
          !field.fieldName.startsWith('Billing') && 
          !field.fieldName.startsWith('Mailing') &&
          field.fieldName !== 'Name' // Account name, not lead name
        );
      case 'account':
        return allFields.filter(field => 
          field.fieldName.startsWith('Billing') || 
          field.fieldName === 'Name' ||
          field.fieldName === 'Phone'
        );
      default:
        return allFields;
    }
  }

  /**
   * Check if field value is valid for analysis
   */
  private isValidFieldValue(value: any): boolean {
    return value !== null && 
           value !== undefined && 
           typeof value === 'string' && 
           value.trim().length > 0;
  }

  /**
   * Analyze individual field for PII
   */
  private async analyzeField(
    fieldValue: string,
    classification: CRMFieldClassification,
    record: CRMRecordWithConsent,
    objectType: string,
    scanId: string,
    context: ScanContext
  ): Promise<PIIFinding | null> {
    // Validate content matches expected PII type
    if (!this.validatePIIContent(fieldValue, classification.piiType)) {
      return null;
    }

    // Classify sensitivity with context
    const sensitivityLevel = this.classifyFieldSensitivity(
      classification.fieldName,
      fieldValue,
      classification.piiType,
      context
    );

    // Validate consent status
    const consentStatus = classification.consentRequired 
      ? this.validateConsentStatus(record, classification.fieldName, classification.piiType)
      : 'valid';

    const location: DataLocation = {
      system: 'Salesforce',
      database: context.dataSource,
      table: objectType,
      column: classification.fieldName,
      recordId: record.Id,
      metadata: {
        objectType,
        recordId: record.Id,
        fieldClassification: classification
      }
    };

    return {
      id: `finding_${scanId}_${record.Id}_${classification.fieldName}`,
      type: classification.piiType,
      location,
      content: this.maskSensitiveData(fieldValue),
      confidence: classification.confidence,
      sensitivityLevel,
      consentStatus,
      recommendedAction: this.getRecommendedAction(
        classification.piiType,
        consentStatus,
        sensitivityLevel
      ),
      detectionMethod: 'context',
      timestamp: new Date()
    };
  }

  /**
   * Apply custom privacy rules to record
   */
  private async applyCustomRules(
    record: CRMRecordWithConsent,
    objectType: string,
    scanId: string,
    context: ScanContext
  ): Promise<PIIFinding[]> {
    const findings: PIIFinding[] = [];
    
    for (const rule of this.customRules) {
      if (!rule.isEnabled) continue;
      
      // Apply rule to all string fields in record
      for (const [fieldName, fieldValue] of Object.entries(record)) {
        if (typeof fieldValue === 'string' && fieldValue.length > 0) {
          const match = this.testCustomRule(fieldValue, rule);
          
          if (match) {
            const finding = this.createCustomRuleFinding(
              fieldValue,
              fieldName,
              rule,
              record,
              objectType,
              scanId,
              context
            );
            findings.push(finding);
          }
        }
      }
    }
    
    return findings;
  }

  /**
   * Test custom rule against field value
   */
  private testCustomRule(fieldValue: string, rule: PrivacyRule): boolean {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      return regex.test(fieldValue);
    } catch (error) {
      console.warn(`Invalid regex pattern in rule ${rule.id}: ${rule.pattern}`);
      return false;
    }
  }

  /**
   * Create finding from custom rule match
   */
  private createCustomRuleFinding(
    fieldValue: string,
    fieldName: string,
    rule: PrivacyRule,
    record: CRMRecordWithConsent,
    objectType: string,
    scanId: string,
    context: ScanContext
  ): PIIFinding {
    const location: DataLocation = {
      system: 'Salesforce',
      database: context.dataSource,
      table: objectType,
      column: fieldName,
      recordId: record.Id,
      metadata: {
        objectType,
        recordId: record.Id,
        customRule: rule
      }
    };

    return {
      id: `finding_${scanId}_${record.Id}_${fieldName}_custom_${rule.id}`,
      type: rule.piiType,
      location,
      content: this.maskSensitiveData(fieldValue),
      confidence: 0.8, // Lower confidence for custom rules
      sensitivityLevel: rule.sensitivityLevel,
      consentStatus: this.validateConsentStatus(record, fieldName, rule.piiType),
      recommendedAction: this.getRecommendedAction(
        rule.piiType,
        this.validateConsentStatus(record, fieldName, rule.piiType),
        rule.sensitivityLevel
      ),
      detectionMethod: 'custom_rule',
      timestamp: new Date()
    };
  }

  /**
   * Validate PII content based on type
   */
  private validatePIIContent(value: string, piiType: PIIType): boolean {
    switch (piiType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /[\d\-\(\)\+\s]{10,}/.test(value);
      case 'name':
        return value.length >= 2 && /^[a-zA-Z\s\-'\.]+$/.test(value);
      case 'address':
        return value.length >= 5;
      case 'ssn':
        return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
      case 'credit_card':
        return /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value);
      default:
        return value.length > 0;
    }
  }

  /**
   * Get base sensitivity level for PII type
   */
  private getBaseSensitivity(piiType: PIIType): SensitivityLevel {
    switch (piiType) {
      case 'ssn':
      case 'credit_card':
        return 'high';
      case 'email':
      case 'phone':
        return 'medium';
      case 'name':
      case 'address':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get contextual sensitivity adjustment based on field name
   */
  private getContextualSensitivityAdjustment(fieldName: string, fieldValue: string): number {
    // Increase sensitivity for certain field patterns
    if (fieldName.toLowerCase().includes('personal') || 
        fieldName.toLowerCase().includes('private') ||
        fieldName.toLowerCase().includes('confidential')) {
      return 1; // Increase by one level
    }
    
    // Decrease sensitivity for public/business fields
    if (fieldName.toLowerCase().includes('business') || 
        fieldName.toLowerCase().includes('work') ||
        fieldName.toLowerCase().includes('company')) {
      return -1; // Decrease by one level
    }
    
    return 0; // No adjustment
  }

  /**
   * Get organizational sensitivity adjustment
   */
  private getOrganizationalSensitivityAdjustment(piiType: PIIType, context: ScanContext): number {
    // Check if organization has specific rules for this PII type
    const orgRules = context.organizationRules?.filter(rule => rule.piiType === piiType);
    
    if (orgRules && orgRules.length > 0) {
      // Use the highest sensitivity level from org rules
      const maxOrgSensitivity = orgRules.reduce((max, rule) => {
        const levels = { 'low': 1, 'medium': 2, 'high': 3 };
        return Math.max(max, levels[rule.sensitivityLevel]);
      }, 0);
      
      const baseLevels = { 'low': 1, 'medium': 2, 'high': 3 };
      const baseLevel = baseLevels[this.getBaseSensitivity(piiType)];
      
      return maxOrgSensitivity - baseLevel;
    }
    
    return 0;
  }

  /**
   * Combine sensitivity levels with adjustments
   */
  private combineSensitivityLevels(
    base: SensitivityLevel,
    contextAdjustment: number,
    orgAdjustment: number
  ): SensitivityLevel {
    const levels = { 'low': 1, 'medium': 2, 'high': 3 };
    const levelNames: SensitivityLevel[] = ['low', 'medium', 'high'];
    
    const baseLevel = levels[base];
    const adjustedLevel = Math.max(1, Math.min(3, baseLevel + contextAdjustment + orgAdjustment));
    
    return levelNames[adjustedLevel - 1];
  }

  /**
   * Map PII type to consent type
   */
  private mapPIITypeToConsentType(piiType: PIIType): 'email' | 'phone' | 'marketing' | 'general' {
    switch (piiType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'phone';
      default:
        return 'general';
    }
  }

  /**
   * Check general consent for record
   */
  private checkGeneralConsent(record: CRMRecordWithConsent, piiType: PIIType): ConsentStatus {
    // Check for general data processing consent
    if (record.DataProcessingConsent__c === false) {
      return 'revoked';
    }
    
    // Check consent expiry
    const consentExpiry = this.getConsentExpiry(record);
    if (consentExpiry && consentExpiry < new Date()) {
      return 'expired';
    }
    
    // Default to valid for basic contact information
    if (['name', 'address'].includes(piiType)) {
      return 'valid';
    }
    
    return 'missing';
  }

  /**
   * Check for explicit opt-out flags
   */
  private isExplicitOptOut(consentType: string, record: CRMRecordWithConsent): boolean {
    switch (consentType) {
      case 'email':
        return record.HasOptedOutOfEmail === true;
      case 'phone':
        return record.DoNotCall === true;
      case 'marketing':
        return record.MarketingConsent__c === false;
      default:
        return false;
    }
  }

  /**
   * Get consent expiry date from record
   */
  private getConsentExpiry(record: CRMRecordWithConsent): Date | null {
    if (record.ConsentExpiry__c) {
      return new Date(record.ConsentExpiry__c);
    }
    return null;
  }

  /**
   * Check for positive consent
   */
  private hasPositiveConsent(consentFieldValue: any, consentType: string): boolean {
    // For boolean fields, check for explicit true
    if (typeof consentFieldValue === 'boolean') {
      return consentFieldValue === true;
    }
    
    // For string fields, check for positive indicators
    if (typeof consentFieldValue === 'string') {
      const positiveValues = ['yes', 'true', 'granted', 'accepted', 'opted-in'];
      return positiveValues.includes(consentFieldValue.toLowerCase());
    }
    
    return false;
  }

  /**
   * Group findings by risk level
   */
  private groupFindingsByRisk(findings: PIIFinding[]) {
    return {
      revokedConsent: findings.filter(f => f.consentStatus === 'revoked'),
      expiredConsent: findings.filter(f => f.consentStatus === 'expired'),
      missingConsent: findings.filter(f => f.consentStatus === 'missing'),
      highSensitivity: findings.filter(f => f.sensitivityLevel === 'high')
    };
  }

  /**
   * Create bulk deletion action for revoked consent
   */
  private createBulkDeletionAction(findings: PIIFinding[], objectType: string): RemediationAction {
    return {
      id: `bulk_delete_${Date.now()}`,
      type: 'delete',
      description: `Delete ${findings.length} PII fields with revoked consent in ${objectType} records`,
      priority: 'critical',
      automated: false,
      parameters: {
        objectType,
        recordIds: [...new Set(findings.map(f => f.location.recordId))],
        fields: findings.map(f => f.location.column)
      }
    };
  }

  /**
   * Create consent renewal action
   */
  private createConsentRenewalAction(findings: PIIFinding[], objectType: string): RemediationAction {
    return {
      id: `consent_renewal_${Date.now()}`,
      type: 'flag_review',
      description: `Renew consent for ${findings.length} PII fields with expired consent in ${objectType} records`,
      priority: 'high',
      automated: false,
      parameters: {
        objectType,
        recordIds: [...new Set(findings.map(f => f.location.recordId))],
        action: 'consent_renewal'
      }
    };
  }

  /**
   * Create encryption action for high sensitivity data
   */
  private createEncryptionAction(findings: PIIFinding[], objectType: string): RemediationAction {
    return {
      id: `encrypt_${Date.now()}`,
      type: 'encrypt',
      description: `Encrypt ${findings.length} high-sensitivity PII fields in ${objectType} records`,
      priority: 'high',
      automated: true,
      parameters: {
        objectType,
        recordIds: [...new Set(findings.map(f => f.location.recordId))],
        fields: findings.map(f => f.location.column)
      }
    };
  }

  /**
   * Create consent collection action
   */
  private createConsentCollectionAction(findings: PIIFinding[], objectType: string): RemediationAction {
    return {
      id: `consent_collection_${Date.now()}`,
      type: 'flag_review',
      description: `Collect consent for ${findings.length} PII fields with missing consent in ${objectType} records`,
      priority: 'medium',
      automated: false,
      parameters: {
        objectType,
        recordIds: [...new Set(findings.map(f => f.location.recordId))],
        action: 'consent_collection'
      }
    };
  }

  /**
   * Get recommended remediation action
   */
  private getRecommendedAction(
    piiType: PIIType,
    consentStatus: ConsentStatus,
    sensitivityLevel: SensitivityLevel
  ): RemediationAction {
    if (consentStatus === 'expired' || consentStatus === 'revoked') {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'delete',
        description: `Delete ${piiType} data due to ${consentStatus} consent`,
        priority: sensitivityLevel === 'high' ? 'critical' : 'high',
        automated: false
      };
    }

    if (sensitivityLevel === 'high') {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'encrypt',
        description: `Encrypt high-sensitivity ${piiType} data`,
        priority: 'high',
        automated: true
      };
    }

    if (consentStatus === 'missing') {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'flag_review',
        description: `Collect consent for ${piiType} data`,
        priority: 'medium',
        automated: false
      };
    }

    return {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'flag_review',
      description: `Review ${piiType} data for compliance`,
      priority: 'low',
      automated: false
    };
  }

  /**
   * Mask sensitive data for logging
   */
  private maskSensitiveData(data: string): string {
    if (!data || data.length <= 4) {
      return '***';
    }
    
    const visibleChars = Math.min(2, Math.floor(data.length * 0.2));
    const maskedLength = data.length - (visibleChars * 2);
    
    return data.substring(0, visibleChars) + 
           '*'.repeat(maskedLength) + 
           data.substring(data.length - visibleChars);
  }
}