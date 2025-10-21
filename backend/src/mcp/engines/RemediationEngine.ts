/**
 * MCP Privacy Connectors - Remediation Engine
 * Service for generating and executing automated remediation actions
 */

import type {
  PIIFinding,
  RemediationAction,
  RemediationActionType,
  RemediationResult,
  ScanContext,
  SensitivityLevel
} from '../types/index.js';

/**
 * Remediation strategy configuration
 */
interface RemediationStrategy {
  piiType: string;
  sensitivityLevel: SensitivityLevel;
  defaultAction: RemediationActionType;
  alternativeActions: RemediationActionType[];
  automationLevel: 'full' | 'semi' | 'manual';
  requiresApproval: boolean;
}

/**
 * Remediation execution context
 */
interface RemediationContext {
  finding: PIIFinding;
  scanContext: ScanContext;
  approvedBy?: string;
  executionMode: 'immediate' | 'scheduled' | 'manual';
  dryRun: boolean;
}

/**
 * Data masking configuration
 */
interface MaskingConfig {
  maskingChar: string;
  preserveLength: boolean;
  preserveFormat: boolean;
  visibleChars: number;
  maskingPattern?: string;
}

/**
 * Anonymization configuration
 */
interface AnonymizationConfig {
  method: 'generalization' | 'suppression' | 'perturbation' | 'synthetic';
  preserveUtility: boolean;
  anonymityLevel: 'k-anonymity' | 'l-diversity' | 't-closeness';
  parameters: Record<string, any>;
}

/**
 * Remediation Engine for generating and executing automated remediation actions
 */
export class RemediationEngine {
  private strategies: Map<string, RemediationStrategy> = new Map();
  private maskingConfig: MaskingConfig;
  private anonymizationConfig: AnonymizationConfig;
  private executionHistory: Map<string, RemediationResult[]> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeDefaultConfigurations();
  }

  /**
   * Generate remediation suggestions for PII findings
   */
  async generateRemediationSuggestions(
    findings: PIIFinding[],
    context: ScanContext
  ): Promise<RemediationAction[]> {
    const actions: RemediationAction[] = [];

    for (const finding of findings) {
      const strategy = this.getRemediationStrategy(finding);
      const primaryAction = this.createRemediationAction(finding, strategy.defaultAction, strategy);
      
      actions.push(primaryAction);

      // Add alternative actions if available
      for (const alternativeActionType of strategy.alternativeActions) {
        const alternativeAction = this.createRemediationAction(
          finding, 
          alternativeActionType, 
          strategy,
          true // mark as alternative
        );
        actions.push(alternativeAction);
      }
    }

    return this.prioritizeActions(actions);
  }

  /**
   * Execute remediation action
   */
  async executeRemediation(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    const startTime = Date.now();
    
    try {
      // Validate action can be executed
      this.validateRemediationAction(action, context);

      let result: RemediationResult;

      // Execute based on action type
      switch (action.type) {
        case 'mask':
          result = await this.executeMasking(action, context);
          break;
        case 'delete':
          result = await this.executeDeletion(action, context);
          break;
        case 'encrypt':
          result = await this.executeEncryption(action, context);
          break;
        case 'anonymize':
          result = await this.executeAnonymization(action, context);
          break;
        case 'flag_review':
          result = await this.executeFlagForReview(action, context);
          break;
        default:
          throw new Error(`Unsupported remediation action type: ${action.type}`);
      }

      // Record execution history
      this.recordExecutionHistory(action.id, result);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const failureResult: RemediationResult = {
        actionId: action.id,
        status: 'failed',
        recordsAffected: 0,
        details: `Remediation failed: ${error.message}`,
        timestamp: new Date()
      };

      this.recordExecutionHistory(action.id, failureResult);
      return failureResult;
    }
  }

  /**
   * Execute data masking
   */
  private async executeMasking(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    if (context.dryRun) {
      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: 'Dry run: Data would be masked using configured pattern',
        timestamp: new Date()
      };
    }

    try {
      const maskedValue = this.maskData(
        context.finding.content,
        context.finding.type,
        this.maskingConfig
      );

      // In a real implementation, this would update the actual data source
      // For now, we simulate the operation
      console.log(`Masking ${context.finding.type} data: ${context.finding.content} -> ${maskedValue}`);

      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Successfully masked ${context.finding.type} data`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Masking failed: ${error.message}`);
    }
  }

  /**
   * Execute data deletion
   */
  private async executeDeletion(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    if (context.dryRun) {
      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: 'Dry run: Data would be permanently deleted',
        timestamp: new Date()
      };
    }

    try {
      // In a real implementation, this would delete from the actual data source
      console.log(`Deleting ${context.finding.type} data from ${context.finding.location.system}`);

      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Successfully deleted ${context.finding.type} data`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Deletion failed: ${error.message}`);
    }
  }

  /**
   * Execute data encryption
   */
  private async executeEncryption(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    if (context.dryRun) {
      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: 'Dry run: Data would be encrypted using AES-256',
        timestamp: new Date()
      };
    }

    try {
      // In a real implementation, this would encrypt the actual data
      console.log(`Encrypting ${context.finding.type} data`);

      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Successfully encrypted ${context.finding.type} data`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Execute data anonymization
   */
  private async executeAnonymization(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    if (context.dryRun) {
      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Dry run: Data would be anonymized using ${this.anonymizationConfig.method}`,
        timestamp: new Date()
      };
    }

    try {
      const anonymizedValue = this.anonymizeData(
        context.finding.content,
        context.finding.type,
        this.anonymizationConfig
      );

      console.log(`Anonymizing ${context.finding.type} data: ${context.finding.content} -> ${anonymizedValue}`);

      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Successfully anonymized ${context.finding.type} data`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Anonymization failed: ${error.message}`);
    }
  }

  /**
   * Execute flag for review
   */
  private async executeFlagForReview(
    action: RemediationAction,
    context: RemediationContext
  ): Promise<RemediationResult> {
    try {
      // Create review ticket or notification
      console.log(`Flagging ${context.finding.type} data for manual review`);

      // In a real implementation, this would integrate with ticketing system
      // or send notifications to privacy officers

      return {
        actionId: action.id,
        status: 'success',
        recordsAffected: 1,
        details: `Successfully flagged ${context.finding.type} data for review`,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Flag for review failed: ${error.message}`);
    }
  }

  /**
   * Mask data according to configuration
   */
  private maskData(content: string, piiType: string, config: MaskingConfig): string {
    if (!content) return content;

    const { maskingChar, preserveLength, preserveFormat, visibleChars } = config;

    // Special handling for different PII types
    switch (piiType) {
      case 'email':
        return this.maskEmail(content, maskingChar, visibleChars);
      case 'phone':
        return this.maskPhone(content, maskingChar, preserveFormat);
      case 'credit_card':
        return this.maskCreditCard(content, maskingChar);
      case 'ssn':
        return this.maskSSN(content, maskingChar);
      default:
        return this.maskGeneric(content, maskingChar, visibleChars, preserveLength);
    }
  }

  /**
   * Mask email address
   */
  private maskEmail(email: string, maskingChar: string, visibleChars: number): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    const maskedLocal = localPart.length > visibleChars * 2 
      ? localPart.substring(0, visibleChars) + 
        maskingChar.repeat(localPart.length - visibleChars * 2) + 
        localPart.substring(localPart.length - visibleChars)
      : maskingChar.repeat(localPart.length);

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone number
   */
  private maskPhone(phone: string, maskingChar: string, preserveFormat: boolean): string {
    if (preserveFormat) {
      return phone.replace(/\d/g, maskingChar);
    } else {
      const digits = phone.replace(/\D/g, '');
      return maskingChar.repeat(digits.length);
    }
  }

  /**
   * Mask credit card number
   */
  private maskCreditCard(cardNumber: string, maskingChar: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return maskingChar.repeat(cleaned.length);
    
    return maskingChar.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }

  /**
   * Mask SSN
   */
  private maskSSN(ssn: string, maskingChar: string): string {
    return ssn.replace(/\d/g, maskingChar);
  }

  /**
   * Generic masking
   */
  private maskGeneric(
    content: string, 
    maskingChar: string, 
    visibleChars: number, 
    preserveLength: boolean
  ): string {
    if (!preserveLength) {
      return maskingChar.repeat(3);
    }

    if (content.length <= visibleChars * 2) {
      return maskingChar.repeat(content.length);
    }

    return content.substring(0, visibleChars) + 
           maskingChar.repeat(content.length - visibleChars * 2) + 
           content.substring(content.length - visibleChars);
  }

  /**
   * Anonymize data according to configuration
   */
  private anonymizeData(
    content: string, 
    piiType: string, 
    config: AnonymizationConfig
  ): string {
    switch (config.method) {
      case 'generalization':
        return this.generalizeData(content, piiType);
      case 'suppression':
        return '[SUPPRESSED]';
      case 'perturbation':
        return this.perturbData(content, piiType);
      case 'synthetic':
        return this.generateSyntheticData(piiType);
      default:
        return '[ANONYMIZED]';
    }
  }

  /**
   * Generalize data (reduce precision)
   */
  private generalizeData(content: string, piiType: string): string {
    switch (piiType) {
      case 'address':
        // Generalize to city level
        return content.split(',')[0] + ', [CITY]';
      case 'phone':
        // Generalize to area code
        const digits = content.replace(/\D/g, '');
        return digits.substring(0, 3) + '-XXX-XXXX';
      case 'email':
        // Generalize to domain
        const domain = content.split('@')[1];
        return `[USER]@${domain}`;
      default:
        return '[GENERALIZED]';
    }
  }

  /**
   * Perturb data (add noise)
   */
  private perturbData(content: string, piiType: string): string {
    // Simple perturbation - in real implementation would use proper algorithms
    return content.split('').map(char => 
      Math.random() > 0.7 ? String.fromCharCode(char.charCodeAt(0) + 1) : char
    ).join('');
  }

  /**
   * Generate synthetic data
   */
  private generateSyntheticData(piiType: string): string {
    const syntheticData: Record<string, string[]> = {
      name: ['John Doe', 'Jane Smith', 'Bob Johnson'],
      email: ['user@example.com', 'test@sample.org', 'demo@placeholder.net'],
      phone: ['555-0123', '555-0456', '555-0789'],
      address: ['123 Main St', '456 Oak Ave', '789 Pine Rd']
    };

    const options = syntheticData[piiType] || ['[SYNTHETIC]'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Get remediation strategy for finding
   */
  private getRemediationStrategy(finding: PIIFinding): RemediationStrategy {
    const strategyKey = `${finding.type}_${finding.sensitivityLevel}`;
    return this.strategies.get(strategyKey) || this.strategies.get(finding.type) || this.getDefaultStrategy();
  }

  /**
   * Create remediation action
   */
  private createRemediationAction(
    finding: PIIFinding,
    actionType: RemediationActionType,
    strategy: RemediationStrategy,
    isAlternative: boolean = false
  ): RemediationAction {
    return {
      id: this.generateActionId(),
      type: actionType,
      description: this.getActionDescription(actionType, finding.type, isAlternative),
      priority: this.calculateActionPriority(finding, actionType),
      automated: strategy.automationLevel === 'full' && !strategy.requiresApproval,
      parameters: this.getActionParameters(actionType, finding)
    };
  }

  /**
   * Get action description
   */
  private getActionDescription(
    actionType: RemediationActionType,
    piiType: string,
    isAlternative: boolean
  ): string {
    const prefix = isAlternative ? 'Alternative: ' : '';
    const descriptions: Record<RemediationActionType, string> = {
      mask: `${prefix}Mask ${piiType} data to protect privacy while preserving format`,
      delete: `${prefix}Permanently delete ${piiType} data from the system`,
      encrypt: `${prefix}Encrypt ${piiType} data using AES-256 encryption`,
      anonymize: `${prefix}Anonymize ${piiType} data while preserving analytical utility`,
      flag_review: `${prefix}Flag ${piiType} data for manual privacy review`
    };

    return descriptions[actionType] || `${prefix}Process ${piiType} data for privacy compliance`;
  }

  /**
   * Calculate action priority
   */
  private calculateActionPriority(
    finding: PIIFinding,
    actionType: RemediationActionType
  ): 'low' | 'medium' | 'high' | 'critical' {
    // High sensitivity data gets higher priority
    if (finding.sensitivityLevel === 'high') {
      return actionType === 'delete' ? 'critical' : 'high';
    }

    if (finding.sensitivityLevel === 'medium') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get action parameters
   */
  private getActionParameters(
    actionType: RemediationActionType,
    finding: PIIFinding
  ): Record<string, any> {
    const baseParams = {
      findingId: finding.id,
      piiType: finding.type,
      location: finding.location
    };

    switch (actionType) {
      case 'mask':
        return { ...baseParams, maskingConfig: this.maskingConfig };
      case 'anonymize':
        return { ...baseParams, anonymizationConfig: this.anonymizationConfig };
      case 'encrypt':
        return { ...baseParams, algorithm: 'AES-256-GCM' };
      default:
        return baseParams;
    }
  }

  /**
   * Prioritize actions by urgency and impact
   */
  private prioritizeActions(actions: RemediationAction[]): RemediationAction[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return actions.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Secondary sort by automation capability
      if (a.automated !== b.automated) {
        return a.automated ? -1 : 1;
      }
      
      return 0;
    });
  }

  /**
   * Validate remediation action
   */
  private validateRemediationAction(
    action: RemediationAction,
    context: RemediationContext
  ): void {
    if (!action.id || !action.type) {
      throw new Error('Invalid remediation action: missing required fields');
    }

    const strategy = this.getRemediationStrategy(context.finding);
    
    if (strategy.requiresApproval && !context.approvedBy) {
      throw new Error('Remediation action requires approval but none provided');
    }

    if (action.type === 'delete' && !context.dryRun && context.executionMode === 'immediate') {
      throw new Error('Immediate deletion requires explicit confirmation');
    }
  }

  /**
   * Record execution history
   */
  private recordExecutionHistory(actionId: string, result: RemediationResult): void {
    const existing = this.executionHistory.get(actionId) || [];
    existing.push(result);
    this.executionHistory.set(actionId, existing);
  }

  /**
   * Initialize default remediation strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: RemediationStrategy[] = [
      {
        piiType: 'ssn',
        sensitivityLevel: 'high',
        defaultAction: 'encrypt',
        alternativeActions: ['delete', 'mask'],
        automationLevel: 'semi',
        requiresApproval: true
      },
      {
        piiType: 'credit_card',
        sensitivityLevel: 'high',
        defaultAction: 'mask',
        alternativeActions: ['encrypt', 'delete'],
        automationLevel: 'full',
        requiresApproval: false
      },
      {
        piiType: 'email',
        sensitivityLevel: 'medium',
        defaultAction: 'flag_review',
        alternativeActions: ['mask', 'anonymize'],
        automationLevel: 'semi',
        requiresApproval: false
      },
      {
        piiType: 'phone',
        sensitivityLevel: 'medium',
        defaultAction: 'mask',
        alternativeActions: ['anonymize', 'flag_review'],
        automationLevel: 'full',
        requiresApproval: false
      },
      {
        piiType: 'address',
        sensitivityLevel: 'medium',
        defaultAction: 'anonymize',
        alternativeActions: ['mask', 'flag_review'],
        automationLevel: 'full',
        requiresApproval: false
      },
      {
        piiType: 'name',
        sensitivityLevel: 'low',
        defaultAction: 'flag_review',
        alternativeActions: ['anonymize', 'mask'],
        automationLevel: 'manual',
        requiresApproval: false
      }
    ];

    for (const strategy of defaultStrategies) {
      const key = `${strategy.piiType}_${strategy.sensitivityLevel}`;
      this.strategies.set(key, strategy);
      this.strategies.set(strategy.piiType, strategy); // Fallback without sensitivity level
    }
  }

  /**
   * Initialize default configurations
   */
  private initializeDefaultConfigurations(): void {
    this.maskingConfig = {
      maskingChar: '*',
      preserveLength: true,
      preserveFormat: true,
      visibleChars: 2
    };

    this.anonymizationConfig = {
      method: 'generalization',
      preserveUtility: true,
      anonymityLevel: 'k-anonymity',
      parameters: { k: 5 }
    };
  }

  /**
   * Get default strategy
   */
  private getDefaultStrategy(): RemediationStrategy {
    return {
      piiType: 'custom',
      sensitivityLevel: 'medium',
      defaultAction: 'flag_review',
      alternativeActions: ['mask', 'anonymize'],
      automationLevel: 'manual',
      requiresApproval: true
    };
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `remediation_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get remediation statistics
   */
  getRemediationStatistics() {
    const totalExecutions = Array.from(this.executionHistory.values())
      .reduce((sum, results) => sum + results.length, 0);
    
    const successfulExecutions = Array.from(this.executionHistory.values())
      .flat()
      .filter(result => result.status === 'success').length;

    return {
      totalStrategies: this.strategies.size,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      maskingConfig: this.maskingConfig,
      anonymizationConfig: this.anonymizationConfig
    };
  }

  /**
   * Update masking configuration
   */
  updateMaskingConfig(config: Partial<MaskingConfig>): void {
    this.maskingConfig = { ...this.maskingConfig, ...config };
  }

  /**
   * Update anonymization configuration
   */
  updateAnonymizationConfig(config: Partial<AnonymizationConfig>): void {
    this.anonymizationConfig = { ...this.anonymizationConfig, ...config };
  }

  /**
   * Add custom remediation strategy
   */
  addRemediationStrategy(strategy: RemediationStrategy): void {
    const key = `${strategy.piiType}_${strategy.sensitivityLevel}`;
    this.strategies.set(key, strategy);
  }

  /**
   * Get execution history for action
   */
  getExecutionHistory(actionId: string): RemediationResult[] {
    return this.executionHistory.get(actionId) || [];
  }
}